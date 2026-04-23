import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { purifySlideHtml } from "../lib/purify-slide-html";
import type { ApiSlide } from "../lib/session-api";
import {
  ViewerSlideResourceCache,
  cancelIdleTask,
  scheduleIdleTask,
} from "../lib/viewer-slide-resource-cache";

type Options = {
  orderedSlides: ApiSlide[];
  activeIndex: number;
  enabled: boolean;
  /** Session join code — new cache instance when this changes. */
  sessionCode: string;
};

const PRELOAD_DEBOUNCE_MS = 72;

export function useViewerSlideCache({ orderedSlides, activeIndex, enabled, sessionCode }: Options) {
  const cacheHolder = useRef<{ code: string; cache: ViewerSlideResourceCache } | null>(null);
  if (!cacheHolder.current || cacheHolder.current.code !== sessionCode) {
    cacheHolder.current = { code: sessionCode, cache: new ViewerSlideResourceCache() };
  }
  const cache = cacheHolder.current.cache;

  const [, forceReload] = useState(0);
  const bumpWarmEpoch = useCallback(() => forceReload((n) => n + 1), []);

  const safeIndex =
    orderedSlides.length === 0 ? 0 : Math.max(0, Math.min(activeIndex, orderedSlides.length - 1));
  const activeSlide = orderedSlides[safeIndex];

  const orderedIds = useMemo(() => orderedSlides.map((s) => s.id), [orderedSlides]);

  let purifiedHtml: string | undefined;
  if (enabled && activeSlide?.content.type === "html") {
    try {
      purifiedHtml = cache.ensurePurifiedHtml(activeSlide.id, activeSlide.content.html, purifySlideHtml);
    } catch {
      purifiedHtml = undefined;
    }
  }

  const isImageCachedReady =
    activeSlide != null && activeSlide.content.type === "image" ? cache.isImageReady(activeSlide.id) : true;

  useEffect(() => {
    if (!enabled || orderedSlides.length === 0 || !activeSlide) {
      return;
    }

    cache.touch(activeSlide.id);
    try {
      if (activeSlide.content.type === "html") {
        cache.ensurePurifiedHtml(activeSlide.id, activeSlide.content.html, purifySlideHtml);
      } else {
        void cache.prefetchImage(activeSlide.id, activeSlide.content.src).then(bumpWarmEpoch);
      }
    } catch {
      /* purify or cache failure — SlideCanvas still attempts render */
    }

    let idleId: number | undefined;
    const debounceTimer = window.setTimeout(() => {
      try {
        cache.evict(orderedIds, safeIndex);
      } catch {
        /* ignore */
      }

      const runNeighbors = () => {
        const slides = orderedSlides;
        const cur = safeIndex;
        const indices: number[] = [];
        for (let ahead = 1; ahead <= 2; ahead++) {
          const i = cur + ahead;
          if (i < slides.length) {
            indices.push(i);
          }
        }
        for (let behind = 1; behind <= 1; behind++) {
          const i = cur - behind;
          if (i >= 0) {
            indices.push(i);
          }
        }
        for (const i of indices) {
          const s = slides[i];
          if (!s) {
            continue;
          }
          try {
            if (s.content.type === "image") {
              void cache.prefetchImage(s.id, s.content.src).then(bumpWarmEpoch);
            } else {
              cache.ensurePurifiedHtml(s.id, s.content.html, purifySlideHtml);
            }
          } catch {
            /* ignore preload errors; navigation retries */
          }
        }
      };

      idleId = scheduleIdleTask(runNeighbors);
    }, PRELOAD_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(debounceTimer);
      if (idleId !== undefined) {
        cancelIdleTask(idleId);
      }
    };
  }, [activeSlide, bumpWarmEpoch, cache, enabled, orderedIds, orderedSlides, safeIndex]);

  const markCurrentImageDecoded = useCallback(() => {
    if (activeSlide?.content.type === "image") {
      cache.markImageReady(activeSlide.id);
      bumpWarmEpoch();
    }
  }, [activeSlide, bumpWarmEpoch, cache]);

  return {
    purifiedHtml,
    isImageCachedReady,
    markCurrentImageDecoded,
  };
}
