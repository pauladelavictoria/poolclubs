import { Fragment, type ReactNode } from "react";
import { splitMentions } from "@/libs/algorithms/mentions";

/**
 * A comment's text with its `@slug`s rendered as people.
 *
 * Where a mention *links* is the caller's business: inside a club it points at
 * the member's club profile, on a public tournament page at their public one,
 * and neither knows about the other's routes. `mention` returning null is the
 * answer for a slug nobody recognises — the raw `@slug` is then left as typed,
 * which is also what it means: somebody wrote a name that resolves to nobody.
 */
export function CommentBody({
  body,
  mention,
}: {
  body: string;
  mention: (slug: string) => ReactNode;
}) {
  return (
    <>
      {splitMentions(body).map((part, i) => (
        <Fragment key={i}>
          {"text" in part ? part.text : (mention(part.slug) ?? `@${part.slug}`)}
        </Fragment>
      ))}
    </>
  );
}
