import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { apiRateLimiter, publicSessionRateLimiter } from "./middleware/rate-limiter.js";
import { publicSessionRoutes } from "./routes/public-session-routes.js";
import { qrRoutes } from "./routes/qr-routes.js";
import { sessionRouter } from "./routes/session-routes.js";
import { registerSocketHandlers } from "./socket/index.js";
import { attachRedisAdapterIfConfigured } from "./socket/setup-redis-adapter.js";

const PORT = Number.parseInt(process.env.PORT ?? "3001", 10);
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

/** Browsers send Origin without a trailing slash; CORS requires an exact match. */
function normalizeFrontendOrigin(raw: string | undefined): string {
  const fallback = "http://localhost:5173";
  if (!raw || typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed || fallback;
}

const frontendUrl = normalizeFrontendOrigin(process.env.FRONTEND_URL);

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(apiRateLimiter);

app.use("/uploads", express.static(uploadDir));

app.use("/api/sessions/public", publicSessionRateLimiter);
app.use("/api/sessions/public", qrRoutes);
app.use("/api/sessions/public", publicSessionRoutes);
app.use("/api/sessions", sessionRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: frontendUrl,
    credentials: true,
  },
});

async function start() {
  await attachRedisAdapterIfConfigured(io);
  registerSocketHandlers(io);
  httpServer.listen(PORT, () => {
    console.log(`API + Socket.io listening on http://localhost:${PORT}`);
  });
}

void start();
