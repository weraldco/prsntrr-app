import { Router } from "express";
import type { Server } from "socket.io";
import { z } from "zod";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import * as sessionService from "../services/session-service.js";
import { slideRouter } from "./slide-routes.js";

const createSchema = z.object({
  title: z.string().min(1).max(200),
});

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(["idle", "live", "ended"]).optional(),
});

export const sessionRouter = Router({ mergeParams: true });

sessionRouter.use(requireAuth);

sessionRouter.post("/", validateBody(createSchema), async (req, res) => {
  const { userId } = getAuth(req);
  const { title } = req.body as z.infer<typeof createSchema>;
  const session = await sessionService.createSession(userId, title);
  res.status(201).json(session);
});

sessionRouter.get("/", async (req, res) => {
  const { userId } = getAuth(req);
  const sessions = await sessionService.listSessionsForUser(userId);
  res.json(sessions);
});

sessionRouter.get("/:sessionId", async (req, res) => {
  const { userId } = getAuth(req);
  const session = await sessionService.getSessionForPresenter(req.params.sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

sessionRouter.patch("/:sessionId", validateBody(patchSchema), async (req, res) => {
  const { userId } = getAuth(req);
  const body = req.body as z.infer<typeof patchSchema>;
  const session = await sessionService.updateSession(req.params.sessionId, userId, body);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const io = req.app.get("io") as Server | undefined;
  io?.to(`session:${session.id}`).emit("session:sync", {
    status: session.status,
    currentSlide: session.currentSlide,
    totalSlides: session.totalSlides,
  });
  res.json(session);
});

sessionRouter.delete("/:sessionId", async (req, res) => {
  const { userId } = getAuth(req);
  const ok = await sessionService.deleteSession(req.params.sessionId, userId);
  if (!ok) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.status(204).end();
});

sessionRouter.use("/:sessionId/slides", slideRouter);
