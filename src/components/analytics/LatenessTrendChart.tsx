"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface TrendData {
    date: string;
    lateCount: number;
    avgLateMinutes: number;
}

interface LatenessTrendChartProps {
    data: TrendData[];
}

export function LatenessTrendChart({ data }: LatenessTrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(value) => {
                        const d = new Date(value);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                />
                <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    yAxisId="left"
                />
                <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    yAxisId="right"
                    orientation="right"
                    unit=" นาที"
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#f1f5f9" }}
                    labelFormatter={(value) => {
                        const d = new Date(value);
                        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                    }}
                />
                <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="lateCount"
                    name="จำนวนคนสาย"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                />
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgLateMinutes"
                    name="สายเฉลี่ย (นาที)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
