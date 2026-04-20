import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "../socket/client";
import { useAuthStore } from "../store/auth-store";
import { useSessionStore } from "../store/session-store";
import type { SessionStatus } from "../store/session-store";

type Options = {
  sessionId: string;
  sessionCode: string;
  enabled: boolean;
  onReconnect?: () => void | Promise<void>;
};

export function usePresenterSocket({ sessionId, sessionCode, enabled, onReconnect }: Options) {
  const token = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }
    const socket = createSocket();
    socketRef.current = socket;

    useSessionStore.getState().setConnected(false);

    socket.on("connect", () => {
      useSessionStore.getState().setMySocketId(socket.id ?? null);
      useSessionStore.getState().setConnected(true);
      socket.emit("join:session", {
        sessionCode,
        role: "presenter",
        token,
      });
    });

    socket.on("reconnect", () => {
      void Promise.resolve(onReconnectRef.current?.());
    });

    socket.on("disconnect", () => {
      useSessionStore.getState().setConnected(false);
    });

    socket.on(
      "session:joined",
      (payload: {
        sessionId: string;
        currentSlide: number;
        totalSlides: number;
        status: SessionStatus;
        hasControl: boolean;
        controlGrantedTo?: string | null;
      }) => {
        useSessionStore.getState().applyJoined({
          ...payload,
          sessionCode,
          role: "presenter",
        });
      },
    );

    socket.on("slide:update", (payload: { slideIndex: number }) => {
      useSessionStore.getState().setSlide(payload.slideIndex);
    });

    socket.on("viewer:list", (payload: { viewers: { socketId: string; joinedAt: string }[] }) => {
      useSessionStore.getState().setViewers(payload.viewers);
    });

    socket.on("control:granted", (payload: { grantedTo: string }) => {
      useSessionStore.getState().syncControlDelegation(payload.grantedTo);
    });

    socket.on("control:revoked", () => {
      useSessionStore.getState().syncControlDelegation(null);
    });

    socket.on("session:error", (payload: { message: string }) => {
      useSessionStore.getState().setError(payload.message);
    });

    socket.on("session:ended", () => {
      useSessionStore.getState().setStatus("ended");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      useSessionStore.getState().reset();
    };
  }, [enabled, sessionCode, sessionId, token]);

  return socketRef;
}
