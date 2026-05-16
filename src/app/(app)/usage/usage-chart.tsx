"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { date: string; costUSD: number };

export function UsageChart({ data }: { data: Point[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5).replace("-", "/"), // MM/DD
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formatted}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#26262a" />
          <XAxis
            dataKey="label"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#26262a" }}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#26262a" }}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#121214",
              border: "1px solid #26262a",
              borderRadius: 6,
              fontSize: 12,
              color: "#f4f4f5",
            }}
            labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
            formatter={(v: number) => [`$${v.toFixed(4)}`, "비용"]}
          />
          <Line
            type="monotone"
            dataKey="costUSD"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
