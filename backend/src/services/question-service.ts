import { supabaseAdmin } from "../config/supabase.js";
import * as sessionService from "./session-service.js";

export type SessionQuestion = {
  id: string;
  sessionId: string;
  body: string;
  answered: boolean;
  createdAt: string;
  answeredAt: string | null;
};

type QuestionRow = {
  id: string;
  session_id: string;
  body: string;
  answered: boolean;
  created_at: string;
  answered_at: string | null;
};

function mapQuestion(row: QuestionRow): SessionQuestion {
  return {
    id: row.id,
    sessionId: row.session_id,
    body: row.body,
    answered: row.answered,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
  };
}

export function sortQuestionsForPresenter(questions: SessionQuestion[]): SessionQuestion[] {
  const open = questions
    .filter((q) => !q.answered)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const done = questions
    .filter((q) => q.answered)
    .sort((a, b) => {
      const at = a.answeredAt ?? "";
      const bt = b.answeredAt ?? "";
      if (at !== bt) {
        return at.localeCompare(bt);
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  return [...open, ...done];
}

export async function createQuestionForLiveSessionByCode(
  code: string,
  body: string,
): Promise<SessionQuestion | null> {
  const session = await sessionService.getSessionByCode(code);
  if (!session || session.status !== "live") {
    return null;
  }
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) {
    return null;
  }
  const { data, error } = await supabaseAdmin
    .from("session_questions")
    .insert({
      session_id: session.id,
      body: trimmed,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save question");
  }
  return mapQuestion(data as QuestionRow);
}

export async function listQuestionsForPresenter(
  sessionId: string,
  presenterId: string,
): Promise<SessionQuestion[] | null> {
  const session = await sessionService.getSessionForPresenter(sessionId, presenterId);
  if (!session) {
    return null;
  }
  const { data, error } = await supabaseAdmin
    .from("session_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  const rows = (data as QuestionRow[]).map(mapQuestion);
  return sortQuestionsForPresenter(rows);
}

export async function setQuestionAnswered(
  sessionId: string,
  questionId: string,
  presenterId: string,
  answered: boolean,
): Promise<SessionQuestion | null> {
  const session = await sessionService.getSessionForPresenter(sessionId, presenterId);
  if (!session) {
    return null;
  }
  const patch: Record<string, unknown> = {
    answered,
    answered_at: answered ? new Date().toISOString() : null,
  };
  const { data, error } = await supabaseAdmin
    .from("session_questions")
    .update(patch)
    .eq("id", questionId)
    .eq("session_id", sessionId)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return mapQuestion(data as QuestionRow);
}

export async function deleteQuestionForPresenter(
  sessionId: string,
  questionId: string,
  presenterId: string,
): Promise<boolean> {
  const session = await sessionService.getSessionForPresenter(sessionId, presenterId);
  if (!session) {
    return false;
  }
  const { data, error } = await supabaseAdmin
    .from("session_questions")
    .delete()
    .eq("id", questionId)
    .eq("session_id", sessionId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data != null;
}
