import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    History,
    TrendingUp,
    TrendingDown,
    Minus,
    ScanLine,
    Trash2,
    Activity,
    Calendar,
    BarChart2,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Filter,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import HbChart from "../components/HbChart";
import {
    formatDate,
    formatDateTime,
    formatHb,
    classifySeverity,
} from "../utils/helpers";
import toast from "react-hot-toast";

/* ─── Severity icon ─────────────────────────────────── */
function SeverityIcon({ severity, size = 14 }) {
    if (severity === "normal")
        return <CheckCircle2 size={size} className="text-green-400" />;
    return (
        <AlertTriangle
            size={size}
            className={
                severity === "mild"
                    ? "text-yellow-400"
                    : severity === "moderate"
                        ? "text-orange-400"
                        : "text-red-400"
            }
        />
    );
}

/* ─── Single history entry card ─────────────────────── */
function HistoryCard({ entry, index, onDelete }) {
    const severityInfo = classifySeverity(entry.hb);

    return (
        <div
            className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border
                      transition-all duration-150
                      ${severityInfo.borderColor} ${severityInfo.bgColor}
                      hover:brightness-110`}
        >
            {/* Index badge */}
            <div
                className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-full
                       flex items-center justify-center border border-gray-300"
            >
                <span className="text-[10px] font-bold text-gray-500">{index + 1}</span>
            </div>

            {/* Hb value */}
            <div className="flex-shrink-0 text-right" style={{ minWidth: 72 }}>
                <p
                    className={`text-lg font-extrabold font-mono ${severityInfo.textColor}`}
                >
                    {Number(entry.hb).toFixed(1)}
                </p>
                <p className="text-[10px] text-slate-600 -mt-0.5">g/dL</p>
            </div>

            {/* Severity badge */}
            <div className="flex-shrink-0">
                <div className={`${severityInfo.badgeClass}`}>
                    <SeverityIcon severity={entry.severity} size={10} />
                    {severityInfo.label}
                </div>
            </div>

            {/* Date */}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">
                    {formatDateTime(entry.date)}
                </p>
            </div>

            {/* Delete button (shows on hover) */}
            <button
                onClick={() => onDelete(index)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center
                   justify-center text-slate-600 hover:text-red-400
                   hover:bg-red-900/20 rounded-lg transition-all duration-150"
                title="Delete entry"
            >
                <Trash2 size={13} />
            </button>
        </div>
    );
}

/* ─── Summary stat card ─────────────────────────────── */
function SummaryCard({ label, value, sub, Icon, color }) {
    return (
        <div className="card text-center space-y-1.5">
            <Icon size={18} className={`${color} mx-auto`} />
            <p className={`text-2xl font-extrabold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════ */
export default function HistoryPage() {
    const navigate = useNavigate();
    const { state, dispatch } = useApp();
    const history = state.hbHistory; // newest first
    const profile = state.profile;

    const [filterSeverity, setFilter] = useState("all");
    const [showChart, setShowChart] = useState(true);

    /* ── Delete single entry ── */
    function handleDelete(idx) {
        if (!window.confirm("Remove this scan entry from history?")) return;
        const updated = history.filter((_, i) => i !== idx);
        dispatch({ type: "HYDRATE", payload: { hbHistory: updated } });
        toast.success("Entry removed");
    }

    /* ── Clear all history ── */
    function handleClearAll() {
        if (!window.confirm("Delete ALL scan history? This cannot be undone."))
            return;
        dispatch({ type: "HYDRATE", payload: { hbHistory: [] } });
        toast.success("History cleared");
    }

    /* ── Filtered list ── */
    const filtered =
        filterSeverity === "all"
            ? history
            : history.filter((h) => h.severity === filterSeverity);

    /* ── Summary stats ── */
    const hbValues = history.map((h) => Number(h.hb));
    const avgHb = hbValues.length
        ? (hbValues.reduce((a, b) => a + b, 0) / hbValues.length).toFixed(1)
        : null;
    const latestHb = hbValues[0];
    const prevHb = hbValues[1];
    const delta = latestHb && prevHb ? (latestHb - prevHb).toFixed(1) : null;

    /* Severity distribution */
    const distribution = history.reduce((acc, h) => {
        acc[h.severity] = (acc[h.severity] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen animate-fade-in">
            {/* ── Page header ─────────────────────────── */}
            <div className="bg-gray-50 border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 pt-8 pb-5">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                        <History size={22} className="text-clinical-400" />
                        Scan History
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {history.length
                            ? `${history.length} scan${history.length !== 1 ? "s" : ""} recorded${profile ? ` for ${profile.name}` : ""
                            }`
                            : "No scans recorded yet"}
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* ── Empty state ── */}
                {history.length === 0 && (
                    <div className="card text-center py-16 space-y-4">
                        <BarChart2 size={40} className="text-gray-400 mx-auto" />
                        <div>
                            <p className="text-gray-700 font-semibold">No Scan History</p>
                            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                                Complete your first scan to start tracking your Haemoglobin over
                                time.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate("/scan")}
                            className="btn-primary mx-auto"
                        >
                            <ScanLine size={15} />
                            Start First Scan
                        </button>
                    </div>
                )}

                {history.length > 0 && (
                    <>
                        {/* ── Summary stats ── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <SummaryCard
                                label="Total Scans"
                                value={history.length}
                                Icon={Activity}
                                color="text-clinical-400"
                                sub="All time"
                            />
                            <SummaryCard
                                label="Average Hb"
                                value={avgHb ? `${avgHb}` : "—"}
                                sub="g/dL"
                                Icon={BarChart2}
                                color="text-gray-700"
                            />
                            <SummaryCard
                                label="Latest Hb"
                                value={latestHb ? Number(latestHb).toFixed(1) : "—"}
                                sub={delta ? `${delta > 0 ? "+" : ""}${delta} vs prev` : "g/dL"}
                                Icon={delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus}
                                color={
                                    delta > 0
                                        ? "text-green-400"
                                        : delta < 0
                                            ? "text-red-400"
                                            : "text-gray-500"
                                }
                            />
                            <SummaryCard
                                label="Last Scan"
                                value={history[0] ? formatDate(history[0].date) : "—"}
                                Icon={Calendar}
                                color="text-gray-500"
                            />
                        </div>

                        {/* ── Severity distribution pills ── */}
                        {Object.keys(distribution).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: "all", label: "All", color: "text-gray-700" },
                                    { key: "normal", label: "Normal", color: "text-green-400" },
                                    { key: "mild", label: "Mild", color: "text-yellow-400" },
                                    {
                                        key: "moderate",
                                        label: "Moderate",
                                        color: "text-orange-400",
                                    },
                                    { key: "severe", label: "Severe", color: "text-red-400" },
                                ].map(({ key, label, color }) => {
                                    const count =
                                        key === "all" ? history.length : (distribution[key] ?? 0);
                                    if (key !== "all" && count === 0) return null;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setFilter(key)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                                   font-semibold border transition-all duration-150
                                   ${filterSeverity === key
                                                    ? "bg-gray-200 border-gray-400 text-white"
                                                    : "bg-gray-50 border-gray-300 text-gray-500 hover:border-gray-400"
                                                }`}
                                        >
                                            <Filter
                                                size={10}
                                                className={filterSeverity === key ? color : ""}
                                            />
                                            {label}
                                            <span
                                                className={`text-[10px] ${filterSeverity === key ? color : "text-slate-600"}`}
                                            >
                                                ({count})
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Chart toggle ── */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp size={17} className="text-clinical-400" />
                                Hb Trend Chart
                            </h2>
                            <button
                                onClick={() => setShowChart((v) => !v)}
                                className="text-xs text-gray-500 hover:text-gray-700
                           flex items-center gap-1 transition-colors"
                            >
                                {showChart ? "Hide" : "Show"}
                                <ChevronRight
                                    size={13}
                                    className={`transition-transform ${showChart ? "rotate-90" : ""}`}
                                />
                            </button>
                        </div>

                        {showChart && <HbChart />}

                        {/* ── Scan log ── */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <History size={17} className="text-clinical-400" />
                                    All Scans
                                    {filterSeverity !== "all" && (
                                        <span className="text-xs text-gray-500 font-normal ml-1">
                                            — filtered: {filterSeverity}
                                        </span>
                                    )}
                                </h2>

                                {history.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="text-xs text-slate-600 hover:text-red-400
                               flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {filtered.length === 0 ? (
                                <div className="card text-center py-8">
                                    <p className="text-gray-500 text-sm">
                                        No scans match the "{filterSeverity}" filter.
                                    </p>
                                    <button
                                        onClick={() => setFilter("all")}
                                        className="mt-3 text-xs text-clinical-400 hover:underline"
                                    >
                                        Show all scans
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filtered.map((entry, i) => (
                                        <HistoryCard
                                            key={`${entry.date}-${i}`}
                                            entry={entry}
                                            index={i}
                                            onDelete={() => handleDelete(history.indexOf(entry))}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Actions row ── */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200">
                            <button
                                onClick={() => navigate("/scan")}
                                className="btn-primary flex-1"
                            >
                                <ScanLine size={15} />
                                New Scan
                            </button>
                            <button
                                onClick={() => navigate("/results")}
                                className="btn-secondary flex-1"
                                disabled={!state.session.hbResult}
                            >
                                <Activity size={15} />
                                View Last Result
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
