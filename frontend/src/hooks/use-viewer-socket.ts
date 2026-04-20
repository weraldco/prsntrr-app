import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "../socket/client";
import { useSessionStore } from "../store/session-store";
import type { SessionStatus } from "../store/session-store";

type Options = {
  sessionCode: string;
  enabled: boolean;
  /** Refetch session + slides from the API after a socket reconnect (source of truth). */
  onReconnect?: () => void | Promise<void>;
};

export function useViewerSocket({ sessionCode, enabled, onReconnect }: Options) {
  const socketRef = useRef<Socket | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!enabled) {
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
        role: "viewer",
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
          role: "viewer",
        });
      },
    );

    socket.on("slide:update", (payload: { slideIndex: number }) => {
      useSessionStore.getState().setSlide(payload.slideIndex);
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

    socket.on(
      "session:sync",
      (payload: { status: SessionStatus; currentSlide: number; totalSlides: number }) => {
        useSessionStore.setState({
          status: payload.status,
          currentSlide: payload.currentSlide,
          totalSlides: payload.totalSlides,
        });
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
      useSessionStore.getState().reset();
    };
  }, [enabled, sessionCode]);

  return socketRef;
}
