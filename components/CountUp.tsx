"use client";

import { useEffect, useState } from "react";

// Counts from 0 to `value` over `duration` ms using requestAnimationFrame,
// eased out (fast start, slow settle) so it reads as a reveal rather
// than a mechanical tick. Re-runs whenever `value` changes (e.g. a new
// turn's numbers) or `startDelay` passes.
export function CountUp({
  value,
  prefix = "",
  duration = 900,
  startDelay = 0,
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  duration?: number;
  startDelay?: number;
  decimals?: number;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let frame: number;
    let startTime: number | null = null;
    const timeoutId = setTimeout(() => {
      function tick(now: number) {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic: fast start, gentle settle at the target.
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(value * eased);
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          setDisplayed(value);
        }
      }
      frame = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(timeoutId);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, duration, startDelay]);

  const formatted = displayed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span>
      {prefix}
      {formatted}
    </span>
  );
}
