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

const REFERENCES = {
    rbc: {
        male: { low: 4.5, high: 5.9, unit: "× 10¹²/L" },
        female: { low: 4.0, high: 5.2, unit: "× 10¹²/L" },
        pregnant: { low: 3.5, high: 5.0, unit: "× 10¹²/L" },
    },
    wbc: { all: { low: 4.5, high: 11.0, unit: "× 10⁹/L" } },
    ferritin: {
        male: { low: 30, high: 400, unit: "ng/mL" },
        female: { low: 12, high: 150, unit: "ng/mL" },
        pregnant: { low: 15, high: 150, unit: "ng/mL" },
    },
    platelets: { all: { low: 150, high: 400, unit: "× 10⁹/L" } },
};

function getRef(key, sex, preg) {
    const r = REFERENCES[key];
    if (!r) return null;
    if (r.all) return r.all;
    if (preg && r.pregnant) return r.pregnant;
    return r[sex] ?? r.female;
}
function flagStatus(value, key, sex, preg) {
    if (!value) return "normal";
    const ref = getRef(key, sex, preg);
    if (!ref) return "normal";
    const v = parseFloat(value);
    if (isNaN(v)) return "normal";
    if (v < ref.low) return "low";
    if (v > ref.high) return "high";
    return "normal";
}
const FLAG = {
    low: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", label: "Low" },
    high: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A", label: "High" },
    normal: {
        bg: "#F0FDF4",
        text: "#14532D",
        border: "#86EFAC",
        label: "Normal",
    },
};

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
    const f = flag ? FLAG[flag] : null;
    return (
        <div>
            <label className="label flex items-center justify-between">
                <span>
                    {label}
                    {required && <span style={{ color: "#DC2626" }}> *</span>}
                </span>
                {value && flag && (
                    <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                        style={{ background: f.bg, color: f.text, borderColor: f.border }}
                    >
                        {f.label}
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
                    className="input-field pr-16"
                    style={{
                        borderColor:
                            flag === "low"
                                ? "#FECACA"
                                : flag === "high"
                                    ? "#FDE68A"
                                    : "#CBD5E1",
                    }}
                />
                <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                    style={{ color: "#94A3B8" }}
                >
                    {unit}
                </span>
            </div>
            {hint && !flag && (
                <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>
                    {hint}
                </p>
            )}
        </div>
    );
}

function LabRow({ entry, index, onDelete, profile }) {
    const [expanded, setExpanded] = useState(false);
    const sex = profile?.sex ?? "female",
        preg = profile?.pregnancyStatus ?? false;
    const flags = {
        rbc: flagStatus(entry.rbc, "rbc", sex, preg),
        wbc: flagStatus(entry.wbc, "wbc", sex, preg),
        ferritin: flagStatus(entry.ferritin, "ferritin", sex, preg),
        platelets: flagStatus(entry.platelets, "platelets", sex, preg),
    };
    const hasAbnormal = Object.values(flags).some((f) => f !== "normal");
    return (
        <div
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{
                border: `1.5px solid ${hasAbnormal ? "#FDE68A" : "#E2E8F0"}`,
                background: hasAbnormal ? "#FFFBEB" : "#fff",
            }}
        >
            <div className="flex items-center gap-3 px-4 py-3">
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: hasAbnormal ? "#D97706" : "#16A34A" }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="text-sm font-semibold"
                            style={{ color: "#0F172A" }}
                        >
                            {formatDate(entry.date)}
                        </span>
                        {hasAbnormal && (
                            <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                    background: "#FEF3C7",
                                    color: "#78350F",
                                    border: "1px solid #FDE68A",
                                }}
                            >
                                Abnormal Values
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-0.5">
                        {entry.rbc && (
                            <span
                                className="text-[10px] font-mono"
                                style={{
                                    color: flags.rbc !== "normal" ? "#DC2626" : "#64748B",
                                }}
                            >
                                RBC {entry.rbc}
                            </span>
                        )}
                        {entry.wbc && (
                            <span
                                className="text-[10px] font-mono"
                                style={{
                                    color: flags.wbc !== "normal" ? "#D97706" : "#64748B",
                                }}
                            >
                                WBC {entry.wbc}
                            </span>
                        )}
                        {entry.ferritin && (
                            <span
                                className="text-[10px] font-mono"
                                style={{
                                    color: flags.ferritin !== "normal" ? "#DC2626" : "#64748B",
                                }}
                            >
                                Ferritin {entry.ferritin}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                    style={{ background: "#F1F5F9", color: "#64748B" }}
                >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                    onClick={() => onDelete(index)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                    style={{ background: "#FEF2F2", color: "#DC2626" }}
                >
                    <Trash2 size={13} />
                </button>
            </div>
            {expanded && (
                <div
                    className="px-4 py-4 animate-fade-in"
                    style={{ borderTop: "1.5px solid #E2E8F0", background: "#F8FAFC" }}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {[
                            ["rbc", "RBC", "×10¹²/L"],
                            ["wbc", "WBC", "×10⁹/L"],
                            ["ferritin", "Ferritin", "ng/mL"],
                            ["platelets", "Platelets", "×10⁹/L"],
                        ].map(([key, lbl, unit]) => {
                            const f = FLAG[flags[key]] || FLAG.normal;
                            return (
                                <div
                                    key={key}
                                    className="rounded-xl p-3"
                                    style={{
                                        background: "#fff",
                                        border: `1.5px solid ${f.border}`,
                                    }}
                                >
                                    <p className="text-xs mb-1" style={{ color: "#64748B" }}>
                                        {lbl}
                                    </p>
                                    <p
                                        className="text-sm font-bold font-mono"
                                        style={{ color: f.text }}
                                    >
                                        {entry[key] ?? "-"}
                                    </p>
                                    <p
                                        className="text-[10px] mt-0.5"
                                        style={{ color: "#94A3B8" }}
                                    >
                                        {unit}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    {entry.lab_name && (
                        <p className="text-xs" style={{ color: "#64748B" }}>
                            <span className="font-semibold" style={{ color: "#334155" }}>
                                Lab:{" "}
                            </span>
                            {entry.lab_name}
                        </p>
                    )}
                    {entry.notes && (
                        <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                            <span className="font-semibold" style={{ color: "#334155" }}>
                                Notes:{" "}
                            </span>
                            {entry.notes}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

const EMPTY = {
    date: new Date().toISOString().slice(0, 10),
    rbc: "",
    wbc: "",
    ferritin: "",
    platelets: "",
    lab_name: "",
    notes: "",
};

export default function LabSync() {
    const { state, addLabLog, deleteLabLog } = useApp();
    const profile = state.profile;
    const labLogs = state.labLogs;
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});

    const sex = profile?.sex ?? "female",
        preg = profile?.pregnancyStatus ?? false;

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    }

    function validate() {
        const errs = {};
        if (!form.date) errs.date = "Date is required";
        if (!form.rbc && !form.wbc && !form.ferritin)
            errs.rbc = "Enter at least one lab value";
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
        addLabLog({ ...form, id: `lab_${Date.now()}`, createdAt: nowISO() });
        toast.success("Lab results saved");
        setForm(EMPTY);
        setShowForm(false);
        setErrors({});
    }

    function handleDelete(idx) {
        if (!window.confirm("Delete this lab entry?")) return;
        deleteLabLog(idx);
        toast.success("Lab entry deleted");
    }

    const refHints = {
        rbc: getRef("rbc", sex, preg),
        wbc: getRef("wbc", sex, preg),
        ferritin: getRef("ferritin", sex, preg),
        platelets: getRef("platelets", sex, preg),
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="section-bar-teal">
                    <h3 className="section-title" style={{ color: "#0D9488" }}>
                        <span className="flex items-center gap-2">
                            <FlaskConical size={16} />
                            Lab Sync
                        </span>
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

            {/* Form */}
            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="card space-y-5 animate-slide-up"
                    style={{ borderColor: "#99F6E4", background: "#F0FDFA" }}
                >
                    <div
                        className="flex items-center gap-2 pb-2"
                        style={{ borderBottom: "1.5px solid #E2E8F0" }}
                    >
                        <FileText size={14} style={{ color: "#0D9488" }} />
                        <p className="text-sm font-bold" style={{ color: "#0D9488" }}>
                            New Lab Entry
                        </p>
                    </div>

                    <div>
                        <label className="label flex items-center gap-1.5">
                            <Calendar size={12} style={{ color: "#64748B" }} />
                            Date of Blood Test <span style={{ color: "#DC2626" }}>*</span>
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            max={new Date().toISOString().slice(0, 10)}
                            className="input-field"
                            style={{ borderColor: errors.date ? "#FECACA" : "#CBD5E1" }}
                        />
                        {errors.date && (
                            <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                                {errors.date}
                            </p>
                        )}
                    </div>

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
                        <p className="text-xs -mt-2" style={{ color: "#DC2626" }}>
                            {errors.rbc}
                        </p>
                    )}

                    {/* Live flags */}
                    {(form.rbc || form.wbc || form.ferritin || form.platelets) && (
                        <div
                            className="rounded-xl p-3"
                            style={{ background: "#fff", border: "1.5px solid #E2E8F0" }}
                        >
                            <p
                                className="text-xs font-bold mb-2"
                                style={{ color: "#334155" }}
                            >
                                Live Reference Check
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    ["rbc", "RBC", form.rbc],
                                    ["wbc", "WBC", form.wbc],
                                    ["ferritin", "Ferritin", form.ferritin],
                                    ["platelets", "Platelets", form.platelets],
                                ]
                                    .filter(([, , v]) => v)
                                    .map(([key, lbl, val]) => {
                                        const fl = flagStatus(val, key, sex, preg),
                                            f = FLAG[fl];
                                        return (
                                            <div
                                                key={key}
                                                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                                                style={{
                                                    background: f.bg,
                                                    color: f.text,
                                                    border: `1.5px solid ${f.border}`,
                                                }}
                                            >
                                                {fl === "normal" ? (
                                                    <CheckCircle2 size={11} />
                                                ) : (
                                                    <AlertTriangle size={11} />
                                                )}
                                                {lbl}: {f.label}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

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

                    <button type="submit" className="btn-primary w-full py-3">
                        <CheckCircle2 size={16} /> Save Lab Entry
                    </button>
                </form>
            )}

            {/* Lab history */}
            {labLogs.length > 0 ? (
                <div className="space-y-3">
                    <p className="text-xs font-semibold" style={{ color: "#64748B" }}>
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
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                            style={{ background: "#F0FDFA", border: "1.5px solid #99F6E4" }}
                        >
                            <FlaskConical size={24} style={{ color: "#0D9488" }} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>
                            No lab entries yet
                        </p>
                        <p
                            className="text-xs max-w-xs mx-auto leading-relaxed"
                            style={{ color: "#64748B" }}
                        >
                            Add your official bloodwork results to enrich your AI report with
                            real clinical data.
                        </p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="btn-primary mx-auto"
                        >
                            <Plus size={14} /> Add First Entry
                        </button>
                    </div>
                )
            )}

            {/* Clinical note */}
            <div className="callout-info flex gap-2">
                <Info
                    size={12}
                    style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
                />
                <p className="text-xs leading-relaxed" style={{ color: "#1D4ED8" }}>
                    Lab values are stored locally and included in the Clinical PDF as a
                    comparison table. Reference ranges shown are WHO/ICSH norms adjusted
                    for your sex and pregnancy status.
                </p>
            </div>
        </div>
    );
}
