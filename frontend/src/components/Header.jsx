import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Activity,
    User,
    History,
    ScanLine,
    Home,
    Menu,
    X,
    LogOut,
    ChevronRight,
    Droplets,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

const NAV_LINKS = [
    { to: "/", label: "Home", Icon: Home, color: "#2563EB" },
    { to: "/scan", label: "Scan", Icon: ScanLine, color: "#7C3AED" },
    { to: "/history", label: "History", Icon: History, color: "#0D9488" },
    { to: "/profile", label: "Profile", Icon: User, color: "#E11D48" },
];

export default function Header() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { state, clearProfile, resetSession } = useApp();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (to) =>
        to === "/" ? pathname === "/" : pathname.startsWith(to);

    function handleLogout() {
        clearProfile();
        resetSession();
        localStorage.removeItem("anemia_tracker_state");
        localStorage.removeItem("anemia_profile");
        toast.success("Profile cleared");
        navigate("/");
        setMobileOpen(false);
    }

    return (
        <header className="site-header fixed top-0 inset-x-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2.5 group"
                    onClick={() => setMobileOpen(false)}
                >
                    <div
                        className="relative w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
                        style={{ background: "linear-gradient(135deg,#2563EB,#7C3AED)" }}
                    >
                        <Droplets size={18} className="text-white" />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                    <div className="leading-none">
                        <p
                            className="text-sm font-800 font-extrabold tracking-tight"
                            style={{ color: "#0F172A" }}
                        >
                            Anemia AI
                        </p>
                        <p
                            className="text-[10px] font-semibold tracking-widest uppercase"
                            style={{ color: "#64748B" }}
                        >
                            Tracker
                        </p>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {NAV_LINKS.map(({ to, label, Icon, color }) => (
                        <Link
                            key={to}
                            to={to}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                            style={{
                                background: isActive(to) ? `${color}12` : "transparent",
                                color: isActive(to) ? color : "#475569",
                                border: isActive(to)
                                    ? `1.5px solid ${color}30`
                                    : "1.5px solid transparent",
                            }}
                        >
                            <Icon size={14} />
                            {label}
                        </Link>
                    ))}
                </nav>

                {/* Right controls */}
                <div className="hidden md:flex items-center gap-3">
                    {state.profile ? (
                        <>
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                                style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
                            >
                                <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: "#2563EB" }}
                                >
                                    <User size={11} className="text-white" />
                                </div>
                                <span
                                    className="text-xs font-semibold truncate max-w-[100px]"
                                    style={{ color: "#1D4ED8" }}
                                >
                                    {state.profile.name}
                                </span>
                            </div>
                            {state.hbHistory.length > 0 && (
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                    style={{
                                        background: "#F0FDF4",
                                        border: "1.5px solid #86EFAC",
                                    }}
                                >
                                    <Activity size={12} style={{ color: "#16A34A" }} />
                                    <span
                                        className="text-xs font-bold font-mono"
                                        style={{ color: "#15803D" }}
                                    >
                                        {Number(state.hbHistory[0].hb).toFixed(1)} g/dL
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition-all"
                                style={{ color: "#64748B" }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                            >
                                <LogOut size={13} /> Clear
                            </button>
                        </>
                    ) : (
                        <Link to="/profile" className="btn-primary text-sm py-2 px-4">
                            Get Started <ChevronRight size={14} />
                        </Link>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 rounded-lg transition-colors"
                    style={{ color: "#475569" }}
                    onClick={() => setMobileOpen((v) => !v)}
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div
                    className="md:hidden border-t animate-fade-in"
                    style={{ background: "#fff", borderColor: "#E2E8F0" }}
                >
                    <div className="px-4 py-4 space-y-1">
                        {NAV_LINKS.map(({ to, label, Icon, color }) => (
                            <Link
                                key={to}
                                to={to}
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                                style={{
                                    background: isActive(to) ? `${color}10` : "transparent",
                                    color: isActive(to) ? color : "#334155",
                                    border: isActive(to)
                                        ? `1.5px solid ${color}25`
                                        : "1.5px solid transparent",
                                }}
                            >
                                <Icon size={16} style={{ color }} /> {label}
                            </Link>
                        ))}
                        <div className="my-2 border-t" style={{ borderColor: "#E2E8F0" }} />
                        {state.profile ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 px-4 py-2">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{ background: "#2563EB" }}
                                    >
                                        <User size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p
                                            className="text-sm font-semibold"
                                            style={{ color: "#0F172A" }}
                                        >
                                            {state.profile.name}
                                        </p>
                                        <p className="text-xs" style={{ color: "#64748B" }}>
                                            {state.profile.age} yrs · {state.profile.sex}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all"
                                    style={{ color: "#DC2626" }}
                                >
                                    <LogOut size={15} /> Clear Profile & Start Over
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/profile"
                                onClick={() => setMobileOpen(false)}
                                className="btn-primary w-full"
                            >
                                Get Started <ChevronRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
