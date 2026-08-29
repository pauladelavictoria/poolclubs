/**
 * Fixture generation, advancement, numbering and the podium — four concerns
 * that used to share one 611-line file. Split for navigation and per-concern
 * testing (generate.test.ts, resolve.test.ts, numbering.test.ts,
 * podium.test.ts); re-exported from here because most call sites — a
 * tournament page renders a resolved, numbered bracket with race lengths and
 * a podium all at once — genuinely need more than one concern together.
 */
export * from "./generate";
export * from "./resolve";
export * from "./numbering";
export * from "./podium";
