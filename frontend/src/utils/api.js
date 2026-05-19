import axios from "axios";

/* ─────────────────────────────────────────────────────────
   Base client
   In development the CRA proxy (package.json "proxy") forwards
   /api/* to http://localhost:8000. In production set
   REACT_APP_API_URL in your .env file.
───────────────────────────────────────────────────────── */
const BASE_URL = process.env.REACT_APP_API_URL || "";

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 60 _000, // 60 s — model inference can take a moment
    headers: {
        "Content-Type": "application/json"
    },
});

/* ── Request interceptor: attach any stored auth token ── */
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("anemia_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/* ── Response interceptor: normalize errors ─────────── */
client.interceptors.response.use(
    (res) => res,
    (err) => {
        const message =
            err.response ? .data ? .detail ||
                err.response ? .data ? .message ||
                    err.message ||
                    "An unexpected error occurred";
        return Promise.reject(new Error(message));
    }
);

/* ═══════════════════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════════════════ */
export async function healthCheck() {
    const {
        data
    } = await client.get("/api/health");
    return data;
}

/* ═══════════════════════════════════════════════════════
   IMAGE QUALITY ASSESSMENT
   POST /api/iqa
   Body: { image: "<base64 data URL>" }
   Returns: { passed: bool, blur_score: float, brightness: float, feedback: string }
═══════════════════════════════════════════════════════ */
export async function assessImageQuality(imageDataUrl) {
    const {
        data
    } = await client.post("/api/iqa", {
        image: imageDataUrl,
    });
    return data;
}

/* ═══════════════════════════════════════════════════════
   HEMOGLOBIN PREDICTION
   POST /api/predict
   Body: {
     image: "<base64 data URL>",
     age: number,
     sex: "male"|"female",
     pregnancy_status: bool
   }
   Returns: {
     hb: float,                // e.g. 11.4
     severity: string,         // "normal"|"mild"|"moderate"|"severe"
     confidence: float,        // 0–1
     gradcam_image: string,    // base64 heatmap PNG
     processing_time_ms: number
   }
═══════════════════════════════════════════════════════ */
export async function predictHemoglobin({
    imageDataUrl,
    age,
    sex,
    pregnancyStatus
}) {
    const {
        data
    } = await client.post("/api/predict", {
        image: imageDataUrl,
        age: Number(age),
        sex: sex.toLowerCase(),
        pregnancy_status: Boolean(pregnancyStatus),
    });
    return data;
}

/* ═══════════════════════════════════════════════════════
   GENERATE PDF REPORT
   POST /api/report
   Body: full report payload
   Returns: PDF blob
═══════════════════════════════════════════════════════ */
export async function generatePDFReport(payload) {
    const response = await client.post("/api/report", payload, {
        responseType: "blob",
    });
    return response.data; // Blob
}

/* ═══════════════════════════════════════════════════════
   SAVE LAB LOG  (optional — if you want server persistence)
   POST /api/labs
═══════════════════════════════════════════════════════ */
export async function saveLabLog(log) {
    const {
        data
    } = await client.post("/api/labs", log);
    return data;
}

/* ═══════════════════════════════════════════════════════
   HELPER — download a blob as a file in the browser
═══════════════════════════════════════════════════════ */
export function downloadBlob(blob, filename = "anemia-report.pdf") {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}