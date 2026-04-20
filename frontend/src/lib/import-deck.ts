import * as pdfjs from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import { uploadSlideImage } from "./session-api";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const MAX_DECK_PAGES = 100;

function naturalComparePaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

const PPTX_MEDIA_RE = /^ppt\/media\/[^/]+\.(png|jpe?g|gif|webp)$/i;

export async function pdfFileToImageFiles(file: File): Promise<File[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const n = pdf.numPages;
  if (n > MAX_DECK_PAGES) {
    throw new Error(`This PDF has ${n} pages. Import supports at most ${MAX_DECK_PAGES} slides.`);
  }
  if (n === 0) {
    throw new Error("This PDF has no pages to import.");
  }
  const out: File[] = [];
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const maxW = 1600;
    const scale = Math.min(2, maxW / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const renderTask = page.render({ canvas, viewport });
    await renderTask.promise;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`Could not encode page ${i} as an image.`))),
        "image/jpeg",
        0.9,
      );
    });
    out.push(new File([blob], `import-pdf-page-${i}.jpg`, { type: "image/jpeg" }));
  }
  return out;
}

export async function pptxFileToImageFiles(file: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(file);
  const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir && PPTX_MEDIA_RE.test(p));
  paths.sort(naturalComparePaths);
  if (paths.length === 0) {
    throw new Error(
      "No raster images found in this .pptx. Export the deck to PDF and import the PDF, or add images to the slides and try again.",
    );
  }
  if (paths.length > MAX_DECK_PAGES) {
    throw new Error(
      `This deck has ${paths.length} embedded images. Import supports at most ${MAX_DECK_PAGES}.`,
    );
  }
  const out: File[] = [];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const entry = zip.files[path];
    const blob = await entry.async("blob");
    const ext = path.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    const safeExt = ext === "jpeg" ? "jpg" : ext;
    out.push(new File([blob], `import-pptx-${i + 1}.${safeExt}`, { type: mime }));
  }
  return out;
}

export async function importSlidesFromImageFiles(
  sessionId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    await uploadSlideImage(sessionId, files[i]);
  }
}
