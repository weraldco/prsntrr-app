import { supabaseAdmin } from "../config/supabase.js";
import { sanitizeSlideHtml } from "../lib/html-sanitize.js";

export type SlideContent = { type: "image"; src: string } | { type: "html"; html: string };

type SlideRow = {
  id: string;
  session_id: string;
  order: number;
  content: SlideContent;
  created_at: string;
};

export type Slide = {
  id: string;
  sessionId: string;
  order: number;
  content: SlideContent;
  createdAt: string;
};

function coerceSlideContent(raw: unknown): SlideContent {
  if (!raw || typeof raw !== "object") {
    return { type: "html", html: "<p></p>" };
  }
  const o = raw as Record<string, unknown>;
  if (o.type === "image" && typeof o.src === "string") {
    return { type: "image", src: o.src };
  }
  if (o.type === "html" && typeof o.html === "string") {
    return { type: "html", html: sanitizeSlideHtml(o.html) };
  }
  return { type: "html", html: "<p></p>" };
}

function mapSlide(row: SlideRow): Slide {
  return {
    id: row.id,
    sessionId: row.session_id,
    order: row.order,
    content: coerceSlideContent(row.content),
    createdAt: row.created_at,
  };
}

async function refreshSessionSlideAggregate(sessionId: string): Promise<void> {
  const { count, error: countErr } = await supabaseAdmin
    .from("slides")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (countErr) {
    throw new Error(countErr.message);
  }

  const { data: sessionRow, error: sessErr } = await supabaseAdmin
    .from("sessions")
    .select("current_slide")
    .eq("id", sessionId)
    .single();

  if (sessErr) {
    throw new Error(sessErr.message);
  }

  const n = count ?? 0;
  const currentSlide = (sessionRow as { current_slide: number }).current_slide;
  const maxIdx = Math.max(0, n - 1);

  const { error: updErr } = await supabaseAdmin
    .from("sessions")
    .update({
      total_slides: n,
      current_slide: Math.min(currentSlide, maxIdx),
    })
    .eq("id", sessionId);

  if (updErr) {
    throw new Error(updErr.message);
  }
}

export async function listSlides(sessionId: string): Promise<Slide[]> {
  const { data, error } = await supabaseAdmin
    .from("slides")
    .select("*")
    .eq("session_id", sessionId)
    .order("order", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data as SlideRow[]).map(mapSlide);
}

async function insertSlide(sessionId: string, content: SlideContent): Promise<Slide> {
  const { data: existing } = await supabaseAdmin
    .from("slides")
    .select("order")
    .eq("session_id", sessionId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = existing ? (existing as { order: number }).order + 1 : 0;

  const { data: slide, error: insertErr } = await supabaseAdmin
    .from("slides")
    .insert({
      session_id: sessionId,
      order: nextOrder,
      content,
    })
    .select()
    .single();

  if (insertErr || !slide) {
    throw new Error(insertErr?.message ?? "Failed to add slide");
  }

  await refreshSessionSlideAggregate(sessionId);
  return mapSlide(slide as SlideRow);
}

export async function addImageSlide(sessionId: string, publicPath: string): Promise<Slide> {
  return insertSlide(sessionId, { type: "image", src: publicPath });
}

export async function addHtmlSlide(sessionId: string, rawHtml: string): Promise<Slide> {
  const html = sanitizeSlideHtml(rawHtml);
  return insertSlide(sessionId, { type: "html", html });
}

export async function updateHtmlSlide(sessionId: string, order: number, rawHtml: string): Promise<Slide | null> {
  const slides = await listSlides(sessionId);
  const target = slides.find((s) => s.order === order);
  if (!target || target.content.type !== "html") {
    return null;
  }
  const html = sanitizeSlideHtml(rawHtml);
  const { data, error } = await supabaseAdmin
    .from("slides")
    .update({ content: { type: "html", html } satisfies SlideContent })
    .eq("id", target.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Update failed");
  }
  return mapSlide(data as SlideRow);
}

export async function reorderSlides(sessionId: string, orderedSlideIds: string[]): Promise<void> {
  const slides = await listSlides(sessionId);
  if (orderedSlideIds.length !== slides.length) {
    throw new Error("Slide count mismatch");
  }
  const idSet = new Set(slides.map((s) => s.id));
  for (const slideId of orderedSlideIds) {
    if (!idSet.has(slideId)) {
      throw new Error("Invalid slide id in reorder list");
    }
  }
  const { error } = await supabaseAdmin.rpc("reorder_session_slides", {
    p_session_id: sessionId,
    p_ordered_ids: orderedSlideIds,
  });
  if (error) {
    throw new Error(error.message);
  }
  await refreshSessionSlideAggregate(sessionId);
}

export async function deleteSlide(sessionId: string, order: number): Promise<boolean> {
  const { data: target, error: findErr } = await supabaseAdmin
    .from("slides")
    .select("id")
    .eq("session_id", sessionId)
    .eq("order", order)
    .maybeSingle();

  if (findErr) {
    throw new Error(findErr.message);
  }
  if (!target) {
    return false;
  }

  const { error: delErr } = await supabaseAdmin.from("slides").delete().eq("id", (target as { id: string }).id);
  if (delErr) {
    throw new Error(delErr.message);
  }

  const { data: remaining, error: listErr } = await supabaseAdmin
    .from("slides")
    .select("*")
    .eq("session_id", sessionId)
    .order("order", { ascending: true });

  if (listErr) {
    throw new Error(listErr.message);
  }

  const rows = remaining as SlideRow[];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].order !== i) {
      const { error: ordErr } = await supabaseAdmin.from("slides").update({ order: i }).eq("id", rows[i].id);
      if (ordErr) {
        throw new Error(ordErr.message);
      }
    }
  }

  await refreshSessionSlideAggregate(sessionId);
  return true;
}
