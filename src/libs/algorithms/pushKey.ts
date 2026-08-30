/**
 * The VAPID public key, as bytes.
 *
 * `applicationServerKey` wants a BufferSource. Chrome will take the base64url
 * string as it comes; Safari will not, so convert once here rather than find out
 * per browser. Its own file so it can be tested in isolation — see pushKey.test.ts.
 */
export function toKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  // base64url drops the padding base64 requires, and swaps two characters.
  const padded = base64url.padEnd(
    base64url.length + ((4 - (base64url.length % 4)) % 4),
    "=",
  );
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

  // Typed as Uint8Array<ArrayBuffer> rather than built with `from`: the DOM's
  // BufferSource excludes a SharedArrayBuffer-backed view, and only the
  // length constructor is narrow enough to say so.
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
