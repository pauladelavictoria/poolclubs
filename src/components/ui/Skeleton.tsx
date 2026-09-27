/**
 * Loading placeholders shaped like the content that replaces them, so the
 * layout doesn't jump. Spinners tell you nothing about what's coming.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-control ${className}`} />;
}
