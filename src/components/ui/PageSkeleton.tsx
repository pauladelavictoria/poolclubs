import { Skeleton } from "./Skeleton";

export function PageSkeleton() {
  return (
    // The app bar is real and already on screen — what is missing below it is
    // the page's title and its first block.
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-card" />
    </div>
  );
}
