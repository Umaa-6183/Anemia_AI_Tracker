import React, { useState } from "react";
import {
    Activity,
    Info,
    ZoomIn,
    ZoomOut,
    X,
    Eye,
    Layers,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
    formatHb,
    formatDateTime,
    formatConfidence,
    classifySeverity,
    hbToPercent,
    normalRangeLabel,
} from "../utils/helpers";

const SEV_THEME = {
    normal: {
        bg: "#F0FDF4",
        border: "#86EFAC",
        text: "#15803D",
        badge: "#16A34A",
        light: "#DCFCE7",
    },
    mild: {
        bg: "#FFFBEB",
        border: "#FDE68A",
        text: "#92400E",
        badge: "#D97706",
        light: "#FEF3C7",
    },
    moderate: {
        bg: "#FFF7ED",
        border: "#FDBA74",
        text: "#9A3412",
        badge: "#EA580C",
        light: "#FFEDD5",
    },
    severe: {
        bg: "#FEF2F2",
        border: "#FCA5A5",
        text: "#991B1B",
        badge: "#DC2626",
        light: "#FEE2E2",
    },
};

function HbGauge({ hb, sex, pregnancyStatus }) {
    const pct = hbToPercent(hb);
    const info = classifySeverity(hb, sex, pregnancyStatus);
    const colMap = {
        normal: "#16A34A",
        mild: "#D97706",
        moderate: "#EA580C",
        severe: "#DC2626",
    };
    const col = colMap[info.severity] || "#16A34A";
    const ticks = [7, 8, 10, 12, 13, 16].map((v) => ({
        pct: hbToPercent(v),
        label: String(v),
    }));
    return (
        <div className="space-y-2">
            <div
                className="relative h-5 rounded-full overflow-hidden"
                style={{ background: "#F1F5F9", border: "1.5px solid #E2E8F0" }}
            >
                <div
                    className="absolute inset-y-0 left-0 w-[44%]"
                    style={{ background: "rgba(220,38,38,0.1)" }}
                />
                <div
                    className="absolute inset-y-0 left-[44%] w-[12%]"
                    style={{ background: "rgba(234,88,12,0.1)" }}
                />
                <div
                    className="absolute inset-y-0 left-[56%] w-[11%]"
                    style={{ background: "rgba(217,119,6,0.1)" }}
                />
                <div
                    className="absolute inset-y-0 left-[67%] right-0"
                    style={{ background: "rgba(22,163,74,0.08)" }}
                />
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: col }}
                />
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow transition-all duration-700"
                    style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                />
            </div>
            <div className="relative h-4">
                {ticks.map(({ pct: p, label }) => (
                    <span
                        key={label}
                        className="absolute text-[9px] font-mono -translate-x-1/2"
                        style={{ left: `${p}%`, color: "#94A3B8" }}
                    >
                        {label}
                    </span>
                ))}
            </div>
            <div
                className="flex justify-between text-[10px] font-mono"
                style={{ color: "#CBD5E1" }}
            >
                <span>0 g/dL</span>
                <span>18 g/dL</span>
            </div>
        </div>
    );
}

function MetricTile({ label, value, sub, Icon, color, bg, border }) {
    return (
        <div
            className="rounded-xl p-3.5"
            style={{
                background: bg || "#F8FAFC",
                border: `1.5px solid ${border || "#E2E8F0"}`,
            }}
        >
            <div className="flex items-center gap-1.5 mb-2">
                {Icon && <Icon size={12} style={{ color: color || "#64748B" }} />}
                <p className="text-xs font-semibold" style={{ color: "#64748B" }}>
                    {label}
                </p>
            </div>
            <p
                className="text-lg font-bold font-mono"
                style={{ color: color || "#0F172A" }}
            >
                {value}
            </p>
            {sub && (
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                    {sub}
                </p>
            )}
        </div>
    );
}

function GradCamViewer({ src }) {
    const [open, setOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    if (!src)
        return (
            <div
                className="flex flex-col items-center justify-center h-40 gap-2 rounded-xl"
                style={{ background: "#F8FAFC", border: "1.5px dashed #E2E8F0" }}
            >
                <Eye size={24} style={{ color: "#CBD5E1" }} />
                <p className="text-xs" style={{ color: "#94A3B8" }}>
                    Grad-CAM unavailable — backend did not return a heatmap
                </p>
            </div>
        );
    return (
        <>
            <div
                className="relative group cursor-pointer"
                onClick={() => setOpen(true)}
            >
                <div className="heatmap-container w-full">
                    <img
                        src={src}
                        alt="Grad-CAM heatmap"
                        className="w-full rounded-xl object-cover max-h-56"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all flex items-center justify-center">
                        <ZoomIn
                            size={24}
                            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#64748B" }}>
                        Low
                    </span>
                    <div
                        className="flex-1 h-2 rounded-full"
                        style={{
                            background:
                                "linear-gradient(to right,#3B82F6,#22C55E,#EAB308,#EF4444)",
                        }}
                    />
                    <span className="text-xs" style={{ color: "#64748B" }}>
                        High
                    </span>
                </div>
                <p className="text-xs mt-1 text-center" style={{ color: "#94A3B8" }}>
                    Click to expand · Red = strongest Hb signal
                </p>
            </div>
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="relative max-w-3xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-3 right-3 flex gap-2 z-10">
                            {[
                                {
                                    Icon: ZoomIn,
                                    fn: () => setZoom((z) => Math.min(3, z + 0.5)),
                                },
                                {
                                    Icon: ZoomOut,
                                    fn: () => setZoom((z) => Math.max(0.5, z - 0.5)),
                                },
                                { Icon: X, fn: () => setOpen(false) },
                            ].map(({ Icon, fn }, i) => (
                                <button
                                    key={i}
                                    onClick={fn}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg"
                                    style={{ background: "#fff", border: "1.5px solid #E2E8F0" }}
                                >
                                    <Icon size={14} style={{ color: "#334155" }} />
                                </button>
                            ))}
                        </div>
                        <img
                            src={src}
                            alt="Grad-CAM expanded"
                            className="w-full rounded-2xl transition-transform duration-200"
                            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                        />
                        <div className="mt-4 flex items-center gap-3">
                            <span className="text-xs text-white/60">Low activity</span>
                            <div
                                className="flex-1 h-3 rounded-full"
                                style={{
                                    background:
                                        "linear-gradient(to right,#3B82F6,#22C55E,#EAB308,#EF4444)",
                                }}
                            />
                            <span className="text-xs text-white/60">High activity</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function SeverityAccordion({ severity }) {
    const [open, setOpen] = useState(false);
    const exp =
        {
            normal: {
                what: "Your Haemoglobin is within the clinically normal range.",
                why: "Normal Hb means red blood cells are carrying adequate oxygen. Continue your current diet.",
                next: "No immediate action required. Rescan in 3–6 months.",
            },
            mild: {
                what: "Your Hb is slightly below the WHO normal threshold — mild anaemia.",
                why: "Often caused by low dietary iron, folate, or B12. You may notice occasional fatigue.",
                next: "Dietary changes can correct mild anaemia in 4–8 weeks. See Remedies below. Consult a GP if no improvement after 6 weeks.",
            },
            moderate: {
                what: "Your Hb is moderately below threshold — moderate anaemia detected.",
                why: "Oxygen delivery to tissues is significantly impaired. You may feel persistent fatigue and dizziness.",
                next: "Please see a physician within 1–2 weeks for a full blood count and iron studies.",
            },
            severe: {
                what: "Your Hb is critically low — severe anaemia detected.",
                why: "Severe anaemia can strain the heart. This requires same-day or next-day medical evaluation.",
                next: "⚠ Seek medical attention within 24 hours. Download the PDF and bring it to your appointment.",
            },
        }[severity] || {};
    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1.5px solid #E2E8F0" }}
        >
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{ background: "#F8FAFC" }}
            >
                <span className="text-sm font-semibold" style={{ color: "#334155" }}>
                    What does this result mean?
                </span>
                {open ? (
                    <ChevronUp size={15} style={{ color: "#64748B" }} />
                ) : (
                    <ChevronDown size={15} style={{ color: "#64748B" }} />
                )}
            </button>
            {open && (
                <div
                    className="px-4 py-4 space-y-3 animate-fade-in"
                    style={{ background: "#fff" }}
                >
                    {[
                        ["Finding", exp.what],
                        ["Why it matters", exp.why],
                        ["Next steps", exp.next],
                    ].map(([label, text]) => (
                        <div key={label}>
                            <p
                                className="text-xs font-bold mb-0.5"
                                style={{ color: "#334155" }}
                            >
                                {label}
                            </p>
                            <p
                                className="text-xs leading-relaxed"
                                style={{ color: "#475569" }}
                            >
                                {text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    const { state } = useApp();
    const result = state.session.hbResult;
    const profile = state.profile;
    if (!result)
        return (
            <div className="card text-center py-10 space-y-3">
                <Activity size={32} style={{ color: "#CBD5E1", margin: "0 auto" }} />
                <p className="text-sm" style={{ color: "#64748B" }}>
                    No scan result available. Complete a scan first.
                </p>
            </div>
        );
    const sInfo = classifySeverity(
        result.hb,
        profile?.sex,
        profile?.pregnancyStatus,
    );
    const theme = SEV_THEME[sInfo.severity] || SEV_THEME.normal;
    const prev = state.hbHistory[1];
    const delta = prev ? (result.hb - prev.hb).toFixed(1) : null;
    const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
    const trendColor = delta > 0 ? "#16A34A" : delta < 0 ? "#DC2626" : "#64748B";

    return (
        <div className="space-y-5 animate-slide-up">
            {/* Hero result card */}
            <div
                className="card"
                style={{
                    borderColor: theme.border,
                    background: theme.bg,
                    borderWidth: "2px",
                }}
            >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={13} style={{ color: "#64748B" }} />
                            <p
                                className="text-xs font-semibold uppercase tracking-widest"
                                style={{ color: "#64748B" }}
                            >
                                Estimated Haemoglobin
                            </p>
                        </div>
                        <p
                            className="font-extrabold font-mono leading-none"
                            style={{ fontSize: "3.5rem", color: "#0F172A" }}
                        >
                            {Number(result.hb).toFixed(1)}
                            <span className="text-xl ml-2" style={{ color: "#64748B" }}>
                                g/dL
                            </span>
                        </p>
                        <p className="text-xs mt-2" style={{ color: "#64748B" }}>
                            Normal for you:{" "}
                            <span className="font-bold" style={{ color: "#334155" }}>
                                {normalRangeLabel(profile?.sex, profile?.pregnancyStatus)}
                            </span>
                        </p>
                    </div>
                    <div className="text-right space-y-2">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm text-white shadow-md"
                            style={{ background: theme.badge }}
                        >
                            {sInfo.severity === "normal" ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <AlertTriangle size={16} />
                            )}
                            {sInfo.label}
                        </div>
                        <p className="text-xs text-right" style={{ color: "#64748B" }}>
                            Confidence:{" "}
                            <span className="font-bold" style={{ color: "#334155" }}>
                                {formatConfidence(result.confidence)}
                            </span>
                        </p>
                        {delta !== null && (
                            <div
                                className="flex items-center justify-end gap-1"
                                style={{ color: trendColor }}
                            >
                                <TrendIcon size={13} />
                                <span className="text-xs font-semibold">
                                    {delta > 0 ? "+" : ""}
                                    {delta} vs last scan
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-5">
                    <HbGauge
                        hb={result.hb}
                        sex={profile?.sex}
                        pregnancyStatus={profile?.pregnancyStatus}
                    />
                </div>
                <p className="text-xs mt-3 text-right" style={{ color: "#94A3B8" }}>
                    {formatDateTime(result.timestamp)}
                </p>
            </div>

            {/* Metric tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricTile
                    label="Hb Level"
                    value={formatHb(result.hb)}
                    sub="AI estimate"
                    Icon={Activity}
                    color={theme.badge}
                    bg={theme.bg}
                    border={theme.border}
                />
                <MetricTile
                    label="Severity"
                    value={sInfo.label}
                    sub="WHO reference"
                    Icon={Layers}
                    color="#7C3AED"
                    bg="#F5F3FF"
                    border="#DDD6FE"
                />
                <MetricTile
                    label="Confidence"
                    value={formatConfidence(result.confidence)}
                    sub="Model certainty"
                    Icon={Info}
                    color="#0D9488"
                    bg="#F0FDFA"
                    border="#99F6E4"
                />
                <MetricTile
                    label="Processing"
                    value={
                        result.processing_time_ms ? `${result.processing_time_ms}ms` : "—"
                    }
                    sub="Inference time"
                    Icon={Activity}
                    color="#D97706"
                    bg="#FFFBEB"
                    border="#FDE68A"
                />
            </div>

            <SeverityAccordion severity={sInfo.severity} />

            {/* Grad-CAM section */}
            <div className="card">
                <div className="flex items-start justify-between mb-4">
                    <div className="section-bar-amber">
                        <h3 className="section-title h-amber">Grad-CAM Explainability</h3>
                        <p className="section-subtitle">
                            Heatmap showing which pixels drove the Hb prediction
                        </p>
                    </div>
                    <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                            background: "#FFFBEB",
                            color: "#D97706",
                            border: "1.5px solid #FDE68A",
                        }}
                    >
                        XAI
                    </span>
                </div>
                <GradCamViewer src={result.gradcam_image} />
                <div className="mt-3 callout-info flex gap-2">
                    <Info
                        size={13}
                        style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
                    />
                    <p className="text-xs leading-relaxed" style={{ color: "#1D4ED8" }}>
                        Grad-CAM back-propagates the output gradient to the last conv layer.
                        Warmer colours (red, yellow) indicate regions that most strongly
                        influenced the Hb estimate — typically areas of dense conjunctival
                        vascularity.
                    </p>
                </div>
            </div>

            {/* Severe warning */}
            {sInfo.severity === "severe" && (
                <div className="callout-danger flex gap-3 animate-pulse-slow">
                    <AlertTriangle
                        size={20}
                        style={{ color: "#DC2626", flexShrink: 0, marginTop: 2 }}
                    />
                    <div>
                        <p className="text-sm font-bold" style={{ color: "#991B1B" }}>
                            Urgent: Seek Medical Attention
                        </p>
                        <p
                            className="text-xs mt-1 leading-relaxed"
                            style={{ color: "#B91C1C" }}
                        >
                            An Hb below 8.0 g/dL requires same-day or next-day clinical
                            evaluation. Download the PDF and visit a healthcare provider
                            immediately.
                        </p>
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="callout-warn flex gap-2">
                <AlertTriangle
                    size={12}
                    style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }}
                />
                <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
                    AI-estimated Haemoglobin from conjunctival imaging. Adjunctive
                    screening tool only — does not replace phlebotomy or professional
                    medical diagnosis.
                </p>
            </div>
        </div>
    );
}
