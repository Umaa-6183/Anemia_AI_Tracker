import React, {
    createContext,
    useContext,
    useReducer,
    useEffect,
    useCallback,
} from "react";

/* ═══════════════════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════════════════ */
const initialState = {
    /* Patient profile (persisted to localStorage) */
    profile: null, // { name, age, sex, pregnancyStatus }

    /* Current scan session (ephemeral) */
    session: {
        capturedImage: null, // base64 data URL from webcam
        hbResult: null, // { hb, severity, confidence, gradcam }
        symptoms: [], // array of symptom strings checked by user
        timestamp: null,
    },

    /* Manual lab entries (persisted to localStorage) */
    labLogs: [], // [{ date, rbc, wbc, ferritin, notes }]

    /* Historical Hb predictions (persisted) */
    hbHistory: [], // [{ date, hb, severity }]

    /* UI state */
    currentStep: 1, // 1-6 wizard steps
    isLoading: false,
    error: null,
};

/* ═══════════════════════════════════════════════════════════
   ACTION TYPES
═══════════════════════════════════════════════════════════ */
export const ACTIONS = {
    SET_PROFILE: "SET_PROFILE",
    CLEAR_PROFILE: "CLEAR_PROFILE",
    SET_CAPTURED_IMAGE: "SET_CAPTURED_IMAGE",
    SET_HB_RESULT: "SET_HB_RESULT",
    SET_SYMPTOMS: "SET_SYMPTOMS",
    TOGGLE_SYMPTOM: "TOGGLE_SYMPTOM",
    RESET_SESSION: "RESET_SESSION",
    ADD_LAB_LOG: "ADD_LAB_LOG",
    DELETE_LAB_LOG: "DELETE_LAB_LOG",
    ADD_HB_HISTORY: "ADD_HB_HISTORY",
    SET_STEP: "SET_STEP",
    SET_LOADING: "SET_LOADING",
    SET_ERROR: "SET_ERROR",
    HYDRATE: "HYDRATE",
};

/* ═══════════════════════════════════════════════════════════
   REDUCER
═══════════════════════════════════════════════════════════ */
function appReducer(state, action) {
    switch (action.type) {
        case ACTIONS.HYDRATE:
            return { ...state, ...action.payload };

        /* ── Profile ── */
        case ACTIONS.SET_PROFILE:
            return { ...state, profile: action.payload };

        case ACTIONS.CLEAR_PROFILE:
            return { ...state, profile: null };

        /* ── Session ── */
        case ACTIONS.SET_CAPTURED_IMAGE:
            return {
                ...state,
                session: { ...state.session, capturedImage: action.payload },
            };

        case ACTIONS.SET_HB_RESULT:
            return {
                ...state,
                session: {
                    ...state.session,
                    hbResult: action.payload,
                    timestamp: new Date().toISOString(),
                },
            };

        case ACTIONS.TOGGLE_SYMPTOM: {
            const exists = state.session.symptoms.includes(action.payload);
            return {
                ...state,
                session: {
                    ...state.session,
                    symptoms: exists
                        ? state.session.symptoms.filter((s) => s !== action.payload)
                        : [...state.session.symptoms, action.payload],
                },
            };
        }

        case ACTIONS.SET_SYMPTOMS:
            return {
                ...state,
                session: { ...state.session, symptoms: action.payload },
            };

        case ACTIONS.RESET_SESSION:
            return {
                ...state,
                session: { ...initialState.session },
                currentStep: 1,
                error: null,
            };

        /* ── Lab logs ── */
        case ACTIONS.ADD_LAB_LOG:
            return {
                ...state,
                labLogs: [action.payload, ...state.labLogs],
            };

        case ACTIONS.DELETE_LAB_LOG:
            return {
                ...state,
                labLogs: state.labLogs.filter((_, i) => i !== action.payload),
            };

        /* ── Hb history ── */
        case ACTIONS.ADD_HB_HISTORY:
            return {
                ...state,
                hbHistory: [action.payload, ...state.hbHistory].slice(0, 50), // keep last 50
            };

        /* ── UI ── */
        case ACTIONS.SET_STEP:
            return { ...state, currentStep: action.payload };

        case ACTIONS.SET_LOADING:
            return { ...state, isLoading: action.payload };

        case ACTIONS.SET_ERROR:
            return { ...state, error: action.payload };

        default:
            return state;
    }
}

/* ═══════════════════════════════════════════════════════════
   CONTEXT
═══════════════════════════════════════════════════════════ */
const AppContext = createContext(null);

const STORAGE_KEY = "anemia_tracker_state";

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    /* Hydrate from localStorage on mount */
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                dispatch({
                    type: ACTIONS.HYDRATE,
                    payload: {
                        profile: saved.profile ?? null,
                        labLogs: saved.labLogs ?? [],
                        hbHistory: saved.hbHistory ?? [],
                    },
                });
            }
        } catch {
            /* corrupt storage — ignore */
        }
    }, []);

    /* Persist selective keys to localStorage whenever they change */
    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    profile: state.profile,
                    labLogs: state.labLogs,
                    hbHistory: state.hbHistory,
                }),
            );
            /* Also keep profile at a dedicated key for the route guard */
            if (state.profile) {
                localStorage.setItem("anemia_profile", JSON.stringify(state.profile));
            } else {
                localStorage.removeItem("anemia_profile");
            }
        } catch {
            /* storage full — ignore */
        }
    }, [state.profile, state.labLogs, state.hbHistory]);

    /* ── Action creators ── */
    const setProfile = useCallback(
        (profile) => dispatch({ type: ACTIONS.SET_PROFILE, payload: profile }),
        [],
    );
    const clearProfile = useCallback(
        () => dispatch({ type: ACTIONS.CLEAR_PROFILE }),
        [],
    );
    const setCapturedImage = useCallback(
        (img) => dispatch({ type: ACTIONS.SET_CAPTURED_IMAGE, payload: img }),
        [],
    );
    const setHbResult = useCallback(
        (result) => dispatch({ type: ACTIONS.SET_HB_RESULT, payload: result }),
        [],
    );
    const toggleSymptom = useCallback(
        (symptom) => dispatch({ type: ACTIONS.TOGGLE_SYMPTOM, payload: symptom }),
        [],
    );
    const resetSession = useCallback(
        () => dispatch({ type: ACTIONS.RESET_SESSION }),
        [],
    );
    const addLabLog = useCallback(
        (log) => dispatch({ type: ACTIONS.ADD_LAB_LOG, payload: log }),
        [],
    );
    const deleteLabLog = useCallback(
        (idx) => dispatch({ type: ACTIONS.DELETE_LAB_LOG, payload: idx }),
        [],
    );
    const addHbHistory = useCallback(
        (entry) => dispatch({ type: ACTIONS.ADD_HB_HISTORY, payload: entry }),
        [],
    );
    const setStep = useCallback(
        (step) => dispatch({ type: ACTIONS.SET_STEP, payload: step }),
        [],
    );
    const setLoading = useCallback(
        (val) => dispatch({ type: ACTIONS.SET_LOADING, payload: val }),
        [],
    );
    const setError = useCallback(
        (err) => dispatch({ type: ACTIONS.SET_ERROR, payload: err }),
        [],
    );

    const value = {
        state,
        dispatch,
        /* Action creators */
        setProfile,
        clearProfile,
        setCapturedImage,
        setHbResult,
        toggleSymptom,
        resetSession,
        addLabLog,
        deleteLabLog,
        addHbHistory,
        setStep,
        setLoading,
        setError,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ─── Hook ─────────────────────────────────────────────── */
export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
    return ctx;
}
