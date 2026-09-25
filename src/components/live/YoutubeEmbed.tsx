/** A YouTube broadcast, live or finished — the same id is both. No-cookie
 *  domain, muted so autoplay is allowed. */
export default function YoutubeEmbed({
  broadcastId,
  title,
  autoplay = false,
}: {
  broadcastId: string;
  title: string;
  autoplay?: boolean;
}) {
  return (
    <iframe
      className="aspect-video w-full rounded-md"
      src={`https://www.youtube-nocookie.com/embed/${broadcastId}${autoplay ? "?autoplay=1&mute=1" : ""}`}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
