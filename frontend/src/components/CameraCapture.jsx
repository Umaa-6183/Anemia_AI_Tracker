import React, { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import {
    Camera,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Sun,
    Wind,
    Eye,
    Zap,
    Upload,
    ImagePlus,
    X,
    Clock,
    Info,
} from "lucide-react";
import { estimateBlurScore, resizeBase64Image } from "../utils/helpers";

const SCAN_TIME_LIMIT_MS = 300_000; // 5 minutes for users to position eye
const IQA_INTERVAL_MS = 350;
const BLUR_THRESHOLD = 80;
const BRIGHTNESS_LOW = 40;
const BRIGHTNESS_HIGH = 220;
const AUTO_CAPTURE_ENABLED = false; // Disabled - manual capture only

async function measureBrightness(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const size = 80,
                canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, size, size);
            const { data } = ctx.getImageData(0, 0, size, size);
            let sum = 0;
            for (let i = 0; i < data.length; i += 4)
                sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            resolve(sum / (size * size));
        };
        img.onerror = () => resolve(128);
        img.src = dataUrl;
    });
}

function buildFeedback(blurScore, brightness) {
    if (brightness < BRIGHTNESS_LOW)
        return {
            ok: false,
            message: "Too dark — move to better lighting",
            color: "#B45309",
        };
    if (brightness > BRIGHTNESS_HIGH)
        return {
            ok: false,
            message: "Too bright — reduce glare",
            color: "#B45309",
        };
    if (blurScore < BLUR_THRESHOLD)
        return {
            ok: false,
            message: "Hold still — image is blurry",
            color: "#C2410C",
        };
    return { ok: true, message: "Good frame — hold steady…", color: "#15803D" };
}

function formatTime(ms) {
    const s = Math.ceil(ms / 1000),
        m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function CameraCapture({ onCapture, disabled = false }) {
    const webcamRef = useRef(null);
    const iqaTimerRef = useRef(null);
    const countdownRef = useRef(null);
    const passStartRef = useRef(null);
    const fileInputRef = useRef(null);

    const [mode, setMode] = useState("live");
    const [ready, setReady] = useState(false);
    const [camError, setCamError] = useState(null);
    const [feedback, setFeedback] = useState({
        ok: false,
        message: "Click 'Start Scanning' to begin",
        color: "#64748B",
    });
    const [captured, setCaptured] = useState(false);
    const [flashActive, setFlashActive] = useState(false);
    const [facingMode, setFacingMode] = useState("user");
    const [timeLeft, setTimeLeft] = useState(SCAN_TIME_LIMIT_MS);
    const [timerActive, setTimerActive] = useState(false);
    const [timeExpired, setTimeExpired] = useState(false);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [scanningStarted, setScanningStarted] = useState(false);

    useEffect(
        () => () => {
            clearInterval(iqaTimerRef.current);
            clearInterval(countdownRef.current);
        },
        [],
    );

    useEffect(() => {
        if (ready && !captured && !disabled && mode === "live" && scanningStarted) {
            setTimerActive(true);
            setTimeLeft(SCAN_TIME_LIMIT_MS);
        }
    }, [ready, captured, disabled, mode, scanningStarted]);

    useEffect(() => {
        if (!timerActive || captured || disabled) {
            clearInterval(countdownRef.current);
            return;
        }
        countdownRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1000) {
                    clearInterval(countdownRef.current);
                    setTimerActive(false);
                    setTimeExpired(true);
                    clearInterval(iqaTimerRef.current);
                    return 0;
                }
                return prev - 1000;
            });
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [timerActive, captured, disabled]);

    const runIQA = useCallback(async () => {
        if (!webcamRef.current || captured || disabled || timeExpired) return;
        const screenshot = webcamRef.current.getScreenshot({
            width: 320,
            height: 240,
        });
        if (!screenshot) return;
        const [blurScore, brightness] = await Promise.all([
            estimateBlurScore(screenshot),
            measureBrightness(screenshot),
        ]);
        const fb = buildFeedback(blurScore, brightness);
        setFeedback(fb);
        // Auto-capture disabled - only show feedback, no automatic capture
        passStartRef.current = null;
    }, [captured, disabled, timeExpired]); // eslint-disable-line

    useEffect(() => {
        if (!ready || captured || disabled || mode !== "live" || !scanningStarted) return;
        iqaTimerRef.current = setInterval(runIQA, IQA_INTERVAL_MS);
        return () => clearInterval(iqaTimerRef.current);
    }, [ready, captured, disabled, runIQA, mode, scanningStarted]);

    const doCapture = useCallback(async () => {
        if (!webcamRef.current || captured) return;
        clearInterval(iqaTimerRef.current);
        clearInterval(countdownRef.current);
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 250);
        const raw = webcamRef.current.getScreenshot({ width: 1280, height: 720 });
        if (!raw) return;
        const resized = await resizeBase64Image(raw, 640);
        setCaptured(true);
        setTimerActive(false);
        setFeedback({
            ok: true,
            message: "Image captured successfully!",
            color: "#15803D",
        });
        onCapture(resized);
    }, [captured, onCapture]);

    const handleManualCapture = useCallback(async () => {
        if (!webcamRef.current || captured || disabled) return;
        clearInterval(iqaTimerRef.current);
        clearInterval(countdownRef.current);
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 250);
        const raw = webcamRef.current.getScreenshot({ width: 1280, height: 720 });
        if (!raw) return;
        const resized = await resizeBase64Image(raw, 640);
        setCaptured(true);
        setTimerActive(false);
        setFeedback({ ok: true, message: "Image captured!", color: "#15803D" });
        onCapture(resized);
    }, [captured, disabled, onCapture]);

    function handleRetake() {
        setCaptured(false);
        setTimeExpired(false);
        setTimeLeft(SCAN_TIME_LIMIT_MS);
        passStartRef.current = null;
        setScanningStarted(false);
        setFeedback({
            ok: false,
            message: "Click 'Start Scanning' to begin",
            color: "#64748B",
        });
    }

    function handleStartScanning() {
        setScanningStarted(true);
        setFeedback({
            ok: false,
            message: "Pull lower eyelid down and centre it in the oval",
            color: "#64748B",
        });
    }

    async function handleFileUpload(file) {
        if (!file || !file.type.startsWith("image/")) {
            alert("Please select a valid image file (JPG, PNG, HEIC).");
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target.result;
            const resized = await resizeBase64Image(dataUrl, 640);
            setUploadPreview(resized);
            setCaptured(true);
            setFeedback({
                ok: true,
                message: "Image uploaded successfully!",
                color: "#15803D",
            });
            onCapture(resized);
        };
        reader.readAsDataURL(file);
    }

    function handleFileInputChange(e) {
        const f = e.target.files?.[0];
        if (f) handleFileUpload(f);
    }
    function handleDrop(e) {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFileUpload(f);
    }
    function handleDragOver(e) {
        e.preventDefault();
        setIsDragOver(true);
    }
    function handleDragLeave() {
        setIsDragOver(false);
    }
    function handleUploadRetake() {
        setUploadPreview(null);
        setCaptured(false);
        setScanningStarted(false);
        setFeedback({
            ok: false,
            message: "Upload a new conjunctival image",
            color: "#64748B",
        });
    }

    const timerColor =
        timeLeft > 60000 ? "#15803D" : timeLeft > 30000 ? "#B45309" : "#B91C1C";

    return (
        <div className="w-full space-y-4">
            {/* Mode switcher */}
            {!captured && (
                <div
                    className="flex gap-2 p-1 rounded-xl"
                    style={{
                        background: "var(--bg-card-alt)",
                        border: "1px solid var(--border)",
                    }}
                >
                    {[
                        { id: "live", label: "Live Camera Scan", Icon: Camera },
                        { id: "upload", label: "Upload Image", Icon: Upload },
                    ].map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            onClick={() => {
                                setMode(id);
                                if (id === "live") setUploadPreview(null);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
                            style={{
                                background: mode === id ? "var(--clinical)" : "transparent",
                                color: mode === id ? "#fff" : "var(--text-secondary)",
                                boxShadow:
                                    mode === id ? "0 2px 8px rgba(14,142,231,0.3)" : "none",
                            }}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── LIVE MODE ── */}
            {mode === "live" && (
                <>
                    {!captured && ready && (
                        <div
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Clock size={15} style={{ color: timerColor }} />
                                <span
                                    className="text-sm font-medium"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    Scan window
                                </span>
                            </div>
                            <span
                                className="text-xl font-mono font-bold"
                                style={{ color: timerColor }}
                            >
                                {timeExpired ? "Time's up!" : formatTime(timeLeft)}
                            </span>
                            {!timeExpired && (
                                <span
                                    className="text-xs"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    Take your time
                                </span>
                            )}
                        </div>
                    )}

                    <div
                        className="relative w-full overflow-hidden rounded-2xl"
                        style={{
                            aspectRatio: "16/9",
                            maxHeight: "360px",
                            background: "#1E293B",
                            border: "1px solid var(--border-strong)",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                        }}
                    >
                        {!camError ? (
                            <Webcam
                                ref={webcamRef}
                                audio={false}
                                screenshotFormat="image/jpeg"
                                screenshotQuality={0.92}
                                videoConstraints={{
                                    facingMode,
                                    width: { ideal: 1280 },
                                    height: { ideal: 720 },
                                }}
                                onUserMedia={() => setReady(true)}
                                onUserMediaError={(err) =>
                                    setCamError(err.message || "Camera access denied")
                                }
                                className="w-full h-full object-cover"
                                style={{
                                    transform: facingMode === "user" ? "scaleX(-1)" : "none",
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
                                <AlertTriangle size={36} className="text-red-400" />
                                <p className="text-sm font-medium text-white text-center">
                                    Camera Error
                                </p>
                                <p
                                    className="text-xs text-center max-w-xs"
                                    style={{ color: "#94A3B8" }}
                                >
                                    {camError}
                                </p>
                                <p className="text-xs text-center" style={{ color: "#64748B" }}>
                                    Grant camera permission or use Upload tab above.
                                </p>
                            </div>
                        )}

                        {ready && !captured && !timeExpired && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute inset-x-0 top-1/3 border-t border-white/5" />
                                <div className="absolute inset-x-0 top-2/3 border-t border-white/5" />
                                <div className="absolute inset-y-0 left-1/3 border-l border-white/5" />
                                <div className="absolute inset-y-0 left-2/3 border-l border-white/5" />
                                <div className="camera-overlay">
                                    <div
                                        className={`camera-reticle transition-all duration-300 ${feedback.ok ? "border-green-400" : ""}`}
                                    />
                                </div>
                            </div>
                        )}

                        {flashActive && (
                            <div className="absolute inset-0 bg-white/80 pointer-events-none z-20" />
                        )}

                        {captured && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                        <CheckCircle2 size={28} className="text-white" />
                                    </div>
                                    <p className="text-sm font-semibold text-white">
                                        Image Captured
                                    </p>
                                    <p className="text-xs" style={{ color: "#94A3B8" }}>
                                        Sending to AI model…
                                    </p>
                                </div>
                            </div>
                        )}

                        {timeExpired && !captured && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10">
                                <div className="text-center space-y-3 p-6">
                                    <Clock size={32} className="text-amber-400 mx-auto" />
                                    <p className="text-sm font-semibold text-white">
                                        5-Minute Window Ended
                                    </p>
                                    <p className="text-xs max-w-xs" style={{ color: "#94A3B8" }}>
                                        Click Submit or restart for a fresh 5-minute window.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!ready && !camError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs" style={{ color: "#94A3B8" }}>
                                    Starting camera…
                                </p>
                            </div>
                        )}

                        {ready && !captured && !timeExpired && scanningStarted && (
                            <div className="absolute top-3 left-3 z-10">
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                    style={{
                                        background: "rgba(255,255,255,0.92)",
                                        border: `1px solid ${feedback.ok ? "#BBF7D0" : "#DDD8D2"}`,
                                        color: feedback.ok ? "#15803D" : "#475569",
                                    }}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${feedback.ok ? "bg-green-500" : "bg-amber-500"} animate-pulse`}
                                    />
                                    {feedback.ok ? "IQA Pass" : "IQA Checking"}
                                </div>
                            </div>
                        )}

                        {ready && (
                            <div className="absolute top-3 right-3 z-10">
                                <button
                                    onClick={() => {
                                        setFacingMode((m) =>
                                            m === "user" ? "environment" : "user",
                                        );
                                        setReady(false);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                                    style={{
                                        background: "rgba(255,255,255,0.92)",
                                        border: "1px solid var(--border)",
                                        color: "var(--text-secondary)",
                                    }}
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {!captured && scanningStarted && (
                        <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl"
                            style={{
                                background: feedback.ok ? "#F0FDF4" : "var(--bg-card)",
                                border: `1px solid ${feedback.ok ? "#BBF7D0" : "var(--border)"}`,
                            }}
                        >
                            {feedback.ok ? (
                                <Zap size={16} style={{ color: "#15803D" }} />
                            ) : (
                                <Wind size={16} style={{ color: "#C2410C" }} />
                            )}
                            <p
                                className="text-sm font-medium flex-1"
                                style={{ color: feedback.color }}
                            >
                                {feedback.message}
                            </p>
                        </div>
                    )}

                    {!captured && ready && !scanningStarted && (
                        <button
                            onClick={handleStartScanning}
                            disabled={disabled}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl"
                            style={{
                                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                                color: "#fff",
                                border: "2px solid rgba(255, 255, 255, 0.2)",
                                cursor: disabled ? "not-allowed" : "pointer",
                            }}
                        >
                            <Camera size={18} /> Start Scanning
                        </button>
                    )}
                    {!captured && ready && scanningStarted && (
                        <button
                            onClick={handleManualCapture}
                            disabled={disabled}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl"
                            style={{
                                background: "linear-gradient(135deg, #0E8EE7 0%, #0C7DD1 100%)",
                                color: "#fff",
                                border: "2px solid rgba(255, 255, 255, 0.2)",
                                cursor: disabled ? "not-allowed" : "pointer",
                            }}
                        >
                            <CheckCircle2 size={18} /> Submit for AI Analysis
                        </button>
                    )}
                    {captured && !disabled && (
                        <button onClick={handleRetake} className="btn-secondary w-full">
                            <RefreshCw size={15} /> Retake Photo
                        </button>
                    )}

                    {!captured && (
                        <div
                            className="rounded-xl p-4"
                            style={{
                                background: "var(--bg-card)",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <p
                                className="text-xs font-semibold flex items-center gap-1.5 mb-2"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <Eye size={12} style={{ color: "var(--clinical)" }} /> How to
                                position your eyelid
                            </p>
                            {[
                                "Click 'Start Scanning' button below to begin",
                                "With a clean finger, gently pull your lower eyelid downward",
                                "The pink inner lining (conjunctiva) should be clearly visible",
                                "Centre the pink area inside the oval guide on screen",
                                "Ensure bright, even lighting — avoid shadows across the eye",
                                "When ready, click 'Submit for AI Analysis' to proceed",
                            ].map((tip, i) => (
                                <p
                                    key={i}
                                    className="text-xs flex gap-2 mb-1"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    <span style={{ color: "var(--clinical)", fontWeight: 700 }}>
                                        {i + 1}.
                                    </span>
                                    {tip}
                                </p>
                            ))}
                            <div
                                className="mt-2 flex items-start gap-2 p-2.5 rounded-lg"
                                style={{
                                    background: "var(--clinical-bg)",
                                    border: "1px solid var(--clinical-border)",
                                }}
                            >
                                <Info
                                    size={12}
                                    style={{
                                        color: "var(--clinical)",
                                        marginTop: 2,
                                        flexShrink: 0,
                                    }}
                                />
                                <p className="text-xs" style={{ color: "#1D4ED8" }}>
                                    <strong>What the AI analyses:</strong> The redness or paleness
                                    of the conjunctival lining indicates haemoglobin
                                    concentration. A pale or white inner eyelid suggests anaemia;
                                    healthy pink indicates normal Hb levels.
                                </p>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── UPLOAD MODE ── */}
            {mode === "upload" && (
                <>
                    {!captured ? (
                        <>
                            <div
                                className={`upload-zone ${isDragOver ? "drag-over" : ""} flex flex-col items-center justify-center text-center`}
                                style={{ padding: "3rem 1.5rem" }}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleFileInputChange}
                                />
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                                    style={{
                                        background: "var(--clinical-bg)",
                                        border: "2px dashed var(--clinical-border)",
                                    }}
                                >
                                    <ImagePlus size={28} style={{ color: "var(--clinical)" }} />
                                </div>
                                <p
                                    className="text-sm font-semibold mb-1"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    Drop your conjunctival image here
                                </p>
                                <p
                                    className="text-xs mb-4"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    or click to browse — JPG, PNG, HEIC supported
                                </p>
                                <button
                                    className="btn-primary"
                                    style={{ padding: "0.6rem 1.5rem", fontSize: "0.875rem" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <Upload size={14} /> Choose Image File
                                </button>
                            </div>
                            <div
                                className="rounded-xl p-4"
                                style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <p
                                    className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                                    style={{ color: "var(--text-secondary)" }}
                                >
                                    <Info size={12} style={{ color: "var(--clinical)" }} /> Tips
                                    for a good conjunctival photo
                                </p>
                                {[
                                    "Pull the lower eyelid down — the pink inner surface should be fully visible",
                                    "Take the photo in bright, natural light or under a well-lit lamp",
                                    "Hold the camera steady and close so the eyelid fills the frame",
                                    "Avoid blurry or dark images — the AI analyses colour and texture",
                                    "A photo taken by someone else is often sharper than a selfie",
                                ].map((tip, i) => (
                                    <p
                                        key={i}
                                        className="text-xs flex gap-2 mb-1"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        <span style={{ color: "var(--clinical)", fontWeight: 700 }}>
                                            {i + 1}.
                                        </span>
                                        {tip}
                                    </p>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div
                                className="relative rounded-2xl overflow-hidden"
                                style={{
                                    border: "1px solid var(--border)",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                                }}
                            >
                                <img
                                    src={uploadPreview}
                                    alt="Uploaded conjunctival image"
                                    className="w-full object-cover max-h-72"
                                />
                                <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/50 to-transparent">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={16} className="text-green-400" />
                                        <span className="text-sm font-semibold text-white">
                                            Image ready for analysis
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleUploadRetake}
                                className="btn-secondary w-full"
                            >
                                <X size={15} /> Remove & Upload Different Image
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
