"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useProjectStore } from "@/store/project-store";

export default function SignInPage() {
  const router = useRouter();
  const setAuth = useProjectStore((s) => s.setAuth);
  const [email, setEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
    setAuth({ signedIn: true, email });
    toast.success("Welcome back");
    router.push("/upload");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <header className="mx-auto flex w-full max-w-md items-center px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-display text-[10px] font-bold">
            S
          </span>
          <span className="font-display text-lg font-semibold">stylebox</span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        <h1 className="font-display text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-[var(--fg-muted)]">
          Only required to save or export. You can edit without an account.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Continue
          </Button>
        </form>
        <Link
          href="/upload"
          className="mt-6 text-center text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          Continue without signing in →
        </Link>
      </main>
    </div>
  );
}
