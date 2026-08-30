"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function EmailAuthScreen() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/hub` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-bp-text mb-2">
        Continue with email
      </h1>
      <p className="text-bp-text-muted mb-8">
        We'll send you a one-time link to sign in — no password needed.
      </p>

      {status === "sent" ? (
        <p className="rounded-xl bg-bp-surface p-4 text-bp-text">
          Check <span className="text-bp-gold">{email}</span> for your sign-in link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text placeholder:text-bp-text-muted focus:outline-none focus:border-bp-gold"
          />
          <Button type="submit" fullWidth disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </Button>
          {status === "error" && (
            <p className="text-sm text-red-400">
              Something went wrong sending that link. Try again.
            </p>
          )}
        </form>
      )}
    </main>
  );
}
