/**
 * Which order a club's photos go in, and therefore which one is the cover.
 *
 * The bucket says which photos *exist*; `clubs.photo_order` says what sequence
 * they go in. Those are two stores, so the only safe way to read them is to
 * reconcile rather than trust — which is what `orderPhotos` does, and why the
 * pair can never drift into something a visitor sees.
 *
 * `photo_order` is jsonb with no CHECK behind it, exactly like `schedule`, so
 * everything here treats it as untrusted input and never throws on it.
 */

/** Anything with a storage path. Generic so the ordering can be tested without
 *  a URL, a bucket or a network. */
type Pathed = { path: string };

/**
 * The stored order, reconciled against what is actually in the bucket.
 *
 * Two rules, and between them they make the array self-healing:
 *
 *   - a path in the order that no longer exists is dropped, so deleting a photo
 *     needs no write to the club row and can never leave a broken tile behind;
 *   - a photo not mentioned in the order is appended, so uploading needs no
 *     write either and a club that has never reordered anything still gets a
 *     sensible sequence.
 *
 * The tail keeps the order the bucket gave it, which is chronological — the
 * object names carry a millisecond prefix (see libs/browser/photoImage.ts). So
 * "newest last" is the default, and the cover only moves when somebody moves it.
 */
export function orderPhotos<T extends Pathed>(photos: T[], order: unknown): T[] {
  const byPath = new Map(photos.map((photo) => [photo.path, photo]));
  const seen = new Set<string>();
  const out: T[] = [];

  if (Array.isArray(order)) {
    for (const path of order) {
      if (typeof path !== "string" || seen.has(path)) continue;
      const photo = byPath.get(path);
      // Silently skipped: this is the "deleted from the bucket" case, which is
      // ordinary rather than exceptional.
      if (!photo) continue;
      seen.add(path);
      out.push(photo);
    }
  }

  for (const photo of photos)
    if (!seen.has(photo.path)) out.push(photo);

  return out;
}

/**
 * One item moved to another index, as a new array.
 *
 * The whole of drag-and-drop, and of the move-left/move-right buttons that make
 * the same thing reachable on a tablet and from a keyboard. Out-of-range
 * indices are returned unchanged rather than clamped: every caller is a drop
 * target or a button that already knows the bounds, so a bad index is a bug and
 * silently doing something plausible would hide it.
 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list;
  if (from < 0 || from >= list.length) return list;
  if (to < 0 || to >= list.length) return list;

  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
