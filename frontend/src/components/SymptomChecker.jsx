import React, { useState } from "react";
import {
    Activity,
    Zap,
    Wind,
    Thermometer,
    Eye,
    Heart,
    Brain,
    Moon,
    AlertTriangle,
    CheckSquare,
    Square,
    Info,
    ChevronDown,
    ChevronUp,
    ClipboardList,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const SYMPTOM_GROUPS = [
    {
        group: "Energy & Fatigue",
        Icon: Zap,
        color: "#D97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
        symptoms: [
            {
                id: "fatigue",
                label: "Persistent Fatigue",
                detail: "Feeling unusually tired even after adequate sleep",
                tiers: ["mild", "moderate", "severe"],
            },
            {
                id: "weakness",
                label: "Generalised Weakness",
                detail: "Muscles feel heavy or lack normal strength",
                tiers: ["moderate", "severe"],
            },
            {
                id: "exercise_intolerance",
                label: "Exercise Intolerance",
                detail: "Unusual breathlessness or fatigue during light activity",
                tiers: ["mild", "moderate", "severe"],
            },
        ],
    },
    {
        group: "Neurological",
        Icon: Brain,
        color: "#7C3AED",
        bg: "#F5F3FF",
        border: "#DDD6FE",
        symptoms: [
            {
                id: "dizziness",
                label: "Dizziness / Light-headedness",
                detail: "Feeling faint, especially when standing up quickly",
                tiers: ["mild", "moderate", "severe"],
            },
            {
                id: "headache",
                label: "Frequent Headaches",
                detail: "Recurring headaches not explained by other causes",
                tiers: ["mild", "moderate"],
            },
            {
                id: "concentration",
                label: "Difficulty Concentrating",
                detail: "Brain fog, trouble focusing, or poor memory",
                tiers: ["moderate", "severe"],
            },
        ],
    },
    {
        group: "Cardiovascular & Respiratory",
        Icon: Heart,
        color: "#E11D48",
        bg: "#FFF1F2",
        border: "#FECDD3",
        symptoms: [
            {
                id: "shortness_of_breath",
                label: "Shortness of Breath",
                detail: "Breathlessness at rest or with minimal exertion",
                tiers: ["moderate", "severe"],
            },
            {
                id: "palpitations",
                label: "Heart Palpitations",
                detail: "Noticeably rapid, strong, or irregular heartbeat",
                tiers: ["moderate", "severe"],
            },
            {
                id: "chest_pain",
                label: "Chest Pain or Tightness",
                detail: "Any chest discomfort — seek urgent care if severe",
                tiers: ["severe"],
                urgent: true,
            },
        ],
    },
    {
        group: "Physical Appearance",
        Icon: Eye,
        color: "#2563EB",
        bg: "#EFF6FF",
        border: "#BFDBFE",
        symptoms: [
            {
                id: "pale_skin",
                label: "Pale Skin or Complexion",
                detail: "Noticeable pallor in face, gums, or nail beds",
                tiers: ["mild", "moderate", "severe"],
            },
            {
                id: "pale_conjunctiva",
                label: "Pale Conjunctiva",
                detail: "Inner lower eyelid appears very pale pink or white",
                tiers: ["mild", "moderate", "severe"],
            },
            {
                id: "brittle_nails",
                label: "Brittle or Spoon-Shaped Nails",
                detail: "Nails that chip easily or curve upward (koilonychia)",
                tiers: ["moderate", "severe"],
            },
        ],
    },
    {
        group: "Temperature & Extremities",
        Icon: Thermometer,
        color: "#0D9488",
        bg: "#F0FDFA",
        border: "#99F6E4",
        symptoms: [
            {
                id: "cold_hands_feet",
                label: "Cold Hands & Feet",
                detail: "Extremities feel cold even in warm environments",
                tiers: ["mild", "moderate", "severe"],
            },
            {
                id: "cold_intolerance",
                label: "General Cold Intolerance",
                detail: "Feeling cold more than those around you",
                tiers: ["mild", "moderate"],
            },
        ],
    },
    {
        group: "Sleep & Restlessness",
        Icon: Moon,
        color: "#4F46E5",
        bg: "#EEF2FF",
        border: "#C7D2FE",
        symptoms: [
            {
                id: "restless_legs",
                label: "Restless Leg Syndrome",
                detail: "Uncomfortable urge to move legs, especially at night",
                tiers: ["mild", "moderate"],
            },
            {
                id: "poor_sleep",
                label: "Poor Sleep Quality",
                detail: "Difficulty falling or staying asleep despite tiredness",
                tiers: ["mild", "moderate"],
            },
        ],
    },
];

const TIER_COLORS = {
    mild: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
    moderate: { bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
    severe: { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
};

function TierBadge({ tier }) {
    const c = TIER_COLORS[tier] || {};
    return (
        <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}
        >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
    );
}

function SymptomRow({ symptom, checked, onToggle, currentSeverity }) {
    const { id, label, detail, tiers, urgent } = symptom;
    const relevant = currentSeverity && tiers.includes(currentSeverity);
    return (
        <button
            type="button"
            onClick={() => onToggle(id)}
            className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
            style={{
                background: checked ? "#EFF6FF" : urgent ? "#FEF2F2" : "#FFFFFF",
                border: `1.5px solid ${checked ? "#BFDBFE" : urgent ? "#FECACA" : "#E2E8F0"}`,
                marginBottom: "0.25rem",
            }}
        >
            <div
                className="flex-shrink-0 mt-0.5"
                style={{ color: checked ? "#2563EB" : "#CBD5E1" }}
            >
                {checked ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="text-sm font-semibold"
                        style={{
                            color: checked ? "#1D4ED8" : urgent ? "#991B1B" : "#0F172A",
                        }}
                    >
                        {label}
                    </span>
                    {urgent && (
                        <span
                            className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                                background: "#FEE2E2",
                                color: "#991B1B",
                                border: "1px solid #FECACA",
                            }}
                        >
                            <AlertTriangle size={8} /> URGENT
                        </span>
                    )}
                    {relevant && !checked && (
                        <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                                background: "#EFF6FF",
                                color: "#2563EB",
                                border: "1px solid #BFDBFE",
                            }}
                        >
                            Matches your result
                        </span>
                    )}
                </div>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "#64748B" }}>
                    {detail}
                </p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                    {tiers.map((t) => (
                        <TierBadge key={t} tier={t} />
                    ))}
                </div>
            </div>
            {checked && (
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: "#2563EB" }}
                />
            )}
        </button>
    );
}

function SymptomGroup({
    group,
    color,
    bg,
    border,
    Icon,
    symptoms,
    checkedIds,
    onToggle,
    currentSeverity,
    defaultOpen,
}) {
    const [open, setOpen] = useState(defaultOpen);
    const checkedCount = symptoms.filter((s) => checkedIds.includes(s.id)).length;
    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1.5px solid ${border}` }}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{ background: bg }}
            >
                <div className="flex items-center gap-2.5">
                    <Icon size={15} style={{ color }} />
                    <span className="text-sm font-bold" style={{ color: "#0F172A" }}>
                        {group}
                    </span>
                    {checkedCount > 0 && (
                        <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: color }}
                        >
                            {checkedCount}
                        </span>
                    )}
                </div>
                {open ? (
                    <ChevronUp size={14} style={{ color: "#64748B" }} />
                ) : (
                    <ChevronDown size={14} style={{ color: "#64748B" }} />
                )}
            </button>
            {open && (
                <div className="p-3 animate-fade-in" style={{ background: "#fff" }}>
                    {symptoms.map((s) => (
                        <SymptomRow
                            key={s.id}
                            symptom={s}
                            checked={checkedIds.includes(s.id)}
                            onToggle={onToggle}
                            currentSeverity={currentSeverity}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SymptomChecker() {
    const { state, toggleSymptom } = useApp();
    const checkedIds = state.session.symptoms;
    const currentSeverity = state.session.hbResult?.severity;
    const allSymptoms = SYMPTOM_GROUPS.flatMap((g) => g.symptoms);
    const total = allSymptoms.length;

    const matchingChecked = checkedIds.filter((id) => {
        const sym = allSymptoms.find((s) => s.id === id);
        return sym && currentSeverity && sym.tiers.includes(currentSeverity);
    });
    const urgentChecked = checkedIds.filter((id) =>
        allSymptoms.find((s) => s.id === id && s.urgent),
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="section-bar-rose">
                    <h3 className="section-title" style={{ color: "#E11D48" }}>
                        <span className="flex items-center gap-2">
                            <ClipboardList size={16} />
                            Symptom Checker
                        </span>
                    </h3>
                    <p className="section-subtitle">
                        Select all symptoms you are currently experiencing
                    </p>
                </div>
                <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
                >
                    <CheckSquare size={12} style={{ color: "#2563EB" }} />
                    <span className="text-xs font-bold" style={{ color: "#1D4ED8" }}>
                        {checkedIds.length}
                        <span style={{ color: "#94A3B8" }}> / {total}</span>
                    </span>
                </div>
            </div>

            {/* Correlation banner */}
            {currentSeverity && matchingChecked.length > 0 && (
                <div className="callout-info flex gap-2.5 animate-fade-in">
                    <Activity
                        size={14}
                        style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
                    />
                    <p className="text-xs leading-relaxed" style={{ color: "#1D4ED8" }}>
                        <span className="font-bold">
                            {matchingChecked.length} of your selected symptoms
                        </span>{" "}
                        are clinically associated with your{" "}
                        <span className="font-bold">{currentSeverity}</span> anaemia result.
                    </p>
                </div>
            )}

            {/* Urgent warning */}
            {urgentChecked.length > 0 && (
                <div className="callout-danger flex gap-2.5 animate-fade-in">
                    <AlertTriangle
                        size={14}
                        style={{ color: "#DC2626", flexShrink: 0, marginTop: 2 }}
                    />
                    <p className="text-xs leading-relaxed" style={{ color: "#991B1B" }}>
                        <span className="font-bold">
                            You have checked an urgent symptom (chest pain).
                        </span>{" "}
                        Please seek immediate medical attention.
                    </p>
                </div>
            )}

            {/* Groups */}
            <div className="space-y-3">
                {SYMPTOM_GROUPS.map(
                    ({ group, Icon, color, bg, border, symptoms }, i) => (
                        <SymptomGroup
                            key={group}
                            group={group}
                            color={color}
                            bg={bg}
                            border={border}
                            Icon={Icon}
                            symptoms={symptoms}
                            checkedIds={checkedIds}
                            onToggle={toggleSymptom}
                            currentSeverity={currentSeverity}
                            defaultOpen={i === 0}
                        />
                    ),
                )}
            </div>

            {/* Selected chips */}
            {checkedIds.length > 0 && (
                <div
                    className="card space-y-3 animate-fade-in"
                    style={{ borderColor: "#BFDBFE", background: "#F8FBFF" }}
                >
                    <p
                        className="text-sm font-bold flex items-center gap-2"
                        style={{ color: "#1D4ED8" }}
                    >
                        <ClipboardList size={14} /> Selected Symptoms ({checkedIds.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {checkedIds.map((id) => {
                            const sym = allSymptoms.find((s) => s.id === id);
                            return sym ? (
                                <button
                                    key={id}
                                    onClick={() => toggleSymptom(id)}
                                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all"
                                    style={{
                                        background: "#EFF6FF",
                                        border: "1.5px solid #BFDBFE",
                                        color: "#1D4ED8",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#FEF2F2";
                                        e.currentTarget.style.color = "#991B1B";
                                        e.currentTarget.style.borderColor = "#FECACA";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#EFF6FF";
                                        e.currentTarget.style.color = "#1D4ED8";
                                        e.currentTarget.style.borderColor = "#BFDBFE";
                                    }}
                                >
                                    {sym.label} <span style={{ opacity: 0.5 }}>×</span>
                                </button>
                            ) : null;
                        })}
                    </div>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                        These symptoms will be included in your clinical PDF report.
                    </p>
                </div>
            )}

            {/* Clinical note */}
            <div className="callout-info flex gap-2">
                <Info
                    size={12}
                    style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
                />
                <p className="text-xs leading-relaxed" style={{ color: "#1D4ED8" }}>
                    Symptom data is stored only on your device and included in the PDF
                    report to provide your clinician with context alongside the AI Hb
                    estimate. It does not influence the model's output.
                </p>
            </div>
        </div>
    );
}
