import { describe, expect, it } from "vitest";
import {
  clubApprovedMail,
  clubClaimMail,
  clubRequestMail,
  joinRequestMail,
  memberApprovedMail,
} from "./mailText";

const mail = (over: Partial<Parameters<typeof memberApprovedMail>[0]> = {}) =>
  memberApprovedMail({
    name: "Ana",
    clubName: "Billar de los jueves",
    clubSlug: "billar-jueves",
    ...over,
  });

describe("memberApprovedMail", () => {
  it("names the club in the subject, because that is what the mail is about", () => {
    expect(mail().subject).toBe("Ya eres miembro de Billar de los jueves");
  });

  it("links to the club, not to /app", () => {
    const url = "https://poolclubs.app/app/billar-jueves";
    expect(mail().html).toContain(`href="${url}"`);
    expect(mail().text).toContain(url);
  });

  it("carries the same link in the plain text alternative", () => {
    const { text, html } = mail();
    expect(text).toContain("Ana");
    expect(text).toContain("Billar de los jueves");
    // No markup leaking into the text part.
    expect(text).not.toContain("<");
    expect(html).toContain("<table");
  });

  it("escapes a club name that contains markup", () => {
    // Club and person names are typed by people and land inside HTML. This is
    // the case that would otherwise put an attacker's tag in somebody's inbox.
    const html = mail({ clubName: '<script>alert("x")</script>' }).html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes a quote in a name without breaking the attribute around it", () => {
    const html = mail({ name: 'Ana "La Reina" O\'Brien' }).html;
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");
  });

  it("percent-encodes the slug it puts in the URL", () => {
    // Slugs are constrained to [a-z0-9-] by a CHECK, so this can only happen if
    // that constraint is ever relaxed — at which point a raw slug would be a
    // way to point the button somewhere else.
    expect(mail({ clubSlug: "a/../b" }).html).toContain(
      "https://poolclubs.app/app/a%2F..%2Fb",
    );
  });

  it("leaves the subject unescaped — it is not HTML", () => {
    expect(mail({ clubName: "Ases & Bolas" }).subject).toBe(
      "Ya eres miembro de Ases & Bolas",
    );
  });
});

const request = (over: Partial<Parameters<typeof joinRequestMail>[0]> = {}) =>
  joinRequestMail({
    name: "Ana",
    clubName: "Billar de los jueves",
    clubSlug: "billar-jueves",
    ...over,
  });

describe("joinRequestMail", () => {
  it("names who is asking and which club, because that is the decision", () => {
    expect(request().subject).toBe("Ana quiere entrar en Billar de los jueves");
  });

  it("links to the club, where the approve button lives", () => {
    const url = "https://poolclubs.app/app/billar-jueves";
    expect(request().html).toContain(`href="${url}"`);
    expect(request().text).toContain(url);
  });

  it("tells the admin why they are getting it, not the requester's version", () => {
    const { text } = request();
    expect(text).toContain("administras este club");
    expect(text).not.toContain("<");
  });

  it("escapes a requester name that contains markup", () => {
    // The one field an attacker controls: they type their own display name at
    // join time and it lands in a club admin's inbox.
    const html = request({ name: '<script>alert("x")</script>' }).html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

const claim = (over: Partial<Parameters<typeof clubClaimMail>[0]> = {}) =>
  clubClaimMail({
    name: "Ana",
    email: "ana@example.com",
    clubName: "C.B. Granollers",
    clubSlug: "c-b-granollers",
    ...over,
  });

describe("clubClaimMail", () => {
  it("names who is claiming and which club, because that is the whole mail", () => {
    expect(claim().subject).toBe("Ana reclama C.B. Granollers");
  });

  it("carries the address the club has to be transferred to", () => {
    const { text, html } = claim();
    expect(text).toContain("ana@example.com");
    expect(html).toContain("ana@example.com");
  });

  it("links to the public club page, which is the one both sides have seen", () => {
    const url = "https://poolclubs.app/clubs/c-b-granollers";
    expect(claim().html).toContain(`href="${url}"`);
    expect(claim().text).toContain(url);
  });

  it("escapes a claimer's name and address, both typed by them", () => {
    const html = claim({
      name: '<script>alert("x")</script>',
      email: '"><b>x</b>@example.com',
    }).html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
  });
});

const newClub = (over: Partial<Parameters<typeof clubRequestMail>[0]> = {}) =>
  clubRequestMail({
    name: "Ana",
    email: "ana@example.com",
    clubName: "Billar de los jueves",
    city: "Girona",
    country: "ES",
    note: "Seis mesas, unos 40 socios.",
    ...over,
  });

describe("clubRequestMail", () => {
  it("says who wants what, in the subject", () => {
    expect(newClub().subject).toBe("Ana pide dar de alta Billar de los jueves");
  });

  it("links to the operator page, where the Approve button is", () => {
    const url = "https://poolclubs.app/app/ops";
    expect(newClub().html).toContain(`href="${url}"`);
    expect(newClub().text).toContain(url);
  });

  it("carries the place and the note, so the request can be judged without a reply", () => {
    const { text, html } = newClub();
    expect(text).toContain("Girona, ES");
    expect(text).toContain("Seis mesas");
    expect(html).toContain("Girona, ES");
  });

  it("reads correctly with neither place nor note, which are both optional", () => {
    const { text } = newClub({ city: null, country: null, note: null });
    expect(text).toContain("Ana (ana@example.com) pide que se dé de alta");
    expect(text).not.toContain("()");
  });

  it("escapes the name, the address, the club and the note — every one of them typed by the requester", () => {
    const html = newClub({
      name: "<script>alert(1)</script>",
      email: '"><b>x</b>@example.com',
      clubName: "<i>club</i>",
      note: "<img src=x onerror=1>",
    }).html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>");
    // Not a bare "<img": the layout's own logo is one.
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
});

const approved = (over: Partial<Parameters<typeof clubApprovedMail>[0]> = {}) =>
  clubApprovedMail({
    name: "Ana",
    clubName: "Billar de los jueves",
    clubSlug: "billar-jueves",
    ...over,
  });

describe("clubApprovedMail", () => {
  it("leads with the club, which is the news", () => {
    expect(approved().subject).toBe("Billar de los jueves ya está en PoolClubs");
  });

  it("links to the club itself, the first thing they have to open", () => {
    const url = "https://poolclubs.app/app/billar-jueves";
    expect(approved().html).toContain(`href="${url}"`);
    expect(approved().text).toContain(url);
  });

  it("keeps markup out of the plain text alternative", () => {
    expect(approved().text).not.toContain("<");
  });

  it("escapes a club name the requester chose", () => {
    const html = approved({ clubName: "<script>alert(1)</script>" }).html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
