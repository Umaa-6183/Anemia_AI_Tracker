import React, { useState } from "react";
import {
    Salad,
    Heart,
    ChevronDown,
    ChevronUp,
    Lightbulb,
    AlertTriangle,
    CheckCircle2,
    BookOpen,
    Leaf,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import remediesData from "../data/remedies.json";

/* ─── Severity colour map ───────────────────────────── */
const SEVERITY_THEME = {
    normal: {
        border: "border-green-800/60",
        bg: "bg-green-900/20",
        icon: "text-green-400",
        badge: "bg-green-900/40 text-green-300 border-green-800",
    },
    mild: {
        border: "border-yellow-800/60",
        bg: "bg-yellow-900/20",
        icon: "text-yellow-400",
        badge: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
    },
    moderate: {
        border: "border-orange-800/60",
        bg: "bg-orange-900/20",
        icon: "text-orange-400",
        badge: "bg-orange-900/40 text-orange-300 border-orange-800",
    },
    severe: {
        border: "border-red-800/60",
        bg: "bg-red-900/20",
        icon: "text-red-400",
        badge: "bg-red-900/40 text-red-300 border-red-800",
    },
};

/* ─── Single tip card ───────────────────────────────── */
function TipCard({ tip, index }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className="border border-slate-700 rounded-xl overflow-hidden
                    hover:border-slate-600 transition-all duration-150"
        >
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left
                   bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
            >
                {/* Emoji icon */}
                <span className="text-xl flex-shrink-0 leading-none mt-0.5">
                    {tip.icon}
                </span>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-200 leading-snug">
                            {tip.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] text-slate-600 font-mono">
                                #{index + 1}
                            </span>
                            {expanded ? (
                                <ChevronUp size={13} className="text-slate-500" />
                            ) : (
                                <ChevronDown size={13} className="text-slate-500" />
                            )}
                        </div>
                    </div>
                    {!expanded && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {tip.detail}
                        </p>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-700/60 animate-fade-in">
                    <p className="text-xs text-slate-300 leading-relaxed">{tip.detail}</p>
                </div>
            )}
        </div>
    );
}

/* ─── Tab button ────────────────────────────────────── */
function TabBtn({ active, onClick, icon: Icon, label, count }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  transition-all duration-150 border
                  ${active
                    ? "bg-clinical-900/60 border-clinical-700 text-clinical-200"
                    : "bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
        >
            <Icon size={14} />
            {label}
            <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                         ${active ? "bg-clinical-700 text-white" : "bg-slate-700 text-slate-400"}`}
            >
                {count}
            </span>
        </button>
    );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function RemediesEngine() {
    const { state } = useApp();
    const severity = state.session.hbResult?.severity ?? "normal";
    const data = remediesData[severity] ?? remediesData.normal;
    const theme = SEVERITY_THEME[severity] ?? SEVERITY_THEME.normal;
    const [tab, setTab] = useState("dietary");

    const tips = tab === "dietary" ? data.dietary : data.lifestyle;

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h3 className="section-title flex items-center gap-2">
                        <Leaf size={16} className="text-green-400" />
                        Remedies & Action Plan
                    </h3>
                    <p className="section-subtitle">
                        Evidence-based tips tailored to your severity tier
                    </p>
                </div>

                {/* Severity badge */}
                <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border ${theme.badge}`}
                >
                    {data.label}
                </span>
            </div>

            {/* ── Severity summary card ── */}
            <div
                className={`border ${theme.border} ${theme.bg} rounded-xl p-4 space-y-2`}
            >
                <div className="flex items-start gap-2.5">
                    {severity === "normal" ? (
                        <CheckCircle2
                            size={16}
                            className={`${theme.icon} flex-shrink-0 mt-0.5`}
                        />
                    ) : (
                        <AlertTriangle
                            size={16}
                            className={`${theme.icon} flex-shrink-0 mt-0.5`}
                        />
                    )}
                    <div>
                        <p className={`text-sm font-semibold ${theme.icon}`}>
                            {data.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {data.description}
                        </p>
                    </div>
                </div>
                <p className="text-xs text-slate-600 pl-6">{data.range}</p>
            </div>

            {/* ── Tab switcher ── */}
            <div className="flex gap-2">
                <TabBtn
                    active={tab === "dietary"}
                    onClick={() => setTab("dietary")}
                    icon={Salad}
                    label="Dietary"
                    count={data.dietary.length}
                />
                <TabBtn
                    active={tab === "lifestyle"}
                    onClick={() => setTab("lifestyle")}
                    icon={Heart}
                    label="Lifestyle"
                    count={data.lifestyle.length}
                />
            </div>

            {/* ── Tips list ── */}
            <div className="space-y-2">
                {tips.map((tip, i) => (
                    <TipCard key={tip.id} tip={tip} index={i} />
                ))}
            </div>

            {/* ── All-severities quick reference ── */}
            <div className="border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60">
                    <BookOpen size={13} className="text-slate-500" />
                    <p className="text-xs font-semibold text-slate-400">
                        Quick Reference — All Severity Tiers
                    </p>
                </div>
                <div className="divide-y divide-slate-800">
                    {Object.entries(remediesData).map(([key, val]) => (
                        <div
                            key={key}
                            className={`flex items-center justify-between px-4 py-3
                           ${key === severity ? "bg-slate-800/40" : ""}`}
                        >
                            <div className="flex items-center gap-2">
                                {key === severity && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-clinical-400" />
                                )}
                                <span
                                    className={`text-xs font-medium
                                   ${SEVERITY_THEME[key]?.icon ?? "text-slate-400"}`}
                                >
                                    {val.label}
                                </span>
                            </div>
                            <span className="text-xs text-slate-600 font-mono">
                                {val.range}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Disclaimer ── */}
            <div className="flex gap-2 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
                <Lightbulb size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                    These recommendations are evidence-based lifestyle and dietary tips,
                    not medical prescriptions. Always consult a qualified healthcare
                    professional before starting any supplement regimen or making
                    significant dietary changes.
                </p>
            </div>
        </div>
    );
}
