/**
 * SVGs from `flag-icons` (lipis, MIT) rather than emoji: emoji flags don't
 * render as flags on Windows without extra fonts installed, and Windows is
 * exactly what the streaming overlay's own encoder PCs are expected to run
 * (see docs/youtube-streaming.md's ops runbook, which steers clubs toward an
 * NVENC/QuickSync mini PC) — a flag emoji there shows as the bare two-letter
 * code instead.
 *
 * Every two-letter flag in the package, as URLs. `no-inline` so none of them
 * lands in the JS as a data URI: the bundle carries ~250 short paths, and a
 * browser only ever fetches the flags actually on screen. The `??` pattern
 * skips the package's regional extras (es-ct, gb-sct…), which are not ISO
 * codes and would fail the `people_country_shape` CHECK anyway.
 */
export const FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/??.svg", {
      query: "?url&no-inline",
      import: "default",
      eager: true,
    }),
  ).map(([path, url]) => [path.slice(-6, -4).toUpperCase(), url]),
);
