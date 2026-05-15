import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ScanLine,
    Brain,
    CheckCircle2,
    AlertTriangle,
    Clock,
    ChevronRight,
    Activity,
    RotateCcw,
    Loader2,
    Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import CameraCapture from "../components/CameraCapture";
import StepIndicator from "../components/StepIndicator";
import { predictHemoglobin, assessImageQuality } from "../utils/api";
import { classifySeverity, nowISO } from "../utils/helpers";

/* ── Scan phase states ─────────────────────────────── */
const PHASE = {
    CAMERA: "camera", // 1 — Live camera + IQA
    PROCESSING: "processing", // 2 — Backend inference running
    DONE: "done", // 3 — Result received, ready to navigate
    ERROR: "error", // 4 — Something went wrong
};

/* ── Processing step labels ─────────────────────────── */
const PROCESSING_STEPS = [
    { id: 1, label: "Sending image to server", duration: 800 },
    { id: 2, label: "Running Image Quality Assessment", duration: 600 },
    { id: 3, label: "White-balance calibration", duration: 700 },
    { id: 4, label: "CNN forward pass", duration: 2000 },
    { id: 5, label: "Applying demographic weights", duration: 500 },
    { id: 6, label: "Generating Grad-CAM heatmap", duration: 900 },
    { id: 7, label: "Classifying severity tier", duration: 400 },
];

/* ── Animated processing step ticker ─────────────────── */
function ProcessingTimeline({ activeStep }) {
    return (
        <div className="space-y-2">
            {PROCESSING_STEPS.map(({ id, label }) => {
                const done = id < activeStep;
                const active = id === activeStep;
                return (
                    <div
                        key={id}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
                         ${active
                                ? "bg-clinical-900/50 border border-clinical-800"
                                : done
                                    ? "bg-green-900/20 border border-green-900/40"
                                    : "bg-slate-800/40 border border-slate-800 opacity-40"
                            }`}
                    >
                        <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                             ${active
                                    ? "bg-clinical-600"
                                    : done
                                        ? "bg-green-600"
                                        : "bg-slate-700"
                                }`}
                        >
                            {done ? (
                                <CheckCircle2 size={12} className="text-white" />
                            ) : active ? (
                                <Loader2 size={12} className="text-white animate-spin" />
                            ) : (
                                <span className="text-[9px] text-slate-500 font-bold">
                                    {id}
                                </span>
                            )}
                        </div>
                        <span
                            className={`text-xs font-medium
                              ${active
                                    ? "text-clinical-200"
                                    : done
                                        ? "text-green-400"
                                        : "text-slate-600"
                                }`}
                        >
                            {label}
                        </span>
                        {active && (
                            <div className="ml-auto flex gap-0.5">
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="w-1 h-1 bg-clinical-400 rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 120}ms` }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════ */
export default function Scan() {
    const navigate = useNavigate();
    const { state, setCapturedImage, setHbResult, addHbHistory, setStep } =
        useApp();

    const [phase, setPhase] = useState(PHASE.CAMERA);
    const [activeStep, setActiveStep] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [result, setResult] = useState(null);

    const startTimeRef = useRef(null);
    const elapsedTimerRef = useRef(null);
    const stepTimerRef = useRef(null);

    /* ── Elapsed timer (runs during processing) ── */
    useEffect(() => {
        if (phase === PHASE.PROCESSING) {
            startTimeRef.current = Date.now();
            elapsedTimerRef.current = setInterval(() => {
                setElapsed(Math.round((Date.now() - startTimeRef.current) / 100) / 10);
            }, 100);
        } else {
            clearInterval(elapsedTimerRef.current);
        }
        return () => clearInterval(elapsedTimerRef.current);
    }, [phase]);

    /* ── Cleanup on unmount ── */
    useEffect(() => {
        return () => {
            clearInterval(elapsedTimerRef.current);
            clearTimeout(stepTimerRef.current);
        };
    }, []);

    /* ── Animate the processing timeline ── */
    function animateSteps(steps, idx, onComplete) {
        if (idx >= steps.length) {
            onComplete();
            return;
        }
        setActiveStep(steps[idx].id);
        stepTimerRef.current = setTimeout(
            () => animateSteps(steps, idx + 1, onComplete),
            steps[idx].duration,
        );
    }

    /* ── Called by CameraCapture once auto-capture fires ── */
    async function handleCapture(imageDataUrl) {
        setCapturedImage(imageDataUrl);
        setPhase(PHASE.PROCESSING);
        setActiveStep(1);

        /* Animate steps while API call is in-flight */
        const animationDone = new Promise((resolve) => {
            animateSteps(PROCESSING_STEPS, 0, resolve);
        });

        try {
            /* Real API call */
            const apiResult = await predictHemoglobin({
                imageDataUrl,
                age: state.profile.age,
                sex: state.profile.sex,
                pregnancyStatus: state.profile.pregnancyStatus,
            });

            /* Wait for the animation to finish too (UX polish) */
            await animationDone;

            /* Derive severity using WHO thresholds */
            const severityInfo = classifySeverity(
                apiResult.hb,
                state.profile.sex,
                state.profile.pregnancyStatus,
            );

            const enriched = {
                ...apiResult,
                severity: severityInfo.severity,
                severityLabel: severityInfo.label,
                severityColor: severityInfo.color,
                timestamp: nowISO(),
            };

            /* Persist to context + history */
            setHbResult(enriched);
            addHbHistory({
                date: enriched.timestamp,
                hb: enriched.hb,
                severity: enriched.severity,
            });

            setResult(enriched);
            setPhase(PHASE.DONE);
            setStep(4); // jump wizard to dashboard step
            toast.success(`Hb estimated: ${Number(enriched.hb).toFixed(1)} g/dL`);
        } catch (err) {
            clearTimeout(stepTimerRef.current);
            setErrorMsg(err.message || "Inference failed. Please try again.");
            setPhase(PHASE.ERROR);
            toast.error("Scan failed — see details below");
        }
    }

    /* ── Reset and retry ── */
    function handleRetry() {
        clearTimeout(stepTimerRef.current);
        setPhase(PHASE.CAMERA);
        setActiveStep(0);
        setElapsed(0);
        setErrorMsg("");
        setResult(null);
        setCapturedImage(null);
    }

    /* ─────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto animate-fade-in">
            {/* ── Step indicator ── */}
            <StepIndicator currentStep={phase === PHASE.CAMERA ? 2 : 3} />

            {/* ── Page header ── */}
            <div className="mt-8 mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                    {phase === PHASE.CAMERA && (
                        <>
                            <ScanLine size={22} className="text-clinical-400" /> Live Scan
                        </>
                    )}
                    {phase === PHASE.PROCESSING && (
                        <>
                            <Brain size={22} className="text-purple-400" /> AI Processing
                        </>
                    )}
                    {phase === PHASE.DONE && (
                        <>
                            <CheckCircle2 size={22} className="text-green-400" /> Scan
                            Complete
                        </>
                    )}
                    {phase === PHASE.ERROR && (
                        <>
                            <AlertTriangle size={22} className="text-red-400" /> Scan Failed
                        </>
                    )}
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    {phase === PHASE.CAMERA &&
                        "Pull your lower eyelid down — the camera fires automatically"}
                    {phase === PHASE.PROCESSING &&
                        "Running AI inference on your conjunctival image…"}
                    {phase === PHASE.DONE &&
                        "Your Haemoglobin estimate is ready. Proceeding to dashboard…"}
                    {phase === PHASE.ERROR &&
                        "Something went wrong during inference. You can retry below."}
                </p>
            </div>

            {/* ══ CAMERA PHASE ════════════════════════════ */}
            {phase === PHASE.CAMERA && (
                <div className="space-y-5 animate-slide-up">
                    {/* Patient info reminder */}
                    <div
                        className="flex items-center gap-3 bg-clinical-950/50 border border-clinical-900/60
                           rounded-xl px-4 py-3"
                    >
                        <Activity size={15} className="text-clinical-400 flex-shrink-0" />
                        <p className="text-xs text-slate-400">
                            Scanning for{" "}
                            <span className="text-white font-semibold">
                                {state.profile?.name}
                            </span>
                            {" · "}
                            <span className="text-slate-300">{state.profile?.age} yrs</span>
                            {" · "}
                            <span className="text-slate-300 capitalize">
                                {state.profile?.sex}
                            </span>
                            {state.profile?.pregnancyStatus && (
                                <span className="ml-1 text-pink-400">· Pregnant</span>
                            )}
                        </p>
                    </div>

                    <CameraCapture onCapture={handleCapture} />
                </div>
            )}

            {/* ══ PROCESSING PHASE ════════════════════════ */}
            {phase === PHASE.PROCESSING && (
                <div className="space-y-6 animate-slide-up">
                    {/* Elapsed timer */}
                    <div className="card flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-900/50 rounded-xl flex items-center justify-center">
                                <Brain size={20} className="text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    CNN Inference
                                </p>
                                <p className="text-xs text-slate-500">
                                    4-layer ConvNet + demographic fusion
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-mono font-bold text-clinical-300">
                                {elapsed.toFixed(1)}
                                <span className="text-sm text-slate-500 ml-1">s</span>
                            </p>
                            <div className="flex items-center gap-1 justify-end mt-0.5">
                                <Clock size={10} className="text-slate-600" />
                                <span className="text-xs text-slate-600">target &lt; 60s</span>
                            </div>
                        </div>
                    </div>

                    {/* Processing steps */}
                    <ProcessingTimeline activeStep={activeStep} />

                    {/* Animated progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-clinical-600 to-purple-500 rounded-full
                          transition-all duration-500"
                            style={{
                                width: `${Math.min(100, (activeStep / PROCESSING_STEPS.length) * 100)}%`,
                            }}
                        />
                    </div>

                    {/* Clinical note */}
                    <div className="flex gap-2.5 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
                        <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 leading-relaxed">
                            The model analyses vascular pigmentation in the palpebral
                            conjunctiva. Your age, sex, and pregnancy status are fused with
                            image features in the final dense layers for a personalised Hb
                            estimate.
                        </p>
                    </div>
                </div>
            )}

            {/* ══ DONE PHASE ══════════════════════════════ */}
            {phase === PHASE.DONE && result && (
                <div className="space-y-5 animate-slide-up">
                    {/* Result preview card */}
                    <div className="card text-center space-y-4">
                        <div
                            className="w-16 h-16 bg-green-700/40 border border-green-600 rounded-full
                             flex items-center justify-center mx-auto
                             shadow-lg shadow-green-900/40"
                        >
                            <CheckCircle2 size={30} className="text-green-400" />
                        </div>
                        <div>
                            <p className="text-4xl font-extrabold text-white font-mono">
                                {Number(result.hb).toFixed(1)}
                                <span className="text-lg text-slate-400 ml-1.5">g/dL</span>
                            </p>
                            <p
                                className="text-sm mt-1"
                                style={{ color: result.severityColor }}
                            >
                                {result.severityLabel}
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-xs text-slate-500">
                                Confidence:{" "}
                                <span className="text-slate-300 font-medium">
                                    {result.confidence
                                        ? `${Math.round(result.confidence * 100)}%`
                                        : "—"}
                                </span>
                            </div>
                            <span className="text-slate-700">·</span>
                            <div className="text-xs text-slate-500">
                                Time:{" "}
                                <span className="text-slate-300 font-medium">
                                    {elapsed.toFixed(1)}s
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigate to full results */}
                    <button
                        onClick={() => navigate("/results")}
                        className="btn-primary w-full py-3.5"
                    >
                        <Activity size={17} />
                        View Full Dashboard & Report
                        <ChevronRight size={15} />
                    </button>

                    <button onClick={handleRetry} className="btn-secondary w-full">
                        <RotateCcw size={15} />
                        Scan Again
                    </button>
                </div>
            )}

            {/* ══ ERROR PHASE ═════════════════════════════ */}
            {phase === PHASE.ERROR && (
                <div className="space-y-4 animate-slide-up">
                    <div className="card border-red-900/60 bg-red-950/20 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-red-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={18} className="text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-red-300">
                                    Inference Error
                                </p>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {errorMsg}
                                </p>
                            </div>
                        </div>

                        {/* Troubleshooting tips */}
                        <div className="border-t border-red-900/40 pt-3 space-y-1">
                            <p className="text-xs font-medium text-slate-400 mb-2">
                                Troubleshooting:
                            </p>
                            {[
                                "Ensure the FastAPI backend is running on port 8000",
                                "Check your network connection",
                                "Make sure the conjunctiva was fully visible in the oval",
                                "Try with better lighting",
                            ].map((tip) => (
                                <p key={tip} className="text-xs text-slate-500 flex gap-2">
                                    <span className="text-slate-700">›</span>
                                    {tip}
                                </p>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleRetry} className="btn-primary w-full">
                        <RotateCcw size={15} />
                        Retry Scan
                    </button>

                    <button
                        onClick={() => navigate("/profile")}
                        className="btn-secondary w-full"
                    >
                        Back to Profile
                    </button>
                </div>
            )}
        </div>
    );
}
