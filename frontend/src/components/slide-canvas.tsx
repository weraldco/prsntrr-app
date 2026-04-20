import type { ApiSlideContent } from "../lib/session-api";
import { purifySlideHtml } from "../lib/purify-slide-html";

type Props = {
  content: ApiSlideContent;
};

export function SlideCanvas({ content }: Props) {
  if (content.type === "image") {
    return <img src={content.src} alt="" className="h-full w-full object-contain" />;
  }

  return (
    <div
      className="slide-html h-full w-full overflow-auto px-6 py-8 text-left text-zinc-100 [&_a]:text-indigo-400 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-medium [&_iframe]:mx-auto [&_iframe]:aspect-video [&_iframe]:max-h-[min(100%,420px)] [&_iframe]:w-full [&_iframe]:max-w-4xl [&_iframe]:rounded-lg [&_iframe]:border-0 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: purifySlideHtml(content.html) }}
    />
  );
}
