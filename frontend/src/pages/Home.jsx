import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Activity,
    ScanLine,
    FileText,
    ShieldCheck,
    Clock,
    Zap,
    ChevronRight,
    TrendingUp,
    Eye,
    Brain,
    BarChart2,
    AlertTriangle,
    Upload,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatDate, formatHb } from "../utils/helpers";

const FEATURES = [
    {
        Icon: Eye,
        title: "Conjunctival Imaging",
        desc: "AI analyses the inner lower eyelid — a clinically validated proxy for haemoglobin concentration.",
        color: "#2563EB",
        bg: "#EFF6FF",
        border: "#BFDBFE",
    },
    {
        Icon: Brain,
        title: "Edge AI Inference",
        desc: "Custom 4-layer CNN processes your image on the server with sub-second inference using TensorFlow.",
        color: "#7C3AED",
        bg: "#F5F3FF",
        border: "#DDD6FE",
    },
    {
        Icon: BarChart2,
        title: "Grad-CAM Explainability",
        desc: "See exactly which pixels drove the Hb estimate through a colour-coded heatmap.",
        color: "#D97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
    },
    {
        Icon: FileText,
        title: "Hospital-Grade PDF",
        desc: "One tap generates a shareable clinical PDF with Hb score, Grad-CAM, symptom log, and lab history.",
        color: "#16A34A",
        bg: "#F0FDF4",
        border: "#86EFAC",
    },
    {
        Icon: Upload,
        title: "Upload or Live Scan",
        desc: "Capture live with your camera or upload an existing eyelid photo — full flexibility for any setting.",
        color: "#0D9488",
        bg: "#F0FDFA",
        border: "#99F6E4",
    },
    {
        Icon: TrendingUp,
        title: "Longitudinal Tracking",
        desc: "Every scan logs your Hb over time. The trend chart helps you and your doctor spot improvements or deterioration.",
        color: "#E11D48",
        bg: "#FFF1F2",
        border: "#FECDD3",
    },
];

const SEVERITY_ROWS = [
    {
        tier: "Normal",
        male: "≥ 13.0",
        female: "≥ 12.0",
        pregnant: "≥ 11.0",
        color: "#16A34A",
        dot: "#22C55E",
    },
    {
        tier: "Mild Anemia",
        male: "11–12.9",
        female: "10–11.9",
        pregnant: "10–10.9",
        color: "#D97706",
        dot: "#F59E0B",
    },
    {
        tier: "Moderate Anemia",
        male: "8–10.9",
        female: "8–9.9",
        pregnant: "7–9.9",
        color: "#EA580C",
        dot: "#F97316",
    },
    {
        tier: "Severe Anemia",
        male: "< 8.0",
        female: "< 8.0",
        pregnant: "< 7.0",
        color: "#DC2626",
        dot: "#EF4444",
    },
];

function useCounter(target, duration = 1200) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const step = Math.ceil(target / (duration / 16));
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            setCount(start);
            if (start >= target) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
}

function StatTile({ value, suffix, label, color }) {
    const count = useCounter(value);
    return (
        <div
            className="text-center p-4 rounded-2xl"
            style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
        >
            <p className="text-3xl md:text-4xl font-extrabold" style={{ color }}>
                {count}
                <span className="text-xl" style={{ color }}>
                    {suffix}
                </span>
            </p>
            <p
                className="text-xs mt-1 font-semibold uppercase tracking-wide"
                style={{ color: "#64748B" }}
            >
                {label}
            </p>
        </div>
    );
}

export default function Home() {
    const navigate = useNavigate();
    const { state } = useApp();
    const hasProfile = !!state.profile;
    const lastScan = state.hbHistory[0] ?? null;

    return (
        <div className="animate-fade-in" style={{ background: "#fff" }}>
            {/* ── HERO ─────────────────────────────────── */}
            <section
                className="relative overflow-hidden pt-20 pb-20 px-4"
                style={{
                    background: "linear-gradient(180deg,#F8FAFF 0%,#FFFFFF 100%)",
                }}
            >
                <div className="absolute inset-0 pointer-events-none">
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] opacity-30"
                        style={{
                            background: "radial-gradient(ellipse,#BFDBFE 0%,transparent 70%)",
                        }}
                    />
                </div>
                <div className="relative max-w-4xl mx-auto text-center space-y-6">
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
                        style={{
                            background: "#EFF6FF",
                            border: "1.5px solid #BFDBFE",
                            color: "#2563EB",
                        }}
                    >
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        AI-Powered · Non-Invasive · Under 60 Seconds for Results
                    </div>
                    <h1
                        className="text-4xl md:text-6xl font-extrabold leading-tight"
                        style={{ color: "#0F172A" }}
                    >
                        Detect Anemia with{" "}
                        <span className="gradient-text">Your Camera</span>
                    </h1>
                    <p
                        className="max-w-2xl mx-auto text-base md:text-lg leading-relaxed"
                        style={{ color: "#475569" }}
                    >
                        Anemia Tracker estimates your Haemoglobin level by analysing a
                        photo of your conjunctiva (inner lower eyelid). No needles, no lab
                        visit — take 2 minutes to scan, get AI results in under 60 seconds.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        {hasProfile ? (
                            <>
                                <button
                                    onClick={() => navigate("/scan")}
                                    className="btn-primary text-base py-3.5 px-8"
                                >
                                    <ScanLine size={18} /> Start New Scan
                                </button>
                                <button
                                    onClick={() => navigate("/history")}
                                    className="btn-secondary text-base py-3.5 px-8"
                                >
                                    <BarChart2 size={18} /> View History
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/profile"
                                    className="btn-primary text-base py-3.5 px-8"
                                >
                                    <Activity size={18} /> Get Started Free{" "}
                                    <ChevronRight size={16} />
                                </Link>
                                <a
                                    href="#how-it-works"
                                    className="btn-secondary text-base py-3.5 px-8"
                                >
                                    How It Works
                                </a>
                            </>
                        )}
                    </div>
                    <p
                        className="text-xs flex items-center justify-center gap-1.5"
                        style={{ color: "#94A3B8" }}
                    >
                        <AlertTriangle size={11} style={{ color: "#D97706" }} />
                        Screening tool only — does not replace professional diagnosis
                    </p>
                </div>
            </section>

            {/* ── RETURNING USER BANNER ──────────────────── */}
            {hasProfile && lastScan && (
                <section
                    className="px-4 py-4"
                    style={{
                        background: "#EFF6FF",
                        borderTop: "1.5px solid #BFDBFE",
                        borderBottom: "1.5px solid #BFDBFE",
                    }}
                >
                    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: "#2563EB" }}
                            >
                                <Activity size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                                    Welcome back, {state.profile.name}
                                </p>
                                <p className="text-xs" style={{ color: "#475569" }}>
                                    Last scan:{" "}
                                    <span className="font-bold" style={{ color: "#2563EB" }}>
                                        {formatHb(lastScan.hb)}
                                    </span>{" "}
                                    · {formatDate(lastScan.date)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate("/scan")}
                            className="btn-primary text-sm py-2 px-5"
                        >
                            <ScanLine size={14} /> New Scan
                        </button>
                    </div>
                </section>
            )}

            {/* ── STATS BAR ──────────────────────────────── */}
            <section
                className="px-4 py-10"
                style={{ background: "#fff", borderBottom: "1.5px solid #E2E8F0" }}
            >
                <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatTile
                        value={2}
                        suffix=" min"
                        label="Max scan time"
                        color="#2563EB"
                    />
                    <StatTile
                        value={60}
                        suffix="s"
                        label="Results time"
                        color="#7C3AED"
                    />
                    <StatTile
                        value={4}
                        suffix=""
                        label="Severity tiers"
                        color="#0D9488"
                    />
                    <StatTile
                        value={100}
                        suffix="+"
                        label="Dietary tips"
                        color="#E11D48"
                    />
                </div>
            </section>

            {/* ── HOW IT WORKS ───────────────────────────── */}
            <section id="how-it-works" className="px-4 py-16 max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h2
                        className="text-2xl md:text-3xl font-extrabold"
                        style={{ color: "#2563EB" }}
                    >
                        How It Works
                    </h2>
                    <p className="mt-2 text-sm" style={{ color: "#64748B" }}>
                        Six steps from camera to clinical report
                    </p>
                </div>
                <div className="space-y-4">
                    {[
                        {
                            n: 1,
                            title: "Patient Profile",
                            desc: "Enter age, sex, and pregnancy status. These feed into the model's final dense layers for a personalised Hb estimate.",
                            color: "#2563EB",
                            bg: "#EFF6FF",
                        },
                        {
                            n: 2,
                            title: "Live Camera or Upload",
                            desc: "Use your webcam (auto-captures when frame is sharp) or upload an existing eyelid photo. You have a full 2 minutes to scan.",
                            color: "#7C3AED",
                            bg: "#F5F3FF",
                        },
                        {
                            n: 3,
                            title: "CNN Inference",
                            desc: "A 4-layer convolutional network analyses conjunctival vascularity to output a continuous Hb value — results in under 60s.",
                            color: "#0D9488",
                            bg: "#F0FDFA",
                        },
                        {
                            n: 4,
                            title: "Dashboard & Grad-CAM",
                            desc: "Your Hb result appears with a WHO severity tier and a Grad-CAM heatmap highlighting the pixels that drove the prediction.",
                            color: "#D97706",
                            bg: "#FFFBEB",
                        },
                        /*{
                            n: 5,
                            title: "Symptom & Lab Sync",
                            desc: "Check your symptoms and optionally enter recent blood-work (RBC, WBC, Ferritin) for a complete holistic report.",
                            color: "#E11D48",
                            bg: "#FFF1F2",
                        },*/
                        {
                            n: 5,
                            title: "Summary PDF Report",
                            desc: "Download a hospital-grade PDF with all findings, heatmap, lab table, remedies, and a strict clinical disclaimer.",
                            color: "#16A34A",
                            bg: "#F0FDF4",
                        },
                    ].map(({ n, title, desc, color, bg }) => (
                        <div key={n} className="flex gap-4 items-start">
                            <div
                                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md"
                                style={{ background: color }}
                            >
                                {n}
                            </div>
                            <div
                                className="card flex-1"
                                style={{ borderLeft: `4px solid ${color}`, background: bg }}
                            >
                                <p className="font-bold text-sm" style={{ color }}>
                                    {title}
                                </p>
                                <p
                                    className="text-xs mt-1 leading-relaxed"
                                    style={{ color: "#475569" }}
                                >
                                    {desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURE GRID ───────────────────────────── */}
            <section className="px-4 py-16" style={{ background: "#F8FAFC" }}>
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-10">
                        <h2
                            className="text-2xl md:text-3xl font-extrabold"
                            style={{ color: "#7C3AED" }}
                        >
                            Everything You Need
                        </h2>
                        <p className="mt-2 text-sm" style={{ color: "#64748B" }}>
                            Clinical-grade features in a single browser tab
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map(({ Icon, title, desc, color, bg, border }) => (
                            <div
                                key={title}
                                className="card-hover"
                                style={{ borderColor: border, background: bg }}
                            >
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                                    style={{
                                        background: "#fff",
                                        border: `1.5px solid ${border}`,
                                    }}
                                >
                                    <Icon size={18} style={{ color }} />
                                </div>
                                <p className="font-bold text-sm mb-1.5" style={{ color }}>
                                    {title}
                                </p>
                                <p
                                    className="text-xs leading-relaxed"
                                    style={{ color: "#475569" }}
                                >
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── WHO REFERENCE TABLE ────────────────────── */}
            <section className="px-4 py-16 max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-extrabold" style={{ color: "#0D9488" }}>
                        WHO Reference Ranges
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                        Haemoglobin thresholds (g/dL) used by the AI classifier
                    </p>
                </div>
                <div className="card overflow-x-auto">
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.875rem",
                        }}
                    >
                        <thead>
                            <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                                {["Severity", "Male", "Female", "Pregnant"].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            textAlign: h === "Severity" ? "left" : "center",
                                            color: "#334155",
                                            fontWeight: 700,
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SEVERITY_ROWS.map(
                                ({ tier, male, female, pregnant, color, dot }) => (
                                    <tr key={tier} style={{ borderBottom: "1px solid #F1F5F9" }}>
                                        <td style={{ padding: "0.75rem 1rem" }}>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ background: dot, flexShrink: 0 }}
                                                />
                                                <span style={{ fontWeight: 700, color }}>{tier}</span>
                                            </div>
                                        </td>
                                        {[male, female, pregnant].map((v, i) => (
                                            <td
                                                key={i}
                                                style={{
                                                    padding: "0.75rem 1rem",
                                                    textAlign: "center",
                                                    fontFamily: "JetBrains Mono,monospace",
                                                    fontWeight: 600,
                                                    color,
                                                }}
                                            >
                                                {v}
                                            </td>
                                        ))}
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── BOTTOM CTA ─────────────────────────────── */}
            <section
                className="px-4 py-16"
                style={{
                    background: "linear-gradient(180deg,#FFFFFF 0%,#EFF6FF 100%)",
                }}
            >
                <div className="max-w-2xl mx-auto text-center space-y-5">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md"
                        style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
                    >
                        <Clock size={26} className="text-white" />
                    </div>
                    <h2
                        className="text-2xl md:text-3xl font-extrabold"
                        style={{ color: "#0F172A" }}
                    >
                        Ready for your 2-minute scan?
                    </h2>
                    <p className="text-sm" style={{ color: "#475569" }}>
                        Set up your patient profile once — scan anytime with your camera or
                        by uploading an image.
                    </p>
                    <Link
                        to={hasProfile ? "/scan" : "/profile"}
                        className="btn-primary text-base py-3.5 px-10 inline-flex"
                    >
                        <Zap size={18} /> {hasProfile ? "Start Scan Now" : "Create Profile"}{" "}
                        <ChevronRight size={16} />
                    </Link>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                        All data stays on your device. Nothing shared with third parties.
                    </p>
                </div>
            </section>

            {/* ── FOOTER ─────────────────────────────────── */}
            <footer
                style={{
                    borderTop: "1.5px solid #E2E8F0",
                    padding: "1.5rem 1rem",
                    textAlign: "center",
                    background: "#F8FAFC",
                }}
            >
                <p
                    className="text-xs leading-relaxed max-w-2xl mx-auto"
                    style={{ color: "#64748B" }}
                >
                    <strong style={{ color: "#334155" }}>Clinical Disclaimer:</strong>{" "}
                    This application utilises AI-estimated Haemoglobin based on
                    conjunctival imaging. It is an adjunctive screening tool and does not
                    replace phlebotomy or professional medical diagnosis.
                </p>
                <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
                    Anemia Tracker · Final Year Project · {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
}
