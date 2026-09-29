"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  EditPlan,
  MediaAsset,
  Project,
  ProjectStatus,
  VideoAnalysis,
  VideoFormat,
  ProcessingStage,
  Clip,
  Caption,
  Zoom,
  TextOverlay,
} from "@/lib/types/edit-plan";

type Selection =
  | { type: "clip"; id: string }
  | { type: "caption"; id: string }
  | { type: "zoom"; id: string }
  | { type: "text"; id: string }
  | { type: "music" }
  | { type: "range"; start: number; end: number }
  | null;

type LeftTab = "media" | "text" | "captions" | "music" | "effects";

type HistorySnap = {
  editPlan: EditPlan;
};

type AuthState = {
  signedIn: boolean;
  email?: string;
};

type ProjectStore = {
  project: Project | null;
  auth: AuthState;
  selection: Selection;
  leftTab: LeftTab;
  playhead: number;
  isPlaying: boolean;
  processingStage: ProcessingStage | null;
  processingDone: ProcessingStage[];
  history: HistorySnap[];
  future: HistorySnap[];
  showAuthModal: boolean;
  authIntent: "save" | "export" | null;

  setAuth: (auth: AuthState) => void;
  setShowAuthModal: (show: boolean, intent?: "save" | "export" | null) => void;
  setLeftTab: (tab: LeftTab) => void;
  setSelection: (sel: Selection) => void;
  setPlayhead: (t: number) => void;
  setIsPlaying: (p: boolean) => void;
  setProcessing: (stage: ProcessingStage | null, done?: ProcessingStage[]) => void;

  createDraft: (partial?: Partial<Project>) => string;
  setProject: (project: Project) => void;
  updateProject: (partial: Partial<Project>) => void;
  setAssets: (assets: MediaAsset[]) => void;
  setFormat: (format: VideoFormat) => void;
  setPrompt: (prompt: string) => void;
  setStatus: (status: ProjectStatus) => void;
  setAnalysis: (analysis: VideoAnalysis) => void;
  setEditPlan: (plan: EditPlan, pushHistory?: boolean) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  updateCaption: (id: string, patch: Partial<Caption>) => void;
  updateZoom: (id: string, patch: Partial<Zoom>) => void;
  updateText: (id: string, patch: Partial<TextOverlay>) => void;
  addText: (text: TextOverlay) => void;
  removeSelected: () => void;
  undo: () => void;
  redo: () => void;
};

function newId() {
  return `proj_${Math.random().toString(36).slice(2, 10)}`;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      project: null,
      auth: { signedIn: false },
      selection: null,
      leftTab: "media",
      playhead: 0,
      isPlaying: false,
      processingStage: null,
      processingDone: [],
      history: [],
      future: [],
      showAuthModal: false,
      authIntent: null,

      setAuth: (auth) => set({ auth }),
      setShowAuthModal: (show, intent = null) =>
        set({ showAuthModal: show, authIntent: intent }),
      setLeftTab: (tab) => set({ leftTab: tab }),
      setSelection: (sel) => set({ selection: sel }),
      setPlayhead: (t) => set({ playhead: t }),
      setIsPlaying: (p) => set({ isPlaying: p }),
      setProcessing: (stage, done) =>
        set({
          processingStage: stage,
          ...(done ? { processingDone: done } : {}),
        }),

      createDraft: (partial) => {
        const id = partial?.id ?? newId();
        const now = new Date().toISOString();
        const project: Project = {
          id,
          name: partial?.name ?? "Untitled project",
          format: partial?.format ?? "instagram_reel",
          prompt: partial?.prompt ?? "",
          assets: partial?.assets ?? [],
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        set({
          project,
          selection: null,
          playhead: 0,
          history: [],
          future: [],
          processingDone: [],
          processingStage: null,
        });
        return id;
      },

      setProject: (project) => set({ project }),
      updateProject: (partial) => {
        const project = get().project;
        if (!project) return;
        set({
          project: {
            ...project,
            ...partial,
            updatedAt: new Date().toISOString(),
          },
        });
      },
      setAssets: (assets) => get().updateProject({ assets }),
      setFormat: (format) => get().updateProject({ format }),
      setPrompt: (prompt) => get().updateProject({ prompt }),
      setStatus: (status) => get().updateProject({ status }),
      setAnalysis: (analysis) => get().updateProject({ analysis }),

      setEditPlan: (plan, pushHistory = true) => {
        const project = get().project;
        if (!project) return;
        if (pushHistory && project.editPlan) {
          set({
            history: [...get().history, { editPlan: project.editPlan }].slice(-40),
            future: [],
          });
        }
        get().updateProject({ editPlan: plan, status: "ready" });
      },

      updateClip: (id, patch) => {
        const plan = get().project?.editPlan;
        if (!plan) return;
        get().setEditPlan({
          ...plan,
          clips: plan.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        });
      },
      updateCaption: (id, patch) => {
        const plan = get().project?.editPlan;
        if (!plan) return;
        get().setEditPlan({
          ...plan,
          captions: plan.captions.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        });
      },
      updateZoom: (id, patch) => {
        const plan = get().project?.editPlan;
        if (!plan) return;
        get().setEditPlan({
          ...plan,
          zooms: plan.zooms.map((z) => (z.id === id ? { ...z, ...patch } : z)),
        });
      },
      updateText: (id, patch) => {
        const plan = get().project?.editPlan;
        if (!plan) return;
        get().setEditPlan({
          ...plan,
          texts: plan.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        });
      },
      addText: (text) => {
        const plan = get().project?.editPlan;
        if (!plan) return;
        get().setEditPlan({ ...plan, texts: [...plan.texts, text] });
      },
      removeSelected: () => {
        const { selection, project } = get();
        const plan = project?.editPlan;
        if (!selection || !plan) return;
        if (selection.type === "clip") {
          const clips = plan.clips.filter((c) => c.id !== selection.id);
          if (clips.length === 0) return;
          get().setEditPlan({ ...plan, clips });
        } else if (selection.type === "caption") {
          get().setEditPlan({
            ...plan,
            captions: plan.captions.filter((c) => c.id !== selection.id),
          });
        } else if (selection.type === "zoom") {
          get().setEditPlan({
            ...plan,
            zooms: plan.zooms.filter((z) => z.id !== selection.id),
          });
        } else if (selection.type === "text") {
          get().setEditPlan({
            ...plan,
            texts: plan.texts.filter((t) => t.id !== selection.id),
          });
        }
        set({ selection: null });
      },
      undo: () => {
        const { history, project, future } = get();
        if (!project?.editPlan || history.length === 0) return;
        const prev = history[history.length - 1];
        set({
          history: history.slice(0, -1),
          future: [{ editPlan: project.editPlan }, ...future].slice(0, 40),
        });
        get().updateProject({ editPlan: prev.editPlan });
      },
      redo: () => {
        const { future, project, history } = get();
        if (!project?.editPlan || future.length === 0) return;
        const next = future[0];
        set({
          future: future.slice(1),
          history: [...history, { editPlan: project.editPlan }].slice(-40),
        });
        get().updateProject({ editPlan: next.editPlan });
      },
    }),
    {
      name: "cutline-store",
      partialize: (s) => ({
        project: s.project,
        auth: s.auth,
      }),
    }
  )
);
