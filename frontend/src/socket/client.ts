import { io, type Socket } from "socket.io-client";
import { apiOrigin } from "../lib/api-origin";

const defaultOptions = {
  path: "/socket.io",
  transports: ["websocket", "polling"] as string[],
  reconnection: true,
  reconnectionAttempts: 12,
  reconnectionDelayMax: 10_000,
  autoConnect: true,
  withCredentials: true,
};

/** Socket.io client with app defaults (presenter still passes Supabase token on `join:session`). */
export function createSocket(extra?: Partial<Parameters<typeof io>[1]>): Socket {
  const origin = apiOrigin();
  if (origin) {
    return io(origin, { ...defaultOptions, ...extra });
  }
  return io({ ...defaultOptions, ...extra });
}
