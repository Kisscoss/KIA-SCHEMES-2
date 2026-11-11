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
    // Max time to wait for a SINGLE OpenRouter attempt. Overridable so you can
    // raise it on slow/unstable networks. Default 25s — small enough that a
    // couple of attempts plus backoff stay inside the 60s serverless cap.
    const n = Number(process.env.AI_TIMEOUT_MS);
    return Number.isFinite(n) && n >= 5000 ? n : 25_000;
  },
  get aiMaxAttempts(): number {
    // Attempts per logical AI call. Default 2.
    const n = Math.floor(Number(process.env.AI_MAX_ATTEMPTS));
    return Number.isFinite(n) && n >= 1 ? n : 2;
  },
  get aiTotalBudgetMs(): number {
    // Overall wall-clock budget for a single generate request, spanning ALL
    // attempts and the stricter-JSON retry. Kept under the 60s serverless
    // function limit so we fail with our own error instead of a platform 504.
    const n = Number(process.env.AI_TOTAL_BUDGET_MS);
    return Number.isFinite(n) && n >= 10_000 ? n : 50_000;
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
