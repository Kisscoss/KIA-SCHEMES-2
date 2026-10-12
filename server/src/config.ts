export const config = {
  get databaseUrl(): string {
    return process.env.DATABASE_URL ?? "";
  },
  get openrouterApiKey(): string {
    return (process.env.OPENROUTER_API_KEY ?? "").trim();
  },
  get openrouterModel(): string {
    return process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  },
  get aiTimeoutMs(): number {
    // Max time to wait for a single OpenRouter response. Overridable so you can
    // raise it on slow/unstable networks. Default 90s.
    const n = Number(process.env.AI_TIMEOUT_MS);
    return Number.isFinite(n) && n >= 5000 ? n : 90_000;
  },
  get port(): number {
    return Number(process.env.PORT || 4000);
  },
};

export function requireEnv(name: "DATABASE_URL" | "OPENROUTER_API_KEY"): string {
  const value = name === "DATABASE_URL" ? config.databaseUrl : config.openrouterApiKey;
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
