"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export interface RseHistoryPoint {
  turn_number: number;
  environmental_score: number;
  social_score: number;
  governance_score: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#161F38",
  border: "1px solid #26315689",
  borderRadius: "0.75rem",
  color: "#F5F6FA",
  fontSize: "0.8rem",
};

export function RseHistoryChart({ data }: { data: RseHistoryPoint[] }) {
  if (data.length < 2) return null;
  return (
    <div className="h-56">
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
          <YAxis stroke="#A6ACC2" fontSize={12} tickLine={false} domain={[0, 100]} width={30} />
          <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(v) => `Turn ${v}`} />
          <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#A6ACC2" }} />
          <Line
            type="monotone"
            dataKey="environmental_score"
            name="Environmental"
            stroke="#4ADE80"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="social_score"
            name="Social"
            stroke="#60A5FA"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="governance_score"
            name="Governance"
            stroke="#D4AF37"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
