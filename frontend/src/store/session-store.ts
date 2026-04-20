import { create } from "zustand";

export type SessionStatus = "idle" | "live" | "ended";

export type ViewerInfo = { socketId: string; joinedAt: string };

type SessionState = {
  sessionId: string | null;
  sessionCode: string | null;
  status: SessionStatus;
  currentSlide: number;
  totalSlides: number;
  role: "presenter" | "viewer" | null;
  hasControl: boolean;
  /** Socket id of the viewer who may advance slides (Phase 2); null if presenter-only. */
  controlGrantedTo: string | null;
  mySocketId: string | null;
  viewers: ViewerInfo[];
  connected: boolean;
  error: string | null;
  reset: () => void;
  applyJoined: (payload: {
    sessionId: string;
    currentSlide: number;
    totalSlides: number;
    status: SessionStatus;
    hasControl: boolean;
    controlGrantedTo?: string | null;
    sessionCode?: string | null;
    role?: "presenter" | "viewer" | null;
  }) => void;
  setMySocketId: (id: string | null) => void;
  syncControlDelegation: (grantedTo: string | null) => void;
  setSlide: (index: number) => void;
  setStatus: (status: SessionStatus) => void;
  setViewers: (viewers: ViewerInfo[]) => void;
  setConnected: (v: boolean) => void;
  setError: (msg: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  sessionCode: null,
  status: "idle",
  currentSlide: 0,
  totalSlides: 0,
  role: null,
  hasControl: false,
  controlGrantedTo: null,
  mySocketId: null,
  viewers: [],
  connected: false,
  error: null,
  reset: () =>
    set({
      sessionId: null,
      sessionCode: null,
      status: "idle",
      currentSlide: 0,
      totalSlides: 0,
      role: null,
      hasControl: false,
      controlGrantedTo: null,
      mySocketId: null,
      viewers: [],
      connected: false,
      error: null,
    }),
  applyJoined: (payload) =>
    set({
      sessionId: payload.sessionId,
      currentSlide: payload.currentSlide,
      totalSlides: payload.totalSlides,
      status: payload.status,
      controlGrantedTo: payload.controlGrantedTo ?? null,
      hasControl: payload.hasControl,
      ...(payload.sessionCode !== undefined && { sessionCode: payload.sessionCode }),
      ...(payload.role !== undefined && { role: payload.role }),
    }),
  setMySocketId: (mySocketId) =>
    set((s) => ({
      mySocketId,
      hasControl: s.controlGrantedTo !== null && s.controlGrantedTo === mySocketId,
    })),
  syncControlDelegation: (grantedTo) =>
    set((s) => ({
      controlGrantedTo: grantedTo,
      hasControl: grantedTo !== null && grantedTo === s.mySocketId,
    })),
  setSlide: (index) => set({ currentSlide: index }),
  setStatus: (status) => set({ status }),
  setViewers: (viewers) => set({ viewers }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),
}));
