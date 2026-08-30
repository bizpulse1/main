"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const MODES = [
  {
    id: "solo",
    label: "SOLO vs IA",
    description: "Build your strategy against BIZ Pulse's simulated market.",
  },
  {
    id: "private",
    label: "PRIVATE MULTIPLAYER",
    description: "Invite friends into a shared market, same rules for everyone.",
  },
  {
    id: "public",
    label: "PUBLIC LEAGUE",
    description: "Compete against the wider BIZ Pulse community.",
  },
] as const;

type ModeId = (typeof MODES)[number]["id"];

export function HubModeSelector() {
  const router = useRouter();
  const [selected, setSelected] = useState<ModeId>("solo");

  function defineStrategy() {
    if (selected === "private") {
      router.push("/match");
    } else if (selected === "public") {
      router.push("/league");
    } else {
      router.push(`/setup?mode=${selected}`);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 overflow-y-auto pb-28">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setSelected(mode.id)}
            className="text-left"
          >
            <Card highlighted={selected === mode.id}>
              <p className="font-display font-semibold text-bp-text tracking-wide">
                {mode.label}
              </p>
              <p className="text-sm text-bp-text-muted mt-1">
                {mode.description}
              </p>
            </Card>
          </button>
        ))}
      </div>

      {/* Fixed bottom CTA (thumb zone) */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-bp-bg via-bp-bg to-transparent">
        <Button fullWidth onClick={defineStrategy}>
          DEFINE STRATEGY ➔
        </Button>
      </div>
    </div>
  );
}
