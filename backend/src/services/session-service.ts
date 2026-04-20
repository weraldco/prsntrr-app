import { supabaseAdmin } from "../config/supabase.js";
import { generateSessionCode } from "../lib/session-code.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export type SessionStatus = "idle" | "live" | "ended";

export type Session = {
  id: string;
  code: string;
  title: string;
  status: SessionStatus;
  currentSlide: number;
  totalSlides: number;
  presenterId: string;
  createdAt: string;
  expiresAt: string;
  liveStartedAt: string | null;
  liveEndedAt: string | null;
  peakViewerCount: number;
};

type SessionRow = {
  id: string;
  code: string;
  title: string;
  status: string;
  current_slide: number;
  total_slides: number;
  presenter_id: string;
  created_at: string;
  expires_at: string;
  live_started_at?: string | null;
  live_ended_at?: string | null;
  peak_viewer_count?: number | null;
};

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    status: row.status as SessionStatus,
    currentSlide: row.current_slide,
    totalSlides: row.total_slides,
    presenterId: row.presenter_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    liveStartedAt: row.live_started_at ?? null,
    liveEndedAt: row.live_ended_at ?? null,
    peakViewerCount: row.peak_viewer_count ?? 0,
  };
}

export async function bumpPeakViewerCount(sessionId: string, viewerCount: number): Promise<void> {
  const { error } = await supabaseAdmin.rpc("bump_peak_viewer_count", {
    p_session_id: sessionId,
    p_count: viewerCount,
  });
  if (error) {
    console.error("bump_peak_viewer_count:", error.message);
  }
}

export async function createSession(presenterId: string, title: string): Promise<Session> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateSessionCode(5);
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .insert({
        code,
        title,
        presenter_id: presenterId,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (!error && data) {
      return mapSession(data as SessionRow);
    }
    if (error?.code !== "23505") {
      throw new Error(error?.message ?? "Failed to create session");
    }
  }
  throw new Error("Could not allocate a unique session code");
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabaseAdmin.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapSession(data as SessionRow) : null;
}

export async function getSessionForPresenter(sessionId: string, presenterId: string): Promise<Session | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("presenter_id", presenterId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapSession(data as SessionRow) : null;
}

export async function listSessionsForUser(presenterId: string): Promise<Session[]> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("presenter_id", presenterId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data as SessionRow[]).map(mapSession);
}

export async function getSessionByCode(code: string): Promise<Session | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapSession(data as SessionRow) : null;
}

export async function updateSession(
  sessionId: string,
  presenterId: string,
  patch: { title?: string; status?: SessionStatus },
): Promise<Session | null> {
  const existing = await getSessionForPresenter(sessionId, presenterId);
  if (!existing) {
    return null;
  }
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    row.title = patch.title;
  }
  if (patch.status !== undefined) {
    row.status = patch.status;
    if (patch.status === "live" && !existing.liveStartedAt) {
      row.live_started_at = new Date().toISOString();
    }
    if (patch.status === "ended") {
      row.live_ended_at = new Date().toISOString();
    }
  }
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update(row)
    .eq("id", sessionId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapSession(data as SessionRow);
}

export async function deleteSession(sessionId: string, presenterId: string): Promise<boolean> {
  const existing = await getSessionForPresenter(sessionId, presenterId);
  if (!existing) {
    return false;
  }
  const { error } = await supabaseAdmin.from("sessions").delete().eq("id", sessionId);
  if (error) {
    throw new Error(error.message);
  }
  return true;
}

export async function setCurrentSlide(sessionId: string, slideIndex: number): Promise<Session | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .update({ current_slide: slideIndex })
    .eq("id", sessionId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return mapSession(data as SessionRow);
}

/** Server-only: clear or set delegated viewer socket id (persisted; live authority is in-memory). */
export async function updateControlGrantedField(sessionId: string, viewerSocketId: string | null): Promise<void> {
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ control_granted: viewerSocketId })
    .eq("id", sessionId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function setControlGrantedByPresenter(
  sessionId: string,
  presenterId: string,
  viewerSocketId: string | null,
): Promise<boolean> {
  const existing = await getSessionForPresenter(sessionId, presenterId);
  if (!existing) {
    return false;
  }
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ control_granted: viewerSocketId })
    .eq("id", sessionId);
  if (error) {
    throw new Error(error.message);
  }
  return true;
}
