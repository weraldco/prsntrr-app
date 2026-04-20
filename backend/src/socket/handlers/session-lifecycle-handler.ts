import type { Server, Socket } from "socket.io";
import { z } from "zod";
import type { SocketSessionMeta } from "../guards.js";
import {
  broadcastViewerList,
  viewersBySession,
  presenterBySession,
  controlGrantedBySession,
} from "../session-socket-state.js";
import * as sessionService from "../../services/session-service.js";

const sessionEndSchema = z.object({
  sessionId: z.string().uuid(),
});

export function registerSessionLifecycleHandler(io: Server, socket: Socket): void {
  socket.on("session:end", async (raw: unknown) => {
    const parsed = sessionEndSchema.safeParse(raw);
    if (!parsed.success) {
      return;
    }
    const { sessionId } = parsed.data;
    const meta = socket.data.session as SocketSessionMeta | undefined;
    if (!meta || meta.sessionId !== sessionId || meta.role !== "presenter" || !meta.presenterId) {
      socket.emit("session:error", { message: "Only the presenter can end the session" });
      return;
    }
    const session = await sessionService.getSessionById(sessionId);
    if (!session) {
      return;
    }
    controlGrantedBySession.delete(sessionId);
    io.to(`session:${sessionId}`).emit("control:revoked");
    await sessionService.setControlGrantedByPresenter(sessionId, meta.presenterId, null);
    await sessionService.updateSession(sessionId, meta.presenterId, { status: "ended" });
    io.to(`session:${sessionId}`).emit("session:ended");
  });

  socket.on("disconnect", () => {
    const meta = socket.data.session as SocketSessionMeta | undefined;
    if (!meta) {
      return;
    }
    const { sessionId, role } = meta;
    if (role === "presenter" && presenterBySession.get(sessionId) === socket.id) {
      presenterBySession.delete(sessionId);
      if (controlGrantedBySession.has(sessionId)) {
        controlGrantedBySession.delete(sessionId);
        io.to(`session:${sessionId}`).emit("control:revoked");
      }
      void sessionService.updateControlGrantedField(sessionId, null).catch(() => {});
    }
    if (role === "viewer") {
      const delegated = controlGrantedBySession.get(sessionId);
      viewersBySession.get(sessionId)?.delete(socket.id);
      if (delegated === socket.id) {
        controlGrantedBySession.delete(sessionId);
        io.to(`session:${sessionId}`).emit("control:revoked");
        void sessionService.updateControlGrantedField(sessionId, null).catch(() => {});
      }
      broadcastViewerList(io, sessionId);
    }
  });
}
