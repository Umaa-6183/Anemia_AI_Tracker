import { format, parseISO, formatDistanceToNow } from "date-fns";

/* ═══════════════════════════════════════════════════════
   HEMOGLOBIN SEVERITY CLASSIFICATION
   Based on WHO / ICSH reference ranges
═══════════════════════════════════════════════════════ */

/**
 * Derive severity tier from Hb value and patient metadata.
 * WHO thresholds differ by sex and pregnancy status.
 *
 * @param {number} hb               - Hemoglobin in g/dL
 * @param {string} sex              - "male" | "female"
 * @param {boolean} pregnancyStatus - true if pregnant
 * @returns {{ severity: string, label: string, color: string, bgColor: string, borderColor: string }}
 */
export function classifySeverity(hb, sex = "female", pregnancyStatus = false) {
    let normalThreshold, mildThreshold, moderateThreshold;

    if (pregnancyStatus) {
        // WHO thresholds for pregnant women
        normalThreshold = 11.0;
        mildThreshold = 10.0;
        moderateThreshold = 7.0;
    } else if (sex === "male") {
        normalThreshold = 13.0;
        mildThreshold = 11.0;
        moderateThreshold = 8.0;
    } else {
        // Non-pregnant female
        normalThreshold = 12.0;
        mildThreshold = 10.0;
        moderateThreshold = 8.0;
    }

    if (hb >= normalThreshold) {
        return {
            severity: "normal",
            label: "Normal",
            color: "#22c55e",
            bgColor: "bg-green-900/30",
            borderColor: "border-green-700",
            textColor: "text-green-400",
            badgeClass: "badge-normal",
        };
    } else if (hb >= mildThreshold) {
        return {
            severity: "mild",
            label: "Mild Anemia",
            color: "#facc15",
            bgColor: "bg-yellow-900/30",
            borderColor: "border-yellow-700",
            textColor: "text-yellow-400",
            badgeClass: "badge-mild",
        };
    } else if (hb >= moderateThreshold) {
        return {
            severity: "moderate",
            label: "Moderate Anemia",
            color: "#f97316",
            bgColor: "bg-orange-900/30",
            borderColor: "border-orange-700",
            textColor: "text-orange-400",
            badgeClass: "badge-moderate",
        };
    } else {
        return {
            severity: "severe",
            label: "Severe Anemia",
            color: "#ef4444",
            bgColor: "bg-red-900/30",
            borderColor: "border-red-700",
            textColor: "text-red-400",
            badgeClass: "badge-severe",
        };
    }
}

/* ═══════════════════════════════════════════════════════
   HB GAUGE — percentage position on a 0–18 g/dL scale
═══════════════════════════════════════════════════════ */
export function hbToPercent(hb, min = 0, max = 18) {
    return Math.min(100, Math.max(0, ((hb - min) / (max - min)) * 100));
}

/* ═══════════════════════════════════════════════════════
   NORMAL RANGE LABELS (for display)
═══════════════════════════════════════════════════════ */
export function normalRangeLabel(sex, pregnancyStatus) {
    if (pregnancyStatus) return "11.0 – 14.5 g/dL";
    if (sex === "male") return "13.0 – 17.5 g/dL";
    return "12.0 – 15.5 g/dL";
}

/* ═══════════════════════════════════════════════════════
   DATE / TIME FORMATTING
═══════════════════════════════════════════════════════ */
export function formatDate(isoString) {
    if (!isoString) return "—";
    try {
        return format(parseISO(isoString), "dd MMM yyyy");
    } catch {
        return isoString;
    }
}

export function formatDateTime(isoString) {
    if (!isoString) return "—";
    try {
        return format(parseISO(isoString), "dd MMM yyyy, HH:mm");
    } catch {
        return isoString;
    }
}

export function timeAgo(isoString) {
    if (!isoString) return "—";
    try {
        return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
    } catch {
        return isoString;
    }
}

export function nowISO() {
    return new Date().toISOString();
}

/* ═══════════════════════════════════════════════════════
   NUMBER FORMATTING
═══════════════════════════════════════════════════════ */
export function formatHb(value) {
    if (value === null || value === undefined) return "—";
    return `${Number(value).toFixed(1)} g/dL`;
}

export function formatConfidence(value) {
    if (value === null || value === undefined) return "—";
    return `${Math.round(Number(value) * 100)}%`;
}

/* ═══════════════════════════════════════════════════════
   IMAGE UTILITIES
═══════════════════════════════════════════════════════ */

/**
 * Resize a base64 image to a maximum dimension (for API payload size).
 */
export function resizeBase64Image(dataUrl, maxDim = 640) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.src = dataUrl;
    });
}

/**
 * Check Laplacian-variance-proxy using canvas pixel variance
 * (client-side blur pre-check before sending to backend).
 * Returns a score: higher = sharper.
 */
export function estimateBlurScore(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const size = 128;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, size, size);
            const { data } = ctx.getImageData(0, 0, size, size);

            // Convert to grayscale and compute pixel variance (proxy for sharpness)
            let sum = 0,
                sumSq = 0,
                n = 0;
            for (let i = 0; i < data.length; i += 4) {
                const gray =
                    0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                sum += gray;
                sumSq += gray * gray;
                n++;
            }
            const mean = sum / n;
            const variance = sumSq / n - mean * mean;
            resolve(variance);
        };
        img.onerror = () => resolve(0);
        img.src = dataUrl;
    });
}

/* ═══════════════════════════════════════════════════════
   SEVERITY COLOR SCALE FOR CHARTS
═══════════════════════════════════════════════════════ */
export function severityColor(severity) {
    const map = {
        normal: "#22c55e",
        mild: "#facc15",
        moderate: "#f97316",
        severe: "#ef4444",
    };
    return map[severity] ?? "#94a3b8";
}

/* ═══════════════════════════════════════════════════════
   GENERATE UNIQUE SESSION ID
═══════════════════════════════════════════════════════ */
export function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ═══════════════════════════════════════════════════════
   DEEP CLONE (safe for plain objects/arrays)
═══════════════════════════════════════════════════════ */
export function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/* ═══════════════════════════════════════════════════════
   TRUNCATE STRING
═══════════════════════════════════════════════════════ */
export function truncate(str, max = 40) {
    if (!str) return "";
    return str.length <= max ? str : str.slice(0, max - 1) + "…";
}
