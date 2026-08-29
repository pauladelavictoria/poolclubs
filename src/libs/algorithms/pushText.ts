import es from "@/i18n/es.json";
import en from "@/i18n/en.json";
import fr from "@/i18n/fr.json";

/**
 * The i18n dictionaries, for code that has no React around it.
 *
 * A push is written by the *sender's* server request but read by the recipient,
 * so the language cannot come from this request's cookie the way useT does —
 * it comes off the recipient's own subscription row (push_subscriptions.lang,
 * recorded when they subscribed). Hence a lookup by language rather than a hook.
 *
 * `fill` is three lines copied from src/i18n/index.tsx rather than exported from
 * it, because that module is a React context and this one is imported by a
 * server function.
 */
const DICTS: Record<string, Record<string, string>> = { es, en, fr };

export type PushKey = keyof typeof es;

export const pushText = (
  lang: string,
  key: PushKey,
  vars?: Record<string, string>,
) => {
  const text = (DICTS[lang] ?? DICTS.es)[key] ?? es[key];
  return vars
    ? text.replace(/\{(\w+)\}/g, (match, name) => vars[name] ?? match)
    : text;
};
