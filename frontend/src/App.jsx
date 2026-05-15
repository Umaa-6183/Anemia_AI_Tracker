import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProvider } from "./context/AppContext";
import Header from "./components/Header";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Scan from "./pages/Scan";
import Results from "./pages/Results";
import History from "./pages/History";

/* ─── Route guard: requires a patient profile to be set ─── */
function RequireProfile({ children }) {
    const profile = JSON.parse(localStorage.getItem("anemia_profile") || "null");
    if (!profile) return <Navigate to="/profile" replace />;
    return children;
}

export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                {/* Global toast notifications */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: "#1e293b",
                            color: "#f1f5f9",
                            border: "1px solid #334155",
                            borderRadius: "12px",
                            fontSize: "14px",
                        },
                        success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
                        error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
                    }}
                />

                {/* Persistent top navigation */}
                <Header />

                {/* Main content area */}
                <main className="min-h-[calc(100dvh-64px)] pt-16">
                    <Routes>
                        {/* Landing / home */}
                        <Route path="/" element={<Home />} />

                        {/* Patient profile setup */}
                        <Route path="/profile" element={<Profile />} />

                        {/* Live camera scan — needs a profile */}
                        <Route
                            path="/scan"
                            element={
                                <RequireProfile>
                                    <Scan />
                                </RequireProfile>
                            }
                        />

                        {/* Results dashboard — needs a profile */}
                        <Route
                            path="/results"
                            element={
                                <RequireProfile>
                                    <Results />
                                </RequireProfile>
                            }
                        />

                        {/* Historical Hb trend log */}
                        <Route
                            path="/history"
                            element={
                                <RequireProfile>
                                    <History />
                                </RequireProfile>
                            }
                        />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </BrowserRouter>
        </AppProvider>
    );
}
