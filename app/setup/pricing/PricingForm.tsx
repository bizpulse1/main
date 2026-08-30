"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { submitPricing } from "./actions";

export function PricingForm({
  companyId,
  unitCost,
  marketReference,
  stockOnHand,
}: {
  companyId: string;
  unitCost: number;
  marketReference: number;
  stockOnHand: number;
}) {
  const [salePrice, setSalePrice] = useState(marketReference);
  const [salesTarget, setSalesTarget] = useState(stockOnHand);

  const margin = salePrice - unitCost;
  const marginPct = unitCost > 0 ? (margin / unitCost) * 100 : 0;
  const projectedRevenue = salePrice * salesTarget;

  return (
    <form action={submitPricing} className="flex flex-col">
      <input type="hidden" name="company_id" value={companyId} />

      <label className="text-sm text-bp-text-muted mb-2" htmlFor="sale_price">
        Sale price per unit
      </label>
      <input
        id="sale_price"
        name="sale_price"
        type="number"
        min={0.01}
        step={0.01}
        value={salePrice}
        onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
        className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-1"
      />
      <p className="text-xs text-bp-text-muted mb-4">
        Your cost: ${unitCost.toLocaleString("en-US")} · Market reference:{" "}
        ${marketReference.toLocaleString("en-US")}
      </p>

      <label className="text-sm text-bp-text-muted mb-2" htmlFor="sales_target">
        Sales target this turn
      </label>
      <input
        id="sales_target"
        name="sales_target"
        type="number"
        min={0}
        step={1}
        value={salesTarget}
        onChange={(e) => setSalesTarget(parseInt(e.target.value, 10) || 0)}
        className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-1"
      />
      <p className="text-xs text-bp-text-muted mb-4">
        You have {stockOnHand.toLocaleString("en-US")} units in stock — actual
        sales will be capped by stock and real market demand, whichever is
        lower.
      </p>

      <div className="rounded-xl bg-bp-surface border border-bp-border p-4 mb-6 space-y-1">
        <div className="flex justify-between text-sm text-bp-text-muted">
          <span>Margin per unit</span>
          <span className={margin < 0 ? "text-red-400" : ""}>
            ${margin.toLocaleString("en-US")} ({marginPct.toFixed(0)}%)
          </span>
        </div>
        <div className="flex justify-between text-bp-gold font-semibold">
          <span>Projected revenue if fully sold</span>
          <span>${projectedRevenue.toLocaleString("en-US")}</span>
        </div>
      </div>

      {margin < 0 && (
        <p className="text-sm text-red-400 mb-4">
          Selling below cost — you'll lose money on every unit at this price.
        </p>
      )}

      <SubmitButton>Confirm pricing</SubmitButton>
    </form>
  );
}
