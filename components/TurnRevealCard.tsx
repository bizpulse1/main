"use client";

import { useEffect, useState } from "react";
import { CountUp } from "./CountUp";

export function TurnRevealCard({
  headline,
  revenue,
  costs,
  netCashChange,
  capitalAfter,
}: {
  headline: string;
  revenue: number;
  costs: number;
  netCashChange: number;
  capitalAfter: number;
}) {
  // A short staged sequence, not a single instant render — headline
  // first, then revenue, then costs, then the net result as the
  // punchline. Each stage's own CountUp starts only once its stage
  // becomes visible (via startDelay), so the count-up animation and
  // the fade-in happen together rather than the number finishing
  // before its container is even visible.
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 150), // headline
      setTimeout(() => setStage(2), 650), // revenue
      setTimeout(() => setStage(3), 1150), // costs
      setTimeout(() => setStage(4), 1700), // net result punchline
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const isPositive = netCashChange >= 0;

  return (
    <div className="mb-4">
      <div
        className={`transition-all duration-500 ease-out ${
          stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <p className="font-display text-lg font-semibold text-bp-text mb-4">{headline}</p>
      </div>

      <div className="rounded-xl bg-bp-surface border border-bp-border p-4 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`transition-all duration-500 ease-out ${
              stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-bp-text-muted text-xs mb-1">Revenue</p>
            <p className="text-bp-text font-display font-semibold text-lg">
              {stage >= 2 && <CountUp value={revenue} prefix="$" duration={700} />}
            </p>
          </div>
          <div
            className={`transition-all duration-500 ease-out ${
              stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <p className="text-bp-text-muted text-xs mb-1">Costs</p>
            <p className="text-bp-text font-display font-semibold text-lg">
              {stage >= 3 && <CountUp value={costs} prefix="$" duration={700} />}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border p-4 transition-all duration-700 ease-out ${
          isPositive ? "border-bp-gold/50 bg-bp-gold/5" : "border-red-400/50 bg-red-400/5"
        } ${stage >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        <div className="flex items-baseline justify-between">
          <p className="text-bp-text-muted text-sm">Net cash this turn</p>
          <p
            className={`font-display text-3xl font-bold ${
              isPositive ? "text-bp-gold" : "text-red-400"
            }`}
          >
            {stage >= 4 && (
              <>
                {isPositive ? "+" : ""}
                <CountUp value={netCashChange} prefix="$" duration={900} />
              </>
            )}
          </p>
        </div>
        <p className="text-bp-text-muted text-sm mt-1">
          Capital now:{" "}
          {stage >= 4 && <CountUp value={capitalAfter} prefix="$" duration={900} />}
        </p>
      </div>
    </div>
  );
}
