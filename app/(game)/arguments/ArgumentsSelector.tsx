"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { selectArguments } from "./actions";

interface ArgumentOption {
  id: string;
  label: string;
}

export function ArgumentsSelector({
  companyId,
  options,
  initialSelected,
}: {
  companyId: string;
  options: ArgumentOption[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // max 2, silently ignore further clicks
      return [...prev, id];
    });
  }

  return (
    <form action={selectArguments}>
      <input type="hidden" name="company_id" value={companyId} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="argument_id" value={id} />
      ))}

      <div className="space-y-3 mb-6">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const disabled = !isSelected && selected.length >= 2;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.id)}
              className={`w-full text-left ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <Card highlighted={isSelected}>
                <p className="text-bp-text">{opt.label}</p>
              </Card>
            </button>
          );
        })}
      </div>

      <p className="text-bp-text-muted text-sm mb-4">{selected.length}/2 selected</p>
      <SubmitButton>Confirm arguments</SubmitButton>
    </form>
  );
}
