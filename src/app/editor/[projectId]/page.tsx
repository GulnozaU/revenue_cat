"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/store/project-store";
import { EditorTopBar } from "@/components/editor/top-bar";
import { LeftSidebar } from "@/components/editor/left-sidebar";
import { PreviewCanvas } from "@/components/editor/preview-canvas";
import { RightSidebar } from "@/components/editor/right-sidebar";
import { Timeline } from "@/components/editor/timeline";
import { AuthModal } from "@/components/auth/auth-modal";

export default function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useProjectStore((s) => s.project);

  useEffect(() => {
    if (!project || project.id !== params.projectId || !project.editPlan) {
      router.replace("/upload");
    }
  }, [project, params.projectId, router]);

  if (!project?.editPlan) {
    return (
      <div className="flex min-h-screen items-center justify-center editor-shell">
        <p className="text-[var(--editor-muted)]">Loading editor…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden editor-shell">
      <EditorTopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PreviewCanvas />
          <Timeline />
        </div>
        <RightSidebar />
      </div>
      <AuthModal />
    </div>
  );
}
