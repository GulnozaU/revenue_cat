export type MusicTrack = {
  id: string;
  name: string;
  mood: string;
  bpm: number;
  duration: number;
  /** Built-in demo tone; real apps would point at audio files */
  demo: true;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: "upbeat_01",
    name: "Pulse Drive",
    mood: "Energetic",
    bpm: 118,
    duration: 90,
    demo: true,
  },
  {
    id: "chill_01",
    name: "Soft Focus",
    mood: "Calm",
    bpm: 92,
    duration: 90,
    demo: true,
  },
  {
    id: "cinematic_01",
    name: "Wide Frame",
    mood: "Cinematic",
    bpm: 100,
    duration: 120,
    demo: true,
  },
];

export function getTrack(id: string) {
  return MUSIC_LIBRARY.find((t) => t.id === id) ?? MUSIC_LIBRARY[0];
}
