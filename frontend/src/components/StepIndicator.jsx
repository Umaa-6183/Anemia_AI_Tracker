import React from "react";
import { Check } from "lucide-react";

const STEPS = [
    { id: 1, label: "Profile", shortLabel: "Profile" },
    { id: 2, label: "Camera", shortLabel: "Camera" },
    { id: 3, label: "AI Scan", shortLabel: "Scan" },
    { id: 4, label: "Dashboard", shortLabel: "Results" },
    { id: 5, label: "Symptoms", shortLabel: "Symptoms" },
    { id: 6, label: "Report", shortLabel: "Report" },
];

/**
 * StepIndicator
 * @param {number}   currentStep  - Active step (1-based)
 * @param {function} onStepClick  - Optional — called with step id when a completed step is clicked
 * @param {boolean}  compact      - Show only icons (no labels), for tight layouts
 */
export default function StepIndicator({
    currentStep = 1,
    onStepClick,
    compact = false,
}) {
    return (
        <div className="w-full" aria-label="Progress">
            <ol className="flex items-center justify-between">
                {STEPS.map((step, idx) => {
                    const isDone = step.id < currentStep;
                    const isActive = step.id === currentStep;
                    const canClick = isDone && typeof onStepClick === "function";

                    return (
                        <li key={step.id} className="flex items-center flex-1">
                            {/* ── Step circle ──────────────────────────── */}
                            <div className="flex flex-col items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={!canClick}
                                    onClick={() => canClick && onStepClick(step.id)}
                                    aria-current={isActive ? "step" : undefined}
                                    className={`
                    flex items-center justify-center w-8 h-8 rounded-full
                    border-2 text-xs font-bold transition-all duration-200
                    ${isDone
                                            ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/40 cursor-pointer hover:bg-green-500"
                                            : isActive
                                                ? "bg-clinical-600 border-clinical-400 text-white shadow-lg shadow-clinical-900/50 ring-4 ring-clinical-900/40"
                                                : "bg-slate-800 border-slate-700 text-slate-500 cursor-default"
                                        }
                  `}
                                >
                                    {isDone ? <Check size={14} strokeWidth={3} /> : step.id}
                                </button>

                                {/* Label (hidden in compact mode) */}
                                {!compact && (
                                    <span
                                        className={`text-[10px] font-medium leading-none hidden sm:block
                                ${isActive
                                                ? "text-clinical-300"
                                                : isDone
                                                    ? "text-green-500"
                                                    : "text-slate-600"
                                            }`}
                                    >
                                        {step.shortLabel}
                                    </span>
                                )}
                            </div>

                            {/* ── Connector line (not after last step) ── */}
                            {idx < STEPS.length - 1 && (
                                <div
                                    className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-300
                              ${step.id < currentStep
                                            ? "bg-green-600"
                                            : step.id === currentStep
                                                ? "bg-gradient-to-r from-clinical-600 to-slate-700"
                                                : "bg-slate-800"
                                        }`}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* ── Current step description ─────────────────────── */}
            <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">
                    Step{" "}
                    <span className="text-clinical-400 font-semibold">{currentStep}</span>{" "}
                    of{" "}
                    <span className="text-slate-400 font-semibold">{STEPS.length}</span>
                    {" — "}
                    <span className="text-slate-300 font-medium">
                        {STEPS.find((s) => s.id === currentStep)?.label}
                    </span>
                </p>
            </div>
        </div>
    );
}

/* ── Mini variant (just the pill row, no labels) ─────── */
export function MiniStepIndicator({ currentStep = 1 }) {
    return (
        <div className="flex items-center gap-1.5">
            {STEPS.map((step) => (
                <div
                    key={step.id}
                    className={`h-1.5 rounded-full transition-all duration-300
            ${step.id < currentStep
                            ? "w-5 bg-green-500"
                            : step.id === currentStep
                                ? "w-8 bg-clinical-500"
                                : "w-3 bg-slate-700"
                        }`}
                />
            ))}
        </div>
    );
}
