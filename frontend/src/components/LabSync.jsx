import React, { useState } from "react";
import {
    FlaskConical,
    Plus,
    Trash2,
    Calendar,
    ChevronDown,
    ChevronUp,
    Info,
    CheckCircle2,
    AlertTriangle,
    FileText,
    X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import { formatDate, nowISO } from "../utils/helpers";

/* ─── Reference ranges ─────────────────────────────── */
const REFERENCES = {
    rbc: {
        male: { low: 4.5, high: 5.9, unit: "× 10¹²/L" },
        female: { low: 4.0, high: 5.2, unit: "× 10¹²/L" },
        pregnant: { low: 3.5, high: 5.0, unit: "× 10¹²/L" },
    },
    wbc: {
        all: { low: 4.5, high: 11.0, unit: "× 10⁹/L" },
    },
    ferritin: {
        male: { low: 30, high: 400, unit: "ng/mL" },
        female: { low: 12, high: 150, unit: "ng/mL" },
        pregnant: { low: 15, high: 150, unit: "ng/mL" },
    },
    platelets: {
        all: { low: 150, high: 400, unit: "× 10⁹/L" },
    },
};

function getRef(key, sex, pregnancyStatus) {
    const r = REFERENCES[key];
    if (!r) return null;
    if (r.all) return r.all;
    if (pregnancyStatus && r.pregnant) return r.pregnant;
    return r[sex] ?? r.female;
}

function flagStatus(value, key, sex, pregnancyStatus) {
    if (!value) return "normal";
    const ref = getRef(key, sex, pregnancyStatus);
    if (!ref) return "normal";
    const v = parseFloat(value);
    if (isNaN(v)) return "normal";
    if (v < ref.low) return "low";
    if (v > ref.high) return "high";
    return "normal";
}

const FLAG_STYLES = {
    low: "text-red-400 bg-red-900/30 border-red-800",
    high: "text-amber-400 bg-amber-900/30 border-amber-800",
    normal: "text-green-400 bg-green-900/30 border-green-800",
};
const FLAG_LABELS = { low: "Low", high: "High", normal: "Normal" };

/* ─── Validated input field ─────────────────────────── */
function LabField({
    label,
    name,
    value,
    unit,
    placeholder,
    onChange,
    flag,
    hint,
    required = false,
}) {
    return (
        <div>
            <label className="label flex items-center justify-between">
                <span>
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
                {value && flag && (
                    <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${FLAG_STYLES[flag]}`}
                    >
                        {FLAG_LABELS[flag]}
                    </span>
                )}
            </label>
            <div className="relative">
                <input
                    type="number"
                    step="any"
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`input-field pr-16 ${flag === "low"
                        ? "border-red-700 focus:ring-red-500"
                        : flag === "high"
                            ? "border-amber-700 focus:ring-amber-500"
                            : ""
                        }`}
                />
                <span
                    className="absolute right-3 top-1/2 -translate-y-1/2
                          text-xs text-slate-500 font-medium pointer-events-none"
                >
                    {unit}
                </span>
            </div>
            {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
        </div>
    );
}

/* ─── Entry row in the history table ───────────────── */
function LabRow({ entry, index, onDelete, profile }) {
    const [expanded, setExpanded] = useState(false);
    const sex = profile?.sex ?? "female";
    const preg = profile?.pregnancyStatus ?? false;

    const flags = {
        rbc: flagStatus(entry.rbc, "rbc", sex, preg),
        wbc: flagStatus(entry.wbc, "wbc", sex, preg),
        ferritin: flagStatus(entry.ferritin, "ferritin", sex, preg),
        platelets: flagStatus(entry.platelets, "platelets", sex, preg),
    };
    const hasAbnormal = Object.values(flags).some((f) => f !== "normal");

    return (
        <div
            className={`border rounded-xl overflow-hidden transition-all duration-200
                      ${hasAbnormal
                    ? "border-amber-800/50 bg-amber-950/10"
                    : "border-slate-700 bg-slate-800/30"
                }`}
        >
            {/* Collapsed row */}
            <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-shrink-0">
                    <div
                        className={`w-2 h-2 rounded-full ${hasAbnormal ? "bg-amber-500" : "bg-green-500"}`}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200">
                            {formatDate(entry.date)}
                        </span>
                        {hasAbnormal && (
                            <span
                                className="text-[9px] font-bold text-amber-400 bg-amber-900/40
                               border border-amber-800 px-1.5 py-0.5 rounded"
                            >
                                Abnormal Values
                            </span>
                        )}
                    </div>
                    {/* Quick preview */}
                    <div className="flex flex-wrap gap-2 mt-1">
                        {entry.rbc && (
                            <span
                                className={`text-[10px] font-mono ${flags.rbc !== "normal" ? "text-red-400" : "text-slate-500"}`}
                            >
                                RBC {entry.rbc}
                            </span>
                        )}
                        {entry.wbc && (
                            <span
                                className={`text-[10px] font-mono ${flags.wbc !== "normal" ? "text-amber-400" : "text-slate-500"}`}
                            >
                                WBC {entry.wbc}
                            </span>
                        )}
                        {entry.ferritin && (
                            <span
                                className={`text-[10px] font-mono ${flags.ferritin !== "normal" ? "text-red-400" : "text-slate-500"}`}
                            >
                                Ferritin {entry.ferritin}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="w-7 h-7 flex items-center justify-center text-slate-500
                       hover:text-slate-200 rounded-lg hover:bg-slate-700 transition-all"
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                        onClick={() => onDelete(index)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600
                       hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-slate-700/60 px-4 py-4 bg-slate-900/40 animate-fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {[
                            { key: "rbc", label: "RBC", unit: "×10¹²/L" },
                            { key: "wbc", label: "WBC", unit: "×10⁹/L" },
                            { key: "ferritin", label: "Ferritin", unit: "ng/mL" },
                            { key: "platelets", label: "Platelets", unit: "×10⁹/L" },
                        ].map(({ key, label, unit }) => (
                            <div
                                key={key}
                                className="bg-slate-800/60 rounded-xl p-3 border border-slate-700"
                            >
                                <p className="text-xs text-slate-500 mb-1">{label}</p>
                                <p
                                    className={`text-sm font-bold font-mono
                               ${flags[key] === "low"
                                            ? "text-red-400"
                                            : flags[key] === "high"
                                                ? "text-amber-400"
                                                : "text-slate-200"
                                        }`}
                                >
                                    {entry[key] ?? "—"}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-0.5">{unit}</p>
                                {entry[key] && flags[key] !== "normal" && (
                                    <span
                                        className={`text-[9px] font-bold mt-1 inline-block
                                    ${FLAG_STYLES[flags[key]]} px-1.5 py-0.5 rounded border`}
                                    >
                                        {FLAG_LABELS[flags[key]]}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {entry.lab_name && (
                        <p className="text-xs text-slate-500">
                            <span className="text-slate-400 font-medium">Lab: </span>
                            {entry.lab_name}
                        </p>
                    )}
                    {entry.notes && (
                        <p className="text-xs text-slate-500 mt-1">
                            <span className="text-slate-400 font-medium">Notes: </span>
                            {entry.notes}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Empty form state ──────────────────────────────── */
const EMPTY = {
    date: new Date().toISOString().slice(0, 10),
    rbc: "",
    wbc: "",
    ferritin: "",
    platelets: "",
    lab_name: "",
    notes: "",
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function LabSync() {
    const { state, addLabLog, deleteLabLog } = useApp();
    const profile = state.profile;
    const labLogs = state.labLogs;

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});

    const sex = profile?.sex ?? "female";
    const preg = profile?.pregnancyStatus ?? false;

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    }

    function validate() {
        const errs = {};
        if (!form.date) errs.date = "Date is required";
        if (!form.rbc && !form.wbc && !form.ferritin) {
            errs.rbc = "Enter at least one lab value";
        }
        return errs;
    }

    function handleSubmit(e) {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            toast.error("Please enter a date and at least one lab value");
            return;
        }

        addLabLog({
            ...form,
            id: `lab_${Date.now()}`,
            createdAt: nowISO(),
        });

        toast.success("Lab results saved to your record");
        setForm(EMPTY);
        setShowForm(false);
        setErrors({});
    }

    function handleDelete(idx) {
        if (!window.confirm("Delete this lab entry?")) return;
        deleteLabLog(idx);
        toast.success("Lab entry deleted");
    }

    /* Reference range hints for current profile */
    const refHints = {
        rbc: getRef("rbc", sex, preg),
        wbc: getRef("wbc", sex, preg),
        ferritin: getRef("ferritin", sex, preg),
        platelets: getRef("platelets", sex, preg),
    };

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h3 className="section-title flex items-center gap-2">
                        <FlaskConical size={16} className="text-green-400" />
                        Lab Sync
                    </h3>
                    <p className="section-subtitle">
                        Log your official hospital bloodwork for a complete report
                    </p>
                </div>

                <button
                    onClick={() => setShowForm((v) => !v)}
                    className={showForm ? "btn-secondary" : "btn-primary"}
                >
                    {showForm ? (
                        <>
                            <X size={14} /> Cancel
                        </>
                    ) : (
                        <>
                            <Plus size={14} /> Add Bloodwork
                        </>
                    )}
                </button>
            </div>

            {/* ── Entry form ── */}
            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="card border-clinical-900/60 bg-clinical-950/20 space-y-5 animate-slide-up"
                >
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700/60">
                        <FileText size={14} className="text-clinical-400" />
                        <p className="text-sm font-semibold text-slate-200">
                            New Lab Entry
                        </p>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="label flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-500" />
                            Date of Blood Test
                            <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            max={new Date().toISOString().slice(0, 10)}
                            className={`input-field ${errors.date ? "border-red-500" : ""}`}
                        />
                        {errors.date && (
                            <p className="text-xs text-red-400 mt-1">{errors.date}</p>
                        )}
                    </div>

                    {/* Lab values grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <LabField
                            label="RBC Count"
                            name="rbc"
                            value={form.rbc}
                            unit="×10¹²/L"
                            placeholder={`e.g. ${sex === "male" ? "5.0" : "4.5"}`}
                            onChange={handleChange}
                            flag={form.rbc ? flagStatus(form.rbc, "rbc", sex, preg) : null}
                            hint={
                                refHints.rbc
                                    ? `Normal: ${refHints.rbc.low}–${refHints.rbc.high} ${refHints.rbc.unit}`
                                    : ""
                            }
                        />
                        <LabField
                            label="WBC Count"
                            name="wbc"
                            value={form.wbc}
                            unit="×10⁹/L"
                            placeholder="e.g. 7.0"
                            onChange={handleChange}
                            flag={form.wbc ? flagStatus(form.wbc, "wbc", sex, preg) : null}
                            hint={`Normal: ${refHints.wbc.low}–${refHints.wbc.high} ${refHints.wbc.unit}`}
                        />
                        <LabField
                            label="Ferritin"
                            name="ferritin"
                            value={form.ferritin}
                            unit="ng/mL"
                            placeholder={`e.g. ${sex === "male" ? "80" : "40"}`}
                            onChange={handleChange}
                            flag={
                                form.ferritin
                                    ? flagStatus(form.ferritin, "ferritin", sex, preg)
                                    : null
                            }
                            hint={
                                refHints.ferritin
                                    ? `Normal: ${refHints.ferritin.low}–${refHints.ferritin.high} ${refHints.ferritin.unit}`
                                    : ""
                            }
                        />
                        <LabField
                            label="Platelets"
                            name="platelets"
                            value={form.platelets}
                            unit="×10⁹/L"
                            placeholder="e.g. 250"
                            onChange={handleChange}
                            flag={
                                form.platelets
                                    ? flagStatus(form.platelets, "platelets", sex, preg)
                                    : null
                            }
                            hint={`Normal: ${refHints.platelets.low}–${refHints.platelets.high} ${refHints.platelets.unit}`}
                        />
                    </div>

                    {errors.rbc && (
                        <p className="text-xs text-red-400 -mt-2">{errors.rbc}</p>
                    )}

                    {/* Optional fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Laboratory / Clinic Name</label>
                            <input
                                type="text"
                                name="lab_name"
                                value={form.lab_name}
                                onChange={handleChange}
                                placeholder="e.g. Apollo Diagnostics"
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="label">Notes</label>
                            <input
                                type="text"
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                placeholder="e.g. Fasting sample"
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Real-time flag preview */}
                    {(form.rbc || form.wbc || form.ferritin || form.platelets) && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                            <p className="text-xs font-medium text-slate-400 mb-2">
                                Live Reference Check
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: "rbc", label: "RBC", val: form.rbc },
                                    { key: "wbc", label: "WBC", val: form.wbc },
                                    { key: "ferritin", label: "Ferritin", val: form.ferritin },
                                    { key: "platelets", label: "Platelets", val: form.platelets },
                                ]
                                    .filter(({ val }) => val)
                                    .map(({ key, label, val }) => {
                                        const fl = flagStatus(val, key, sex, preg);
                                        return (
                                            <div
                                                key={key}
                                                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1
                                  rounded-full border ${FLAG_STYLES[fl]}`}
                                            >
                                                {fl === "normal" ? (
                                                    <CheckCircle2 size={11} />
                                                ) : (
                                                    <AlertTriangle size={11} />
                                                )}
                                                {label}: {FLAG_LABELS[fl]}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit" className="btn-primary w-full py-3">
                        <CheckCircle2 size={16} />
                        Save Lab Entry
                    </button>
                </form>
            )}

            {/* ── Lab history ── */}
            {labLogs.length > 0 ? (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                        {labLogs.length} record{labLogs.length !== 1 ? "s" : ""} · Newest
                        first
                    </p>
                    {labLogs.map((entry, i) => (
                        <LabRow
                            key={entry.id ?? i}
                            entry={entry}
                            index={i}
                            onDelete={handleDelete}
                            profile={profile}
                        />
                    ))}
                </div>
            ) : (
                !showForm && (
                    <div className="card text-center py-10 space-y-3">
                        <FlaskConical size={30} className="text-slate-700 mx-auto" />
                        <p className="text-slate-400 text-sm font-medium">
                            No lab entries yet
                        </p>
                        <p className="text-slate-600 text-xs max-w-xs mx-auto leading-relaxed">
                            Add your official bloodwork results here to enrich your AI report
                            with real clinical data.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary mx-auto"
                        >
                            <Plus size={14} />
                            Add First Entry
                        </button>
                    </div>
                )
            )}

            {/* ── Clinical note ── */}
            <div className="flex gap-2 bg-slate-800/40 border border-slate-700 rounded-xl p-3">
                <Info size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                    Lab values are stored locally and included in the Clinical PDF report
                    as a comparison table. Reference ranges shown are WHO/ICSH population
                    norms adjusted for your sex and pregnancy status.
                </p>
            </div>
        </div>
    );
}
