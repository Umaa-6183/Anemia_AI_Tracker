import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    User,
    Calendar,
    Venus,
    Baby,
    ChevronRight,
    CheckCircle2,
    Info,
    Edit3,
    Trash2,
    ScanLine,
} from "lucide-react";
import toast from "react-hot-toast";
import { useApp } from "../context/AppContext";
import StepIndicator from "../components/StepIndicator";

/* ── Field validation ───────────────────────────────── */
function validate(form) {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    else if (form.name.trim().length < 2)
        errors.name = "Name must be at least 2 characters";
    if (!form.age) errors.age = "Age is required";
    else if (form.age < 1 || form.age > 120)
        errors.age = "Enter a valid age (1–120)";
    if (!form.sex) errors.sex = "Please select a biological sex";
    return errors;
}

/* ── Input wrapper ──────────────────────────────────── */
function Field({ label, error, icon: Icon, children, hint }) {
    return (
        <div>
            <label className="label flex items-center gap-1.5">
                {Icon && <Icon size={13} className="text-gray-500" />}
                {label}
            </label>
            {children}
            {hint && !error && (
                <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                    <Info size={10} />
                    {hint}
                </p>
            )}
            {error && (
                <p className="mt-1 text-xs text-red-400 font-medium">{error}</p>
            )}
        </div>
    );
}

/* ── Sex selector button ────────────────────────────── */
function SexButton({ value, selected, onClick, icon, label, description }) {
    return (
        <button
            type="button"
            onClick={() => onClick(value)}
            className={`relative flex-1 p-4 rounded-xl border-2 text-left transition-all duration-150
                  ${selected
                    ? "bg-clinical-900/50 border-clinical-500 shadow-lg shadow-clinical-900/30"
                    : "bg-gray-100 border-gray-300 hover:border-gray-400"
                }`}
        >
            {selected && (
                <CheckCircle2
                    size={16}
                    className="absolute top-3 right-3 text-clinical-400"
                />
            )}
            <span className="text-2xl block mb-1">{icon}</span>
            <p
                className={`text-sm font-semibold ${selected ? "text-clinical-200" : "text-gray-700"}`}
            >
                {label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
        </button>
    );
}

const EMPTY_FORM = {
    name: "",
    age: "",
    sex: "",
    pregnancyStatus: false,
};

/* ═══════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════ */
export default function Profile() {
    const navigate = useNavigate();
    const { state, setProfile, clearProfile } = useApp();
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [isEditing, setIsEditing] = useState(false);

    /* Pre-fill form if profile exists */
    useEffect(() => {
        if (state.profile) {
            setForm({
                name: state.profile.name ?? "",
                age: state.profile.age ?? "",
                sex: state.profile.sex ?? "",
                pregnancyStatus: state.profile.pregnancyStatus ?? false,
            });
        }
    }, [state.profile]);

    const hasProfile = !!state.profile;

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
        if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
    }

    function handleSexSelect(sex) {
        setForm((f) => ({
            ...f,
            sex,
            pregnancyStatus: sex === "male" ? false : f.pregnancyStatus,
        }));
        if (errors.sex) setErrors((e) => ({ ...e, sex: undefined }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        const errs = validate(form);
        if (Object.keys(errs).length) {
            setErrors(errs);
            toast.error("Please fix the highlighted fields");
            return;
        }

        const profile = {
            name: form.name.trim(),
            age: Number(form.age),
            sex: form.sex,
            pregnancyStatus: form.pregnancyStatus,
            createdAt: state.profile?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setProfile(profile);
        setIsEditing(false);
        toast.success(
            hasProfile
                ? "Profile updated successfully!"
                : "Profile created! Ready to scan.",
        );

        if (!hasProfile) {
            setTimeout(() => navigate("/scan"), 700);
        }
    }

    function handleDelete() {
        if (
            !window.confirm(
                "Delete your profile and all local data? This cannot be undone.",
            )
        )
            return;
        clearProfile();
        localStorage.removeItem("anemia_tracker_state");
        setForm(EMPTY_FORM);
        toast.success("Profile deleted");
    }

    /* ── Read-only view (when profile exists and not editing) ── */
    if (hasProfile && !isEditing) {
        return (
            <div className="min-h-screen px-4 py-10 max-w-lg mx-auto animate-fade-in">
                <StepIndicator currentStep={1} />

                <div className="mt-8 space-y-5">
                    {/* Profile card */}
                    <div className="card">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 bg-clinical-700 rounded-2xl flex items-center justify-center
                                shadow-lg shadow-clinical-900/50"
                                >
                                    <User size={22} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {state.profile.name}
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Profile · Created{" "}
                                        {new Date(state.profile.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <span
                                className="flex items-center gap-1.5 bg-green-900/40 text-green-400
                               border border-green-800 text-xs font-semibold px-2.5 py-1 rounded-full"
                            >
                                <CheckCircle2 size={11} />
                                Active
                            </span>
                        </div>

                        {/* Profile fields */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                {
                                    label: "Age",
                                    value: `${state.profile.age} years`,
                                    Icon: Calendar,
                                },
                                {
                                    label: "Biological Sex",
                                    value: state.profile.sex === "male" ? "Male" : "Female",
                                    Icon: Venus,
                                },
                                {
                                    label: "Pregnancy Status",
                                    value: state.profile.pregnancyStatus ? "Yes" : "No / N/A",
                                    Icon: Baby,
                                },
                                {
                                    label: "Total Scans",
                                    value: `${state.hbHistory.length} scan${state.hbHistory.length !== 1 ? "s" : ""}`,
                                    Icon: ScanLine,
                                },
                            ].map(({ label, value, Icon }) => (
                                <div
                                    key={label}
                                    className="bg-gray-100 rounded-xl p-3 border border-gray-300"
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Icon size={11} className="text-gray-500" />
                                        <p className="text-xs text-gray-500 font-medium">{label}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-white capitalize">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="btn-secondary flex-1"
                        >
                            <Edit3 size={15} />
                            Edit Profile
                        </button>
                        <button
                            onClick={() => navigate("/scan")}
                            className="btn-primary flex-1"
                        >
                            <ScanLine size={15} />
                            Start Scan
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 text-xs text-red-500
                       hover:text-red-400 py-2 rounded-lg hover:bg-red-900/20 transition-all"
                    >
                        <Trash2 size={13} />
                        Delete Profile & All Local Data
                    </button>

                    {/* Clinical note */}
                    <div className="flex gap-2.5 bg-amber-900/20 border border-amber-800/50 rounded-xl p-3">
                        <Info size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300/80 leading-relaxed">
                            Your age, sex, and pregnancy status are passed directly into the
                            AI model's dense layers to apply WHO-calibrated Hb thresholds.
                            Keeping them accurate ensures a clinically meaningful result.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Create / Edit form ─────────────────────────────── */
    return (
        <div className="min-h-screen px-4 py-10 max-w-lg mx-auto animate-slide-up">
            <StepIndicator currentStep={1} />

            <div className="mt-8">
                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">
                        {hasProfile ? "Edit Your Profile" : "Patient Profile"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {hasProfile
                            ? "Update your details below. Changes apply to all future scans."
                            : "Enter your details once. They personalise every Haemoglobin estimate."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    {/* ── Name ── */}
                    <Field label="Full Name" error={errors.name} icon={User}>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="e.g. Priya Sharma"
                            autoComplete="name"
                            className={`input-field ${errors.name ? "border-red-500 focus:ring-red-500" : ""}`}
                        />
                    </Field>

                    {/* ── Age ── */}
                    <Field
                        label="Age (years)"
                        error={errors.age}
                        icon={Calendar}
                        hint="Used to apply age-adjusted WHO Hb reference ranges"
                    >
                        <input
                            type="number"
                            name="age"
                            value={form.age}
                            onChange={handleChange}
                            placeholder="e.g. 28"
                            min={1}
                            max={120}
                            className={`input-field ${errors.age ? "border-red-500 focus:ring-red-500" : ""}`}
                        />
                    </Field>

                    {/* ── Biological sex ── */}
                    <Field
                        label="Biological Sex"
                        error={errors.sex}
                        icon={Venus}
                        hint="Affects WHO Hb thresholds (male ≥13.0, female ≥12.0 g/dL)"
                    >
                        <div className="flex gap-3">
                            <SexButton
                                value="male"
                                selected={form.sex === "male"}
                                onClick={handleSexSelect}
                                icon="♂"
                                label="Male"
                                description="Hb threshold ≥ 13.0 g/dL"
                            />
                            <SexButton
                                value="female"
                                selected={form.sex === "female"}
                                onClick={handleSexSelect}
                                icon="♀"
                                label="Female"
                                description="Hb threshold ≥ 12.0 g/dL"
                            />
                        </div>
                        {errors.sex && (
                            <p className="mt-1 text-xs text-red-400 font-medium">
                                {errors.sex}
                            </p>
                        )}
                    </Field>

                    {/* ── Pregnancy (females only) ── */}
                    {form.sex === "female" && (
                        <div className="animate-fade-in">
                            <Field
                                label="Pregnancy Status"
                                icon={Baby}
                                hint="Lowers the normal Hb threshold to ≥ 11.0 g/dL (WHO)"
                            >
                                <label
                                    className="flex items-center gap-3 bg-gray-100 border border-gray-300
                                   rounded-xl px-4 py-3 cursor-pointer hover:border-gray-400
                                   transition-all group"
                                >
                                    <div
                                        className={`w-5 h-5 rounded flex items-center justify-center
                                   border-2 transition-all
                                   ${form.pregnancyStatus
                                                ? "bg-clinical-600 border-clinical-500"
                                                : "bg-gray-200 border-gray-400 group-hover:border-gray-400"
                                            }`}
                                    >
                                        {form.pregnancyStatus && (
                                            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                                                <path
                                                    d="M2 6l3 3 5-5"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="pregnancyStatus"
                                        checked={form.pregnancyStatus}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">
                                            Currently pregnant
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            WHO threshold drops to ≥ 11.0 g/dL
                                        </p>
                                    </div>
                                </label>
                            </Field>
                        </div>
                    )}

                    {/* ── Submit ── */}
                    <div className="pt-2 flex gap-3">
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setErrors({});
                                }}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="btn-primary flex-1 py-3.5">
                            {hasProfile ? (
                                <>
                                    <CheckCircle2 size={17} />
                                    Save Changes
                                </>
                            ) : (
                                <>
                                    <ScanLine size={17} />
                                    Save & Go to Scan
                                    <ChevronRight size={15} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-xs text-slate-600 text-center leading-relaxed">
                        All data is stored locally on your device. Nothing is uploaded to
                        any server except during the active scan for AI inference.
                    </p>
                </form>
            </div>
        </div>
    );
}
