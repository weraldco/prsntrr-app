const STORAGE_PREFIX = "prsntrr.viewer.v1";

export type ViewerStoredPreferences = {
  followPresenter: boolean;
  lastSlideIndex: number;
};

function storageKey(sessionCode: string): string {
  return `${STORAGE_PREFIX}.${sessionCode.trim().toUpperCase()}`;
}

export function readViewerPreferences(sessionCode: string): ViewerStoredPreferences | null {
  if (typeof window === "undefined" || !sessionCode) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(sessionCode));
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as Partial<ViewerStoredPreferences>;
    if (typeof data.followPresenter !== "boolean" || typeof data.lastSlideIndex !== "number") {
      return null;
    }
    return {
      followPresenter: data.followPresenter,
      lastSlideIndex: Math.max(0, Math.floor(data.lastSlideIndex)),
    };
  } catch {
    return null;
  }
}

export function writeViewerPreferences(sessionCode: string, prefs: ViewerStoredPreferences): void {
  if (typeof window === "undefined" || !sessionCode) {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(sessionCode), JSON.stringify(prefs));
  } catch {
    /* quota or private mode */
  }
}
