/**
 * A face where there is one, the initial where there isn't. Same ring in both
 * cases, so a row of mixed avatars still lines up.
 */
export function Avatar({
  name,
  url,
  className = "h-7 w-7",
}: {
  name: string;
  url?: string | null;
  /** Size lives here — pass the height/width utility pair you need. */
  className?: string;
}) {
  const ring =
    "shrink-0 rounded-full outline outline-1 -outline-offset-1 outline-white/10";

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${ring} ${className} object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${ring} ${className} flex items-center justify-center bg-felt-raised text-caption font-semibold text-ink-soft`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
