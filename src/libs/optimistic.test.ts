import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { optimisticList, tempId } from "./optimistic";
import { makeQueryClient } from "./queryClient";

type Row = { id: number; body: string };
const key = ["check-rows"];

let queryClient: ReturnType<typeof makeQueryClient>;
let append: ReturnType<typeof optimisticList<string, Row>>;

beforeEach(() => {
  queryClient = makeQueryClient();
  append = optimisticList<string, Row>(queryClient, key, (rows, body) => [
    ...rows,
    { id: tempId(), body },
  ]);
});

afterEach(() => {
  // Each cached query holds a live gcTime timer, which would keep the process
  // running for ten minutes after the last assertion.
  queryClient.clear();
});

describe("optimisticList", () => {
  it("lands the patch in the cache before the request resolves", async () => {
    queryClient.setQueryData<Row[]>(key, [{ id: 1, body: "a" }]);
    await append.onMutate("b");
    expect(queryClient.getQueryData<Row[]>(key)?.map((r) => r.body)).toEqual([
      "a",
      "b",
    ]);
  });

  it("puts back exactly what was there on failure", async () => {
    queryClient.setQueryData<Row[]>(key, [{ id: 1, body: "a" }]);
    const ctx = await append.onMutate("b");
    append.onError(new Error("boom"), "b", ctx);
    expect(queryClient.getQueryData<Row[]>(key)).toEqual([
      { id: 1, body: "a" },
    ]);
  });

  it("starts from [] on an empty cache rather than throwing", async () => {
    await append.onMutate("first");
    expect(queryClient.getQueryData<Row[]>(key)?.map((r) => r.body)).toEqual([
      "first",
    ]);
  });
});

describe("tempId", () => {
  it("is always negative, so it can never collide with a real serial id", () => {
    expect(tempId()).toBeLessThan(0);
  });
});
