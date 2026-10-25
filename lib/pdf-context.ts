import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Binds extracted PDF text to the upload pipeline.
 *
 * /api/chat/upload is the only place that runs the visual injection scanner,
 * so the text it returns is signed here and /api/chat refuses document context
 * that doesn't carry a valid signature. Without this, a player could skip the
 * upload (and the scanner) entirely by POSTing `pdfContext` straight to the
 * chat endpoint, bypassing the challenge.
 *
 * Set APP_SECRET in production so tokens survive restarts and work across
 * instances. Otherwise a random per-process secret is used.
 */
const TOKEN_TTL_MS = 60 * 60_000;

function secret(): string {
  const configured = process.env.APP_SECRET;
  // Ignore the template placeholder: a publicly known secret would let anyone forge tokens.
  if (configured && configured !== "change-me" && configured.length >= 16) return configured;
  const g = globalThis as Record<string, unknown>;
  g.__astralAppSecret ??= randomBytes(32).toString("hex");
  return g.__astralAppSecret as string;
}

function mac(userId: string, expiresAt: number, text: string): string {
  const digest = createHash("sha256").update(text).digest("hex");
  return createHmac("sha256", secret())
    .update(`${userId}\n${expiresAt}\n${digest}`)
    .digest("base64url");
}

export function signPdfContext(userId: string, text: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return `${expiresAt}.${mac(userId, expiresAt, text)}`;
}

export function verifyPdfContext(userId: string, text: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const expiresAt = Number(expRaw);
  if (!sig || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(mac(userId, expiresAt, text));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
