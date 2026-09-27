/** The classic teardrop, in the app's accent colour. */
export function MapPinGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-strike" aria-hidden>
      <path
        d="M12 2c-3.87 0-7 3.13-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="currentColor"
        stroke="rgba(0,0,0,0.25)"
      />
      <circle cx="12" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}
