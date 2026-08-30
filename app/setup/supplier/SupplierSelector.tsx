"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { selectSupplier } from "./actions";

interface SupplierOption {
  id: string;
  code: string;
  profile_label: string | null;
  moq: number | null;
  lead_time_turns_min: number | null;
  lead_time_turns_max: number | null;
  non_conformity_rate: number | null;
  on_time_delivery_rate: number | null;
  prices: { range_code: string; unit_price: number }[];
}

export function SupplierSelector({
  companyId,
  options,
}: {
  companyId: string;
  options: SupplierOption[];
}) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");

  return (
    <form action={selectSupplier} className="flex flex-col">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="supplier_id" value={selectedId} />

      <div className="flex flex-col gap-4 pb-28">
        {options.map((option) => {
          const refPrice = option.prices.find((p) => p.range_code === "reference")?.unit_price;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              className="text-left"
            >
              <Card highlighted={selectedId === option.id}>
                <div className="flex items-baseline justify-between">
                  <p className="font-display font-semibold text-bp-text">
                    {option.code}
                  </p>
                  {refPrice !== undefined && (
                    <p className="text-bp-gold font-semibold">
                      ${refPrice.toLocaleString("en-US")} / unit
                    </p>
                  )}
                </div>
                <p className="text-sm text-bp-text-muted mt-1">{option.profile_label}</p>
                <div className="flex gap-4 mt-3 text-xs text-bp-text-muted">
                  <span>MOQ: {option.moq}</span>
                  <span>
                    Lead time: {option.lead_time_turns_min}–{option.lead_time_turns_max} turns
                  </span>
                  <span>On-time: {option.on_time_delivery_rate}%</span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-bp-bg via-bp-bg to-transparent">
        <SubmitButton>Confirm this supplier</SubmitButton>
      </div>
    </form>
  );
}
