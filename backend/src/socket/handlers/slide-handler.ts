import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { canControlSlides, type SocketSessionMeta } from "../guards.js";
import { allowSlideChange } from "../session-socket-state.js";
import * as sessionService from "../../services/session-service.js";

const slideChangeSchema = z.object({
  sessionId: z.string().uuid(),
  slideIndex: z.number().int().min(0),
});

export function registerSlideHandler(io: Server, socket: Socket): void {
  socket.on("slide:change", async (raw: unknown) => {
    const parsed = slideChangeSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit("session:error", { message: "Invalid slide payload" });
      return;
    }
    const { sessionId, slideIndex } = parsed.data;
    const meta = socket.data.session as SocketSessionMeta | undefined;
    if (!meta || meta.sessionId !== sessionId) {
      socket.emit("session:error", { message: "Join a session first" });
      return;
    }
    if (!allowSlideChange(socket.id)) {
      socket.emit("session:error", { message: "Too many slide changes" });
      return;
    }
    if (!canControlSlides(socket, meta)) {
      socket.emit("session:error", { message: "Not authorized to control slides" });
      return;
    }
    const session = await sessionService.getSessionById(sessionId);
    if (!session) {
      socket.emit("session:error", { message: "Session not found" });
      return;
    }
    if (session.totalSlides === 0) {
      return;
    }
    if (slideIndex < 0 || slideIndex >= session.totalSlides) {
      return;
    }
    await sessionService.setCurrentSlide(sessionId, slideIndex);
    io.to(`session:${sessionId}`).emit("slide:update", { slideIndex });
  });
}
