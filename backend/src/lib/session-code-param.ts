import { z } from "zod";

/** Uppercase session codes (plan: 5 chars from A-Z2-9 subset; allow 4–12 for forward compatibility). */
export const sessionCodePathSchema = z.string().regex(/^[A-Z2-9]{4,12}$/);

export function normalizeSessionCodeParam(raw: string): string | null {
  const upper = raw.toUpperCase();
  const parsed = sessionCodePathSchema.safeParse(upper);
  return parsed.success ? parsed.data : null;
}
