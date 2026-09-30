"use client";

import { create } from "zustand";
import type {
  AestheticId,
  EditPlan,
  ProjectRecord,
  VideoFormat,
} from "@/lib/types/edit-plan";

type Selection =
  | { type: "clip"; id: string }
  | { type: "caption"; id: string }
  | { type: "zoom"; id: string }
  | { type: "text"; id: string }
  | { type: "sticker"; id: string }
  | { type: "music" }
  | null;

type LeftTab = "media" | "text" | "captions" | "stickers" | "music" | "effects" | "fonts";

type ProjectStore = {
  project: ProjectRecord | null;
  /** Original uploaded File kept in-memory for ffmpeg.wasm rendering */
  sourceFile: File | null;
  auth: { signedIn: boolean; email?: string };
  selection: Selection;
  leftTab: LeftTab;
  playhead: number;
  isPlaying: boolean;
  showAuthModal: boolean;
  authIntent: "save" | "export" | null;
  history: EditPlan[];
  future: EditPlan[];
  rendering: boolean;
  renderProgress: { ratio: number; message: string } | null;
  /** After Apply preview/Export, show burned MP4; otherwise live source+overlays */
  preferRenderedPreview: boolean;

  setAuth: (auth: { signedIn: boolean; email?: string }) => void;
  setShowAuthModal: (show: boolean, intent?: "save" | "export" | null) => void;
  setLeftTab: (tab: LeftTab) => void;
  setSelection: (sel: Selection) => void;
  setPlayhead: (t: number) => void;
  setIsPlaying: (p: boolean) => void;
  setProject: (project: ProjectRecord | null) => void;
  setSourceFile: (file: File | null) => void;
  setPreviewBlobUrl: (url: string | null) => void;
  setEditPlanLocal: (plan: EditPlan, pushHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  setRendering: (v: boolean) => void;
  setRenderProgress: (p: { ratio: number; message: string } | null) => void;
  setPreferRenderedPreview: (v: boolean) => void;

  draftFormat: VideoFormat;
  draftAesthetic: AestheticId;
  draftPrompt: string;
  setDraftFormat: (f: VideoFormat) => void;
  setDraftAesthetic: (a: AestheticId) => void;
  setDraftPrompt: (p: string) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  sourceFile: null,
  auth: { signedIn: false },
  selection: null,
  leftTab: "media",
  playhead: 0,
  isPlaying: false,
  showAuthModal: false,
  authIntent: null,
  history: [],
  future: [],
  rendering: false,
  renderProgress: null,
  preferRenderedPreview: false,
  draftFormat: "instagram_reel",
  draftAesthetic: "clean_lifestyle",
  draftPrompt: "",

  setAuth: (auth) => set({ auth }),
  setShowAuthModal: (show, intent = null) =>
    set({ showAuthModal: show, authIntent: intent }),
  setLeftTab: (tab) => set({ leftTab: tab }),
  setSelection: (sel) => set({ selection: sel }),
  setPlayhead: (t) => set({ playhead: t }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setProject: (project) =>
    set({ project, playhead: 0, isPlaying: false, preferRenderedPreview: false }),
  setSourceFile: (file) => set({ sourceFile: file }),
  setPreferRenderedPreview: (v) => set({ preferRenderedPreview: v }),
  setPreviewBlobUrl: (url) => {
    const project = get().project;
    if (!project) return;
    const prev = project.previewUrl;
    if (prev?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        /* ignore */
      }
    }
    set({
      preferRenderedPreview: Boolean(url),
      project: {
        ...project,
        previewUrl: url ?? undefined,
        exportUrl:
          url && project.exportUrl?.startsWith("blob:")
            ? url
            : project.exportUrl,
      },
    });
  },
  setRendering: (v) => set({ rendering: v }),
  setRenderProgress: (p) => set({ renderProgress: p }),

  setDraftFormat: (f) => set({ draftFormat: f }),
  setDraftAesthetic: (a) => set({ draftAesthetic: a }),
  setDraftPrompt: (p) => set({ draftPrompt: p }),

  setEditPlanLocal: (plan, pushHistory = true) => {
    const project = get().project;
    if (!project) return;
    if (pushHistory && project.editPlan) {
      set({
        history: [...get().history, project.editPlan].slice(-40),
        future: [],
      });
    }
    // Caption/sticker edits should show live, not the old burned render
    set({
      project: { ...project, editPlan: plan },
      preferRenderedPreview: false,
    });
  },

  undo: () => {
    const { history, project, future } = get();
    if (!project?.editPlan || history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      future: [project.editPlan, ...future].slice(0, 40),
      project: { ...project, editPlan: prev },
    });
  },

  redo: () => {
    const { future, project, history } = get();
    if (!project?.editPlan || future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      history: [...history, project.editPlan].slice(-40),
      project: { ...project, editPlan: next },
    });
  },
}));
