export function NavDrawerHeading({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1 pt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </div>
  );
}
