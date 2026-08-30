"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { selectDepot } from "./actions";

interface DepotOption {
  id: string;
  size_sqm: number;
  rent_per_turn: number;
  security_deposit_turns: number;
  charges_per_turn: number;
}

export function DepotSelector({
  companyId,
  options,
  capital,
}: {
  companyId: string;
  options: DepotOption[];
  capital: number;
}) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");
  const selected = options.find((o) => o.id === selectedId);
  const deposit = selected
    ? selected.rent_per_turn * selected.security_deposit_turns
    : 0;
  const canAfford = deposit <= capital;

  return (
    <form action={selectDepot} className="flex flex-col">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="premises_option_id" value={selectedId} />

      <div className="flex flex-col gap-4 pb-28">
        {options.map((option) => {
          const optionDeposit = option.rent_per_turn * option.security_deposit_turns;
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
                    {option.size_sqm} m²
                  </p>
                  <p className="text-bp-gold font-semibold">
                    ${option.rent_per_turn.toLocaleString("en-US")}/turn
                  </p>
                </div>
                <p className="text-sm text-bp-text-muted mt-1">
                  Deposit: ${optionDeposit.toLocaleString("en-US")} ·
                  Charges: ${option.charges_per_turn.toLocaleString("en-US")}/turn
                </p>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-bp-bg via-bp-bg to-transparent space-y-2">
        {!canAfford && (
          <p className="text-sm text-red-400 text-center">
            Not enough capital for this deposit.
          </p>
        )}
        <SubmitButton>
          Rent this depot — ${deposit.toLocaleString("en-US")} deposit
        </SubmitButton>
      </div>
    </form>
  );
}
