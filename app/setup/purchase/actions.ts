"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

export async function submitPurchaseOrder(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
  const quantityRaw = formData.get("quantity") as string | null;
  const quantity = quantityRaw ? parseInt(quantityRaw, 10) : NaN;

  if (!companyId) redirect("/hub");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .eq("owner_user_id", user.id)
    .single();
  if (!company) redirect("/hub");

  const { data: relationship } = await supabase
    .from("company_supplier_relationships")
    .select("*")
    .eq("company_id", companyId)
    .eq("supplier_kind", "finished_goods")
    .maybeSingle();
  if (!relationship || !relationship.finished_goods_supplier_id) {
    redirect(`/setup/supplier?company=${companyId}`);
  }

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  // Already ordered THIS turn — don't let a resubmit double-purchase.
  // Ordering again in a later turn is normal and allowed.
  const { data: existingOrderThisTurn } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("company_id", companyId)
    .eq("turn_id", turn.id)
    .maybeSingle();
  if (existingOrderThisTurn) {
    redirect(`/setup/pricing?company=${companyId}`);
  }

  const [{ data: supplier }, { data: priceRow }] = await Promise.all([
    supabase
      .from("finished_goods_suppliers")
      .select("moq")
      .eq("id", relationship!.finished_goods_supplier_id!)
      .single(),
    supabase
      .from("finished_goods_prices")
      .select("unit_price")
      .eq("supplier_id", relationship!.finished_goods_supplier_id!)
      .eq("range_code", "reference")
      .single(),
  ]);

  if (!supplier || !priceRow) {
    throw new Error("Supplier or price data missing — check seed data");
  }

  const moq = supplier.moq ?? 1;
  if (!Number.isFinite(quantity) || quantity < moq) {
    redirect(
      `/setup/purchase?company=${companyId}&error=below_moq&moq=${moq}`
    );
  }

  const unitPrice = priceRow.unit_price;
  const totalCost = quantity * unitPrice;

  if (totalCost > company.capital) {
    redirect(`/setup/purchase?company=${companyId}&error=insufficient_funds`);
  }

  // First order is always cash — payment_term_unlocked starts at 'cash'
  // and only opens up to deferred terms after a track record with the
  // supplier (reliable_orders_count), which doesn't exist yet.
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .insert({
      company_id: companyId,
      turn_id: turn.id,
      supplier_relationship_id: relationship!.id,
      item_type: "finished_good",
      range_code: "reference",
      quantity,
      unit_price: unitPrice,
      transport_cost: 0,
      payment_term: "cash",
      immediate_payment_amount: totalCost,
      deferred_payment_amount: 0,
    })
    .select()
    .single();
  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Failed to create purchase order");
  }

  // Inventory is a running balance, not a per-purchase snapshot — a
  // second purchase in a later turn adds to existing stock (with a
  // weighted-average cost) rather than creating a second, disconnected
  // row that the sales engine would have to reconcile across.
  const { data: existingInventory } = await supabase
    .from("inventory_lots")
    .select("*")
    .eq("company_id", companyId)
    .eq("item_type", "finished_good")
    .eq("range_code", "reference")
    .maybeSingle();

  if (existingInventory) {
    const newQuantity = existingInventory.quantity_on_hand + quantity;
    const newUnitCost =
      (existingInventory.quantity_on_hand * existingInventory.unit_cost +
        quantity * unitPrice) /
      newQuantity;
    const { error: inventoryError } = await supabase
      .from("inventory_lots")
      .update({
        turn_id: turn.id,
        quantity_on_hand: newQuantity,
        unit_cost: newUnitCost,
      })
      .eq("id", existingInventory.id);
    if (inventoryError) throw new Error(inventoryError.message);
  } else {
    const { error: inventoryError } = await supabase.from("inventory_lots").insert({
      company_id: companyId,
      turn_id: turn.id,
      item_type: "finished_good",
      range_code: "reference",
      quantity_on_hand: quantity,
      unit_cost: unitPrice,
    });
    if (inventoryError) throw new Error(inventoryError.message);
  }

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "purchase",
    direction: "out",
    amount: totalCost,
    reference_table: "purchase_orders",
    reference_id: order.id,
  });
  if (ledgerError) {
    throw new Error(ledgerError.message);
  }

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - totalCost })
    .eq("id", companyId);
  if (capitalError) {
    throw new Error(capitalError.message);
  }

  redirect(`/setup/pricing?company=${companyId}`);
}
