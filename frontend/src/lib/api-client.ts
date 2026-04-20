import { apiUrl } from "./api-origin";

let getAccessToken: () => string | null = () => null;

export function bindAccessToken(fn: () => string | null) {
  getAccessToken = fn;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(input);
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });
}

export async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
