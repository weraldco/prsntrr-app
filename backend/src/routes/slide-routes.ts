import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { getAuth, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { uploadSlideImageToStorage, removeSlideImageFromStorageIfPresent } from "../lib/slide-storage.js";
import * as sessionService from "../services/session-service.js";
import * as slideService from "../services/slide-service.js";

export const slideRouter = Router({ mergeParams: true });

const uploadRoot = path.join(process.cwd(), "uploads", "sessions");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

const textSlideSchema = z.object({
  html: z.string().max(120_000).optional(),
});

const reorderSchema = z
  .object({
    slideIds: z.array(z.string().uuid()).min(1),
  })
  .refine((data) => new Set(data.slideIds).size === data.slideIds.length, {
    path: ["slideIds"],
    message: "slideIds must be a permutation with no duplicates",
  });

const patchHtmlSchema = z.object({
  html: z.string().max(120_000),
});

slideRouter.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const sessionId = req.params.sessionId as string;
  const session = await sessionService.getSessionForPresenter(sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const slides = await slideService.listSlides(sessionId);
  res.json(
    slides.map((s) => ({
      id: s.id,
      order: s.order,
      content: s.content,
    })),
  );
});

slideRouter.patch("/reorder", requireAuth, validateBody(reorderSchema), async (req, res) => {
  const { userId } = getAuth(req);
  const sessionId = req.params.sessionId as string;
  const session = await sessionService.getSessionForPresenter(sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const { slideIds } = req.body as z.infer<typeof reorderSchema>;
  try {
    await slideService.reorderSlides(sessionId, slideIds);
    const slides = await slideService.listSlides(sessionId);
    res.json(
      slides.map((s) => ({
        id: s.id,
        order: s.order,
        content: s.content,
      })),
    );
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Reorder failed" });
  }
});

slideRouter.post("/text", requireAuth, validateBody(textSlideSchema), async (req, res) => {
  const { userId } = getAuth(req);
  const sessionId = req.params.sessionId as string;
  const session = await sessionService.getSessionForPresenter(sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const { html } = req.body as z.infer<typeof textSlideSchema>;
  try {
    const slide = await slideService.addHtmlSlide(sessionId, html ?? "<p></p>");
    res.status(201).json({
      id: slide.id,
      order: slide.order,
      content: slide.content,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to add text slide" });
  }
});

slideRouter.post("/", requireAuth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
      return;
    }
    next();
  });
}, async (req, res) => {
  const { userId } = getAuth(req);
  const sessionId = req.params.sessionId as string;
  const session = await sessionService.getSessionForPresenter(sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const file = req.file;
  if (!file?.buffer) {
    res.status(400).json({ error: "Missing image file" });
    return;
  }
  try {
    const publicUrl = await uploadSlideImageToStorage(
      sessionId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
    const slide = await slideService.addImageSlide(sessionId, publicUrl);
    res.status(201).json({
      id: slide.id,
      order: slide.order,
      content: slide.content,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Upload to storage failed" });
  }
});

slideRouter.patch("/:order", requireAuth, validateBody(patchHtmlSchema), async (req, res) => {
  const { userId } = getAuth(req);
  const sessionId = req.params.sessionId as string;
  const order = Number.parseInt(req.params.order, 10);
  if (Number.isNaN(order)) {
    res.status(400).json({ error: "Invalid order" });
    return;
  }
  const session = await sessionService.getSessionForPresenter(sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const { html } = req.body as z.infer<typeof patchHtmlSchema>;
  try {
    const slide = await slideService.updateHtmlSlide(sessionId, order, html);
    if (!slide) {
      res.status(404).json({ error: "Slide not found or not a text slide" });
      return;
    }
    res.json({
      id: slide.id,
      order: slide.order,
      content: slide.content,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Update failed" });
  }
});

slideRouter.delete("/:order", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const sessionId = req.params.sessionId as string;
  const order = Number.parseInt(req.params.order, 10);
  if (Number.isNaN(order)) {
    res.status(400).json({ error: "Invalid order" });
    return;
  }
  const session = await sessionService.getSessionForPresenter(sessionId, userId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const slides = await slideService.listSlides(sessionId);
  const target = slides.find((s) => s.order === order);
  if (!target) {
    res.status(404).json({ error: "Slide not found" });
    return;
  }
  const content = target.content as slideService.SlideContent;
  if (content?.type === "image") {
    if (content.src.startsWith(`/uploads/sessions/${sessionId}/`)) {
      const rel = content.src.replace(`/uploads/sessions/${sessionId}/`, "");
      const abs = path.join(uploadRoot, sessionId, rel);
      fs.unlink(abs, () => {});
    } else {
      await removeSlideImageFromStorageIfPresent(content.src);
    }
  }
  const ok = await slideService.deleteSlide(sessionId, order);
  if (!ok) {
    res.status(404).json({ error: "Slide not found" });
    return;
  }
  res.status(204).end();
});
