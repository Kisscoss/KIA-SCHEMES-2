import { createInternalNeonAuth } from "@neondatabase/neon-js/auth";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

if (!authUrl) {
  console.error(
    "Missing VITE_NEON_AUTH_URL. Get the Auth base URL from Neon Console → KIA-SCHEME-GENIE → Auth, and add it to .env."
  );
}

const neonAuth = createInternalNeonAuth(
  authUrl ?? "http://localhost:4000/api/auth-placeholder"
);

/** Better Auth client (signUp.email, signIn.email, getSession, ...). */
export const authClient = neonAuth.adapter;

/**
 * Returns a signed session JWT for API Authorization headers, or null when
 * signed out.
 *
 * Neon Auth stores the session as an opaque cookie; the API needs a signed JWT.
 * We mint one from the Better Auth `/token` endpoint using the session cookie
 * (`credentials: "include"`). The built-in `getJWTToken` only returns the opaque
 * session token, which our JWKS-based API cannot verify, so we call `/token`.
 */
export const getAuthToken = async (): Promise<string | null> => {
  if (!authUrl) return null;
  try {
    const res = await fetch(`${authUrl.replace(/\/$/, "")}/token`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
};

export const isAuthConfigured = Boolean(authUrl);

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}
