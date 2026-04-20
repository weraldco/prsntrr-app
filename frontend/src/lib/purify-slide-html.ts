import DOMPurify from "dompurify";

const IFRAME_PREFIXES = [
  "https://www.youtube.com/embed/",
  "https://www.youtube-nocookie.com/embed/",
  "https://player.vimeo.com/video/",
] as const;

let hookInstalled = false;

function installIframeSrcHook() {
  if (hookInstalled) {
    return;
  }
  hookInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName !== "src" || node.nodeName !== "IFRAME") {
      return;
    }
    const v = (data.attrValue ?? "").trim();
    if (!IFRAME_PREFIXES.some((p) => v.startsWith(p))) {
      data.keepAttr = false;
    }
  });
}

export function purifySlideHtml(html: string): string {
  installIframeSrcHook();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "frameborder",
      "referrerpolicy",
      "title",
      "loading",
      "width",
      "height",
    ],
  });
}
