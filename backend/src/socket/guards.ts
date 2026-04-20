import type { Socket } from "socket.io";
import { controlGrantedBySession, presenterBySession } from "./session-socket-state.js";

export type SocketSessionMeta = {
  sessionId: string;
  role: "presenter" | "viewer";
  presenterId?: string;
};

export function canControlSlides(socket: Socket, meta: SocketSessionMeta | undefined): boolean {
  if (!meta) {
    return false;
  }
  if (meta.role === "presenter") {
    return presenterBySession.get(meta.sessionId) === socket.id;
  }
  if (meta.role === "viewer") {
    return controlGrantedBySession.get(meta.sessionId) === socket.id;
  }
  return false;
}
