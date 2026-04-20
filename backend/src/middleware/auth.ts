import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase.js";

export type AuthedRequest = Request & { userId: string; userEmail: string };

export function getAuth(req: Request): { userId: string; userEmail: string } {
  const r = req as unknown as AuthedRequest;
  return { userId: r.userId, userEmail: r.userEmail };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  void (async () => {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const u = data.user;
    (req as AuthedRequest).userId = u.id;
    (req as AuthedRequest).userEmail = u.email ?? "";
    next();
  })().catch(next);
}
