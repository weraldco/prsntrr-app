import type { Server, Socket } from "socket.io";
import { z } from "zod";
import type { SocketSessionMeta } from "../guards.js";
import {
  controlGrantedBySession,
  presenterBySession,
  viewersBySession,
} from "../session-socket-state.js";
import * as sessionService from "../../services/session-service.js";

const grantSchema = z.object({
  sessionId: z.string().uuid(),
  viewerSocketId: z.string().min(1),
});

const revokeSchema = z.object({
  sessionId: z.string().uuid(),
});

export function registerControlHandlers(io: Server, socket: Socket): void {
  socket.on("control:grant", async (raw: unknown) => {
    const parsed = grantSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }
    const { sessionId, viewerSocketId } = parsed.data;
    const meta = socket.data.session as SocketSessionMeta | undefined;
    if (!meta || meta.sessionId !== sessionId || meta.role !== "presenter" || !meta.presenterId) {
      socket.emit("session:error", { message: "Only the presenter can grant control" });
      return;
    }
    if (presenterBySession.get(sessionId) !== socket.id) {
      socket.emit("session:error", { message: "Not the active presenter connection" });
      return;
    }
    if (viewerSocketId === socket.id) {
      return;
    }
    const viewers = viewersBySession.get(sessionId);
    if (!viewers?.has(viewerSocketId)) {
      socket.emit("session:error", { message: "Viewer is not connected" });
      return;
    }

    controlGrantedBySession.set(sessionId, viewerSocketId);
    const ok = await sessionService.setControlGrantedByPresenter(sessionId, meta.presenterId, viewerSocketId);
    if (!ok) {
      controlGrantedBySession.delete(sessionId);
      socket.emit("session:error", { message: "Could not persist control grant" });
      return;
    }
    io.to(`session:${sessionId}`).emit("control:granted", { grantedTo: viewerSocketId });
  });

  socket.on("control:revoke", async (raw: unknown) => {
    const parsed = revokeSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }
    const { sessionId } = parsed.data;
    const meta = socket.data.session as SocketSessionMeta | undefined;
    if (!meta || meta.sessionId !== sessionId || meta.role !== "presenter" || !meta.presenterId) {
      socket.emit("session:error", { message: "Only the presenter can revoke control" });
      return;
    }
    if (presenterBySession.get(sessionId) !== socket.id) {
      socket.emit("session:error", { message: "Not the active presenter connection" });
      return;
    }

    controlGrantedBySession.delete(sessionId);
    await sessionService.setControlGrantedByPresenter(sessionId, meta.presenterId, null);
    io.to(`session:${sessionId}`).emit("control:revoked");
  });
}
