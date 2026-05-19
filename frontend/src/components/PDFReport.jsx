import React, { useState } from "react";
import {
    FileDown,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Printer,
} from "lucide-react";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import remediesData from "../data/remedies.json";
import {
    formatDate,
    formatDateTime,
    formatHb,
    classifySeverity,
    normalRangeLabel,
} from "../utils/helpers";

/* ── Colour palette ───────────────────────────────── */
const C = {
    navy: [8, 40, 73],
    blue: [37, 99, 235],
    white: [255, 255, 255],
    lightGray: [248, 250, 252],
    midGray: [148, 163, 184],
    darkGray: [51, 65, 85],
    rowAlt: [241, 245, 249],
    green: [22, 163, 74],
    yellow: [217, 119, 6],
    orange: [234, 88, 12],
    red: [220, 38, 38],
    black: [15, 23, 42],
};

const SEV_RGB = {
    normal: C.green,
    mild: C.yellow,
    moderate: C.orange,
    severe: C.red,
};

/* Strip all non-ASCII / emoji characters */
function cleanText(str) {
    if (!str) return "";
    return String(str)
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
function setFill(doc, rgb) {
    doc.setFillColor(...rgb);
}
function setDraw(doc, rgb) {
    doc.setDrawColor(...rgb);
}
function setTextC(doc, rgb) {
    doc.setTextColor(...rgb);
}
function setFont(doc, s) {
    doc.setFont("helvetica", s);
}
function rect(doc, x, y, w, h, rgb) {
    setFill(doc, rgb);
    doc.rect(x, y, w, h, "F");
}
function hRule(doc, y, rgb = C.lightGray) {
    setDraw(doc, rgb);
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
}
function wrapText(doc, text, x, y, maxW, lh = 5) {
    const lines = doc.splitTextToSize(cleanText(text), maxW);
    doc.text(lines, x, y);
    return y + lines.length * lh;
}
function sectionHdr(doc, title, y) {
    rect(doc, 14, y - 4, 182, 8, C.navy);
    setFont(doc, "bold");
    setTextC(doc, C.white);
    doc.setFontSize(9);
    doc.text(cleanText(title).toUpperCase(), 18, y + 1);
    return y + 9;
}

/* ── Build PDF ──────────────────────────────────────── */
function buildPDF(state) {
    const { profile, session, labLogs } = state;
    const result = session.hbResult;
    // Prefer server white-balanced clean image; fall back to raw capture
    const origImage = session.cleanImage || session.capturedImage;
    if (!result || !profile) throw new Error("Missing scan result or profile");

    const sevInfo = classifySeverity(
        result.hb,
        profile.sex,
        profile.pregnancyStatus,
    );
    const sevRgb = SEV_RGB[sevInfo.severity] ?? C.midGray;
    const remedies = remediesData[sevInfo.severity] ?? remediesData.normal;

    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pw = 210,
        ph = 297,
        ml = 14,
        cw = 182;
    let y = 0;

    /* ── Header bar ─────────────────────────────────── */
    rect(doc, 0, 0, pw, 28, C.navy);
    setFont(doc, "bold");
    setTextC(doc, C.white);
    doc.setFontSize(16);
    doc.text("ANEMIA AI TRACKER", ml, 11);
    setFont(doc, "normal");
    doc.setFontSize(8);
    doc.text("AI-Assisted Haemoglobin Screening Report", ml, 17);
    doc.text(
        "For clinical adjunct use only — does not replace professional diagnosis",
        ml,
        22,
    );
    doc.setFontSize(7);
    doc.text(
        `Report: RPT-${Date.now().toString(36).toUpperCase()}`,
        pw - ml - 45,
        11,
    );
    doc.text(
        `Generated: ${formatDateTime(new Date().toISOString())}`,
        pw - ml - 45,
        16,
    );
    y = 34;

    /* ── Patient row ─────────────────────────────────── */
    rect(doc, ml, y, cw, 22, C.lightGray);
    setDraw(doc, C.midGray);
    doc.setLineWidth(0.3);
    doc.rect(ml, y, cw, 22);
    setFont(doc, "bold");
    setTextC(doc, C.navy);
    doc.setFontSize(13);
    doc.text(cleanText(profile.name), ml + 3, y + 8);
    setFont(doc, "normal");
    setTextC(doc, C.darkGray);
    doc.setFontSize(8);
    const patMeta = [
        `Age: ${profile.age} years`,
        `Sex: ${profile.sex === "male" ? "Male" : "Female"}`,
        `Pregnancy: ${profile.pregnancyStatus ? "Yes" : "No / N/A"}`,
        `Normal Range: ${cleanText(normalRangeLabel(profile.sex, profile.pregnancyStatus))}`,
    ].join("    |    ");
    doc.text(patMeta, ml + 3, y + 14);
    const scanTime = result.timestamp
        ? result.timestamp.slice(0, 19).replace("T", "  ")
        : new Date().toISOString().slice(0, 19).replace("T", "  ");
    doc.text(`Scan Date/Time: ${scanTime}`, ml + 3, y + 19);
    y += 28;

    /* ── Section 1: AI Diagnostic ───────────────────── */
    y = sectionHdr(doc, "1. AI Diagnostic - Haemoglobin Estimate", y);
    y += 4;

    rect(doc, ml, y, 55, 24, C.navy);
    setFont(doc, "bold");
    setTextC(doc, C.white);
    doc.setFontSize(22);
    doc.text(`${Number(result.hb).toFixed(1)}`, ml + 4, y + 14);
    doc.setFontSize(9);
    doc.text("g/dL", ml + 36, y + 14);
    setFont(doc, "normal");
    doc.setFontSize(7);
    doc.text("Estimated Hb", ml + 4, y + 20);

    rect(doc, ml + 58, y, 60, 24, sevRgb);
    setFont(doc, "bold");
    setTextC(doc, C.white);
    doc.setFontSize(11);
    doc.text(cleanText(sevInfo.label), ml + 62, y + 11);
    setFont(doc, "normal");
    doc.setFontSize(7);
    doc.text("WHO Classification", ml + 62, y + 17);
    doc.text(
        `Confidence: ${result.confidence ? Math.round(result.confidence * 100) + "%" : "--"}`,
        ml + 62,
        y + 21,
    );

    rect(doc, ml + 121, y, 75, 24, C.lightGray);
    setTextC(doc, C.darkGray);
    doc.setFontSize(7.5);
    doc.text("Model: Custom CNN (4 ConvLayers)", ml + 124, y + 7);
    doc.text(
        `Inference: ${result.processing_time_ms ? result.processing_time_ms + " ms" : "--"}`,
        ml + 124,
        y + 12,
    );
    doc.text("XAI Method: Grad-CAM", ml + 124, y + 17);
    doc.text(`IQA: ${result.iqa_passed ? "Passed" : "Failed"}`, ml + 124, y + 22);
    y += 30;

    /* ── Conjunctival image (original, no overlay) ─── */
    const pdfImage = origImage || result.gradcam_image; // prefer original
    if (pdfImage) {
        try {
            const fmt = pdfImage.startsWith("data:image/png") ? "PNG" : "JPEG";
            setFont(doc, "bold");
            setTextC(doc, C.navy);
            doc.setFontSize(8);
            doc.text("Conjunctival Image (Original Capture)", ml, y + 4);
            doc.addImage(pdfImage, fmt, ml, y + 6, 80, 50);
            const lgX = ml + 85;
            setFont(doc, "bold");
            setTextC(doc, C.navy);
            doc.setFontSize(7.5);
            doc.text("Heatmap Legend", lgX, y + 10);
            setFont(doc, "normal");
            setTextC(doc, C.darkGray);
            doc.setFontSize(7);
            setFont(doc, "normal");
            setTextC(doc, C.darkGray);
            doc.setFontSize(7.5);
            doc.text(
                "Mode: " + (origImage ? "Original scan" : "Processed image"),
                lgX,
                y + 10,
            );
            doc.text(
                "Source: " + (origImage ? "Live camera / upload" : "Model output"),
                lgX,
                y + 16,
            );
            setFont(doc, "italic");
            setTextC(doc, C.midGray);
            doc.setFontSize(6.5);
            wrapText(
                doc,
                "This is the original conjunctival image captured during the scan. The AI analysed the pallor and vascularity of the inner lower eyelid to estimate the Haemoglobin level.",
                lgX,
                y + 24,
                97,
                4.5,
            );
            y += 62;
        } catch (_) {
            y += 4;
        }
    }

    hRule(doc, y);
    y += 6;

    /* ── Section 2: Symptoms ────────────────────────── */
    y = sectionHdr(doc, "2. Self-Reported Symptoms", y);
    y += 5;
    const SYMS = {
        fatigue: "Persistent Fatigue",
        weakness: "Generalised Weakness",
        exercise_intolerance: "Exercise Intolerance",
        dizziness: "Dizziness / Light-headedness",
        headache: "Frequent Headaches",
        concentration: "Difficulty Concentrating",
        shortness_of_breath: "Shortness of Breath",
        palpitations: "Heart Palpitations",
        chest_pain: "Chest Pain",
        pale_skin: "Pale Skin",
        pale_conjunctiva: "Pale Conjunctiva",
        brittle_nails: "Brittle Nails",
        cold_hands_feet: "Cold Hands & Feet",
        cold_intolerance: "Cold Intolerance",
        restless_legs: "Restless Leg Syndrome",
        poor_sleep: "Poor Sleep",
    };
    const symptoms = session.symptoms || [];
    if (symptoms.length === 0) {
        setFont(doc, "italic");
        setTextC(doc, C.midGray);
        doc.setFontSize(8);
        doc.text("No symptoms reported by patient.", ml, y);
        y += 8;
    } else {
        const checked = symptoms.map((id) => SYMS[id] || id.replace(/_/g, " "));
        const cols = 2,
            colW = cw / cols;
        const rows = [];
        for (let i = 0; i < checked.length; i += cols)
            rows.push(checked.slice(i, i + cols));
        rows.forEach((row, ri) => {
            const sy = y + ri * 7;
            row.forEach((cell, ci) => {
                const sx = ml + ci * colW;
                rect(
                    doc,
                    sx,
                    sy - 3.5,
                    colW - 2,
                    6.5,
                    ci % 2 === 0 ? C.lightGray : C.white,
                );
                setFont(doc, "normal");
                setTextC(doc, C.darkGray);
                doc.setFontSize(8);
                doc.text(`- ${cleanText(cell)}`, sx + 2, sy + 1);
            });
        });
        y += Math.ceil(checked.length / cols) * 7 + 6;
    }

    /* ── Section 3: Lab History ─────────────────────── */
    if (y > ph - 80) {
        doc.addPage();
        y = 20;
    }
    y = sectionHdr(doc, "3. Clinical Lab History", y);
    y += 5;
    if (labLogs.length === 0) {
        setFont(doc, "italic");
        setTextC(doc, C.midGray);
        doc.setFontSize(8);
        doc.text("No laboratory results have been entered.", ml, y);
        y += 10;
    } else {
        const tCols = [28, 22, 22, 28, 28, 50];
        const tHeads = [
            "Date",
            "RBC x10^12/L",
            "WBC x10^9/L",
            "Ferritin ng/mL",
            "Platelets x10^9/L",
            "Lab / Notes",
        ];
        let tx = ml;
        rect(doc, ml, y, cw, 10, C.navy);
        setFont(doc, "bold");
        setTextC(doc, C.white);
        doc.setFontSize(7);
        tHeads.forEach((h, i) => {
            doc.text(cleanText(h), tx + 1.5, y + 6);
            tx += tCols[i];
        });
        y += 11;
        labLogs.slice(0, 10).forEach((log, ri) => {
            if (y > ph - 20) {
                doc.addPage();
                y = 20;
            }
            rect(doc, ml, y, cw, 8, ri % 2 === 0 ? C.white : C.rowAlt);
            const cells = [
                formatDate(log.date) || "--",
                log.rbc != null ? String(log.rbc) : "--",
                log.wbc != null ? String(log.wbc) : "--",
                log.ferritin != null ? String(log.ferritin) : "--",
                log.platelets != null ? String(log.platelets) : "--",
                cleanText(
                    `${log.lab_name || ""} ${log.notes ? ". " + log.notes : ""}`.trim() ||
                    "--",
                ).slice(0, 28),
            ];
            setFont(doc, "normal");
            setTextC(doc, C.darkGray);
            doc.setFontSize(7.5);
            tx = ml;
            cells.forEach((cell, i) => {
                doc.text(String(cell).slice(0, 12), tx + 1.5, y + 5.5);
                tx += tCols[i];
            });
            setDraw(doc, C.lightGray);
            doc.setLineWidth(0.2);
            doc.rect(ml, y, cw, 8);
            y += 8;
        });
        y += 6;
    }

    /* ── Section 4: Action Plan ─────────────────────── */
    if (y > ph - 100) {
        doc.addPage();
        y = 20;
    }
    y = sectionHdr(doc, "4. Action Plan - Dietary & Lifestyle Remedies", y);
    y += 5;

    rect(doc, ml, y, cw, 14, C.lightGray);
    setFont(doc, "bold");
    setTextC(doc, C.navy);
    doc.setFontSize(8.5);
    doc.text(
        `${cleanText(remedies.label)} - ${cleanText(remedies.range)}`,
        ml + 3,
        y + 6,
    );
    setFont(doc, "normal");
    setTextC(doc, C.darkGray);
    doc.setFontSize(7.5);
    y = wrapText(doc, remedies.description, ml + 3, y + 11, cw - 6, 4.5);
    y += 4;

    /* Dietary */
    setFont(doc, "bold");
    setTextC(doc, C.navy);
    doc.setFontSize(8.5);
    doc.text("Dietary Recommendations", ml, y);
    y += 6;
    remedies.dietary.forEach((tip) => {
        if (y > ph - 30) {
            doc.addPage();
            y = 20;
        }
        setFont(doc, "bold");
        setTextC(doc, C.darkGray);
        doc.setFontSize(8);
        doc.text(`* ${cleanText(tip.title)}`, ml + 2, y);
        setFont(doc, "normal");
        setTextC(doc, C.midGray);
        doc.setFontSize(7);
        y = wrapText(doc, tip.detail, ml + 6, y + 4, cw - 8, 4.2);
        y += 3;
    });

    y += 4;
    if (y > ph - 50) {
        doc.addPage();
        y = 20;
    }
    setFont(doc, "bold");
    setTextC(doc, C.navy);
    doc.setFontSize(8.5);
    doc.text("Lifestyle Recommendations", ml, y);
    y += 6;
    remedies.lifestyle.forEach((tip) => {
        if (y > ph - 30) {
            doc.addPage();
            y = 20;
        }
        setFont(doc, "bold");
        setTextC(doc, C.darkGray);
        doc.setFontSize(8);
        doc.text(`* ${cleanText(tip.title)}`, ml + 2, y);
        setFont(doc, "normal");
        setTextC(doc, C.midGray);
        doc.setFontSize(7);
        y = wrapText(doc, tip.detail, ml + 6, y + 4, cw - 8, 4.2);
        y += 3;
    });

    /* ── Footer on every page ───────────────────────── */
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        rect(doc, 0, ph - 18, pw, 18, C.navy);
        setFont(doc, "italic");
        setTextC(doc, C.midGray);
        doc.setFontSize(6);
        const disc =
            "This report utilises AI-estimated Haemoglobin based on conjunctival imaging. It is an adjunctive screening tool and does not replace phlebotomy or professional medical diagnosis. Always consult a qualified healthcare professional.";
        const dLines = doc.splitTextToSize(disc, pw - 28);
        doc.text(dLines, ml, ph - 12);
        setFont(doc, "bold");
        setTextC(doc, C.white);
        doc.setFontSize(7);
        doc.text(`Page ${p} / ${pageCount}`, pw - ml - 20, ph - 6);
    }
    return doc;
}

/* ══ COMPONENT ══════════════════════════════════════ */
export default function PDFReport() {
    const { state } = useApp();
    const [status, setStatus] = useState("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const hasResult = !!state.session.hbResult;
    const hasProfile = !!state.profile;

    async function handleGenerate() {
        if (!hasResult || !hasProfile) {
            toast.error("Complete a scan first");
            return;
        }
        setStatus("generating");
        setErrorMsg("");
        try {
            const doc = buildPDF(state);
            const name = state.profile.name.replace(/\s+/g, "_");
            const dateStr = new Date().toISOString().slice(0, 10);
            doc.save(`Anemia_Report_${name}_${dateStr}.pdf`);
            setStatus("done");
            toast.success("PDF downloaded!");
            setTimeout(() => setStatus("idle"), 4000);
        } catch (err) {
            setErrorMsg(err.message || "PDF generation failed");
            setStatus("error");
            toast.error("Failed to generate PDF");
        }
    }

    return (
        <div className="space-y-5">
            <div className="section-bar-indigo">
                <h3 className="section-title h-indigo">Clinical PDF Report</h3>
                <p className="section-subtitle">
                    Hospital-grade report with Hb result, Grad-CAM, labs, symptoms &
                    remedies
                </p>
            </div>

            {/* Checklist */}
            <div className="card space-y-3">
                <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#64748B" }}
                >
                    Report Contents
                </p>
                {[
                    {
                        n: "1",
                        label: "Patient Header",
                        detail: "Name, age, sex, date, scan time",
                        done: hasProfile,
                    },
                    {
                        n: "2",
                        label: "AI Diagnostic",
                        detail: "Hb estimate, severity, confidence, original image",
                        done: hasResult,
                    },
                    {
                        n: "3",
                        label: "Self-Reported Symptoms",
                        detail: `${state.session.symptoms.length} symptom(s) checked`,
                        done: true,
                    },
                    {
                        n: "4",
                        label: "Clinical Lab History",
                        detail: `${state.labLogs.length} lab record(s) logged`,
                        done: true,
                    },
                    {
                        n: "5",
                        label: "Action Plan",
                        detail: "Dietary & lifestyle remedies for your severity tier",
                        done: hasResult,
                    },
                    {
                        n: "6",
                        label: "Clinical Disclaimer",
                        detail: "Strict footer on every page",
                        done: true,
                    },
                ].map(({ n, label, detail, done }) => (
                    <div key={n} className="flex items-start gap-3">
                        <div
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{
                                background: done ? "#F0FDF4" : "#F1F5F9",
                                border: `1.5px solid ${done ? "#86EFAC" : "#E2E8F0"}`,
                            }}
                        >
                            {done ? (
                                <CheckCircle2 size={11} style={{ color: "#16A34A" }} />
                            ) : (
                                <span
                                    className="text-[9px] font-bold"
                                    style={{ color: "#94A3B8" }}
                                >
                                    {n}
                                </span>
                            )}
                        </div>
                        <div>
                            <p
                                className="text-sm font-semibold"
                                style={{ color: done ? "#0F172A" : "#94A3B8" }}
                            >
                                {label}
                            </p>
                            <p className="text-xs" style={{ color: "#64748B" }}>
                                {detail}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {!hasResult && (
                <div className="callout-warn flex gap-2.5">
                    <AlertTriangle
                        size={14}
                        style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }}
                    />
                    <p className="text-xs" style={{ color: "#92400E" }}>
                        Complete a scan first to generate a report with your Hb estimate and
                        Grad-CAM.
                    </p>
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={!hasResult || status === "generating"}
                className="btn-primary w-full py-4 text-base"
            >
                {status === "generating" ? (
                    <>
                        <Loader2 size={18} className="animate-spin" /> Generating PDF…
                    </>
                ) : status === "done" ? (
                    <>
                        <CheckCircle2 size={18} style={{ color: "#86EFAC" }} /> Downloaded!
                    </>
                ) : (
                    <>
                        <FileDown size={18} /> Download Clinical PDF
                    </>
                )}
            </button>

            {status === "error" && (
                <div className="callout-danger flex gap-2.5">
                    <AlertTriangle
                        size={14}
                        style={{ color: "#DC2626", flexShrink: 0, marginTop: 2 }}
                    />
                    <p className="text-xs" style={{ color: "#991B1B" }}>
                        {errorMsg}
                    </p>
                </div>
            )}

            <div
                className="flex items-start gap-2 text-xs"
                style={{ color: "#64748B" }}
            >
                <Printer size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                <p>
                    After downloading, open the PDF and use your browser's print dialog to
                    send to a clinic printer or share via email.
                </p>
            </div>

            <div className="card" style={{ borderColor: "#E2E8F0" }}>
                <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
                    <span className="font-bold" style={{ color: "#334155" }}>
                        Strict Clinical Disclaimer:{" "}
                    </span>
                    This report utilises AI-estimated Haemoglobin based on conjunctival
                    imaging. It is an adjunctive screening tool and does not replace
                    phlebotomy or professional medical diagnosis.
                </p>
            </div>
        </div>
    );
}
