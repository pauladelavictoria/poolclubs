import { useState } from "react";
import { LuMessageSquare, LuPencil, LuSmilePlus, LuX } from "react-icons/lu";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerLookup } from "@/hooks/usePlayers";
import {
  matchesTarget,
  useComments,
  useReactions,
  useSocialActions,
} from "@/hooks/useSocial";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fmt } from "@/libs/algorithms/dayLabel";
import { CommentBody } from "@/components/social/CommentBody";
import { MentionPicker } from "@/components/social/MentionPicker";
import { useMentionPicker } from "@/hooks/useMentionPicker";
import { REACTIONS, type SocialTarget } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

/**
 * Reactions and comments on one result — a match or a drill log.
 *
 * Deliberately quiet: a bare row of counts until you touch it, so a page of
 * scores still reads as scores. The thread only exists once someone opens it.
 */
export default function SocialBar({
  target,
  preview = false,
  defaultOpen = false,
}: {
  target: SocialTarget;
  /** Feed cards show the first comment without a tap — a thread nobody can see
   *  is a thread nobody joins. */
  preview?: boolean;
  /** The thread already open. For a page that is one result and nothing else:
   *  there the thread is the rest of the page, not a thing to reveal. */
  defaultOpen?: boolean;
}) {
  const { t, locale } = useT();
  const { player, isClubAdmin } = useAuth();
  const { nameOf, bySlug } = usePlayerLookup();
  const { data: allComments } = useComments();
  const { data: allReactions } = useReactions();
  const { addComment, deleteComment, editComment, toggleReaction } =
    useSocialActions();

  const [open, setOpen] = useState(defaultOpen);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("");
  /** Which comment is open for editing, and the text as it is being changed. */
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const comments = (allComments ?? []).filter((c) => matchesTarget(c, target));
  const reactions = (allReactions ?? []).filter((r) =>
    matchesTarget(r, target),
  );

  /** A mention resolves against the club roster: inside the club that is who
   *  the reader can actually open. An unknown slug falls through to the raw
   *  text — somebody from another club, or a typo. */
  const mention = (slug: string) => {
    const person = bySlug.get(slug);
    if (!person) return null;
    return (
      <AppLink
        to="/app/$clubSlug/players/$playerId"
        params={{ playerId: person.id }}
        className="font-medium text-strike hover:text-ink"
      >
        @{person.name}
      </AppLink>
    );
  };

  // Who the `@` picker offers: the roster minus the tablets, since a device has
  // a player row and nobody to read a notification on it.
  const picker = useMentionPicker(
    [...bySlug.values()].filter((p) => !p.is_device),
    draft,
    setDraft,
  );

  const timeFmt = fmt(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Only emoji anyone has actually used get a pill; the rest live behind the
  // picker so the row stays short. Read off the rows rather than the palette,
  // so an emoji added to the picker later still shows on old reactions.
  const used = [...new Set(reactions.map((r) => r.emoji))].sort(
    (a, b) =>
      (REACTIONS.indexOf(a as never) + 1 || 99) -
      (REACTIONS.indexOf(b as never) + 1 || 99),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    // The comment lands in the cache before the request does, so the input
    // clears now. A rollback removes the comment; retyping is the recovery.
    addComment.mutate({ target, body: draft });
    setDraft("");
  };

  const pill =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-body transition-colors duration-150";

  return (
    <div className="mt-1 px-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {used.map((emoji) => {
          const forEmoji = reactions.filter((r) => r.emoji === emoji);
          const mine = forEmoji.some((r) => r.author_player_id === player?.id);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleReaction.mutate({ target, emoji })}
              aria-pressed={mine}
              title={forEmoji.map((r) => nameOf(r.author_player_id)).join(", ")}
              className={`${pill} ${
                mine
                  ? "border-strike bg-strike-tint text-ink"
                  : "border-hairline text-ink-soft hover:border-hairline-strong"
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

        {picking ? (
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
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`${pill} border-hairline text-ink-faint hover:border-hairline-strong hover:text-ink-soft`}
        >
          <LuMessageSquare className="h-4 w-4" />
          {comments.length > 0 && (
            <span className="font-mono text-caption tabular-nums">
              {comments.length}
            </span>
          )}
        </button>
      </div>

      {preview && !open && comments.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen(true);
          }}
          className="mt-1.5 block w-full cursor-pointer text-left"
        >
          <span className="line-clamp-2 text-body text-ink-faint">
            <AppLink
              to="/app/$clubSlug/players/$playerId"
              params={{ playerId: comments[0].author_player_id }}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-ink-soft hover:text-strike"
            >
              {nameOf(comments[0].author_player_id)}
            </AppLink>{" "}
            <CommentBody body={comments[0].body} mention={mention} />
          </span>
        </div>
      )}

      {open && (
        <div className="mt-2 space-y-3 border-l border-hairline pl-3">
          {comments.length === 0 && (
            <p className="text-body text-ink-ghost">{t("social.empty")}</p>
          )}

          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-faint">
                  <AppLink
                    to="/app/$clubSlug/players/$playerId"
                    params={{ playerId: c.author_player_id }}
                    className="font-medium text-ink-soft hover:text-strike"
                  >
                    {nameOf(c.author_player_id)}
                  </AppLink>{" "}
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
                      // Escape leaves the comment as it was, which is what
                      // Escape means everywhere else in the app.
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditing(null);
                      }}
                      maxLength={1000}
                      className="h-9"
                    />
                    <Button
                      type="submit"
                      variant="accent"
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
              {/* The row's own actions step aside while it is being edited —
                  the form carries save and cancel itself. */}
              {editing !== c.id && (
                <>
                  {c.author_player_id === player?.id && (
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
                  {(c.author_player_id === player?.id || isClubAdmin) && (
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
          ))}

          <form onSubmit={submit} className="relative flex gap-2 pt-1">
            <MentionPicker
              id="social-mentions"
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
              aria-controls="social-mentions"
              aria-activedescendant={
                picker.matches.length
                  ? `social-mentions-${picker.active}`
                  : undefined
              }
              maxLength={1000}
              placeholder={t("social.write")}
              className="h-9"
            />
            <Button
              type="submit"
              variant="accent"
              size="sm"
              disabled={!draft.trim()}
              // The input beside it is w-full and would otherwise squash it
              className="shrink-0"
            >
              {t("social.send")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
