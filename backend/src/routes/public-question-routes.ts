import type { Server } from "socket.io";
import { Router } from "express";
import { z } from "zod";
import { normalizeSessionCodeParam } from "../lib/session-code-param.js";
import { validateBody } from "../middleware/validate.js";
import * as questionService from "../services/question-service.js";

const submitSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const publicQuestionRoutes = Router();

publicQuestionRoutes.post("/:code/questions", validateBody(submitSchema), async (req, res) => {
  const code = normalizeSessionCodeParam(req.params.code);
  if (!code) {
    res.status(400).json({ error: "Invalid session code" });
    return;
  }
  const { body } = req.body as z.infer<typeof submitSchema>;
  try {
    const question = await questionService.createQuestionForLiveSessionByCode(code, body);
    if (!question) {
      res.status(404).json({ error: "Session not found or not live" });
      return;
    }
    const io = req.app.get("io") as Server | undefined;
    io?.to(`presenter:${question.sessionId}`).emit("question:created", question);
    res.status(201).json(question);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});
