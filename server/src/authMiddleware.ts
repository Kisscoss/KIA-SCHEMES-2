import { createPublicKey, type KeyObject } from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  auth?: { userId: string; email?: string };
}

let cachedKeys: { fetchedAt: number; keys: Map<string, KeyObject> } | null = null;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function loadJwks(): Promise<Map<string, KeyObject>> {
  if (cachedKeys && Date.now() - cachedKeys.fetchedAt < JWKS_TTL_MS) {
    return cachedKeys.keys;
  }
  const url = process.env.AUTH_JWKS_URL ?? "";
  if (!url) throw new Error("AUTH_JWKS_URL is not configured");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch JWKS (${res.status})`);
  const jwks = (await res.json()) as {
    keys?: Array<Record<string, unknown> & { kid?: string }>;
  };
  const keys = new Map<string, KeyObject>();
  for (const jwk of jwks.keys ?? []) {
    if (!jwk.kid) continue;
    keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
  }
  cachedKeys = { fetchedAt: Date.now(), keys };
  return keys;
}

function keyProvider(
  header: jwt.JwtHeader,
  callback: jwt.SigningKeyCallback
): void {
  loadJwks()
    .then((keys) => {
      const key = header.kid ? keys.get(header.kid) : undefined;
      if (!key) return callback(new Error(`Unknown JWKS kid: ${header.kid}`));
      callback(null, key);
    })
    .catch((e) => callback(e as Error));
}

function verifyOptions(): jwt.VerifyOptions {
  const iss = process.env.AUTH_ISSUER ?? "";
  return {
    algorithms: ["RS256"],
    issuer: iss || undefined,
    clockTolerance: 60,
  };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Express middleware: requires a valid Neon Auth (Better Auth) session JWT,
 * verified against the branch's JWKS endpoint. Attaches req.auth on success.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Not signed in" });
  }

  jwt.verify(
    token,
    keyProvider,
    verifyOptions(),
    (err, decoded) => {
      if (err || !decoded) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }
      const payload = decoded as jwt.JwtPayload;
      req.auth = {
        userId: String(payload.sub ?? ""),
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
      next();
    }
  );
}

