import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import * as sessionService from "../../services/session-service.js";
import type { SocketSessionMeta } from "../guards.js";
import {
  broadcastViewerList,
  viewersBySession,
  presenterBySession,
  controlGrantedBySession,
} from "../session-socket-state.js";

const joinSessionSchema = z.object({
  sessionCode: z.string().min(1).max(16),
  role: z.enum(["presenter", "viewer"]),
  token: z.string().optional(),
});

export function registerJoinHandler(io: Server, socket: Socket): void {
  socket.on("join:session", async (raw: unknown, ack?: (r: unknown) => void) => {
    const parsed = joinSessionSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit("session:error", { message: "Invalid join payload" });
      ack?.({ ok: false, error: "Invalid join payload" });
      return;
    }
    const { sessionCode, role, token } = parsed.data;
    const session = await sessionService.getSessionByCode(sessionCode);
    if (!session) {
      socket.emit("session:error", { message: "Session not found" });
      ack?.({ ok: false, error: "Session not found" });
      return;
    }

    if (role === "presenter") {
      if (!token) {
        socket.emit("session:error", { message: "Presenter token required" });
        ack?.({ ok: false, error: "Presenter token required" });
        return;
      }
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      const user = data.user;
      if (error || !user) {
        socket.emit("session:error", { message: "Invalid token" });
        ack?.({ ok: false, error: "Invalid token" });
        return;
      }
      if (user.id !== session.presenterId) {
        socket.emit("session:error", { message: "Not the presenter for this session" });
        ack?.({ ok: false, error: "Not the presenter for this session" });
        return;
      }
      const prev = presenterBySession.get(session.id);
      if (prev && prev !== socket.id) {
        io.sockets.sockets.get(prev)?.disconnect(true);
      }
      presenterBySession.set(session.id, socket.id);

      const hadDelegation = controlGrantedBySession.has(session.id);
      controlGrantedBySession.delete(session.id);
      void sessionService.updateControlGrantedField(session.id, null).catch(() => {});
      if (hadDelegation) {
        io.to(`session:${session.id}`).emit("control:revoked");
      }
    }

    socket.join(`session:${session.id}`);
    if (role === "presenter") {
      socket.join(`presenter:${session.id}`);
    }

    const meta: SocketSessionMeta = {
      sessionId: session.id,
      role,
      ...(role === "presenter" ? { presenterId: session.presenterId } : {}),
    };
    socket.data.session = meta;

    if (role === "viewer") {
      if (!viewersBySession.has(session.id)) {
        viewersBySession.set(session.id, new Map());
      }
      viewersBySession.get(session.id)!.set(socket.id, {
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
      });
      const viewerCount = viewersBySession.get(session.id)!.size;
      void sessionService.bumpPeakViewerCount(session.id, viewerCount);
    }
    broadcastViewerList(io, session.id);

    const controlGrantedTo = controlGrantedBySession.get(session.id) ?? null;
    const hasControl = role === "viewer" && controlGrantedTo === socket.id;

    socket.emit("session:joined", {
      sessionId: session.id,
      currentSlide: session.currentSlide,
      totalSlides: session.totalSlides,
      status: session.status,
      hasControl,
      controlGrantedTo,
    });
    ack?.({ ok: true });
  });
}
