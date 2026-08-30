"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function AuthScreen({ showError = false }: { showError?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState<"linkedin" | "email" | null>(null);

  async function continueWithLinkedIn() {
    setIsLoading("linkedin");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/hub` },
    });
    if (error) setIsLoading(null);
    // On success, Supabase redirects away — no further action needed here.
  }

  async function continueWithEmail() {
    setIsLoading("email");
    router.push("/auth/email");
  }

  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 py-10">
      {/* Top: logo */}
      <div className="pt-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-wide text-bp-gold">
          BIZ PULSE
        </h1>
      </div>

      {/* Middle: welcome text */}
      <div className="text-center">
        <p className="font-display text-2xl font-semibold leading-snug text-bp-text">
          Take control
          <br />
          of the market.
        </p>
        {showError && (
          <p className="mt-6 rounded-xl bg-bp-surface border border-red-400/40 px-4 py-3 text-sm text-red-400">
            That sign-in link didn't work — it may have expired. Try again.
          </p>
        )}
      </div>

      {/* Bottom: thumb-zone actions */}
      <div className="space-y-3 pb-4">
        <Button
          variant="primary"
          fullWidth
          onClick={continueWithLinkedIn}
          disabled={isLoading !== null}
          className="flex items-center justify-center gap-2 !bg-[#0A66C2] !text-white disabled:!bg-bp-gold-dim"
        >
          <LinkedInIcon />
          {isLoading === "linkedin" ? "Connecting…" : "Continue with LinkedIn"}
        </Button>

        <Button
          variant="outline"
          fullWidth
          onClick={continueWithEmail}
          disabled={isLoading !== null}
        >
          Continue with Email
        </Button>
      </div>
    </main>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}
