import { describe, expect, it } from "vitest";
import {
  applyMention,
  matchMentions,
  mentionDraft,
  mentionedSlugs,
  splitMentions,
} from "@/libs/algorithms/mentions";

describe("mentionedSlugs", () => {
  it("reads slugs and drops repeats", () => {
    expect(mentionedSlugs("hey @ana-lopez and @ana-lopez, ask @luis")).toEqual([
      "ana-lopez",
      "luis",
    ]);
  });

  it("stops at punctuation and trailing hyphens", () => {
    expect(mentionedSlugs("@ana-lopez. @luis-")).toEqual(["ana-lopez", "luis"]);
  });

  it("finds nothing in a body with no mention", () => {
    expect(mentionedSlugs("great run at the table")).toEqual([]);
  });
});

describe("splitMentions", () => {
  it("keeps the text around the mentions", () => {
    expect(splitMentions("gg @ana!")).toEqual([
      { text: "gg " },
      { slug: "ana" },
      { text: "!" },
    ]);
  });
});

describe("mentionDraft", () => {
  it("opens on @ and follows the fragment", () => {
    expect(mentionDraft("nice @")).toBe("");
    expect(mentionDraft("nice @an")).toBe("an");
  });

  it("stays shut mid-word and after the mention is finished", () => {
    expect(mentionDraft("mail me at ana@club")).toBeNull();
    expect(mentionDraft("@ana played well")).toBeNull();
  });
});

describe("applyMention", () => {
  it("completes the fragment being typed", () => {
    expect(applyMention("nice @an", "ana-lopez")).toBe("nice @ana-lopez ");
  });
});

describe("matchMentions", () => {
  const roster = [
    { slug: "ana-lopez", name: "Ana López" },
    { slug: "luis-mora", name: "Luis Mora" },
  ];

  it("matches on slug or on name, and caps the list", () => {
    expect(matchMentions(roster, "mora").map((p) => p.slug)).toEqual([
      "luis-mora",
    ]);
    expect(matchMentions(roster, "ana").map((p) => p.slug)).toEqual([
      "ana-lopez",
    ]);
    expect(matchMentions(Array(9).fill(roster[0]), "ana")).toHaveLength(5);
  });
});
