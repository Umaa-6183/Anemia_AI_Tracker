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

/* ── Severity themes (white-background safe) ────── */
const SEV_THEME = {
    normal: {
        border: "#86EFAC",
        bg: "#F0FDF4",
        iconColor: "#16A34A",
        headingColor: "#15803D",
        badgeBg: "#DCFCE7",
        badgeText: "#14532D",
        badgeBorder: "#86EFAC",
    },
    mild: {
        border: "#FDE68A",
        bg: "#FFFBEB",
        iconColor: "#D97706",
        headingColor: "#92400E",
        badgeBg: "#FEF3C7",
        badgeText: "#78350F",
        badgeBorder: "#FDE68A",
    },
    moderate: {
        border: "#FDBA74",
        bg: "#FFF7ED",
        iconColor: "#EA580C",
        headingColor: "#9A3412",
        badgeBg: "#FFEDD5",
        badgeText: "#7C2D12",
        badgeBorder: "#FDBA74",
    },
    severe: {
        border: "#FCA5A5",
        bg: "#FEF2F2",
        iconColor: "#DC2626",
        headingColor: "#991B1B",
        badgeBg: "#FEE2E2",
        badgeText: "#7F1D1D",
        badgeBorder: "#FCA5A5",
    },
};

/* Strip ALL emoji and non-printable characters */
function stripEmoji(str) {
    if (!str) return "";
    return String(str)
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
        .replace(/[\u{2600}-\u{27BF}]/gu, "")
        .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
        .replace(/[^\x20-\x7E\u00C0-\u024F]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/* ── Single expandable tip card ─────────────────── */
function TipCard({ tip, index }) {
    const [open, setOpen] = useState(false);
    const cleanTitle = stripEmoji(tip.title);

    return (
        <div
            className="rounded-xl overflow-hidden transition-all duration-150"
            style={{ border: "1.5px solid #E2E8F0" }}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ background: open ? "#F8FAFC" : "#FFFFFF" }}
            >
                {/* Number badge */}
                <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{
                        background: "#EFF6FF",
                        color: "#2563EB",
                        border: "1.5px solid #BFDBFE",
                    }}
                >
                    {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                        {cleanTitle}
                    </p>
                    {!open && (
                        <p
                            className="text-xs mt-0.5"
                            style={{
                                color: "#94A3B8",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {stripEmoji(tip.detail)}
                        </p>
                    )}
                </div>

                <div className="flex-shrink-0 ml-2">
                    {open ? (
                        <ChevronUp size={13} style={{ color: "#64748B" }} />
                    ) : (
                        <ChevronDown size={13} style={{ color: "#64748B" }} />
                    )}
                </div>
            </button>

            {open && (
                <div
                    className="px-4 py-3 animate-fade-in"
                    style={{ background: "#F8FAFC", borderTop: "1.5px solid #E2E8F0" }}
                >
                    <p className="text-xs leading-relaxed" style={{ color: "#334155" }}>
                        {stripEmoji(tip.detail)}
                    </p>
                </div>
            )}
        </div>
    );
}

/* ── Tab button ─────────────────────────────────── */
function TabBtn({ active, onClick, Icon, label, count, color }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{
                background: active ? `${color}12` : "#F8FAFC",
                color: active ? color : "#64748B",
                border: `1.5px solid ${active ? color + "50" : "#E2E8F0"}`,
                boxShadow: active ? `0 2px 8px ${color}20` : "none",
            }}
        >
            <Icon size={14} style={{ color: active ? color : "#94A3B8" }} />
            {label}
            <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{
                    background: active ? color : "#E2E8F0",
                    color: active ? "#fff" : "#64748B",
                }}
            >
                {count}
            </span>
        </button>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function RemediesEngine() {
    const { state } = useApp();
    const severity = state.session.hbResult?.severity ?? "normal";
    const data = remediesData[severity] ?? remediesData.normal;
    const theme = SEV_THEME[severity] ?? SEV_THEME.normal;
    const [tab, setTab] = useState("dietary");

    const tips = tab === "dietary" ? data.dietary : data.lifestyle;

    return (
        <div className="space-y-5">
            {/* ── Header ─────────────────────────────────── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="section-bar-green">
                    <h3 className="section-title" style={{ color: "#16A34A" }}>
                        Remedies &amp; Action Plan
                    </h3>
                    <p className="section-subtitle">
                        Evidence-based tips tailored to your severity tier
                    </p>
                </div>
                <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{
                        background: theme.badgeBg,
                        color: theme.badgeText,
                        border: `1.5px solid ${theme.badgeBorder}`,
                    }}
                >
                    {stripEmoji(data.label)}
                </span>
            </div>

            {/* ── Severity summary card ───────────────────── */}
            <div
                className="rounded-xl p-4"
                style={{ background: theme.bg, border: `1.5px solid ${theme.border}` }}
            >
                <div className="flex items-start gap-2.5">
                    {severity === "normal" ? (
                        <CheckCircle2
                            size={16}
                            style={{ color: theme.iconColor, flexShrink: 0, marginTop: 2 }}
                        />
                    ) : (
                        <AlertTriangle
                            size={16}
                            style={{ color: theme.iconColor, flexShrink: 0, marginTop: 2 }}
                        />
                    )}
                    <div>
                        <p
                            className="text-sm font-bold"
                            style={{ color: theme.headingColor }}
                        >
                            {stripEmoji(data.label)}
                        </p>
                        <p
                            className="text-xs mt-0.5 leading-relaxed"
                            style={{ color: "#475569" }}
                        >
                            {stripEmoji(data.description)}
                        </p>
                    </div>
                </div>
                <p
                    className="text-xs mt-2 pl-6 font-mono font-semibold"
                    style={{ color: "#94A3B8" }}
                >
                    {stripEmoji(data.range)}
                </p>
            </div>

            {/* ── Tab switcher ───────────────────────────── */}
            <div className="flex gap-2">
                <TabBtn
                    active={tab === "dietary"}
                    onClick={() => setTab("dietary")}
                    Icon={Salad}
                    label="Dietary"
                    count={data.dietary.length}
                    color="#16A34A"
                />
                <TabBtn
                    active={tab === "lifestyle"}
                    onClick={() => setTab("lifestyle")}
                    Icon={Heart}
                    label="Lifestyle"
                    count={data.lifestyle.length}
                    color="#2563EB"
                />
            </div>

            {/* ── Tips list ──────────────────────────────── */}
            <div className="space-y-2">
                {tips.map((tip, i) => (
                    <TipCard key={tip.id} tip={tip} index={i} />
                ))}
            </div>

            {/* ── All-tiers quick reference ───────────────── */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1.5px solid #E2E8F0" }}
            >
                <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}
                >
                    <BookOpen size={13} style={{ color: "#64748B" }} />
                    <p className="text-xs font-bold" style={{ color: "#334155" }}>
                        Quick Reference — All Severity Tiers
                    </p>
                </div>
                {Object.entries(remediesData).map(([key, val]) => {
                    const t = SEV_THEME[key] ?? SEV_THEME.normal;
                    return (
                        <div
                            key={key}
                            className="flex items-center justify-between px-4 py-3"
                            style={{
                                background: key === severity ? "#F8FAFC" : "#FFFFFF",
                                borderBottom: "1px solid #F1F5F9",
                            }}
                        >
                            <div className="flex items-center gap-2">
                                {key === severity && (
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: t.iconColor }}
                                    />
                                )}
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: t.headingColor }}
                                >
                                    {stripEmoji(val.label)}
                                </span>
                            </div>
                            <span
                                className="text-xs font-mono font-semibold"
                                style={{ color: "#94A3B8" }}
                            >
                                {stripEmoji(val.range)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* ── Disclaimer ─────────────────────────────── */}
            <div className="callout-warn flex gap-2">
                <Lightbulb
                    size={12}
                    style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }}
                />
                <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
                    These are evidence-based lifestyle and dietary tips, not medical
                    prescriptions. Always consult a qualified healthcare professional
                    before starting any supplement regimen or making significant dietary
                    changes.
                </p>
            </div>
        </div>
    );
}
