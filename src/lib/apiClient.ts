import { useAuthStore } from "../state/useAuthStore";
const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData | string | null;
};

const normalizeBody = (body: FetchOptions["body"]) => {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}) {
  const { headers, body, ...rest } = options;
  const normalizedBody = normalizeBody(body);
  const contentTypeHeader: HeadersInit | undefined =
    normalizedBody !== undefined && !(normalizedBody instanceof FormData)
      ? { "Content-Type": "application/json" }
      : undefined;

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: {
      ...(contentTypeHeader ?? {}),
      ...(headers ?? {})
    },
    body: normalizedBody,
    ...rest
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      try {
        useAuthStore.getState().clearSession();
      } catch (_err) {
        // ignore
      }
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}
