import { describe, expect, it } from "vitest";
import { joinRequestMail, memberApprovedMail } from "./mailText";

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
