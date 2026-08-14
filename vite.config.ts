import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

// https://vite.dev/config/
export default defineConfig({
  server: { port: 3000 },
  resolve: {
    // Vite 8 reads the `paths` in tsconfig.app.json directly, so the "@" alias
    // is declared once, in TypeScript, rather than here as well.
    tsconfigPaths: true,
  },
  // Order is not cosmetic: tanstackStart() has to see the code before
  // viteReact() transforms it, and netlify() wraps Start's output.
  plugins: [tailwindcss(), tanstackStart(), netlify(), react()],
});
