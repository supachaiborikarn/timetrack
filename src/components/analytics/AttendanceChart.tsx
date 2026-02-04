"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface WeeklyData {
    day: string;
    onTime: number;
    late: number;
    absent: number;
}

interface AttendanceChartProps {
    data: WeeklyData[];
}

export function AttendanceChart({ data }: AttendanceChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={12}
                />
                <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#f1f5f9" }}
                />
                <Legend />
                <Bar
                    dataKey="onTime"
                    name="ตรงเวลา"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="late"
                    name="สาย"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="absent"
                    name="ขาด"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
