import { createPublicKey, verify, type KeyObject } from "crypto";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  auth?: { userId: string; email?: string };
}

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  iss?: string;
  exp?: number;
  iat?: number;
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
    try {
      keys.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
    } catch {
      // Skip any key we cannot load.
    }
  }
  cachedKeys = { fetchedAt: Date.now(), keys };
  return keys;
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function parseJsonPart(part: string): unknown {
  return JSON.parse(b64urlDecode(part).toString("utf8"));
}

/**
 * Verify a JWT signature with Node's native crypto. Supports EdDSA (Ed25519),
 * which is what Neon Auth (Better Auth) uses, plus RS256. `jsonwebtoken` cannot
 * verify ed25519 keys, so we verify here directly.
 */
function verifySignature(
  token: string,
  header: JwtHeader,
  key: KeyObject
): boolean {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;
  const signingInput = `${h}.${p}`;
  const signature = b64urlDecode(s);

  if (header.alg === "EdDSA") {
    // Ed25519: pass null as the digest algorithm.
    return verify(null, Buffer.from(signingInput), key, signature);
  }
  if (header.alg === "RS256") {
    return verify("RSA-SHA256", Buffer.from(signingInput), key, signature);
  }
  return false;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Express middleware: requires a valid Neon Auth (Better Auth) session JWT,
 * verified against the branch's JWKS endpoint. Attaches req.auth on success.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Not signed in" });
  }

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = parseJsonPart(token.split(".")[0]) as JwtHeader;
    payload = parseJsonPart(token.split(".")[1]) as JwtPayload;
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  if (!header.kid) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  try {
    const keys = await loadJwks();
    const key = keys.get(header.kid);
    if (!key) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    if (!verifySignature(token, header, key)) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  } catch (e) {
    console.error("Auth verification error:", e);
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Expiry check (with a small clock tolerance).
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp + 60 < now) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  // Optional issuer pin (skip when AUTH_ISSUER is empty).
  const expectedIssuer = process.env.AUTH_ISSUER ?? "";
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.auth = {
    userId: String(payload.sub ?? ""),
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
  next();
}

