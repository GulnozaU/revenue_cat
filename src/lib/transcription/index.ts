import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import type { Transcript, TranscriptSegment } from "@/lib/types/edit-plan";
import { detectSilences } from "@/lib/ffmpeg/media";

export async function transcribeAudio(input: {
  wavPath: string;
  duration: number;
}): Promise<Transcript> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await transcribeWithOpenAI(input.wavPath, input.duration);
    } catch (err) {
      console.warn("OpenAI transcription failed, trying local", err);
    }
  }

  try {
    return await transcribeWithLocalWhisper(input.wavPath, input.duration);
  } catch (err) {
    console.warn("Local whisper failed, using silence-based segments", err);
    return await silenceFallbackTranscript(input.wavPath, input.duration);
  }
}

async function transcribeWithOpenAI(
  wavPath: string,
  duration: number
): Promise<Transcript> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const buf = await fs.readFile(wavPath);
  const file = new File([buf], path.basename(wavPath), { type: "audio/wav" });

  const result = (await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    response_format: "verbose_json",
  })) as unknown as {
    text: string;
    language?: string;
    duration?: number;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  const segments: TranscriptSegment[] = (result.segments ?? []).map((s, i) => ({
    id: `seg_${i + 1}`,
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }));

  return {
    language: result.language ?? "en",
    fullText: result.text,
    segments,
    duration: result.duration ?? duration,
    provider: "openai",
  };
}

async function transcribeWithLocalWhisper(
  wavPath: string,
  duration: number
): Promise<Transcript> {
  const { pipeline, env } = await import("@xenova/transformers");
  env.allowLocalModels = false;

  const audio = await readWavAsFloat32(wavPath);
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny.en"
  );

  const output = (await transcriber(audio, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  } as Record<string, unknown>)) as {
    text: string;
    chunks?: Array<{ text: string; timestamp: [number, number | null] }>;
  };

  const segments: TranscriptSegment[] = (output.chunks ?? [])
    .map((c, i) => ({
      id: `seg_${i + 1}`,
      text: c.text.trim(),
      start: c.timestamp?.[0] ?? 0,
      end: c.timestamp?.[1] ?? duration,
    }))
    .filter((s) => s.text.length > 0);

  if (segments.length === 0 && output.text?.trim()) {
    segments.push({
      id: "seg_1",
      text: output.text.trim(),
      start: 0,
      end: duration,
    });
  }

  return {
    language: "en",
    fullText: output.text ?? segments.map((s) => s.text).join(" "),
    segments,
    duration,
    provider: "local-whisper",
  };
}

/** Read 16-bit mono PCM WAV into Float32Array for transformers.js */
async function readWavAsFloat32(wavPath: string): Promise<Float32Array> {
  const buf = await fs.readFile(wavPath);
  // Find "data" chunk
  let offset = 12;
  let dataOffset = 44;
  let dataSize = buf.length - 44;
  while (offset < buf.length - 8) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "data") {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }
    offset += 8 + size;
  }
  const sampleCount = Math.floor(dataSize / 2);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const s = buf.readInt16LE(dataOffset + i * 2);
    out[i] = s / 32768;
  }
  return out;
}

async function silenceFallbackTranscript(
  wavPath: string,
  duration: number
): Promise<Transcript> {
  const silences = await detectSilences(wavPath);
  const speech: TranscriptSegment[] = [];
  let cursor = 0;
  let i = 0;
  for (const sil of silences) {
    if (sil.start - cursor >= 0.4) {
      speech.push({
        id: `seg_${++i}`,
        start: cursor,
        end: sil.start,
        text: `[speech ${i}]`,
      });
    }
    cursor = sil.end;
  }
  if (duration - cursor >= 0.4) {
    speech.push({
      id: `seg_${++i}`,
      start: cursor,
      end: duration,
      text: `[speech ${i}]`,
    });
  }
  if (speech.length === 0) {
    speech.push({ id: "seg_1", start: 0, end: duration, text: "[speech 1]" });
  }

  return {
    language: "und",
    fullText: speech.map((s) => s.text).join(" "),
    segments: speech,
    duration,
    provider: "silence-fallback",
  };
}
