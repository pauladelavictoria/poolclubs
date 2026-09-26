/**
 * Plain REST wrapper for the YouTube Live Streaming API — no `googleapis`
 * dependency, per docs/youtube-streaming.md's Decisions table: the whole
 * integration is `fetch` plus a token POST. Used by both the admin "create a
 * stream" action (youtube.functions.ts) and the reconciler
 * (netlify/functions/youtube-reconcile.mts).
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/youtube/v3";

/** A club's stored refresh_token_enc, decrypted, traded for a short-lived
 *  access token. Never cached — one call per reconcile tick per club is a
 *  1-unit-class request, nowhere near the quota (§2.1a). */
export async function refreshYoutubeAccessToken(
  refreshToken: string,
): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("YouTube OAuth is not configured");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok)
    throw new Error(`youtube: token refresh failed: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function youtubeFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`youtube: ${path} failed: ${await res.text()}`);
  // The two DELETE-shaped calls below (transition, bind) return 200 with a
  // body; only deleteYoutubeStream sends no content, and it never calls this.
  return res.json();
}

/** contentDetails.isReusable — see the doc's Decisions table: one stream key
 *  pasted into OBS once, bound to many broadcasts over the camera's life. */
export async function createReusableStream(
  accessToken: string,
  title: string,
): Promise<{ streamId: string; ingestionAddress: string; streamKey: string }> {
  const stream = await youtubeFetch(
    accessToken,
    "/liveStreams?part=snippet,cdn,contentDetails",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: { title },
        cdn: {
          frameRate: "variable",
          ingestionType: "rtmp",
          resolution: "variable",
        },
        contentDetails: { isReusable: true },
      }),
    },
  );
  return {
    streamId: stream.id,
    ingestionAddress: stream.cdn.ingestionInfo.ingestionAddress,
    streamKey: stream.cdn.ingestionInfo.streamName,
  };
}

export async function deleteYoutubeStream(
  accessToken: string,
  streamId: string,
) {
  await fetch(`${API}/liveStreams?id=${streamId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

/** liveBroadcasts.delete. A broadcast already gone (404) counts as deleted:
 *  the point is that it is not on the channel. */
export async function deleteBroadcast(
  accessToken: string,
  broadcastId: string,
) {
  const res = await fetch(`${API}/liveBroadcasts?id=${broadcastId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404)
    throw new Error(`youtube: delete broadcast failed: ${await res.text()}`);
}

/** §2.1: liveBroadcasts.insert. scheduledStartTime is required by the API but
 *  otherwise unused here — the reconciler transitions to live by hand once
 *  the encoder is actually connected, not on a timer. */
export async function insertBroadcast(
  accessToken: string,
  title: string,
  privacyStatus: "public" | "unlisted",
): Promise<string> {
  const broadcast = await youtubeFetch(
    accessToken,
    "/liveBroadcasts?part=snippet,status",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: { title, scheduledStartTime: new Date().toISOString() },
        status: { privacyStatus },
      }),
    },
  );
  return broadcast.id;
}

export async function bindBroadcast(
  accessToken: string,
  broadcastId: string,
  streamId: string,
) {
  await youtubeFetch(
    accessToken,
    `/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=id`,
    { method: "POST" },
  );
}

/** liveStreams.list, the 1-unit poll the doc's quota section leans on (§2.1a)
 *  — one call for every stream asked about, so a club's whole room costs what
 *  one table does. The raw streamStatus ("active", "ready", "inactive",
 *  "error"…) by stream id, not a boolean, so the reconciler can log what
 *  YouTube actually said; a stream YouTube doesn't know is simply absent. */
export async function streamStatuses(
  accessToken: string,
  streamIds: string[],
): Promise<Map<string, string>> {
  const res = await youtubeFetch(
    accessToken,
    `/liveStreams?part=status&maxResults=50&id=${streamIds.join(",")}`,
  );
  return new Map(
    (res.items ?? []).map(
      (item: { id: string; status?: { streamStatus?: string } }) => [
        item.id,
        item.status?.streamStatus ?? "",
      ],
    ),
  );
}

export async function transitionBroadcast(
  accessToken: string,
  broadcastId: string,
  status: "live" | "complete",
) {
  await youtubeFetch(
    accessToken,
    `/liveBroadcasts/transition?broadcastStatus=${status}&id=${broadcastId}&part=id`,
    { method: "POST" },
  );
}
