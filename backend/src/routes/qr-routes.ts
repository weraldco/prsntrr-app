import { Router } from "express";
import { normalizeSessionCodeParam } from "../lib/session-code-param.js";
import * as sessionService from "../services/session-service.js";
import { qrPngBufferForSessionCode } from "../services/qr-service.js";

export const qrRoutes = Router();

qrRoutes.get("/:code/qr", async (req, res) => {
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
  const buffer = await qrPngBufferForSessionCode(session.code);
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(buffer);
});
