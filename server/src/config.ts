export const config = {
  get databaseUrl(): string {
    return process.env.DATABASE_URL ?? "";
  },
  get openrouterApiKey(): string {
    return (process.env.OPENROUTER_API_KEY ?? "").trim();
  },
  get openrouterModel(): string {
    return process.env.OPENROUTER_MODEL ?? "openrouter/free";
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
