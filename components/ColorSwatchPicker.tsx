"use client";

import { useState } from "react";
import { COMPANY_COLORS, DEFAULT_COMPANY_COLOR } from "@/lib/game/companyColors";

export function ColorSwatchPicker({ name = "color" }: { name?: string }) {
  const [selected, setSelected] = useState<string>(DEFAULT_COMPANY_COLOR);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="flex flex-wrap gap-3">
        {COMPANY_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => setSelected(c.hex)}
            aria-label={c.label}
            className={`h-10 w-10 rounded-full transition-all ${
              selected === c.hex
                ? "ring-2 ring-offset-2 ring-offset-bp-bg ring-bp-text scale-110"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}
