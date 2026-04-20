import { randomUUID } from "node:crypto";
import path from "node:path";
import { supabaseAdmin } from "../config/supabase.js";
import { SLIDE_ASSETS_BUCKET } from "../config/storage-bucket.js";

const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export function extensionForMime(mime: string, originalName: string): string {
  const fromName = path.extname(originalName).toLowerCase();
  if (ALLOWED_EXT.has(fromName)) {
    return fromName;
  }
  if (mime === "image/png") {
    return ".png";
  }
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return ".jpg";
  }
  if (mime === "image/gif") {
    return ".gif";
  }
  if (mime === "image/webp") {
    return ".webp";
  }
  return ".png";
}

export async function uploadSlideImageToStorage(
  sessionId: string,
  buffer: Buffer,
  mime: string,
  originalName: string,
): Promise<string> {
  const ext = extensionForMime(mime, originalName);
  const objectPath = `${sessionId}/${randomUUID()}${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(SLIDE_ASSETS_BUCKET)
    .upload(objectPath, buffer, { contentType: mime, upsert: false });
  if (error) {
    throw new Error(error.message);
  }
  const { data } = supabaseAdmin.storage.from(SLIDE_ASSETS_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

/** Returns storage object path (e.g. sessionId/file.png) or null if not a public slide-asset URL. */
export function storageObjectPathFromPublicUrl(src: string): string | null {
  const marker = `/object/public/${SLIDE_ASSETS_BUCKET}/`;
  const i = src.indexOf(marker);
  if (i === -1) {
    return null;
  }
  return src.slice(i + marker.length).split("?")[0] ?? null;
}

export async function removeSlideImageFromStorageIfPresent(src: string): Promise<void> {
  const objectPath = storageObjectPathFromPublicUrl(src);
  if (!objectPath) {
    return;
  }
  const { error } = await supabaseAdmin.storage.from(SLIDE_ASSETS_BUCKET).remove([objectPath]);
  if (error) {
    console.warn("Storage remove failed:", error.message);
  }
}
