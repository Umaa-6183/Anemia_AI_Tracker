import React, { useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Area,
    AreaChart,
    Dot,
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
import { classifySeverity, severityColor } from "../utils/helpers";

/* ─── Filter options ───────────────────────────────── */
const RANGES = [
    { label: "7D", days: 7 },
    { label: "1M", days: 30 },
    { label: "3M", days: 90 },
    { label: "All", days: Infinity },
];

/* ─── Custom tooltip ───────────────────────────────── */
function CustomTooltip({ active, payload, label, profile }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    const info = classifySeverity(d.hb, profile?.sex, profile?.pregnancyStatus);

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl min-w-[160px]">
            <p className="text-xs text-slate-500 mb-2">{d.fullDate}</p>
            <p className="text-xl font-bold font-mono text-white">
                {Number(d.hb).toFixed(1)}
                <span className="text-xs text-slate-400 ml-1">g/dL</span>
            </p>
            <span
                className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full`}
                style={{
                    color: info.color,
                    background: `${info.color}20`,
                    border: `1px solid ${info.color}40`,
                }}
            >
                {info.label}
            </span>
        </div>
    );
}

/* ─── Custom dot on the line ───────────────────────── */
function SeverityDot(props) {
    const { cx, cy, payload, profile } = props;
    if (!payload) return null;
    const info = classifySeverity(
        payload.hb,
        profile?.sex,
        profile?.pregnancyStatus,
    );
    return (
        <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={info.color}
            stroke="#0f172a"
            strokeWidth={2}
        />
    );
}

/* ─── Summary stat ─────────────────────────────────── */
function StatChip({ label, value, color = "text-slate-300", Icon }) {
    return (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-center">
            {Icon && <Icon size={14} className="text-slate-500 mx-auto mb-1" />}
            <p className="text-xs text-slate-500 mb-0.5">{label}</p>
            <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function HbChart() {
    const { state } = useApp();
    const profile = state.profile;
    const history = state.hbHistory; // [{ date, hb, severity }] newest first

    const [rangeIdx, setRangeIdx] = useState(3); // default: All

    /* ── Filter by date range ── */
    const chartData = useMemo(() => {
        const cutoff =
            RANGES[rangeIdx].days === Infinity
                ? 0
                : Date.now() - RANGES[rangeIdx].days * 86_400_000;

        return [...history]
            .filter((h) => new Date(h.date).getTime() >= cutoff)
            .reverse() // oldest → newest for chart
            .map((h) => ({
                date: format(parseISO(h.date), "dd MMM"),
                fullDate: format(parseISO(h.date), "dd MMM yyyy, HH:mm"),
                hb: Number(h.hb),
                severity: h.severity,
            }));
    }, [history, rangeIdx]);

    /* ── Summary stats ── */
    const hbValues = chartData.map((d) => d.hb);
    const avgHb = hbValues.length
        ? (hbValues.reduce((a, b) => a + b, 0) / hbValues.length).toFixed(1)
        : null;
    const minHb = hbValues.length ? Math.min(...hbValues).toFixed(1) : null;
    const maxHb = hbValues.length ? Math.max(...hbValues).toFixed(1) : null;

    const first = chartData[0]?.hb;
    const last = chartData[chartData.length - 1]?.hb;
    const trend = first && last ? last - first : 0;
    const TrendIcon =
        trend > 0.2 ? TrendingUp : trend < -0.2 ? TrendingDown : Minus;
    const trendClr =
        trend > 0.2
            ? "text-green-400"
            : trend < -0.2
                ? "text-red-400"
                : "text-slate-500";

    /* ── Reference lines (WHO normal lower bound) ── */
    const normalFloor = profile?.pregnancyStatus
        ? 11
        : profile?.sex === "male"
            ? 13
            : 12;

    /* ── Empty state ── */
    if (history.length === 0) {
        return (
            <div className="card text-center py-12 space-y-3">
                <BarChart2 size={36} className="text-slate-700 mx-auto" />
                <p className="text-slate-400 text-sm font-medium">
                    No scan history yet
                </p>
                <p className="text-slate-600 text-xs">
                    Complete your first scan to see your Hb trend chart here.
                </p>
            </div>
        );
    }

    return (
        <div className="card space-y-5">
            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h3 className="section-title flex items-center gap-2">
                        <TrendingUp size={16} className="text-clinical-400" />
                        Hb Trend
                    </h3>
                    <p className="section-subtitle">
                        {history.length} scan{history.length !== 1 ? "s" : ""} recorded
                    </p>
                </div>

                {/* Range filter pills */}
                <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                    {RANGES.map(({ label }, i) => (
                        <button
                            key={label}
                            onClick={() => setRangeIdx(i)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150
                           ${i === rangeIdx
                                    ? "bg-clinical-600 text-white shadow"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Chart ── */}
            {chartData.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                    <Calendar size={20} className="text-slate-600" />
                    <p className="text-xs text-slate-500">
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
                            <linearGradient id="hbGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0e8ee7" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#0e8ee7" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="date"
                            tick={{ fill: "#475569", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[
                                (dataMin) => Math.max(0, Math.floor(dataMin - 1)),
                                (dataMax) => Math.ceil(dataMax + 1),
                            ]}
                            tick={{ fill: "#475569", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            unit=" g/dL"
                            width={60}
                        />

                        <Tooltip
                            content={<CustomTooltip profile={profile} />}
                            cursor={{ stroke: "#334155", strokeWidth: 1 }}
                        />

                        {/* WHO normal lower bound */}
                        <ReferenceLine
                            y={normalFloor}
                            stroke="#22c55e"
                            strokeDasharray="5 4"
                            strokeOpacity={0.5}
                            label={{
                                value: `Normal ≥ ${normalFloor}`,
                                position: "insideTopLeft",
                                fill: "#22c55e",
                                fontSize: 10,
                                opacity: 0.7,
                            }}
                        />

                        {/* Severe threshold */}
                        <ReferenceLine
                            y={8}
                            stroke="#ef4444"
                            strokeDasharray="5 4"
                            strokeOpacity={0.4}
                            label={{
                                value: "Severe < 8",
                                position: "insideBottomLeft",
                                fill: "#ef4444",
                                fontSize: 10,
                                opacity: 0.6,
                            }}
                        />

                        <Area
                            type="monotone"
                            dataKey="hb"
                            stroke="#0e8ee7"
                            strokeWidth={2.5}
                            fill="url(#hbGradient)"
                            dot={(dotProps) => (
                                <SeverityDot {...dotProps} profile={profile} />
                            )}
                            activeDot={{
                                r: 7,
                                fill: "#38aaf6",
                                stroke: "#0f172a",
                                strokeWidth: 2,
                            }}
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {/* ── Summary stats row ── */}
            <div className="grid grid-cols-3 gap-3">
                <StatChip
                    label="Average"
                    value={avgHb ? `${avgHb} g/dL` : "—"}
                    color="text-clinical-300"
                    Icon={BarChart2}
                />
                <StatChip
                    label="Lowest"
                    value={minHb ? `${minHb} g/dL` : "—"}
                    color="text-red-300"
                    Icon={TrendingDown}
                />
                <StatChip
                    label="Highest"
                    value={maxHb ? `${maxHb} g/dL` : "—"}
                    color="text-green-300"
                    Icon={TrendingUp}
                />
            </div>

            {/* ── Trend summary ── */}
            {chartData.length >= 2 && (
                <div
                    className={`flex items-center gap-2 text-sm font-medium ${trendClr}`}
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

            {/* ── Legend ── */}
            <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-800">
                {[
                    { color: "#22c55e", label: "Normal" },
                    { color: "#facc15", label: "Mild" },
                    { color: "#f97316", label: "Moderate" },
                    { color: "#ef4444", label: "Severe" },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: color }}
                        />
                        <span className="text-xs text-slate-500">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
