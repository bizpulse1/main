"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCurrentTurn } from "@/lib/game/turns";

type RawItemType = "raw_material_c1" | "raw_material_c2" | "packaging";

function toItemType(componentCode: string): RawItemType | null {
  if (componentCode === "C1") return "raw_material_c1";
  if (componentCode === "C2") return "raw_material_c2";
  if (componentCode === "packaging") return "packaging";
  return null; // 'other' or unrecognized components aren't purchasable yet
}

export async function purchaseRawMaterials(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const companyId = formData.get("company_id") as string | null;
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
    .eq("supplier_kind", "raw_material")
    .maybeSingle();
  if (!relationship || !relationship.raw_material_supplier_id) {
    redirect(`/raw-supplier?company=${companyId}`);
  }

  const { data: supplier } = await supabase
    .from("raw_material_suppliers")
    .select("price_coefficient")
    .eq("id", relationship!.raw_material_supplier_id!)
    .single();
  if (!supplier) throw new Error("Supplier data missing");

  const { data: bom } = await supabase
    .from("bill_of_materials")
    .select("component_code, target_cost")
    .eq("range_code", "reference");
  if (!bom || bom.length === 0) throw new Error("No BOM configured — check seed data");

  const turn = await getOrCreateCurrentTurn(supabase, company.session_id);

  let totalCost = 0;
  const purchases: { itemType: RawItemType; quantity: number; unitCost: number }[] = [];
  for (const line of bom) {
    const itemType = toItemType(line.component_code);
    if (!itemType) continue;
    const raw = formData.get(`qty_${line.component_code}`) as string | null;
    const quantity = raw ? parseFloat(raw) : 0;
    if (quantity <= 0) continue;
    const unitCost = (line.target_cost ?? 0) * supplier.price_coefficient;
    totalCost += quantity * unitCost;
    purchases.push({ itemType, quantity, unitCost });
  }

  if (purchases.length === 0) {
    redirect(`/raw-purchase?company=${companyId}&error=nothing_selected`);
  }
  if (totalCost > company.capital) {
    redirect(`/raw-purchase?company=${companyId}&error=insufficient_funds`);
  }

  for (const p of purchases) {
    const { data: existingInventory } = await supabase
      .from("inventory_lots")
      .select("*")
      .eq("company_id", companyId)
      .eq("item_type", p.itemType)
      .maybeSingle();

    if (existingInventory) {
      const newQuantity = existingInventory.quantity_on_hand + p.quantity;
      const newUnitCost =
        (existingInventory.quantity_on_hand * existingInventory.unit_cost + p.quantity * p.unitCost) /
        newQuantity;
      const { error } = await supabase
        .from("inventory_lots")
        .update({ turn_id: turn.id, quantity_on_hand: newQuantity, unit_cost: newUnitCost })
        .eq("id", existingInventory.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("inventory_lots").insert({
        company_id: companyId,
        turn_id: turn.id,
        item_type: p.itemType,
        range_code: null,
        quantity_on_hand: p.quantity,
        unit_cost: p.unitCost,
      });
      if (error) throw new Error(error.message);
    }
  }

  const { error: ledgerError } = await supabase.from("treasury_ledger").insert({
    company_id: companyId,
    turn_id: turn.id,
    movement_type: "raw_material_purchase",
    direction: "out",
    amount: totalCost,
    reference_table: "inventory_lots",
  });
  if (ledgerError) throw new Error(ledgerError.message);

  const { error: capitalError } = await supabase
    .from("companies")
    .update({ capital: company.capital - totalCost })
    .eq("id", companyId);
  if (capitalError) throw new Error(capitalError.message);

  redirect(`/production?company=${companyId}`);
}
