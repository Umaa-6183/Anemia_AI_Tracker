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

/* ═══════════════════════════════════════════════════════
   SYMPTOM DATABASE
   Each symptom maps to severity tiers where it commonly
   appears — used for correlation badge display.
═══════════════════════════════════════════════════════ */
const SYMPTOM_GROUPS = [
    {
        group: "Energy & Fatigue",
        icon: Zap,
        color: "text-amber-400",
        bg: "bg-amber-900/20",
        border: "border-amber-800/50",
        symptoms: [
            {
                id: "fatigue",
                label: "Persistent Fatigue",
                detail: "Feeling unusually tired even after adequate sleep",
                tiers: ["mild", "moderate", "severe"],
                Icon: Zap,
            },
            {
                id: "weakness",
                label: "Generalised Weakness",
                detail: "Muscles feel heavy or lack normal strength",
                tiers: ["moderate", "severe"],
                Icon: Activity,
            },
            {
                id: "exercise_intolerance",
                label: "Exercise Intolerance",
                detail: "Unusual breathlessness or fatigue during light activity",
                tiers: ["mild", "moderate", "severe"],
                Icon: Heart,
            },
        ],
    },
    {
        group: "Neurological",
        icon: Brain,
        color: "text-purple-400",
        bg: "bg-purple-900/20",
        border: "border-purple-800/50",
        symptoms: [
            {
                id: "dizziness",
                label: "Dizziness / Light-headedness",
                detail: "Feeling faint, especially when standing up quickly",
                tiers: ["mild", "moderate", "severe"],
                Icon: Brain,
            },
            {
                id: "headache",
                label: "Frequent Headaches",
                detail: "Recurring headaches not explained by other causes",
                tiers: ["mild", "moderate"],
                Icon: Brain,
            },
            {
                id: "concentration",
                label: "Difficulty Concentrating",
                detail: "Brain fog, trouble focusing, or poor memory",
                tiers: ["moderate", "severe"],
                Icon: Brain,
            },
        ],
    },
    {
        group: "Cardiovascular & Respiratory",
        icon: Heart,
        color: "text-red-400",
        bg: "bg-red-900/20",
        border: "border-red-800/50",
        symptoms: [
            {
                id: "shortness_of_breath",
                label: "Shortness of Breath",
                detail: "Breathlessness at rest or with minimal exertion",
                tiers: ["moderate", "severe"],
                Icon: Wind,
            },
            {
                id: "palpitations",
                label: "Heart Palpitations",
                detail: "Noticeably rapid, strong, or irregular heartbeat",
                tiers: ["moderate", "severe"],
                Icon: Heart,
            },
            {
                id: "chest_pain",
                label: "Chest Pain or Tightness",
                detail: "Any chest discomfort — seek urgent care if severe",
                tiers: ["severe"],
                Icon: Heart,
                urgent: true,
            },
        ],
    },
    {
        group: "Physical Appearance",
        icon: Eye,
        color: "text-clinical-400",
        bg: "bg-clinical-900/20",
        border: "border-clinical-800/50",
        symptoms: [
            {
                id: "pale_skin",
                label: "Pale Skin or Complexion",
                detail: "Noticeable pallor, especially in face, gums, or nail beds",
                tiers: ["mild", "moderate", "severe"],
                Icon: Eye,
            },
            {
                id: "pale_conjunctiva",
                label: "Pale Conjunctiva",
                detail: "Inner lower eyelid appears very pale pink or white",
                tiers: ["mild", "moderate", "severe"],
                Icon: Eye,
            },
            {
                id: "brittle_nails",
                label: "Brittle or Spoon-Shaped Nails",
                detail: "Nails that chip easily or curve upward (koilonychia)",
                tiers: ["moderate", "severe"],
                Icon: Eye,
            },
        ],
    },
    {
        group: "Temperature & Extremities",
        icon: Thermometer,
        color: "text-teal-400",
        bg: "bg-teal-900/20",
        border: "border-teal-800/50",
        symptoms: [
            {
                id: "cold_hands_feet",
                label: "Cold Hands & Feet",
                detail: "Extremities feel cold even in warm environments",
                tiers: ["mild", "moderate", "severe"],
                Icon: Thermometer,
            },
            {
                id: "cold_intolerance",
                label: "General Cold Intolerance",
                detail: "Feeling cold more than those around you",
                tiers: ["mild", "moderate"],
                Icon: Thermometer,
            },
        ],
    },
    {
        group: "Sleep & Restlessness",
        icon: Moon,
        color: "text-indigo-400",
        bg: "bg-indigo-900/20",
        border: "border-indigo-800/50",
        symptoms: [
            {
                id: "restless_legs",
                label: "Restless Leg Syndrome",
                detail: "Uncomfortable urge to move legs, especially at night",
                tiers: ["mild", "moderate"],
                Icon: Moon,
            },
            {
                id: "poor_sleep",
                label: "Poor Sleep Quality",
                detail: "Difficulty falling or staying asleep despite tiredness",
                tiers: ["mild", "moderate"],
                Icon: Moon,
            },
        ],
    },
];

/* ─── Severity correlation badge ───────────────────── */
const TIER_COLORS = {
    mild: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
    moderate: "bg-orange-900/40 text-orange-400 border-orange-800",
    severe: "bg-red-900/40    text-red-400    border-red-800",
};

function TierBadge({ tier }) {
    return (
        <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${TIER_COLORS[tier] ?? ""}`}
        >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
    );
}

/* ─── Single symptom row ────────────────────────────── */
function SymptomRow({ symptom, checked, onToggle, currentSeverity }) {
    const { id, label, detail, tiers, Icon, urgent } = symptom;
    const relevant = currentSeverity && tiers.includes(currentSeverity);

    return (
        <button
            type="button"
            onClick={() => onToggle(id)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left
                  transition-all duration-150 group
                  ${checked
                    ? "bg-clinical-900/40 border-clinical-700 shadow-sm"
                    : urgent
                        ? "bg-red-950/20 border-red-900/40 hover:border-red-800/60"
                        : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600"
                }`}
        >
            {/* Checkbox */}
            <div
                className={`flex-shrink-0 mt-0.5 transition-colors
                        ${checked ? "text-clinical-400" : "text-slate-600 group-hover:text-slate-500"}`}
            >
                {checked ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className={`text-sm font-medium
                            ${checked
                                ? "text-white"
                                : urgent
                                    ? "text-red-300"
                                    : "text-slate-300"
                            }`}
                    >
                        {label}
                    </span>
                    {urgent && (
                        <span
                            className="flex items-center gap-0.5 text-[9px] font-bold text-red-400
                              bg-red-900/40 border border-red-800 px-1.5 py-0.5 rounded"
                        >
                            <AlertTriangle size={8} />
                            URGENT
                        </span>
                    )}
                    {relevant && !checked && (
                        <span
                            className="text-[9px] text-clinical-500 border border-clinical-800
                             bg-clinical-900/30 px-1.5 py-0.5 rounded font-medium"
                        >
                            Matches your result
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{detail}</p>

                {/* Tier correlation badges */}
                <div className="flex gap-1 mt-1.5 flex-wrap">
                    {tiers.map((t) => (
                        <TierBadge key={t} tier={t} />
                    ))}
                </div>
            </div>

            {/* Checked indicator dot */}
            {checked && (
                <div className="w-2 h-2 bg-clinical-400 rounded-full flex-shrink-0 mt-1.5" />
            )}
        </button>
    );
}

/* ─── Group accordion ───────────────────────────────── */
function SymptomGroup({
    group,
    groupColor,
    groupBg,
    groupBorder,
    GroupIcon,
    symptoms,
    checkedIds,
    onToggle,
    currentSeverity,
    defaultOpen,
}) {
    const [open, setOpen] = useState(defaultOpen);
    const checkedCount = symptoms.filter((s) => checkedIds.includes(s.id)).length;

    return (
        <div className={`border ${groupBorder} rounded-xl overflow-hidden`}>
            {/* Group header */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-3
                    ${groupBg} hover:brightness-110 transition-all`}
            >
                <div className="flex items-center gap-2.5">
                    <GroupIcon size={15} className={groupColor} />
                    <span className="text-sm font-semibold text-slate-200">{group}</span>
                    {checkedCount > 0 && (
                        <span
                            className="w-5 h-5 bg-clinical-600 rounded-full text-[10px]
                             font-bold text-white flex items-center justify-center"
                        >
                            {checkedCount}
                        </span>
                    )}
                </div>
                {open ? (
                    <ChevronUp size={14} className="text-slate-500" />
                ) : (
                    <ChevronDown size={14} className="text-slate-500" />
                )}
            </button>

            {/* Symptom list */}
            {open && (
                <div className="p-3 space-y-2 bg-slate-900/40 animate-fade-in">
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

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function SymptomChecker() {
    const { state, toggleSymptom } = useApp();
    const checkedIds = state.session.symptoms;
    const currentSeverity = state.session.hbResult?.severity;
    const total = SYMPTOM_GROUPS.reduce((n, g) => n + g.symptoms.length, 0);

    /* Correlation: how many checked symptoms match current severity */
    const allSymptoms = SYMPTOM_GROUPS.flatMap((g) => g.symptoms);
    const matchingChecked = checkedIds.filter((id) => {
        const sym = allSymptoms.find((s) => s.id === id);
        return sym && currentSeverity && sym.tiers.includes(currentSeverity);
    });

    /* Urgent symptoms checked */
    const urgentChecked = checkedIds.filter((id) =>
        allSymptoms.find((s) => s.id === id && s.urgent),
    );

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h3 className="section-title flex items-center gap-2">
                        <ClipboardList size={16} className="text-clinical-400" />
                        Symptom Checker
                    </h3>
                    <p className="section-subtitle">
                        Select all symptoms you are currently experiencing
                    </p>
                </div>

                {/* Progress pill */}
                <div
                    className="flex items-center gap-2 bg-slate-800 border border-slate-700
                         px-3 py-1.5 rounded-full"
                >
                    <CheckSquare size={12} className="text-clinical-400" />
                    <span className="text-xs font-semibold text-slate-300">
                        {checkedIds.length}
                        <span className="text-slate-600"> / {total}</span>
                    </span>
                </div>
            </div>

            {/* ── Correlation banner ── */}
            {currentSeverity && matchingChecked.length > 0 && (
                <div
                    className="flex gap-2.5 bg-clinical-950/50 border border-clinical-900/60
                         rounded-xl px-4 py-3 animate-fade-in"
                >
                    <Activity
                        size={14}
                        className="text-clinical-400 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-clinical-300 leading-relaxed">
                        <span className="font-semibold">
                            {matchingChecked.length} of your selected symptoms
                        </span>{" "}
                        are clinically associated with your{" "}
                        <span className="font-semibold">{currentSeverity}</span> anaemia
                        result. This pattern strengthens the AI prediction.
                    </p>
                </div>
            )}

            {/* ── Urgent warning ── */}
            {urgentChecked.length > 0 && (
                <div
                    className="flex gap-2.5 bg-red-950/50 border border-red-800
                         rounded-xl px-4 py-3 animate-fade-in"
                >
                    <AlertTriangle
                        size={14}
                        className="text-red-400 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-red-300 leading-relaxed">
                        <span className="font-bold">
                            You have checked an urgent symptom (chest pain).
                        </span>{" "}
                        Please seek immediate medical attention or call emergency services.
                    </p>
                </div>
            )}

            {/* ── Symptom groups ── */}
            <div className="space-y-3">
                {SYMPTOM_GROUPS.map(
                    ({ group, icon: GroupIcon, color, bg, border, symptoms }, i) => (
                        <SymptomGroup
                            key={group}
                            group={group}
                            groupColor={color}
                            groupBg={bg}
                            groupBorder={border}
                            GroupIcon={GroupIcon}
                            symptoms={symptoms}
                            checkedIds={checkedIds}
                            onToggle={toggleSymptom}
                            currentSeverity={currentSeverity}
                            defaultOpen={i === 0}
                        />
                    ),
                )}
            </div>

            {/* ── Summary ── */}
            {checkedIds.length > 0 && (
                <div className="card border-clinical-900/60 bg-clinical-950/20 space-y-3 animate-fade-in">
                    <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <ClipboardList size={14} className="text-clinical-400" />
                        Selected Symptoms ({checkedIds.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {checkedIds.map((id) => {
                            const sym = allSymptoms.find((s) => s.id === id);
                            return sym ? (
                                <button
                                    key={id}
                                    onClick={() => toggleSymptom(id)}
                                    className="flex items-center gap-1.5 bg-clinical-900/40 border border-clinical-800
                             text-clinical-200 text-xs font-medium px-2.5 py-1 rounded-full
                             hover:bg-red-900/30 hover:border-red-800 hover:text-red-300
                             transition-all duration-150"
                                    title="Click to remove"
                                >
                                    {sym.label}
                                    <span className="text-slate-500">×</span>
                                </button>
                            ) : null;
                        })}
                    </div>
                    <p className="text-xs text-slate-600">
                        These symptoms will be included in your clinical PDF report.
                    </p>
                </div>
            )}

            {/* ── Clinical note ── */}
            <div className="flex gap-2 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
                <Info size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                    Symptom data is self-reported and stored only on your device. It is
                    included in the PDF report to provide your clinician with context
                    alongside the AI Hb estimate. It does not influence the model's
                    output.
                </p>
            </div>
        </div>
    );
}
