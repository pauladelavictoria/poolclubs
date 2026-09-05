import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LuPencil, LuSmilePlus, LuX } from "react-icons/lu";
import { matchesTarget, useTournamentSocial } from "@/hooks/useSocial";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fmt } from "@/libs/algorithms/dayLabel";
import { CommentBody } from "@/components/social/CommentBody";
import { MentionPicker } from "@/components/social/MentionPicker";
import { useMentionPicker } from "@/hooks/useMentionPicker";
import { publicClubRosterQuery } from "@/queries/public/clubs";
import { REACTIONS } from "@/types";
import { useT } from "@/i18n";

/**
 * The talk under a public tournament's results.
 *
 * A sibling of SocialBar rather than a mode of it: that one resolves names off
 * the club roster and links into /app/$clubSlug, and neither holds out here —
 * a commenter can be from any club, and the
 * reader may be signed out entirely. Sharing the component would have meant
 * threading every one of those through it as a prop.
 *
 * Always open, unlike SocialBar's quiet row: this is the bottom of a page
 * somebody navigated to on purpose, not one line in a tape of a hundred
 * results.
 */
export default function TournamentSocialBar({
  tournamentId,
  clubId,
}: {
  tournamentId: number;
  clubId: number;
}) {
  const { t, locale } = useT();
  const {
    comments,
    reactions,
    canWrite,
    myPlayerId,
    canModerate,
    mentionedBySlug,
    addComment,
    deleteComment,
    editComment,
    toggleReaction,
  } = useTournamentSocial(tournamentId, clubId);

  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("");
  /** Which comment is open for editing, and the text as it is being changed. */
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const target = { tournamentId };
  const rows = comments.data ?? [];
  const marks = (reactions.data ?? []).filter((r) => matchesTarget(r, target));

  /** Out here a mention links to the public profile — the only page a signed-out
   *  reader can open. An unresolved slug stays as typed: the person is not in a
   *  public club, so there is nowhere to send anybody. */
  const mention = (slug: string) => {
    const person = mentionedBySlug.get(slug);
    if (!person) return null;
    return (
      <Link
        to="/players/$playerSlug"
        params={{ playerSlug: slug }}
        className="font-medium text-strike hover:text-ink"
      >
        @{person.name}
      </Link>
    );
  };

  // Who the `@` picker offers out here: the host club's roster — the same query
  // the page around this already loaded, so this is a cache read — plus anybody
  // already in the thread, who may be from another club entirely. Public people
  // only, since a mention links to a public profile.
  const roster = useQuery(publicClubRosterQuery(clubId));
  const mentionable = new Map(
    [
      ...(roster.data ?? []).filter((p) => p.is_public),
      ...rows.flatMap((c) => (c.author?.person ? [c.author.person] : [])),
    ].map((p) => [
      p.slug,
      { slug: p.slug, name: p.name, avatar_url: p.avatar_url },
    ]),
  );
  const picker = useMentionPicker([...mentionable.values()], draft, setDraft);

  const timeFmt = fmt(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Same rule as SocialBar: only emoji somebody used get a pill, ordered by the
  // palette so the row is stable, with anything off-palette last.
  const used = [...new Set(marks.map((r) => r.emoji))].sort(
    (a, b) =>
      (REACTIONS.indexOf(a as never) + 1 || 99) -
      (REACTIONS.indexOf(b as never) + 1 || 99),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment.mutate({ target, body: draft });
    setDraft("");
  };

  const pill =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-body transition-colors duration-150";

  return (
    <section className="mt-8">
      <h2 className="text-h4 font-semibold text-ink">{t("social.title")}</h2>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {used.map((emoji) => {
          const forEmoji = marks.filter((r) => r.emoji === emoji);
          return (
            <button
              key={emoji}
              type="button"
              disabled={!canWrite}
              onClick={() => toggleReaction.mutate({ target, emoji })}
              className={`${pill} border-hairline text-ink-soft ${
                canWrite ? "hover:border-hairline-strong" : "cursor-default"
              }`}
            >
              <span aria-hidden className="text-h4 leading-none">
                {emoji}
              </span>
              <span className="font-mono text-caption tabular-nums">
                {forEmoji.length}
              </span>
            </button>
          );
        })}

        {canWrite &&
          (picking ? (
            <span className="inline-flex flex-wrap items-center gap-0.5 rounded-full border border-hairline px-1 py-0.5">
              {REACTIONS.map((emoji) => (
                <IconButton
                  key={emoji}
                  type="button"
                  label={emoji}
                  size="sm"
                  shape="circle"
                  className="text-h4"
                  onClick={() => {
                    toggleReaction.mutate({ target, emoji });
                    setPicking(false);
                  }}
                >
                  {emoji}
                </IconButton>
              ))}
              <IconButton
                type="button"
                label={t("common.cancel")}
                size="sm"
                shape="circle"
                onClick={() => setPicking(false)}
              >
                <LuX className="h-4 w-4" />
              </IconButton>
            </span>
          ) : (
            <button
              type="button"
              aria-label={t("social.react")}
              onClick={() => setPicking(true)}
              className={`${pill} border-hairline text-ink-faint hover:border-hairline-strong hover:text-ink-soft`}
            >
              <LuSmilePlus className="h-4 w-4" />
            </button>
          ))}
      </div>

      <div className="mt-4 space-y-3 border-l border-hairline pl-3">
        {rows.length === 0 && (
          <p className="text-body text-ink-ghost">{t("social.empty")}</p>
        )}

        {rows.map((c) => {
          const person = c.author?.person;
          return (
            <div key={c.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-faint">
                  {person ? (
                    <Link
                      to="/players/$playerSlug"
                      params={{ playerSlug: person.slug }}
                      className="font-medium text-ink-soft hover:text-strike"
                    >
                      {person.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-soft">
                      {t("social.unknownAuthor")}
                    </span>
                  )}{" "}
                  <time dateTime={c.created_at}>
                    {timeFmt.format(new Date(c.created_at))}
                  </time>
                </p>
                {editing === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editDraft.trim()) {
                        editComment.mutate({ id: c.id, body: editDraft });
                      }
                      setEditing(null);
                    }}
                    className="mt-1 flex gap-2"
                  >
                    <Input
                      autoFocus
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditing(null);
                      }}
                      maxLength={1000}
                      className="h-9"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!editDraft.trim()}
                      className="shrink-0"
                    >
                      {t("common.save")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(null)}
                      className="shrink-0"
                    >
                      {t("common.cancel")}
                    </Button>
                  </form>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-body text-ink">
                    <CommentBody body={c.body} mention={mention} />
                  </p>
                )}
              </div>
              {/* Same as the club bar: the row's actions step aside while its
                  form is open. Editing is the author's alone — an admin out
                  here may remove a comment, never rewrite one. */}
              {editing !== c.id && (
                <>
                  {c.author_player_id === myPlayerId && (
                    <IconButton
                      type="button"
                      label={t("common.edit")}
                      size="sm"
                      onClick={() => {
                        setEditing(c.id);
                        setEditDraft(c.body);
                      }}
                    >
                      <LuPencil className="h-4 w-4" />
                    </IconButton>
                  )}
                  {(c.author_player_id === myPlayerId || canModerate) && (
                    <IconButton
                      type="button"
                      label={t("common.delete")}
                      size="sm"
                      tone="danger"
                      onClick={() => deleteComment.mutate(c.id)}
                    >
                      <LuX className="h-4 w-4" />
                    </IconButton>
                  )}
                </>
              )}
            </div>
          );
        })}

        {canWrite ? (
          <>
            <form onSubmit={submit} className="relative flex gap-2 pt-1">
              <MentionPicker
                id="tournament-mentions"
                people={picker.matches}
                active={picker.active}
                onHighlight={picker.setHighlight}
                onPick={picker.pick}
              />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={picker.onKeyDown}
                aria-autocomplete="list"
                aria-expanded={picker.matches.length > 0}
                aria-controls="tournament-mentions"
                aria-activedescendant={
                  picker.matches.length
                    ? `tournament-mentions-${picker.active}`
                    : undefined
                }
                maxLength={1000}
                placeholder={t("social.write")}
                className="h-9"
              />
              <Button type="submit" size="sm" disabled={!draft.trim()}>
                {t("social.send")}
              </Button>
            </form>
          </>
        ) : (
          <Link
            to="/app/login"
            search={{ next: `/tournaments/${tournamentId}` }}
            className="inline-block pt-1 text-body font-medium text-strike hover:text-ink"
          >
            {t("social.signInToPost")}
          </Link>
        )}
      </div>
    </section>
  );
}
