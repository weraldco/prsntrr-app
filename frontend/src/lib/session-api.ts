import { apiFetch, parseJson } from "./api-client";

export type ApiSession = {
  id: string;
  code: string;
  title: string;
  status: "idle" | "live" | "ended";
  currentSlide: number;
  totalSlides: number;
  createdAt: string;
  expiresAt: string;
  liveStartedAt?: string | null;
  liveEndedAt?: string | null;
  peakViewerCount?: number;
};

export type ApiSlideContent =
  | { type: "image"; src: string }
  | { type: "html"; html: string };

export type ApiSlide = {
  id: string;
  order: number;
  content: ApiSlideContent;
};

export type ApiSessionQuestion = {
  id: string;
  sessionId: string;
  body: string;
  answered: boolean;
  createdAt: string;
  answeredAt: string | null;
};

export async function fetchMySessions(): Promise<ApiSession[]> {
  const res = await apiFetch("/api/sessions");
  if (!res.ok) {
    throw new Error("Failed to load sessions");
  }
  return parseJson<ApiSession[]>(res);
}

export async function createSession(title: string): Promise<ApiSession> {
  const res = await apiFetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error("Failed to create session");
  }
  return parseJson<ApiSession>(res);
}

export async function fetchSession(id: string): Promise<ApiSession> {
  const res = await apiFetch(`/api/sessions/${id}`);
  if (!res.ok) {
    throw new Error("Session not found");
  }
  return parseJson<ApiSession>(res);
}

export async function updateSession(
  id: string,
  body: Partial<Pick<ApiSession, "title">> & { status?: ApiSession["status"] },
): Promise<ApiSession> {
  const res = await apiFetch(`/api/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("Failed to update session");
  }
  return parseJson<ApiSession>(res);
}

export async function fetchSlides(sessionId: string): Promise<ApiSlide[]> {
  const res = await apiFetch(`/api/sessions/${sessionId}/slides`);
  if (!res.ok) {
    throw new Error("Failed to load slides");
  }
  return parseJson<ApiSlide[]>(res);
}

export async function uploadSlideImage(sessionId: string, file: File): Promise<ApiSlide> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await apiFetch(`/api/sessions/${sessionId}/slides`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    throw new Error("Upload failed");
  }
  return parseJson<ApiSlide>(res);
}

export async function createTextSlide(sessionId: string, html = "<p></p>"): Promise<ApiSlide> {
  const res = await apiFetch(`/api/sessions/${sessionId}/slides/text`, {
    method: "POST",
    body: JSON.stringify({ html }),
  });
  if (!res.ok) {
    throw new Error("Could not add text slide");
  }
  return parseJson<ApiSlide>(res);
}

export async function updateSlideHtml(sessionId: string, order: number, html: string): Promise<ApiSlide> {
  const res = await apiFetch(`/api/sessions/${sessionId}/slides/${order}`, {
    method: "PATCH",
    body: JSON.stringify({ html }),
  });
  if (!res.ok) {
    throw new Error("Could not save text slide");
  }
  return parseJson<ApiSlide>(res);
}

export async function reorderSlides(sessionId: string, slideIds: string[]): Promise<ApiSlide[]> {
  const res = await apiFetch(`/api/sessions/${sessionId}/slides/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ slideIds }),
  });
  if (!res.ok) {
    throw new Error("Reorder failed");
  }
  return parseJson<ApiSlide[]>(res);
}

export async function deleteSlide(sessionId: string, order: number): Promise<void> {
  const res = await apiFetch(`/api/sessions/${sessionId}/slides/${order}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Delete failed");
  }
}

export async function fetchPublicSession(code: string): Promise<{
  session: Omit<ApiSession, "createdAt" | "expiresAt">;
  slides: ApiSlide[];
}> {
  const res = await apiFetch(`/api/sessions/public/${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error("Session not found");
  }
  return parseJson(res);
}

function mapQuestionPayload(raw: Record<string, unknown>): ApiSessionQuestion {
  return {
    id: String(raw.id),
    sessionId: String(raw.sessionId ?? raw.session_id),
    body: String(raw.body),
    answered: Boolean(raw.answered),
    createdAt: String(raw.createdAt ?? raw.created_at),
    answeredAt: raw.answeredAt != null ? String(raw.answeredAt) : raw.answered_at != null ? String(raw.answered_at) : null,
  };
}

export async function fetchSessionQuestions(sessionId: string): Promise<ApiSessionQuestion[]> {
  const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/questions`);
  if (!res.ok) {
    throw new Error("Failed to load questions");
  }
  const data = await parseJson<Record<string, unknown>[]>(res);
  return data.map(mapQuestionPayload);
}

export async function patchSessionQuestion(
  sessionId: string,
  questionId: string,
  answered: boolean,
): Promise<ApiSessionQuestion> {
  const res = await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/questions/${encodeURIComponent(questionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ answered }),
  });
  if (!res.ok) {
    throw new Error("Failed to update question");
  }
  const raw = await parseJson<Record<string, unknown>>(res);
  return mapQuestionPayload(raw);
}

export async function submitViewerQuestion(code: string, body: string): Promise<ApiSessionQuestion> {
  const res = await apiFetch(`/api/sessions/public/${encodeURIComponent(code)}/questions`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    let msg = "Could not send question";
    try {
      const err = (await res.json()) as { error?: string };
      if (err?.error) {
        msg = err.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const raw = await parseJson<Record<string, unknown>>(res);
  return mapQuestionPayload(raw);
}
