/**
 * @mentions inside a comment body.
 *
 * A mention is written as the person's slug — the same slug their public page
 * lives at (`people.slug`, produced by `slugify` in sql/schema.sql) — and is
 * *rendered* as their name. Storing the slug rather than the name is what makes
 * the mention survive a rename, and what lets the push path resolve recipients
 * in SQL without parsing display names.
 *
 * The pattern is deliberately the same in three places — here, the composer's
 * autocomplete, and the `commentMention` branch of `push_targets` — so a body
 * that shows a link in the thread is a body that notifies. Change one, change
 * all three.
 */

/** Slugs are lowercase alphanumerics in hyphen-separated groups, so a trailing
 *  hyphen or a full stop ends the mention rather than joining it. */
const MENTION = /@([a-z0-9]+(?:-[a-z0-9]+)*)/g;

/** Every slug mentioned, once each, in the order they appear. */
export const mentionedSlugs = (body: string) => [
  ...new Set(Array.from(body.matchAll(MENTION), (m) => m[1])),
];

export type BodyPart = { text: string } | { slug: string };

/** The body split into plain runs and mentions, for rendering. */
export function splitMentions(body: string): BodyPart[] {
  const parts: BodyPart[] = [];
  let last = 0;

  for (const match of body.matchAll(MENTION)) {
    const at = match.index;
    if (at > last) parts.push({ text: body.slice(last, at) });
    parts.push({ slug: match[1] });
    last = at + match[0].length;
  }

  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}

/** What the composer is half-way through typing: the slug fragment after the
 *  last `@`, or null when the caret is not in a mention. Empty string right
 *  after the `@` itself, which is when the whole roster should be offered. */
export const mentionDraft = (text: string) =>
  // A mention starts at the beginning or after whitespace, so an email address
  // typed into a comment does not open the picker.
  /(?:^|\s)@([a-z0-9-]*)$/.exec(text.toLowerCase())?.[1] ?? null;

/** Replace the fragment the caret is in with a chosen slug, ready to keep
 *  typing after. */
export const applyMention = (text: string, slug: string) =>
  `${text.replace(/@[a-z0-9-]*$/, "")}@${slug} `;

/** The five best matches for what is being typed, by slug or by name. Five
 *  because the picker wraps to a second line beyond that on a phone. */
export const matchMentions = <T extends { slug: string; name: string }>(
  people: T[],
  fragment: string,
) =>
  people
    .filter(
      (p) =>
        p.slug.includes(fragment) || p.name.toLowerCase().includes(fragment),
    )
    .slice(0, 5);
