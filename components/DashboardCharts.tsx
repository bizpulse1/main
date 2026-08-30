"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface TurnHistoryPoint {
  turn_number: number;
  capital_after: number;
  revenue: number;
  total_costs: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#161F38",
  border: "1px solid #26315689",
  borderRadius: "0.75rem",
  color: "#F5F6FA",
  fontSize: "0.8rem",
};

export function CapitalOverTimeChart({ data }: { data: TurnHistoryPoint[] }) {
  if (data.length < 2) return null;
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#26315689" vertical={false} />
          <XAxis
            dataKey="turn_number"
            tickFormatter={(v) => `T${v}`}
            stroke="#A6ACC2"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#A6ACC2"
            fontSize={12}
            tickLine={false}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={40}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`$${Number(value).toLocaleString("en-US")}`, "Capital"]}
            labelFormatter={(v) => `Turn ${v}`}
          />
          <Line
            type="monotone"
            dataKey="capital_after"
            stroke="#D4AF37"
            strokeWidth={2}
            dot={{ fill: "#D4AF37", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueVsCostsChart({ data }: { data: TurnHistoryPoint[] }) {
  if (data.length === 0) return null;
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#26315689" vertical={false} />
          <XAxis
            dataKey="turn_number"
            tickFormatter={(v) => `T${v}`}
            stroke="#A6ACC2"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#A6ACC2"
            fontSize={12}
            tickLine={false}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={40}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [
              `$${Number(value).toLocaleString("en-US")}`,
              name === "revenue" ? "Revenue" : "Costs",
            ]}
            labelFormatter={(v) => `Turn ${v}`}
          />
          <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
          <Bar dataKey="total_costs" fill="#8C7526" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
