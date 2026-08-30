-- Photos of the venue, for a club's public page.
--
-- TWO STEPS, and the first one is not in this file.
--
-- 1. Create the bucket by hand, Storage → New bucket in the dashboard:
--
--        name:               club-photos
--        public:             yes
--        file size limit:    1 MB
--        allowed MIME types: image/jpeg
--
--    There is no migration runner here (see sql/README.md) and a bucket is a
--    row in storage.buckets that the dashboard owns. `public: yes` is what makes
--    getPublicUrl work for a visitor with no account; it does NOT make the
--    bucket writable, which is what the policies below are for.
--
--    The 1 MB limit is a backstop, not the budget: the browser shrinks every
--    photo to ~300 KB before upload (src/libs/browser/photoImage.ts). It is here
--    so a bug in that code cannot fill the bucket.
--
-- 2. Apply this file: `npm run db:sql sql/club-photos.sql`.
--
-- No `npm run db:types` is needed and no table is added — see the note below.
--
-- ---------------------------------------------------------------------------
-- Why there is no club_photos table
-- ---------------------------------------------------------------------------
-- Storage already keeps a row per object with a name and a created_at, and
-- `storage.list()` returns both. A table alongside it would restate that and
-- add a way for the two to disagree — an object deleted with its row left
-- behind is a broken <img> nobody can remove from the UI.
--
-- The path carries everything the app needs to know:
--
--     club-{club_id}/{unix_ms}-{uuid}.jpg
--
-- The club id is the folder, which is what the policies below authorise on, and
-- the millisecond prefix makes a plain name sort chronological — so "oldest
-- first" is `list({ sortBy: { column: "name" } })` and costs nothing.
--
-- ponytail: the one thing this cannot do is arbitrary reordering, which would
-- mean renaming objects. If a club ever asks to choose which photo leads, that
-- is when a table with a sort_order earns its place. Until then it is a second
-- source of truth for a gallery of eight pictures.

BEGIN;

-- ---------------------------------------------------------------------------
-- Who owns a path
-- ---------------------------------------------------------------------------
-- The first path segment is `club-{id}`. storage.foldername() splits the object
-- name on "/" and returns the parts, so [1] is that folder in Postgres' 1-based
-- arrays. Anything that is not exactly `club-<digits>` yields NULL and every
-- policy below then fails closed.
--
-- STRICT so a NULL argument short-circuits, and no SECURITY DEFINER: it reads
-- nothing, it only parses. STABLE rather than IMMUTABLE despite being pure text
-- arithmetic, because it calls storage.foldername() and a function must not
-- claim a stronger guarantee than the one it delegates to. Nothing here needs
-- IMMUTABLE anyway — that buys index and generated-column use, and this is only
-- ever called from a policy predicate.
CREATE OR REPLACE FUNCTION public.club_photo_club_id("object_name" text)
RETURNS integer
LANGUAGE "sql" STABLE STRICT
SET "search_path" TO 'public'
AS $$
  SELECT CASE
    WHEN (storage.foldername(object_name))[1] ~ '^club-\d+$'
    THEN substring((storage.foldername(object_name))[1] from 6)::integer
  END;
$$;

ALTER FUNCTION public.club_photo_club_id(text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.club_photo_club_id(text) TO anon;
GRANT ALL ON FUNCTION public.club_photo_club_id(text) TO authenticated;
GRANT ALL ON FUNCTION public.club_photo_club_id(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Policies on storage.objects, scoped to this bucket
-- ---------------------------------------------------------------------------
-- Every one of them names bucket_id first, so nothing here can widen access to
-- any other bucket that gets created later.

-- Reading. A public bucket serves bytes over its public URL without consulting
-- RLS at all — this policy is what lets the app *enumerate* a club's folder, so
-- the page can know which photos exist. Restricted to public clubs, so a
-- private club's gallery is not listable by a stranger even though the objects
-- themselves are reachable by anyone holding a URL.
--
-- Say that plainly, because it is the security boundary and it is not obvious:
-- THE OBJECTS IN THIS BUCKET ARE NOT SECRET. Anyone with the URL can fetch one,
-- including for a club that later goes private. Do not put anything in here
-- that is not intended to be on the open web.
DROP POLICY IF EXISTS "Club photos are listable for public clubs" ON storage.objects;
CREATE POLICY "Club photos are listable for public clubs" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (
        bucket_id = 'club-photos'
        AND public.is_public_club(public.club_photo_club_id(name))
    );

-- Members of a club can list its photos whether or not it is public — the
-- gallery is on the club's own settings page too, and a private club still has
-- one. is_club_member is the same predicate the rest of the schema uses.
DROP POLICY IF EXISTS "Members can list their club's photos" ON storage.objects;
CREATE POLICY "Members can list their club's photos" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'club-photos'
        AND public.is_club_member(public.club_photo_club_id(name))
    );

-- Writing. Admin only, and only into their own club's folder. The WITH CHECK is
-- what pins the path: without it an admin of club 3 could upload into club-9.
DROP POLICY IF EXISTS "Club admins can add photos" ON storage.objects;
CREATE POLICY "Club admins can add photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'club-photos'
        AND public.is_club_admin(public.club_photo_club_id(name))
    );

DROP POLICY IF EXISTS "Club admins can remove photos" ON storage.objects;
CREATE POLICY "Club admins can remove photos" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'club-photos'
        AND public.is_club_admin(public.club_photo_club_id(name))
    );

-- Deliberately no UPDATE policy. Replacing a photo is a delete and an upload,
-- which is one fewer thing to authorise and leaves no way to swap the bytes
-- under a URL somebody has already seen.

COMMIT;
