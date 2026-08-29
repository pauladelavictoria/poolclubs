import type { ReactNode } from "react";
import en from "@/i18n/en.json";

/**
 * A plain, English-only stand-in for `useT()`/`I18nProvider`.
 *
 * The real `I18nProvider` detects the language via libs/prefs'
 * `createIsomorphicFn`, which reads a cookie. Outside the TanStack Start
 * compiler (which vitest.config.ts deliberately doesn't load — see the
 * comment there), that helper's uncompiled fallback always resolves to its
 * `.server()` branch, which needs a request AsyncLocalStorage jsdom does not
 * have, and throws. Replacing both sidesteps that plumbing entirely.
 *
 * Call from a test file's own `vi.mock("@/i18n", ...)` — `vi.mock` factories
 * only take effect for the file that calls them (and whatever it imports),
 * not globally from vitest.setup.ts, so this cannot be registered once there.
 */
export function mockI18nModule<T extends object>(actual: T) {
  const dict = en as Record<string, string>;
  const fill = (text: string, vars?: Record<string, string | number>) =>
    vars
      ? text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match))
      : text;

  return {
    ...actual,
    I18nProvider: ({ children }: { children: ReactNode }) => children,
    useT: () => ({
      lang: "en" as const,
      locale: "en-GB",
      setLang: () => {},
      t: (key: string, vars?: Record<string, string | number>) =>
        fill(dict[key] ?? key, vars),
    }),
  };
}
