import type { GeneratedScheme, SchemeFormData, SchemeRow } from "@/types/scheme";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined ?? "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    throw new Error(
      (data && typeof data.error === "string" && data.error) ||
        `Request failed (${res.status})`
    );
  }
  return data as T;
}

export interface GenerateResponse {
  formData: SchemeFormData;
  rows: SchemeRow[];
  id?: string;
}

export async function generateScheme(formData: SchemeFormData): Promise<GeneratedScheme> {
  return request<GeneratedScheme>("/api/schemes/generate", {
    method: "POST",
    body: JSON.stringify({ formData }),
  });
}

export async function saveScheme(scheme: GeneratedScheme): Promise<{ id: string }> {
  return request("/api/schemes", {
    method: "POST",
    body: JSON.stringify(scheme),
  });
}

export function isApiConfigured(): boolean {
  // Same-origin by default (Vite proxies /api in dev, host serves both in prod).
  return true;
}

export { API_BASE };
