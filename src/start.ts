import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

/**
 * Server functions are same-origin RPC endpoints, and sign-in, sign-up and
 * sign-out are all server functions now — so they need the origin check a form
 * post would otherwise get for free. Without this Start logs a warning at
 * startup and the endpoints accept cross-site requests.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
