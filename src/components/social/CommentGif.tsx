/** A GIF comment. Height-capped so one GIF does not push the thread off the
 *  screen; the width follows the GIF's own shape. */
export function CommentGif({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt="GIF"
      loading="lazy"
      className="mt-1 max-h-48 max-w-full rounded-control"
    />
  );
}
