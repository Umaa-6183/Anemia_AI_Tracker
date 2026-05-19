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

/* Each step has its own brand colour */
const STEP_COLORS = [
    "#2563EB",
    "#7C3AED",
    "#0D9488",
    "#E11D48",
    "#D97706",
    "#16A34A",
];

/**
 * StepIndicator
 * @param {number}   currentStep  - Active step (1-based)
 * @param {function} onStepClick  - Optional — called with step id when a completed step is clicked
 * @param {boolean}  compact      - Show only circles (no labels)
 */
export default function StepIndicator({
    currentStep = 1,
    onStepClick,
    compact = false,
}) {
    return (
        <div className="w-full">
            <ol className="flex items-center justify-between">
                {STEPS.map((step, idx) => {
                    const isDone = step.id < currentStep;
                    const isActive = step.id === currentStep;
                    const color = STEP_COLORS[idx];
                    const canClick = isDone && typeof onStepClick === "function";

                    return (
                        <li key={step.id} className="flex items-center flex-1">
                            {/* Step circle */}
                            <div className="flex flex-col items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={!canClick}
                                    onClick={() => canClick && onStepClick(step.id)}
                                    aria-current={isActive ? "step" : undefined}
                                    className="flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-all duration-200"
                                    style={{
                                        background: isDone
                                            ? "#16A34A"
                                            : isActive
                                                ? color
                                                : "#F1F5F9",
                                        borderColor: isDone
                                            ? "#15803D"
                                            : isActive
                                                ? color
                                                : "#E2E8F0",
                                        color: isDone || isActive ? "#fff" : "#94A3B8",
                                        boxShadow: isActive ? `0 0 0 4px ${color}20` : "none",
                                        cursor: canClick ? "pointer" : "default",
                                    }}
                                >
                                    {isDone ? <Check size={14} strokeWidth={3} /> : step.id}
                                </button>

                                {/* Label */}
                                {!compact && (
                                    <span
                                        className="text-[10px] font-semibold hidden sm:block"
                                        style={{
                                            color: isDone ? "#16A34A" : isActive ? color : "#94A3B8",
                                        }}
                                    >
                                        {step.shortLabel}
                                    </span>
                                )}
                            </div>

                            {/* Connector line */}
                            {idx < STEPS.length - 1 && (
                                <div
                                    className="flex-1 h-0.5 mx-2 rounded-full transition-all duration-300"
                                    style={{
                                        background:
                                            step.id < currentStep
                                                ? "#16A34A"
                                                : step.id === currentStep
                                                    ? `linear-gradient(to right, ${color}, #E2E8F0)`
                                                    : "#E2E8F0",
                                    }}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* Current step label */}
            <div className="mt-3 text-center">
                <p className="text-xs" style={{ color: "#64748B" }}>
                    Step{" "}
                    <span
                        className="font-bold"
                        style={{ color: STEP_COLORS[currentStep - 1] }}
                    >
                        {currentStep}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold" style={{ color: "#334155" }}>
                        {STEPS.length}
                    </span>
                    {" — "}
                    <span className="font-semibold" style={{ color: "#0F172A" }}>
                        {STEPS.find((s) => s.id === currentStep)?.label}
                    </span>
                </p>
            </div>
        </div>
    );
}

/* Mini pill variant */
export function MiniStepIndicator({ currentStep = 1 }) {
    return (
        <div className="flex items-center gap-1.5">
            {STEPS.map((step, idx) => (
                <div
                    key={step.id}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                        width:
                            step.id < currentStep
                                ? "1.25rem"
                                : step.id === currentStep
                                    ? "2rem"
                                    : "0.75rem",
                        background:
                            step.id < currentStep
                                ? "#16A34A"
                                : step.id === currentStep
                                    ? STEP_COLORS[idx]
                                    : "#E2E8F0",
                    }}
                />
            ))}
        </div>
    );
}
