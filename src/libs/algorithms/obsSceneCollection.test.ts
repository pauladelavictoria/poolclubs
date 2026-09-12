import { describe, expect, it } from "vitest";
import { buildObsSceneCollection } from "./obsSceneCollection";

/**
 * A regression snapshot, not a correctness proof: nothing here has been
 * checked against a real OBS import/export round trip, because this repo has
 * no OBS install to test against — see the doc comment on the generator and
 * docs/youtube-streaming.md's open question #3. This test only catches an
 * accidental future change to the shape; it cannot catch a shape that was
 * wrong from the start.
 */
describe("buildObsSceneCollection", () => {
  it("emits one camera, one overlay and one scene source per table", () => {
    const collection = buildObsSceneCollection({
      clubName: "El Billar",
      clubSlug: "el-billar",
      tables: [
        { id: 1, label: "Mesa 1" },
        { id: 2, label: "Mesa 2" },
      ],
      origin: "https://poolclubs.example",
    });

    expect(collection.scene_order).toEqual([
      { name: "Mesa 1" },
      { name: "Mesa 2" },
    ]);
    expect(collection.sources).toHaveLength(6);

    const overlay = collection.sources.find(
      (s) => s.id === "browser_source" && s.name === "Mesa 1 — Overlay",
    );
    expect(overlay?.settings).toMatchObject({
      url: "https://poolclubs.example/overlay/table/el-billar/1",
      width: 1920,
      height: 1080,
      shutdown: false,
      restart_when_active: true,
    });

    const scene = collection.sources.find((s) => s.name === "Mesa 2");
    expect(scene?.id).toBe("scene");
    expect(scene?.settings).toMatchObject({
      items: [
        { name: "Mesa 2 — Camera" },
        { name: "Mesa 2 — Overlay" },
      ],
    });
  });

  it("never puts the stream key or any credential in the file", () => {
    const collection = buildObsSceneCollection({
      clubName: "El Billar",
      clubSlug: "el-billar",
      tables: [{ id: 1, label: "Mesa 1" }],
      origin: "https://poolclubs.example",
    });

    // Not a bare /key/i: OBS's own "hotkeys" field would trip that on every
    // source. What must never appear is an actual credential or RTMP detail.
    expect(JSON.stringify(collection)).not.toMatch(
      /stream_key|rtmp:\/\/|access_token/i,
    );
  });

  it("handles a club with no tables yet", () => {
    const collection = buildObsSceneCollection({
      clubName: "El Billar",
      clubSlug: "el-billar",
      tables: [],
      origin: "https://poolclubs.example",
    });

    expect(collection.sources).toEqual([]);
    expect(collection.scene_order).toEqual([]);
    expect(collection.current_scene).toBe("");
  });
});
