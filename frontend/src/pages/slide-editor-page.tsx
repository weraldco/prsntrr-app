import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/app-shell";
import { SlideCanvas } from "../components/slide-canvas";
import { SlideRichEditor } from "../components/slide-rich-editor";
import { apiUrl } from "../lib/api-origin";
import {
  importSlidesFromImageFiles,
  pdfFileToImageFiles,
  pptxFileToImageFiles,
} from "../lib/import-deck";
import {
  type ApiSession,
  type ApiSlide,
  createTextSlide,
  deleteSlide,
  fetchSession,
  fetchSlides,
  reorderSlides,
  uploadSlideImage,
} from "../lib/session-api";

function SortableSlideCard({
  slide,
  sessionId,
  displayIndex,
  onDelete,
}: {
  slide: ApiSlide;
  sessionId: string;
  displayIndex: number;
  onDelete: (order: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="prsnt-card overflow-hidden p-0 shadow-md"
    >
      <div className="flex gap-2 border-b border-teal-900/10 bg-prsnt-surface/50 px-2 py-1.5">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-prsnt-ink/45 transition-colors hover:bg-teal-900/5 hover:text-prsnt-ink active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <span className="text-lg leading-none">⋮⋮</span>
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-prsnt-ink/55">
            Slide {displayIndex}
            <span className="ml-2 text-prsnt-ink/40">
              {slide.content.type === "image" ? "Image" : "Rich text"}
            </span>
          </span>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
            aria-label={`Remove slide ${displayIndex}`}
            onClick={() => void onDelete(slide.order)}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="aspect-video w-full bg-black">
        {slide.content.type === "image" ? (
          slide.content.src ? (
            <img src={apiUrl(slide.content.src)} alt="" className="h-full w-full object-contain" />
          ) : null
        ) : (
          <div className="h-full w-full overflow-hidden">
            <div className="h-full scale-[0.35] origin-top-left" style={{ width: "285%" }}>
              <SlideCanvas content={slide.content} />
            </div>
          </div>
        )}
      </div>
      {slide.content.type === "html" ? (
        <div className="border-t border-teal-900/10 bg-white/50 p-3 dark:border-white/10 dark:bg-zinc-900/40">
          <p className="mb-2 text-xs font-medium text-prsnt-ink/55">Edit content</p>
          <SlideRichEditor sessionId={sessionId} order={slide.order} initialHtml={slide.content.html} />
        </div>
      ) : null}
    </li>
  );
}

export function SlideEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<ApiSession | null>(null);
  const [slides, setSlides] = useState<ApiSlide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addingText, setAddingText] = useState(false);
  const [deckImportStatus, setDeckImportStatus] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [s, sl] = await Promise.all([fetchSession(id), fetchSlides(id)]);
        if (!cancelled) {
          setSession(s);
          setSlides(sl);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load session");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const sortedSlides = useMemo(() => [...slides].sort((a, b) => a.order - b.order), [slides]);

  async function refreshSlidesAndSession() {
    if (!id) {
      return;
    }
    const [s, sl] = await Promise.all([fetchSession(id), fetchSlides(id)]);
    setSession(s);
    setSlides(sl);
  }

  async function onImportDeck(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) {
      return;
    }
    const name = file.name.toLowerCase();
    setError(null);
    setDeckImportStatus("Preparing…");
    try {
      let images: File[];
      if (name.endsWith(".pdf")) {
        setDeckImportStatus("Rendering PDF pages…");
        images = await pdfFileToImageFiles(file);
      } else if (name.endsWith(".pptx")) {
        setDeckImportStatus("Reading PowerPoint assets…");
        images = await pptxFileToImageFiles(file);
      } else {
        setError("Choose a .pdf or .pptx file.");
        setDeckImportStatus(null);
        return;
      }
      await importSlidesFromImageFiles(id, images, (done, total) => {
        setDeckImportStatus(`Uploading ${done} / ${total}…`);
      });
      await refreshSlidesAndSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setDeckImportStatus(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadSlideImage(id, file);
      await refreshSlidesAndSession();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onAddTextSlide() {
    if (!id) {
      return;
    }
    setAddingText(true);
    setError(null);
    try {
      await createTextSlide(id);
      await refreshSlidesAndSession();
    } catch {
      setError("Could not add text slide");
    } finally {
      setAddingText(false);
    }
  }

  async function onDelete(order: number) {
    if (!id) {
      return;
    }
    setError(null);
    try {
      await deleteSlide(id, order);
    } catch {
      setError("Could not delete slide");
      return;
    }
    try {
      await refreshSlidesAndSession();
    } catch {
      setError("Slide was removed but the list could not be refreshed. Reload the page.");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    if (!id) {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = sortedSlides.findIndex((s) => s.id === active.id);
    const newIndex = sortedSlides.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const reordered = arrayMove(sortedSlides, oldIndex, newIndex);
    const previous = slides;
    const optimistic = reordered.map((s, i) => ({ ...s, order: i }));
    setSlides(optimistic);
    void (async () => {
      try {
        const updated = await reorderSlides(
          id,
          reordered.map((s) => s.id),
        );
        setSlides(updated);
        const s = await fetchSession(id);
        setSession(s);
      } catch {
        setSlides(previous);
        setError("Could not reorder slides");
      }
    })();
  }

  if (!id) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{session?.title ?? "Session"}</h1>
            {session ? (
              <p className="text-sm text-prsnt-ink/65">
                Code <span className="font-mono text-prsnt-ink/85">{session.code}</span> ·{" "}
                {session.totalSlides} slides
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={addingText}
              className="prsnt-btn-ghost disabled:opacity-50"
              onClick={() => void onAddTextSlide()}
            >
              {addingText ? "Adding…" : "Add text slide"}
            </button>
            <label className="prsnt-btn-primary cursor-pointer">
              {uploading ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
            </label>
            <label
              className={`prsnt-btn-ghost cursor-pointer ${
                deckImportStatus || uploading || addingText ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {deckImportStatus ?? "Import PDF / PPTX"}
              <input
                type="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                disabled={Boolean(deckImportStatus) || uploading || addingText}
                onChange={(e) => void onImportDeck(e)}
              />
            </label>
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-prsnt-cta px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800"
              to={`/sessions/${id}/present`}
            >
              Present
            </Link>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {sortedSlides.length === 0 ? (
          <p className="text-prsnt-ink/55">Add a text slide or upload an image to present.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sortedSlides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="grid gap-4 lg:grid-cols-2">
                {sortedSlides.map((slide, idx) => (
                  <SortableSlideCard
                    key={slide.id}
                    slide={slide}
                    sessionId={id}
                    displayIndex={idx + 1}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </AppShell>
  );
}
