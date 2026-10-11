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

/** Returns the session JWT for API Authorization headers, or null when signed out. */
export const getAuthToken = neonAuth.getJWTToken;

export const isAuthConfigured = Boolean(authUrl);

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}
