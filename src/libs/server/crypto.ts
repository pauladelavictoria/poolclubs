import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * AES-256-GCM at rest for club_youtube.refresh_token_enc and
 * club_streams.stream_key_enc — see docs/youtube-streaming.md §2.2. Both
 * tables deny all anon/authenticated access already (RLS), so this is
 * defence in depth against a leaked service-role key or a dump, not the
 * primary boundary.
 */
function encryptionKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  return Buffer.from(hex, "hex");
}

/** iv:authTag:ciphertext, each base64 — self-contained, no separate nonce store. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((b) => b.toString("base64"))
    .join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Signed `state` for the YouTube OAuth round trip (§2.3) — carries the club
 * id through Google's redirect and proves the callback wasn't forged, since
 * nothing else ties that request back to an admin's connect click. Reuses
 * TOKEN_ENCRYPTION_KEY as the HMAC key rather than adding a second secret.
 */
export function signYoutubeState(clubId: number): string {
  const payload = `${clubId}.${Date.now() + STATE_TTL_MS}`;
  const sig = createHmac("sha256", encryptionKey())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Returns the club id if `state` is a signature we issued and it hasn't expired. */
export function verifyYoutubeState(state: string): number | null {
  const [clubIdStr, expiryStr, sig] = state.split(".");
  if (!clubIdStr || !expiryStr || !sig) return null;

  const expected = createHmac("sha256", encryptionKey())
    .update(`${clubIdStr}.${expiryStr}`)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  if (Date.now() > Number(expiryStr)) return null;
  return Number(clubIdStr);
}
