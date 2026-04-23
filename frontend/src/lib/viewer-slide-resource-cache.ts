import { apiUrl } from "./api-origin";

/** Max entries kept after distance-based trim; LRU applies if still over cap. */
const MAX_ENTRIES = 7;
/** Keep cache entries within this index distance of the current slide. */
const NEIGHBOR_RADIUS = 2;

type ResourceCacheEntry = {
  lastAccessMs: number;
  imageReady: boolean;
  purifiedHtml?: string;
};

export class ViewerSlideResourceCache {
  private entries = new Map<string, ResourceCacheEntry>();
  private imagePromises = new Map<string, Promise<void>>();

  touch(slideId: string): void {
    const e = this.entries.get(slideId) ?? { lastAccessMs: 0, imageReady: false };
    e.lastAccessMs = Date.now();
    this.entries.set(slideId, e);
  }

  ensurePurifiedHtml(slideId: string, html: string, purify: (h: string) => string): string {
    let e = this.entries.get(slideId);
    if (!e) {
      e = { lastAccessMs: Date.now(), imageReady: false };
    }
    if (e.purifiedHtml === undefined) {
      e.purifiedHtml = purify(html);
    }
    e.lastAccessMs = Date.now();
    this.entries.set(slideId, e);
    return e.purifiedHtml;
  }

  isImageReady(slideId: string): boolean {
    return this.entries.get(slideId)?.imageReady ?? false;
  }

  markImageReady(slideId: string): void {
    const e = this.entries.get(slideId) ?? { lastAccessMs: Date.now(), imageReady: false };
    e.imageReady = true;
    e.lastAccessMs = Date.now();
    this.entries.set(slideId, e);
  }

  /**
   * Warm browser cache for an image slide; dedupes concurrent requests for the same slide.
   */
  prefetchImage(slideId: string, src: string): Promise<void> {
    this.touch(slideId);
    const existing = this.imagePromises.get(slideId);
    if (existing) {
      return existing;
    }
    const url = apiUrl(src);
    const p = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.markImageReady(slideId);
        this.imagePromises.delete(slideId);
        resolve();
      };
      img.onerror = () => {
        this.imagePromises.delete(slideId);
        resolve();
      };
      img.src = url;
    });
    this.imagePromises.set(slideId, p);
    return p;
  }

  evict(orderedIds: string[], currentIndex: number): void {
    const n = orderedIds.length;
    if (n === 0) {
      return;
    }
    const cur = Math.max(0, Math.min(currentIndex, n - 1));
    const curId = orderedIds[cur];
    const keepNear = new Set<string>();
    for (let d = -NEIGHBOR_RADIUS; d <= NEIGHBOR_RADIUS; d++) {
      const i = cur + d;
      if (i >= 0 && i < n) {
        keepNear.add(orderedIds[i]);
      }
    }
    for (const id of [...this.entries.keys()]) {
      if (!keepNear.has(id)) {
        this.entries.delete(id);
        this.imagePromises.delete(id);
      }
    }
    while (this.entries.size > MAX_ENTRIES) {
      let victim: string | null = null;
      let oldest = Infinity;
      for (const [id, e] of this.entries) {
        if (id === curId) {
          continue;
        }
        if (e.lastAccessMs < oldest) {
          oldest = e.lastAccessMs;
          victim = id;
        }
      }
      if (!victim) {
        break;
      }
      this.entries.delete(victim);
      this.imagePromises.delete(victim);
    }
  }

  clear(): void {
    this.entries.clear();
    this.imagePromises.clear();
  }
}

export function scheduleIdleTask(fn: () => void, timeoutMs = 1200): number {
  if (typeof requestIdleCallback !== "undefined") {
    return requestIdleCallback(fn, { timeout: timeoutMs });
  }
  return window.setTimeout(fn, 0) as unknown as number;
}

export function cancelIdleTask(id: number): void {
  if (typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
}
