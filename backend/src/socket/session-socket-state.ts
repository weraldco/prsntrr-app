import type { Server } from "socket.io";

export type ViewerEntry = { socketId: string; joinedAt: string };

export const viewersBySession = new Map<string, Map<string, ViewerEntry>>();
export const presenterBySession = new Map<string, string>();
/** Live delegated slide control: sessionId → viewer socket id */
export const controlGrantedBySession = new Map<string, string>();

const slideChangeBuckets = new Map<string, { count: number; windowStart: number }>();
const SLIDE_RATE_MAX = 10;
const SLIDE_RATE_MS = 1000;

export function allowSlideChange(socketId: string): boolean {
  const now = Date.now();
  const bucket = slideChangeBuckets.get(socketId);
  if (!bucket || now - bucket.windowStart >= SLIDE_RATE_MS) {
    slideChangeBuckets.set(socketId, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= SLIDE_RATE_MAX) {
    return false;
  }
  bucket.count += 1;
  return true;
}

export function getViewersList(sessionId: string): ViewerEntry[] {
  const m = viewersBySession.get(sessionId);
  if (!m) {
    return [];
  }
  return [...m.values()];
}

export function broadcastViewerList(io: Server, sessionId: string) {
  io.to(`presenter:${sessionId}`).emit("viewer:list", {
    viewers: getViewersList(sessionId),
  });
}
