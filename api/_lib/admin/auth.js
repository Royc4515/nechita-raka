/**
 * Who may open the dashboard: whoever signs in with Google as one of ADMIN_EMAILS. Google's ID
 * token is checked once, at sign-in; after that the browser holds our own short session token in
 * an httpOnly cookie, signed with ADMIN_SESSION_SECRET, or, when that isn't set, with a key derived
 * from the chat's CHAT_SALT (so there is one secret less to keep; changing either signs everyone out).
 */
import { createHmac } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

/** Shorter than ADMIN_SESSION_SECRET would make the session tokens guessable. */
const MIN_SECRET_LENGTH = 32;
export const SESSION_COOKIE = "nr_admin";
export const SESSION_DAYS = 7;
const SESSION_ISSUER = "nechita-raka-admin";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

/** The session signing secret: ADMIN_SESSION_SECRET, else derived from CHAT_SALT, else null. */
function sessionSecret(env) {
  const own = env.ADMIN_SESSION_SECRET?.trim();
  if (own) return own;
  const salt = env.CHAT_SALT?.trim();
  return salt && salt.length >= MIN_SECRET_LENGTH ? createHmac("sha256", salt).update("nechita-raka admin session v1").digest("hex") : null;
}

/** `null` (dashboard off, 503) unless the Google client id, at least one admin, a long secret and the database are set. */
export function readAdminConfig(env = process.env) {
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const secret = sessionSecret(env);
  const databaseUrl = (env.DATABASE_URL ?? env.POSTGRES_URL)?.trim();
  const emails = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL.test(e));
  if (!googleClientId || !databaseUrl || !emails.length || !secret || secret.length < MIN_SECRET_LENGTH) return null;
  return { googleClientId, admins: new Set(emails), sessionKey: new TextEncoder().encode(secret), databaseUrl };
}

let googleKeys = null;
/** Google's signing keys, fetched and cached by jose (refetched when Google rotates them). */
export function googleJwks() {
  googleKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  return googleKeys;
}

/**
 * The admin's email from a Google Sign-In ID token, or null: the token must be signed by Google,
 * issued for our client id, unexpired, for a verified email, and that email must be an admin.
 */
export async function adminFromGoogleToken(token, config, jwks = googleJwks()) {
  if (typeof token !== "string" || token.length > 4_096) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: GOOGLE_ISSUERS, audience: config.googleClientId, algorithms: ["RS256"] });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    return payload.email_verified === true && config.admins.has(email) ? email : null;
  } catch {
    return null;
  }
}

export function createSession(email, config, now = new Date()) {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer(SESSION_ISSUER)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_DAYS * 86_400)
    .sign(config.sessionKey);
}

/** The signed-in admin's email from the request's session cookie, or null. Still checks ADMIN_EMAILS, so removing someone there signs them out. */
export async function adminFromRequest(request, config, now = new Date()) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, config.sessionKey, { issuer: SESSION_ISSUER, algorithms: ["HS256"], currentDate: now });
    return typeof payload.sub === "string" && config.admins.has(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/** Only sent to /api/admin, never readable by page scripts, never sent cross-site. */
export function sessionCookie(token) {
  const maxAge = token ? SESSION_DAYS * 86_400 : 0;
  return `${SESSION_COOKIE}=${token ?? ""}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
