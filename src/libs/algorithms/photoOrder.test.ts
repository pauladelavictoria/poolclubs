import { describe, expect, it } from "vitest";
import { moveItem, orderPhotos } from "./photoOrder";

const photos = (...paths: string[]) => paths.map((path) => ({ path }));
const paths = (list: { path: string }[]) => list.map((p) => p.path);

describe("orderPhotos", () => {
  const bucket = photos("a.jpg", "b.jpg", "c.jpg");

  it("follows the stored order", () => {
    expect(paths(orderPhotos(bucket, ["c.jpg", "a.jpg", "b.jpg"]))).toEqual([
      "c.jpg",
      "a.jpg",
      "b.jpg",
    ]);
  });

  it("falls back to the bucket's own order when nothing is stored", () => {
    // Which is chronological: object names carry a millisecond prefix.
    for (const empty of [[], null, undefined, "nonsense", 42, {}])
      expect(paths(orderPhotos(bucket, empty))).toEqual([
        "a.jpg",
        "b.jpg",
        "c.jpg",
      ]);
  });

  it("drops an entry whose photo has been deleted from the bucket", () => {
    // The reason deleting a photo needs no write to the club row.
    expect(paths(orderPhotos(bucket, ["gone.jpg", "c.jpg", "a.jpg"]))).toEqual([
      "c.jpg",
      "a.jpg",
      "b.jpg",
    ]);
  });

  it("appends a photo the order has never heard of", () => {
    // The reason uploading needs no write either. New ones land at the end, so
    // an upload never silently steals the cover.
    expect(paths(orderPhotos(bucket, ["c.jpg"]))).toEqual([
      "c.jpg",
      "a.jpg",
      "b.jpg",
    ]);
  });

  it("ignores duplicates and non-strings in the stored order", () => {
    expect(
      paths(orderPhotos(bucket, ["b.jpg", "b.jpg", 7, null, "a.jpg"])),
    ).toEqual(["b.jpg", "a.jpg", "c.jpg"]);
  });

  it("returns every photo exactly once, whatever the order says", () => {
    for (const order of [[], ["c.jpg"], ["x", "b.jpg"], ["a.jpg", "a.jpg"]]) {
      const out = paths(orderPhotos(bucket, order));
      expect(out).toHaveLength(3);
      expect(new Set(out).size).toBe(3);
    }
  });

  it("is empty when the bucket is", () => {
    expect(orderPhotos([], ["a.jpg"])).toEqual([]);
  });
});

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves forwards and backwards", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
  });

  it("moves a photo to the front, which is what makes it the cover", () => {
    expect(moveItem(list, 2, 0)[0]).toBe("c");
  });

  it("does not mutate the input", () => {
    const original = [...list];
    moveItem(list, 0, 3);
    expect(list).toEqual(original);
  });

  it("returns the list unchanged for a no-op or an out-of-range index", () => {
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, -1, 0)).toBe(list);
    expect(moveItem(list, 0, 9)).toBe(list);
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});
