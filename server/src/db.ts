import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

let sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  if (!sql) sql = neon(url);
  return sql;
}

export interface SchemeRowInput {
  week: number;
  period: string;
  topic: string;
  competency: string;
  learningOutcomes: string;
  resources: string;
  methodology: string;
  references: string;
  remarks: string;
}
