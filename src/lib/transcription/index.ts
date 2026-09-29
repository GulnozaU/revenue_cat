import type { Transcript, VideoMetadata } from "@/lib/types/edit-plan";

export interface TranscriptionProvider {
  name: "mock" | "openai" | "deepgram";
  transcribe(input: {
    filePathOrUrl: string;
    duration: number;
    mimeType?: string;
  }): Promise<Transcript>;
}

const MOCK_SCRIPT = [
  { text: "Okay so here's the thing nobody talks about", start: 0.4, end: 3.2 },
  { text: "when you're building something people actually want", start: 3.4, end: 6.1 },
  { text: "You don't need perfect footage", start: 6.8, end: 8.6 },
  { text: "You need a clear story and good pacing", start: 8.8, end: 11.4 },
  { text: "Cut the awkward pauses", start: 12.2, end: 13.8 },
  { text: "Keep the moments that feel real", start: 14.0, end: 16.2 },
  { text: "And suddenly it looks like a pro edit", start: 16.5, end: 19.0 },
  { text: "That's the whole idea behind Cutline", start: 19.8, end: 22.4 },
  { text: "Describe the vibe", start: 23.0, end: 24.2 },
  { text: "Refine it visually", start: 24.4, end: 25.8 },
  { text: "Ship something that feels human", start: 26.2, end: 28.6 },
];

function buildMockTranscript(duration: number): Transcript {
  const scale = duration > 0 ? Math.min(1, duration / 30) : 1;
  const segments = MOCK_SCRIPT.map((s, i) => {
    const start = Math.min(duration - 0.2, s.start * scale);
    const end = Math.min(duration, s.end * scale);
    return {
      id: `seg_${i + 1}`,
      text: s.text,
      start,
      end: Math.max(start + 0.3, end),
      words: s.text.split(" ").map((word, wi, arr) => {
        const span = (end - start) / arr.length;
        return {
          word,
          start: start + wi * span,
          end: start + (wi + 1) * span,
        };
      }),
    };
  }).filter((s) => s.start < duration);

  return {
    language: "en",
    fullText: segments.map((s) => s.text).join(". ") + ".",
    segments,
    duration,
    provider: "mock",
  };
}

export class MockTranscriptionProvider implements TranscriptionProvider {
  name = "mock" as const;

  async transcribe(input: {
    filePathOrUrl: string;
    duration: number;
  }): Promise<Transcript> {
    await delay(400);
    return buildMockTranscript(input.duration || 30);
  }
}

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  name = "openai" as const;

  async transcribe(input: {
    filePathOrUrl: string;
    duration: number;
    mimeType?: string;
  }): Promise<Transcript> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new MockTranscriptionProvider().transcribe(input);
    }

    // Whisper-compatible path: if we only have a URL/path without fetchable file,
    // fall back to mock so demos never break.
    try {
      const { promises: fs } = await import("fs");
      const pathMod = await import("path");
      const isLocal = !input.filePathOrUrl.startsWith("http");
      if (!isLocal) {
        return new MockTranscriptionProvider().transcribe(input);
      }

      const abs = pathMod.isAbsolute(input.filePathOrUrl)
        ? input.filePathOrUrl
        : pathMod.join(/* turbopackIgnore: true */ process.cwd(), "storage", input.filePathOrUrl);
      const buf = await fs.readFile(abs);
      const form = new FormData();
      const bytes = new Uint8Array(buf);
      form.append(
        "file",
        new Blob([bytes], { type: input.mimeType ?? "video/mp4" }),
        "audio.mp4"
      );
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "segment");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      if (!res.ok) {
        console.warn("OpenAI transcription failed, using mock", await res.text());
        return new MockTranscriptionProvider().transcribe(input);
      }

      const data = (await res.json()) as {
        text: string;
        language?: string;
        duration?: number;
        segments?: Array<{ id: number; start: number; end: number; text: string }>;
      };

      return {
        language: data.language ?? "en",
        fullText: data.text,
        duration: data.duration ?? input.duration,
        provider: "openai",
        segments: (data.segments ?? []).map((s, i) => ({
          id: `seg_${i + 1}`,
          text: s.text.trim(),
          start: s.start,
          end: s.end,
        })),
      };
    } catch (err) {
      console.warn("Transcription error, using mock", err);
      return new MockTranscriptionProvider().transcribe(input);
    }
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAITranscriptionProvider();
  }
  if (process.env.DEEPGRAM_API_KEY) {
    // Deepgram can be wired later; mock keeps demos working.
    return new MockTranscriptionProvider();
  }
  return new MockTranscriptionProvider();
}

export function estimateMetadata(durationHint?: number): VideoMetadata {
  return {
    duration: durationHint && durationHint > 0 ? durationHint : 30,
    width: 1080,
    height: 1920,
    fps: 30,
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
