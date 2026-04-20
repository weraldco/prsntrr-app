import { Router } from "express";
import { normalizeSessionCodeParam } from "../lib/session-code-param.js";
import * as sessionService from "../services/session-service.js";
import * as slideService from "../services/slide-service.js";

export const publicSessionRoutes = Router();

/** Public: session + slides by code (viewer). */
publicSessionRoutes.get("/:code", async (req, res) => {
  const code = normalizeSessionCodeParam(req.params.code);
  if (!code) {
    res.status(400).json({ error: "Invalid session code" });
    return;
  }
  const session = await sessionService.getSessionByCode(code);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const slides = await slideService.listSlides(session.id);
  res.json({
    session: {
      id: session.id,
      code: session.code,
      title: session.title,
      status: session.status,
      currentSlide: session.currentSlide,
      totalSlides: session.totalSlides,
    },
    slides: slides.map((s) => ({
      id: s.id,
      order: s.order,
      content: s.content,
    })),
  });
});
