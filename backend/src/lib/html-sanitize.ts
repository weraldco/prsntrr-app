import sanitizeHtml from "sanitize-html";

const slideHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "h1",
    "h2",
    "h3",
    "span",
    "div",
    "hr",
    "br",
    "iframe",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "width", "height", "class"],
    a: ["href", "name", "target", "rel", "class"],
    p: ["class"],
    span: ["class"],
    div: ["class"],
    iframe: [
      "src",
      "width",
      "height",
      "frameborder",
      "allow",
      "allowfullscreen",
      "referrerpolicy",
      "title",
      "loading",
      "class",
    ],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
};

export function sanitizeSlideHtml(dirty: string): string {
  return sanitizeHtml(dirty, slideHtmlOptions);
}
