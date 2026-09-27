import { type ReactNode } from "react";

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    // `overflow-x-clip`, not `hidden`: hidden makes this a scroll container and
    // every `position: sticky` inside it stops working. Clip only stops a child
    // widening the page — which the map's hover card can do on a phone, since it
    // is allowed to spill out past the map's edge.
    <main className="overflow-x-clip px-4 pb-20 sm:px-6">{children}</main>
  );
}
