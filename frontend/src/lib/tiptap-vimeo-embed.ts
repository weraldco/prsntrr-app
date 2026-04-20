import { Node, mergeAttributes } from "@tiptap/core";

const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

export const VimeoEmbed = Node.create({
  name: "vimeoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: "Vimeo video",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src*="player.vimeo.com"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(HTMLAttributes, {
        width: "640",
        height: "360",
        frameborder: "0",
        allow: "autoplay; fullscreen; picture-in-picture",
        allowfullscreen: "true",
        loading: "lazy",
        referrerpolicy: "strict-origin-when-cross-origin",
        class: "w-full max-w-full rounded-lg",
      }),
    ];
  },
});

export function vimeoUrlToEmbedContent(input: string): { type: "vimeoEmbed"; attrs: { src: string; title: string } } | null {
  const m = input.trim().match(VIMEO_RE);
  if (!m?.[1]) {
    return null;
  }
  return {
    type: "vimeoEmbed",
    attrs: { src: `https://player.vimeo.com/video/${m[1]}`, title: "Vimeo video" },
  };
}
