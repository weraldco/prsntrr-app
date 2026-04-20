import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Youtube from "@tiptap/extension-youtube";
import { useCallback, useEffect, useRef, useState } from "react";
import { VimeoEmbed, vimeoUrlToEmbedContent } from "../lib/tiptap-vimeo-embed";
import { updateSlideHtml } from "../lib/session-api";

type Props = {
  sessionId: string;
  order: number;
  initialHtml: string;
};

export function SlideRichEditor({ sessionId, order, initialHtml }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef(initialHtml);
  const lastSavedRef = useRef(initialHtml);
  const sessionOrderRef = useRef({ sessionId, order });
  sessionOrderRef.current = { sessionId, order };
  const [saveError, setSaveError] = useState<string | null>(null);

  const runSave = useCallback(async (html: string) => {
    if (html === lastSavedRef.current) {
      return;
    }
    const { sessionId: sid, order: ord } = sessionOrderRef.current;
    try {
      await updateSlideHtml(sid, ord, html);
      lastSavedRef.current = html;
      setSaveError(null);
    } catch {
      setSaveError("Could not save changes. Check your connection and try again.");
    }
  }, []);

  const scheduleSave = useCallback(
    (html: string) => {
      latestHtmlRef.current = html;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        void runSave(latestHtmlRef.current);
      }, 750);
    },
    [runSave],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Youtube.configure({
        nocookie: true,
        controls: true,
        width: 640,
        height: 360,
      }),
      VimeoEmbed,
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] px-2 py-2 font-sans text-prsnt-ink outline-none [&_p]:mb-2 [&_h1]:font-serif [&_h1]:text-xl [&_h2]:font-serif [&_h2]:text-lg [&_h3]:font-serif [&_h3]:text-base",
        "aria-label": "Slide text content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      scheduleSave(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = editor.getHTML();
    if (initialHtml !== current) {
      editor.commands.setContent(initialHtml, { emitUpdate: false });
      lastSavedRef.current = initialHtml;
      latestHtmlRef.current = initialHtml;
    }
  }, [editor, initialHtml]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const html = latestHtmlRef.current;
      if (html !== lastSavedRef.current) {
        const { sessionId: sid, order: ord } = sessionOrderRef.current;
        void updateSlideHtml(sid, ord, html).catch(() => {});
      }
    };
  }, []);

  if (!editor) {
    return <div className="min-h-[140px] animate-pulse rounded-lg bg-teal-900/10" />;
  }

  return (
    <div className="rounded-xl border border-teal-900/15 bg-white focus-within:ring-2 focus-within:ring-prsnt-cta/25 dark:border-white/10 dark:bg-zinc-900/70">
      <div className="flex flex-wrap gap-2 border-b border-teal-900/10 bg-prsnt-surface/40 px-2 py-1.5 dark:border-white/10 dark:bg-zinc-900/40">
        <button
          type="button"
          className="rounded-lg px-2 py-0.5 text-xs text-prsnt-ink/65 transition-colors hover:bg-teal-900/5 hover:text-prsnt-ink"
          onClick={() => {
            const url = window.prompt("Paste a YouTube link");
            if (!url?.trim()) {
              return;
            }
            editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
          }}
        >
          Embed YouTube
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-0.5 text-xs text-prsnt-ink/65 transition-colors hover:bg-teal-900/5 hover:text-prsnt-ink"
          onClick={() => {
            const url = window.prompt("Paste a Vimeo link (e.g. https://vimeo.com/123456)");
            if (!url?.trim()) {
              return;
            }
            const node = vimeoUrlToEmbedContent(url);
            if (!node) {
              window.alert("Could not parse that Vimeo URL.");
              return;
            }
            editor.chain().focus().insertContent(node).run();
          }}
        >
          Embed Vimeo
        </button>
      </div>
      <EditorContent editor={editor} />
      {saveError ? (
        <p className="border-t border-teal-900/10 px-2 py-1.5 text-xs text-red-600 dark:border-white/10 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
