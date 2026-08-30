"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { submitPurchaseOrder } from "./actions";

export function PurchaseForm({
  companyId,
  moq,
  unitPrice,
  capital,
}: {
  companyId: string;
  moq: number;
  unitPrice: number;
  capital: number;
}) {
  const [quantity, setQuantity] = useState(moq);
  const total = quantity * unitPrice;
  const canAfford = total <= capital;
  const meetsMoq = quantity >= moq;

  return (
    <form action={submitPurchaseOrder} className="flex flex-col">
      <input type="hidden" name="company_id" value={companyId} />

      <label className="text-sm text-bp-text-muted mb-2" htmlFor="quantity">
        Quantity (minimum order: {moq} units)
      </label>
      <input
        id="quantity"
        name="quantity"
        type="number"
        min={moq}
        step={1}
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
        className="w-full rounded-xl bg-bp-surface border border-bp-border px-4 py-4 text-bp-text focus:outline-none focus:border-bp-gold mb-4"
      />

      <div className="rounded-xl bg-bp-surface border border-bp-border p-4 mb-4">
        <div className="flex justify-between text-sm text-bp-text-muted mb-1">
          <span>Unit price</span>
          <span>${unitPrice.toLocaleString("en-US")}</span>
        </div>
        <div className="flex justify-between text-bp-gold font-semibold">
          <span>Total (cash)</span>
          <span>${total.toLocaleString("en-US")}</span>
        </div>
      </div>

      {!meetsMoq && (
        <p className="text-sm text-red-400 mb-4">
          Quantity must be at least {moq} units.
        </p>
      )}
      {meetsMoq && !canAfford && (
        <p className="text-sm text-red-400 mb-4">
          You don't have enough capital for this order.
        </p>
      )}

      <SubmitButton>Place order</SubmitButton>
    </form>
  );
}
