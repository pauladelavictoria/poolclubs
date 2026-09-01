import { describe, it, expect } from "vitest";
import { publicMeta } from "./publicMeta";

const get = (meta: ReturnType<typeof publicMeta>, key: string) =>
  meta.find((tag) => "property" in tag && tag.property === key)?.content;

describe("publicMeta", () => {
  it("keeps the brand in the tab title but drops it from the card title", () => {
    const meta = publicMeta({
      title: "Torneo apertura · PoolClubs",
      description: "PoolValencia. Inscripciones abiertas, doble eliminación.",
      path: "/tournaments/7",
      origin: "https://poolclubs.app",
      fallback: "tournaments",
    });

    expect(meta.find((tag) => "title" in tag)?.title).toBe(
      "Torneo apertura · PoolClubs",
    );
    // og:site_name already prints "PoolClubs" above the title in every card.
    expect(get(meta, "og:title")).toBe("Torneo apertura");
    expect(get(meta, "og:site_name")).toBe("PoolClubs");
  });

  it("leaves a title that only mentions the brand mid-string alone", () => {
    const meta = publicMeta({
      title: "Ejercicio · PoolClubs · algo",
      description: "x",
      path: "/drills/1",
      origin: "https://poolclubs.app",
      fallback: "drills",
    });
    expect(get(meta, "og:title")).toBe("Ejercicio · PoolClubs · algo");
  });
});
