"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useProjectStore } from "@/store/project-store";

export function AuthModal() {
  const open = useProjectStore((s) => s.showAuthModal);
  const intent = useProjectStore((s) => s.authIntent);
  const setShowAuthModal = useProjectStore((s) => s.setShowAuthModal);
  const setAuth = useProjectStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const title =
    intent === "export" ? "Sign in to export" : "Sign in to save";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Auth failed");
      setAuth({ signedIn: true, email });
      setShowAuthModal(false);
      toast.success(
        intent === "export"
          ? "Signed in — click Export again"
          : "Signed in — your project can be saved"
      );
    } catch {
      // Demo auth always works client-side
      setAuth({ signedIn: true, email });
      setShowAuthModal(false);
      toast.success("Signed in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => setShowAuthModal(v)}
      title={title}
      description="Editing is free. An account is only needed to save or export."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="mt-1.5"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Continue"}
        </Button>
        <p className="text-center text-xs text-[var(--fg-subtle)]">
          Demo auth — no password required for Shipaton.
        </p>
      </form>
    </Modal>
  );
}
