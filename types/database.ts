// Hand-written subset of the schema, covering only what the Auth and Hub
// screens touch. Replace this file once you can run:
//   npx supabase gen types typescript --project-id <your-project-id> > types/database.ts
// against the real Supabase project — that command generates the full,
// exact types for all 60 tables and keeps them in sync with migrations.

export type PlanType = "free" | "paid";
export type SessionMode = "solo" | "training" | "multiplayer" | "assessment";
export type ActivityType = "commercial" | "industrial";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          linkedin_id: string | null;
          role: "player" | "admin_trainer" | "super_admin";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: PlanType;
          zone_limit: number;
          level_cap: number | null;
          started_at: string;
          expires_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          session_id: string;
          owner_user_id: string;
          name: string;
          logo_url: string | null;
          color: string;
          activity_type: ActivityType;
          zone_id: string;
          current_level: number;
          capital: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["companies"]["Row"]>;
        Relationships: [];
      };
      game_sessions: {
        Row: {
          id: string;
          owner_user_id: string;
          mode: SessionMode;
          parameter_version_id: string;
          turn_advance_rule: string;
          turns_per_day_limit: number | null;
          starting_level: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["game_sessions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["game_sessions"]["Row"]>;
        Relationships: [];
      };
      zones: {
        Row: {
          id: string;
          name: string;
          income_profile: string;
          population_size: number | null;
          description: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["zones"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["zones"]["Row"]>;
        Relationships: [];
      };
      parameter_versions: {
        Row: {
          id: string;
          version_label: string;
          published_by: string | null;
          published_at: string;
          parameters: Record<string, unknown>;
          is_active: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["parameter_versions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["parameter_versions"]["Row"]>;
        Relationships: [];
      };
      premises_options: {
        Row: {
          id: string;
          category: string;
          size_sqm: number;
          rent_per_turn: number;
          security_deposit_turns: number;
          charges_per_turn: number;
          fit_out_cost_per_sqm: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["premises_options"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["premises_options"]["Row"]>;
        Relationships: [];
      };
      company_premises: {
        Row: {
          id: string;
          company_id: string;
          premises_option_id: string;
          rented_turn_id: string;
          released_turn_id: string | null;
          security_deposit_paid: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_premises"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_premises"]["Row"]>;
        Relationships: [];
      };
      session_turns: {
        Row: {
          id: string;
          session_id: string;
          turn_number: number;
          status: "open" | "submitted" | "locked" | "computed";
          opened_at: string;
          submitted_at: string | null;
          locked_at: string | null;
          computed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["session_turns"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["session_turns"]["Row"]>;
        Relationships: [];
      };
      treasury_ledger: {
        Row: {
          id: string;
          company_id: string;
          turn_id: string;
          movement_type: string;
          direction: "in" | "out";
          amount: number;
          reference_table: string | null;
          reference_id: string | null;
          due_turn_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["treasury_ledger"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["treasury_ledger"]["Row"]>;
        Relationships: [];
      };
      finished_goods_suppliers: {
        Row: {
          id: string;
          code: string;
          profile_label: string | null;
          moq: number | null;
          lead_time_turns_min: number | null;
          lead_time_turns_max: number | null;
          default_payment_term: "cash" | "t_plus_1" | "t_plus_2" | "t_plus_3";
          non_conformity_rate: number | null;
          on_time_delivery_rate: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["finished_goods_suppliers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["finished_goods_suppliers"]["Row"]>;
        Relationships: [];
      };
      finished_goods_prices: {
        Row: {
          supplier_id: string;
          range_code: "reference" | "qualite" | "prestige_tech";
          unit_price: number;
        };
        Insert: Partial<Database["public"]["Tables"]["finished_goods_prices"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["finished_goods_prices"]["Row"]>;
        Relationships: [];
      };
      company_supplier_relationships: {
        Row: {
          id: string;
          company_id: string;
          supplier_kind: "finished_goods" | "raw_material";
          finished_goods_supplier_id: string | null;
          raw_material_supplier_id: string | null;
          reliable_orders_count: number;
          incidents_count: number;
          payment_term_unlocked: "cash" | "t_plus_1" | "t_plus_2" | "t_plus_3";
        };
        Insert: Partial<Database["public"]["Tables"]["company_supplier_relationships"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_supplier_relationships"]["Row"]>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          company_id: string;
          turn_id: string;
          supplier_relationship_id: string;
          item_type: "finished_good" | "raw_material_c1" | "raw_material_c2" | "packaging" | "semi_finished";
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          quantity: number;
          unit_price: number;
          transport_cost: number;
          payment_term: "cash" | "t_plus_1" | "t_plus_2" | "t_plus_3";
          immediate_payment_amount: number;
          deferred_payment_amount: number;
          due_turn_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["purchase_orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Row"]>;
        Relationships: [];
      };
      inventory_lots: {
        Row: {
          id: string;
          company_id: string;
          turn_id: string;
          item_type: "finished_good" | "raw_material_c1" | "raw_material_c2" | "packaging" | "semi_finished";
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          quantity_on_hand: number;
          unit_cost: number;
          security_stock_target: number | null;
          spoiled_or_lost_qty: number;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory_lots"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["inventory_lots"]["Row"]>;
        Relationships: [];
      };
      company_pricing_decisions: {
        Row: {
          id: string;
          company_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          sale_price: number;
          sales_target_quantity: number;
        };
        Insert: Partial<Database["public"]["Tables"]["company_pricing_decisions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_pricing_decisions"]["Row"]>;
        Relationships: [];
      };
      product_ranges: {
        Row: {
          code: "reference" | "qualite" | "prestige_tech";
          label: string;
          unlock_level: number;
          base_sale_price: number | null;
          reference_market_price: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["product_ranges"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["product_ranges"]["Row"]>;
        Relationships: [];
      };
      sales_results: {
        Row: {
          company_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          units_sold: number;
          units_lost_demand: number;
          revenue: number;
          avg_price: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sales_results"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["sales_results"]["Row"]>;
        Relationships: [];
      };
      turn_dashboards: {
        Row: {
          company_id: string;
          turn_id: string;
          department: string;
          kpis: Record<string, unknown>;
          alerts: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["turn_dashboards"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["turn_dashboards"]["Row"]>;
        Relationships: [];
      };
      workers: {
        Row: {
          id: string;
          company_id: string;
          role: "commercial" | "ouvrier" | "chauffeur" | "magasinier" | "technicien" | "encadrement";
          hired_turn_id: string;
          base_salary: number;
          competency_pct: number;
          satisfaction_pct: number;
          assigned: boolean;
          status: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["workers"]["Row"]>;
        Relationships: [];
      };
      worker_training: {
        Row: {
          id: string;
          worker_id: string;
          turn_id: string;
          training_type: string;
          cost: number;
        };
        Insert: Partial<Database["public"]["Tables"]["worker_training"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["worker_training"]["Row"]>;
        Relationships: [];
      };
      marketing_campaigns_catalog: {
        Row: {
          id: string;
          label: string;
          channel: string;
          cost_per_turn: number | null;
          awareness_effect: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["marketing_campaigns_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["marketing_campaigns_catalog"]["Row"]>;
        Relationships: [];
      };
      company_marketing_investments: {
        Row: {
          id: string;
          company_id: string;
          turn_id: string;
          campaign_id: string;
          spend: number;
        };
        Insert: Partial<Database["public"]["Tables"]["company_marketing_investments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_marketing_investments"]["Row"]>;
        Relationships: [];
      };
      sales_arguments_catalog: {
        Row: {
          id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          label: string;
          requires_proof_field: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sales_arguments_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["sales_arguments_catalog"]["Row"]>;
        Relationships: [];
      };
      company_sales_arguments_used: {
        Row: {
          company_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          argument_1_id: string | null;
          argument_2_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_sales_arguments_used"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_sales_arguments_used"]["Row"]>;
        Relationships: [];
      };
      event_catalog: {
        Row: {
          id: string;
          code: string;
          category: string;
          label: string | null;
          base_probability: number;
          aggravated_probability: number | null;
          critical_probability: number | null;
          aggravating_factors: Record<string, unknown> | null;
          effect_template: Record<string, unknown>;
        };
        Insert: Partial<Database["public"]["Tables"]["event_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["event_catalog"]["Row"]>;
        Relationships: [];
      };
      turn_events: {
        Row: {
          id: string;
          session_id: string;
          company_id: string | null;
          turn_id: string;
          event_catalog_id: string;
          severity: "normal" | "aggrave" | "critique";
          effect_applied: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["turn_events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["turn_events"]["Row"]>;
        Relationships: [];
      };
      company_activity_transitions: {
        Row: {
          id: string;
          company_id: string;
          from_activity: "commercial" | "industrial";
          to_activity: "commercial" | "industrial";
          diagnostic_result: Record<string, unknown> | null;
          started_turn_id: string | null;
          completed_turn_id: string | null;
          total_cost: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_activity_transitions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_activity_transitions"]["Row"]>;
        Relationships: [];
      };
      machines_catalog: {
        Row: {
          id: string;
          name: string;
          price: number;
          install_turns: number;
          nominal_capacity_per_turn: number;
          energy_cost_per_unit: number;
          footprint_sqm: number;
        };
        Insert: Partial<Database["public"]["Tables"]["machines_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["machines_catalog"]["Row"]>;
        Relationships: [];
      };
      company_machines: {
        Row: {
          id: string;
          company_id: string;
          machine_catalog_id: string;
          purchased_turn_id: string;
          financed_via: string | null;
          wear_pct: number;
          cumulative_production: number;
          status: string;
        };
        Insert: Partial<Database["public"]["Tables"]["company_machines"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_machines"]["Row"]>;
        Relationships: [];
      };
      raw_material_suppliers: {
        Row: {
          id: string;
          code: string;
          profile_label: string | null;
          price_coefficient: number;
          moq: number | null;
          lead_time_turns_min: number | null;
          lead_time_turns_max: number | null;
          default_payment_term: "cash" | "t_plus_1" | "t_plus_2" | "t_plus_3" | null;
          non_conformity_rate: number | null;
          on_time_delivery_rate: number | null;
          requires_customs: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["raw_material_suppliers"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["raw_material_suppliers"]["Row"]>;
        Relationships: [];
      };
      bill_of_materials: {
        Row: {
          id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          component_code: string;
          quantity_per_unit: number;
          normal_loss_pct: number;
          target_cost: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bill_of_materials"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["bill_of_materials"]["Row"]>;
        Relationships: [];
      };
      production_orders: {
        Row: {
          id: string;
          company_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          target_quantity: number;
          produced_quantity: number;
          defect_quantity: number;
          rework_quantity: number;
          capacity_constraint: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["production_orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["production_orders"]["Row"]>;
        Relationships: [];
      };
      maintenance_logs: {
        Row: {
          id: string;
          company_machine_id: string;
          turn_id: string;
          type: "preventive" | "corrective";
          cost: number;
          breakdown_occurred: boolean;
          downtime_turns: number;
          auto_authorize_ceiling: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["maintenance_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["maintenance_logs"]["Row"]>;
        Relationships: [];
      };
      company_quality_metrics: {
        Row: {
          company_id: string;
          turn_id: string;
          defect_rate: number | null;
          complaints_count: number | null;
          sav_cost: number | null;
          certifications: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_quality_metrics"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_quality_metrics"]["Row"]>;
        Relationships: [];
      };
      assembly_lines_catalog: {
        Row: {
          id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          price: number;
          install_cost: number;
          capacity_per_turn: number;
          direct_workers_required: number;
          footprint_sqm: number;
          energy_per_unit: number | null;
          maintenance_per_unit: number | null;
          std_minutes_per_unit: number | null;
          test_minutes_per_unit: number | null;
          initial_fail_rate: number | null;
          stabilized_fail_rate: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["assembly_lines_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["assembly_lines_catalog"]["Row"]>;
        Relationships: [];
      };
      company_assembly_lines: {
        Row: {
          id: string;
          company_id: string;
          assembly_line_catalog_id: string;
          purchased_turn_id: string;
          status: string;
        };
        Insert: Partial<Database["public"]["Tables"]["company_assembly_lines"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_assembly_lines"]["Row"]>;
        Relationships: [];
      };
      rd_levels_catalog: {
        Row: {
          level: number;
          label: string | null;
          cost: number | null;
          duration_turns: number | null;
          base_risk_pct: number | null;
          ip_rules: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["rd_levels_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["rd_levels_catalog"]["Row"]>;
        Relationships: [];
      };
      company_rd_projects: {
        Row: {
          id: string;
          company_id: string;
          level: number;
          status: string;
          started_turn_id: string;
          completed_turn_id: string | null;
          cost_incurred: number | null;
          outcome: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_rd_projects"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_rd_projects"]["Row"]>;
        Relationships: [];
      };
      banks_catalog: {
        Row: {
          id: string;
          code: string;
          label: string;
          positioning: string | null;
          rate_profile: Record<string, unknown> | null;
          strengths: string | null;
          tradeoffs: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["banks_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["banks_catalog"]["Row"]>;
        Relationships: [];
      };
      company_bank_loans: {
        Row: {
          id: string;
          company_id: string;
          bank_id: string;
          taken_turn_id: string;
          principal: number;
          rate_pct: number;
          term_turns: number;
          remaining_balance: number;
          down_payment_amount: number;
        };
        Insert: Partial<Database["public"]["Tables"]["company_bank_loans"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_bank_loans"]["Row"]>;
        Relationships: [];
      };
      insurance_formulas_catalog: {
        Row: {
          formula: "basique" | "standard" | "multirisque";
          coverage_description: string;
          premium_per_turn: number | null;
          duration_turns: number;
          deductible: number | null;
          coverage_cap: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["insurance_formulas_catalog"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["insurance_formulas_catalog"]["Row"]>;
        Relationships: [];
      };
      company_insurance_policies: {
        Row: {
          id: string;
          company_id: string;
          formula: "basique" | "standard" | "multirisque";
          start_turn_id: string;
          end_turn_id: string | null;
          premium_per_turn: number;
        };
        Insert: Partial<Database["public"]["Tables"]["company_insurance_policies"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_insurance_policies"]["Row"]>;
        Relationships: [];
      };
      company_shares: {
        Row: {
          company_id: string;
          total_shares: number;
          shares_public_pct: number;
        };
        Insert: Partial<Database["public"]["Tables"]["company_shares"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_shares"]["Row"]>;
        Relationships: [];
      };
      dividends: {
        Row: {
          company_id: string;
          turn_id: string;
          amount_per_share: number;
        };
        Insert: Partial<Database["public"]["Tables"]["dividends"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["dividends"]["Row"]>;
        Relationships: [];
      };
      company_rse_metrics: {
        Row: {
          company_id: string;
          turn_id: string;
          environmental_score: number | null;
          social_score: number | null;
          governance_score: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["company_rse_metrics"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_rse_metrics"]["Row"]>;
        Relationships: [];
      };
      competitor_profiles: {
        Row: {
          id: string;
          code: string;
          positioning: string | null;
          price_stance: string | null;
          quality_stance: string | null;
          marketing_stance: string | null;
          stock_stance: string | null;
          main_reaction: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["competitor_profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["competitor_profiles"]["Row"]>;
        Relationships: [];
      };
      demand_attribute_weights: {
        Row: {
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          attribute_code: string;
          weight_pct: number;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_attribute_weights"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["demand_attribute_weights"]["Row"]>;
        Relationships: [];
      };
      competitor_state: {
        Row: {
          id: string;
          session_id: string;
          competitor_profile_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          price: number | null;
          quality_score: number | null;
          marketing_score: number | null;
          stock_level: number | null;
          market_share_pct: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["competitor_state"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["competitor_state"]["Row"]>;
        Relationships: [];
      };
      company_attribute_scores: {
        Row: {
          company_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          attribute_code: string;
          score: number;
        };
        Insert: Partial<Database["public"]["Tables"]["company_attribute_scores"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["company_attribute_scores"]["Row"]>;
        Relationships: [];
      };
      market_demand: {
        Row: {
          session_id: string;
          turn_id: string;
          zone_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          base_demand: number;
          seasonal_factor: number;
          macro_factor: number;
          total_demand: number;
        };
        Insert: Partial<Database["public"]["Tables"]["market_demand"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["market_demand"]["Row"]>;
        Relationships: [];
      };
      market_share_allocation: {
        Row: {
          session_id: string;
          turn_id: string;
          range_code: "reference" | "qualite" | "prestige_tech" | null;
          participant_type: "company" | "competitor";
          participant_id: string;
          attractiveness_score: number | null;
          market_share_pct: number | null;
          allocated_demand: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["market_share_allocation"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["market_share_allocation"]["Row"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          session_id: string;
          status: string;
          max_players: number | null;
          is_public: boolean;
          zone_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["matches"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["matches"]["Row"]>;
        Relationships: [];
      };
      match_participants: {
        Row: {
          id: string;
          match_id: string;
          company_id: string;
          score: number | null;
          rank: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["match_participants"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["match_participants"]["Row"]>;
        Relationships: [];
      };
      admin_managed_sessions: {
        Row: {
          admin_id: string;
          session_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_managed_sessions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["admin_managed_sessions"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
