import * as React from "react";
import { cardClasses } from "@/components/ui/cardStyles";

/**
 * The one container. Surface shift + hairline, never a shadow — depth strategy
 * for this app is lightness, because shadows don't read on near-black.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cardClasses({ className })} {...props} />;
}
