-- Contact, opening hours and a free-form blurb for the club's own page.
--
-- Apply with `npm run db:sql sql/club-details.sql`, then `npm run db:dump`
-- and `npm run db:types`. See sql/README.md.
ALTER TABLE public.clubs
    -- However the admin wants to be reached — phone, WhatsApp, email as text.
    -- No format enforced: a club that only takes WhatsApp shouldn't be made
    -- to type a phone number shape it doesn't have.
    ADD COLUMN IF NOT EXISTS phone text,
    -- Pricing, house rules, anything that doesn't have its own field yet.
    ADD COLUMN IF NOT EXISTS description text,
    -- One key per day (mon..sun), free text ("10:00-22:00", "Cerrado"), or
    -- the day left out entirely when the admin hasn't said anything about it.
    -- jsonb rather than seven columns because the form and the reader always
    -- want the whole week at once, never one day pulled out on its own.
    ADD COLUMN IF NOT EXISTS schedule jsonb DEFAULT '{}'::jsonb NOT NULL,
    -- Whether only members get to play, or anyone can walk in and pay by the
    -- table or the hour. Purely informational — nothing in RLS reads this —
    -- and deliberately its own column rather than reusing is_public: that one
    -- is "does this club appear in the public directory", a website-listing
    -- choice, not a business-model one. A club can be members-only and still
    -- unlisted, or open-to-the-public and still choose not to be listed.
    ADD COLUMN IF NOT EXISTS members_only boolean DEFAULT true NOT NULL;

-- No new RLS policy needed: "Owner can update club" already covers every
-- column of an UPDATE, and "Members can view their clubs" already covers
-- every column of a SELECT — same as club-location.sql.
--
-- Not granted to anon: unlike address/city/country, these live only on the
-- club's own private page for now, not the public directory at /clubs.
