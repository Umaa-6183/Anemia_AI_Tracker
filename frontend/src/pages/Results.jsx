import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    Eye,
    FlaskConical,
    ClipboardList,
    Leaf,
    FileDown,
    ScanLine,
    ChevronLeft,
    LayoutDashboard,
    ChevronRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import StepIndicator, { MiniStepIndicator } from "../components/StepIndicator";
import Dashboard from "../components/Dashboard";
import HbChart from "../components/HbChart";
import SymptomChecker from "../components/SymptomChecker";
import LabSync from "../components/LabSync";
import RemediesEngine from "../components/RemediesEngine";
import PDFReport from "../components/PDFReport";

/* ── Tab definitions with unique colours ─────────── */
const TABS = [
    {
        id: "dashboard",
        label: "Dashboard",
        shortLabel: "Result",
        Icon: LayoutDashboard,
        step: 4,
        color: "#2563EB",
        bg: "#EFF6FF",
        border: "#BFDBFE",
    },
    {
        id: "symptoms",
        label: "Symptoms",
        shortLabel: "Symptoms",
        Icon: ClipboardList,
        step: 5,
        color: "#E11D48",
        bg: "#FFF1F2",
        border: "#FECDD3",
    },
    {
        id: "labs",
        label: "Lab Sync",
        shortLabel: "Labs",
        Icon: FlaskConical,
        step: 5,
        color: "#0D9488",
        bg: "#F0FDFA",
        border: "#99F6E4",
    },
    {
        id: "chart",
        label: "Hb Trend",
        shortLabel: "Trend",
        Icon: Activity,
        step: 4,
        color: "#7C3AED",
        bg: "#F5F3FF",
        border: "#DDD6FE",
    },
    {
        id: "remedies",
        label: "Remedies",
        shortLabel: "Remedies",
        Icon: Leaf,
        step: 5,
        color: "#16A34A",
        bg: "#F0FDF4",
        border: "#86EFAC",
    },
    {
        id: "report",
        label: "PDF Report",
        shortLabel: "Report",
        Icon: FileDown,
        step: 6,
        color: "#4F46E5",
        bg: "#EEF2FF",
        border: "#C7D2FE",
    },
];

function TabButton({ tab, active, onClick, hasResult }) {
    const needsScan = ["symptoms", "remedies", "report"].includes(tab.id);
    const disabled = needsScan && !hasResult;

    return (
        <button
            type="button"
            onClick={() => !disabled && onClick(tab.id)}
            disabled={disabled}
            title={disabled ? "Complete a scan first" : tab.label}
            className="relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 whitespace-nowrap"
            style={{
                background: active ? tab.bg : disabled ? "#F8FAFC" : "#fff",
                color: active ? tab.color : disabled ? "#CBD5E1" : "#475569",
                border: active ? `1.5px solid ${tab.border}` : "1.5px solid #E2E8F0",
                cursor: disabled ? "not-allowed" : "pointer",
                boxShadow: active ? `0 2px 8px ${tab.color}20` : "none",
            }}
        >
            <tab.Icon size={13} />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
            {active && (
                <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full border-2 border-white"
                    style={{ background: tab.color }}
                />
            )}
        </button>
    );
}

export default function Results() {
    const navigate = useNavigate();
    const { state, setStep } = useApp();
    const [activeTab, setActiveTab] = useState("dashboard");

    const hasResult = !!state.session.hbResult;
    const hasProfile = !!state.profile;
    const result = state.session.hbResult;
    const activeTabObj = TABS.find((t) => t.id === activeTab);

    function handleTabChange(id) {
        setActiveTab(id);
        const tab = TABS.find((t) => t.id === id);
        if (tab) setStep(tab.step);
    }

    const activeIdx = TABS.findIndex((t) => t.id === activeTab);
    const prevTab = activeIdx > 0 ? TABS[activeIdx - 1] : null;
    const nextTab = activeIdx < TABS.length - 1 ? TABS[activeIdx + 1] : null;
    const nextDisabled =
        nextTab &&
        ["symptoms", "remedies", "report"].includes(nextTab.id) &&
        !hasResult;

    /* ── No scan guard ─────────────────────────────── */
    if (!hasResult) {
        return (
            <div
                className="min-h-screen flex items-center justify-center px-4"
                style={{ background: "#fff" }}
            >
                <div className="card text-center max-w-sm w-full py-12 space-y-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                        style={{ background: "#EFF6FF" }}
                    >
                        <Activity size={26} style={{ color: "#2563EB" }} />
                    </div>
                    <div>
                        <p className="font-bold text-lg" style={{ color: "#0F172A" }}>
                            No Scan Result Yet
                        </p>
                        <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                            Run a scan to see your Haemoglobin estimate and full dashboard.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/scan")}
                        className="btn-primary mx-auto"
                    >
                        <ScanLine size={15} /> Go to Scan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen animate-fade-in"
            style={{ background: "#fff" }}
        >
            {/* ── Page header ─────────────────────────────── */}
            <div
                style={{
                    background: activeTabObj?.bg || "#EFF6FF",
                    borderBottom: `2px solid ${activeTabObj?.border || "#BFDBFE"}`,
                }}
            >
                <div className="max-w-4xl mx-auto px-4 pt-8 pb-5">
                    {/* Back button */}
                    <button
                        onClick={() => navigate("/scan")}
                        className="flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
                        style={{ color: "#64748B" }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color = activeTabObj?.color || "#2563EB")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                    >
                        <ChevronLeft size={14} /> Back to Scan
                    </button>

                    <StepIndicator currentStep={activeTabObj?.step ?? 4} />

                    {/* Title row */}
                    <div className="mt-5 flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <h1
                                className="text-2xl font-extrabold flex items-center gap-2.5"
                                style={{ color: activeTabObj?.color || "#2563EB" }}
                            >
                                <LayoutDashboard size={22} />
                                Results Dashboard
                            </h1>
                            <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
                                {hasProfile ? `${state.profile.name} · ` : ""}
                                {Number(result.hb).toFixed(1)} g/dL · {result.severityLabel}
                            </p>
                        </div>
                        <MiniStepIndicator currentStep={activeTabObj?.step ?? 4} />
                    </div>
                </div>
            </div>

            {/* ── Tab bar ──────────────────────────────────── */}
            <div
                className="sticky top-16 z-30 shadow-sm"
                style={{
                    background: "rgba(255,255,255,0.97)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1.5px solid #E2E8F0",
                }}
            >
                <div className="max-w-4xl mx-auto px-4">
                    <div
                        className="flex items-center gap-2 py-2.5 overflow-x-auto pb-2.5"
                        style={{ scrollbarWidth: "thin" }}
                    >
                        {TABS.map((tab) => (
                            <TabButton
                                key={tab.id}
                                tab={tab}
                                active={activeTab === tab.id}
                                onClick={handleTabChange}
                                hasResult={hasResult}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tab content ──────────────────────────────── */}
            <div
                className="max-w-4xl mx-auto px-4 py-8"
                style={{ background: "#fff" }}
            >
                <div className="animate-fade-in" key={activeTab}>
                    {activeTab === "dashboard" && (
                        <div className="space-y-6">
                            <Dashboard />
                            <HbChart />
                        </div>
                    )}
                    {activeTab === "symptoms" && <SymptomChecker />}
                    {activeTab === "labs" && <LabSync />}
                    {activeTab === "chart" && <HbChart />}
                    {activeTab === "remedies" && <RemediesEngine />}
                    {activeTab === "report" && <PDFReport />}
                </div>

                {/* ── Bottom navigation ─────────────────────── */}
                <div
                    className="mt-10 pt-6 flex items-center justify-between gap-3 flex-wrap"
                    style={{ borderTop: "1.5px solid #E2E8F0" }}
                >
                    {/* Previous tab */}
                    {prevTab && (
                        <button
                            onClick={() => handleTabChange(prevTab.id)}
                            className="btn-secondary"
                            style={{ borderColor: prevTab.border, color: prevTab.color }}
                        >
                            <ChevronLeft size={15} /> {prevTab.label}
                        </button>
                    )}

                    {/* New scan */}
                    <button
                        onClick={() => navigate("/scan")}
                        className="btn-secondary ml-auto"
                    >
                        <ScanLine size={15} /> New Scan
                    </button>

                    {/* Next tab */}
                    {nextTab && (
                        <button
                            onClick={() => !nextDisabled && handleTabChange(nextTab.id)}
                            disabled={nextDisabled}
                            className="btn-primary"
                            style={{
                                background: nextDisabled ? "#E2E8F0" : nextTab.color,
                                boxShadow: nextDisabled
                                    ? "none"
                                    : `0 2px 8px ${nextTab.color}30`,
                            }}
                        >
                            {nextTab.label} <ChevronRight size={15} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
