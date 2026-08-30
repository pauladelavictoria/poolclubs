import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nProvider } from "@/i18n";

/**
 * Wraps a component under test in `<I18nProvider>`, since `useT()` falls back
 * to a hardcoded Spanish default outside one. A test file that renders
 * something using `useT()` should also `vi.mock("@/i18n", ...)` with
 * `mockI18nModule` (see ./mockI18n.ts) so this provider resolves to English
 * rather than crashing on the isomorphic cookie read.
 */
export function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { wrapper: I18nProvider, ...options });
}

export * from "@testing-library/react";
