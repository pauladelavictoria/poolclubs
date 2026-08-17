-- A club's identity in the URL: /app/paulas-pool/ranking, not /app/12/ranking.
--
-- Apply with `npm run db:sql sql/club-slug.sql`, then `npm run db:dump` and
-- `npm run db:types`. See sql/README.md.
--
-- The slug is generated here rather than in the app because it is written once,
-- at insert, and then never again: every link and every bookmark points at it,
-- so renaming a club must not move its URL. src/libs/slug.ts is the app's copy
-- of these rules — it predicts what this file produces so forms can validate
-- before submitting — and src/libs/slug.check.ts asserts the two agree. Change
-- one, change both.

ALTER TABLE public.clubs ADD COLUMN slug text;

-- Segments that are already routes under /app. /app/login, /app/join/:code and
-- /app/clubs/new are static siblings of /app/:clubSlug and a static segment
-- wins the match, so a club slugged "login" would be permanently unreachable.
-- One function, because both the trigger and the CHECK below need this list and
-- two copies of it would drift.
CREATE OR REPLACE FUNCTION public.club_slug_reserved()
    RETURNS text[]
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    AS $$
    SELECT ARRAY['login', 'logout', 'join', 'clubs', 'me', 'auth', 'api']
$$;

-- Mirrors slugify() in src/libs/slug.ts, step for step.
--
-- translate() rather than the `unaccent` extension: unaccent is not enabled on
-- this project, and a fixed table is something TypeScript can reproduce
-- exactly. ß is handled before the table because it is the one letter that
-- widens to two rather than folding to one.
CREATE OR REPLACE FUNCTION public.slugify(txt text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    PARALLEL SAFE
    AS $$
    SELECT COALESCE(NULLIF(
        trim(BOTH '-' FROM
            regexp_replace(
                -- Apostrophes vanish rather than separating, so "Paula's Pool"
                -- is paulas-pool and not paula-s-pool.
                regexp_replace(
                    translate(
                        replace(lower(txt), 'ß', 'ss'),
                        'àáäâãåāèéëêēìíïîīòóöôõøōùúüûūñçÿýž',
                        'aaaaaaaeeeeeiiiiiooooooouuuuuncyyz'
                    ),
                    '[''’]', '', 'g'
                ),
                '[^a-z0-9]+', '-', 'g'
            )
        ), ''),
        -- A name of nothing but punctuation still needs a slug, and the CHECK
        -- below requires it to start with an alphanumeric.
        'club')
$$;

-- Backfill. Duplicates and reserved words take the club's id as a suffix,
-- which is guaranteed unique and keeps the slug readable.
WITH ranked AS (
    SELECT
        id,
        public.slugify(name) AS base,
        row_number() OVER (PARTITION BY public.slugify(name) ORDER BY id) AS rn
    FROM public.clubs
)
UPDATE public.clubs c
SET slug = CASE
    WHEN r.rn > 1 OR r.base = ANY (public.club_slug_reserved())
        THEN r.base || '-' || c.id
    ELSE r.base
END
FROM ranked r
WHERE r.id = c.id;

ALTER TABLE public.clubs ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX clubs_slug_key ON public.clubs (slug);

ALTER TABLE public.clubs
    ADD CONSTRAINT clubs_slug_shape CHECK (
        slug ~ '^[a-z0-9][a-z0-9-]*$'
        AND NOT (slug = ANY (public.club_slug_reserved()))
    );

-- New clubs get their slug from the trigger, not from create_club(), so the
-- existing SECURITY DEFINER function needs no change: whatever inserts a club
-- gets a slug. NEW.id is already populated here — column defaults are applied
-- before BEFORE ROW triggers fire.
CREATE OR REPLACE FUNCTION public.clubs_set_slug()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    base text;
BEGIN
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
        RETURN NEW;
    END IF;

    base := public.slugify(NEW.name);

    IF base = ANY (public.club_slug_reserved())
        OR EXISTS (SELECT 1 FROM public.clubs WHERE slug = base AND id <> NEW.id)
    THEN
        NEW.slug := base || '-' || NEW.id;
    ELSE
        NEW.slug := base;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER clubs_set_slug
    BEFORE INSERT ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION public.clubs_set_slug();

-- No RLS change. Resolving a slug to a club happens in memory from the rows the
-- member already reads (players joined to clubs), so nothing here needs to read
-- a club it is not a member of.
