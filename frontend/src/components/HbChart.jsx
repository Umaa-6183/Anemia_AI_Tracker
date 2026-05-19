import React, { useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    BarChart2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useApp } from "../context/AppContext";
import { classifySeverity } from "../utils/helpers";

const RANGES = [
    { label: "7D", days: 7 },
    { label: "1M", days: 30 },
    { label: "3M", days: 90 },
    { label: "All", days: Infinity },
];

const SEV_COLOR = {
    normal: "#16A34A",
    mild: "#D97706",
    moderate: "#EA580C",
    severe: "#DC2626",
};

function CustomTooltip({ active, payload, profile }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const info = classifySeverity(d.hb, profile?.sex, profile?.pregnancyStatus);
    const col = SEV_COLOR[info.severity] || "#64748B";
    return (
        <div
            className="rounded-xl p-3 shadow-xl min-w-[150px]"
            style={{ background: "#fff", border: `1.5px solid ${col}40` }}
        >
            <p className="text-xs mb-1" style={{ color: "#64748B" }}>
                {d.fullDate}
            </p>
            <p className="text-xl font-bold font-mono" style={{ color: "#0F172A" }}>
                {Number(d.hb).toFixed(1)}
                <span className="text-xs ml-1" style={{ color: "#94A3B8" }}>
                    g/dL
                </span>
            </p>
            <span
                className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                    background: `${col}15`,
                    color: col,
                    border: `1px solid ${col}40`,
                }}
            >
                {info.label}
            </span>
        </div>
    );
}

function SeverityDot(props) {
    const { cx, cy, payload, profile } = props;
    if (!payload) return null;
    const info = classifySeverity(
        payload.hb,
        profile?.sex,
        profile?.pregnancyStatus,
    );
    const col = SEV_COLOR[info.severity] || "#64748B";
    return (
        <circle cx={cx} cy={cy} r={5} fill={col} stroke="#fff" strokeWidth={2} />
    );
}

function StatChip({ label, value, color, Icon }) {
    return (
        <div
            className="rounded-xl px-4 py-3 text-center"
            style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
        >
            {Icon && <Icon size={14} style={{ color, margin: "0 auto 4px" }} />}
            <p className="text-xs mb-0.5" style={{ color: "#64748B" }}>
                {label}
            </p>
            <p className="text-base font-bold font-mono" style={{ color }}>
                {value}
            </p>
        </div>
    );
}

export default function HbChart() {
    const { state } = useApp();
    const profile = state.profile;
    const history = state.hbHistory;
    const [rangeIdx, setRangeIdx] = useState(3);

    const chartData = useMemo(() => {
        const cutoff =
            RANGES[rangeIdx].days === Infinity
                ? 0
                : Date.now() - RANGES[rangeIdx].days * 86_400_000;
        return [...history]
            .filter((h) => new Date(h.date).getTime() >= cutoff)
            .reverse()
            .map((h) => ({
                date: format(parseISO(h.date), "dd MMM"),
                fullDate: format(parseISO(h.date), "dd MMM yyyy, HH:mm"),
                hb: Number(h.hb),
                severity: h.severity,
            }));
    }, [history, rangeIdx]);

    const hbValues = chartData.map((d) => d.hb);
    const avgHb = hbValues.length
        ? (hbValues.reduce((a, b) => a + b, 0) / hbValues.length).toFixed(1)
        : null;
    const minHb = hbValues.length ? Math.min(...hbValues).toFixed(1) : null;
    const maxHb = hbValues.length ? Math.max(...hbValues).toFixed(1) : null;

    const first = chartData[0]?.hb,
        last = chartData[chartData.length - 1]?.hb;
    const trend = first && last ? last - first : 0;
    const TrendIcon =
        trend > 0.2 ? TrendingUp : trend < -0.2 ? TrendingDown : Minus;
    const trendColor =
        trend > 0.2 ? "#16A34A" : trend < -0.2 ? "#DC2626" : "#64748B";

    const normalFloor = profile?.pregnancyStatus
        ? 11
        : profile?.sex === "male"
            ? 13
            : 12;

    if (history.length === 0) {
        return (
            <div className="card text-center py-12 space-y-3">
                <BarChart2 size={36} style={{ color: "#E2E8F0", margin: "0 auto" }} />
                <p className="font-semibold text-sm" style={{ color: "#475569" }}>
                    No scan history yet
                </p>
                <p className="text-xs" style={{ color: "#94A3B8" }}>
                    Complete your first scan to see your Hb trend chart here.
                </p>
            </div>
        );
    }

    return (
        <div className="card space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="section-bar-violet">
                    <h3 className="section-title" style={{ color: "#7C3AED" }}>
                        <span className="flex items-center gap-2">
                            <TrendingUp size={16} />
                            Hb Trend
                        </span>
                    </h3>
                    <p className="section-subtitle">
                        {history.length} scan{history.length !== 1 ? "s" : ""} recorded
                    </p>
                </div>
                {/* Range filter */}
                <div
                    className="flex gap-1 p-1 rounded-lg"
                    style={{ background: "#F1F5F9", border: "1.5px solid #E2E8F0" }}
                >
                    {RANGES.map(({ label }, i) => (
                        <button
                            key={label}
                            onClick={() => setRangeIdx(i)}
                            className="px-3 py-1 rounded-md text-xs font-bold transition-all duration-150"
                            style={{
                                background: i === rangeIdx ? "#7C3AED" : "transparent",
                                color: i === rangeIdx ? "#fff" : "#64748B",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            {chartData.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                    <Calendar size={20} style={{ color: "#CBD5E1" }} />
                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                        Need at least 2 scans in this range to draw a trend line.
                    </p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="hbGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.18} />
                                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#F1F5F9"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: "#94A3B8", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[
                                (dm) => Math.max(0, Math.floor(dm - 1)),
                                (dm) => Math.ceil(dm + 1),
                            ]}
                            tick={{ fill: "#94A3B8", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            unit=" g/dL"
                            width={62}
                        />
                        <Tooltip
                            content={<CustomTooltip profile={profile} />}
                            cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
                        />
                        <ReferenceLine
                            y={normalFloor}
                            stroke="#16A34A"
                            strokeDasharray="5 4"
                            strokeOpacity={0.6}
                            label={{
                                value: `Normal ≥${normalFloor}`,
                                position: "insideTopLeft",
                                fill: "#16A34A",
                                fontSize: 10,
                                opacity: 0.8,
                            }}
                        />
                        <ReferenceLine
                            y={8}
                            stroke="#DC2626"
                            strokeDasharray="5 4"
                            strokeOpacity={0.5}
                            label={{
                                value: "Severe <8",
                                position: "insideBottomLeft",
                                fill: "#DC2626",
                                fontSize: 10,
                                opacity: 0.7,
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="hb"
                            stroke="#7C3AED"
                            strokeWidth={2.5}
                            fill="url(#hbGrad)"
                            dot={(p) => <SeverityDot {...p} profile={profile} />}
                            activeDot={{
                                r: 7,
                                fill: "#7C3AED",
                                stroke: "#fff",
                                strokeWidth: 2,
                            }}
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                <StatChip
                    label="Average"
                    value={avgHb ? `${avgHb} g/dL` : "—"}
                    color="#7C3AED"
                    Icon={BarChart2}
                />
                <StatChip
                    label="Lowest"
                    value={minHb ? `${minHb} g/dL` : "—"}
                    color="#DC2626"
                    Icon={TrendingDown}
                />
                <StatChip
                    label="Highest"
                    value={maxHb ? `${maxHb} g/dL` : "—"}
                    color="#16A34A"
                    Icon={TrendingUp}
                />
            </div>

            {/* Trend summary */}
            {chartData.length >= 2 && (
                <div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: trendColor }}
                >
                    <TrendIcon size={16} />
                    <span>
                        {Math.abs(trend) < 0.2
                            ? "Hb is stable across this period"
                            : trend > 0
                                ? `Hb improved by ${trend.toFixed(1)} g/dL over this period`
                                : `Hb decreased by ${Math.abs(trend).toFixed(1)} g/dL — consider dietary review`}
                    </span>
                </div>
            )}

            {/* Legend */}
            <div
                className="flex flex-wrap gap-3 pt-1"
                style={{ borderTop: "1.5px solid #F1F5F9" }}
            >
                {[
                    ["#16A34A", "Normal"],
                    ["#D97706", "Mild"],
                    ["#EA580C", "Moderate"],
                    ["#DC2626", "Severe"],
                ].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: color }}
                        />
                        <span className="text-xs font-medium" style={{ color: "#64748B" }}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
