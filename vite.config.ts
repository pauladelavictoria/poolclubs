import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // VAPID_PRIVATE_KEY is deliberately not VITE_-prefixed — Vite inlines every
  // import.meta.env.VITE_* into the client bundle, and a push signing key must
  // never ship to a browser. The cost of that is that Vite will not expose it
  // either, so the dev server has to hand it to process.env itself, which is
  // where libs/push.functions.ts reads it. On Netlify the platform already has.
  process.env.VAPID_PRIVATE_KEY ??= loadEnv(
    mode,
    process.cwd(),
    "",
  ).VAPID_PRIVATE_KEY;

  return {
    server: { port: 3000 },
    // Vite's default is `baseline-widely-available` (~Chrome 107), which an old
    // Android tablet on the club's rail does not meet. chrome87 is roughly
    // ES2020: optional chaining, nullish coalescing and logical assignment still
    // ship native, only newer syntax gets compiled down, so the cost to everyone
    // else is small. Runtime *methods* are a separate problem — libs/polyfills.ts.
    build: { target: "chrome87" },
    resolve: {
      // Vite 8 reads the `paths` in tsconfig.app.json directly, so the "@" alias
      // is declared once, in TypeScript, rather than here as well.
      tsconfigPaths: true,
    },
    // Order is not cosmetic: tanstackStart() has to see the code before
    // viteReact() transforms it, and netlify() wraps Start's output.
    plugins: [tailwindcss(), tanstackStart(), netlify(), react()],
  };
});
