/**
 * Self-check for the optimistic-mutation helper. No test runner in this project:
 *   node src/libs/optimistic.check.ts
 */
import assert from "node:assert/strict";
import { optimisticList, tempId } from "./optimistic.ts";
import { makeQueryClient } from "./queryClient.ts";

type Row = { id: number; body: string };
const queryClient = makeQueryClient();
const key = ["check-rows"];
const seed = () => queryClient.setQueryData<Row[]>(key, [{ id: 1, body: "a" }]);

const append = optimisticList<string, Row>(queryClient, key, (rows, body) => [
  ...rows,
  { id: tempId(), body },
]);

// The patch lands in the cache before the request resolves
seed();
const ctx = await append.onMutate("b");
assert.deepEqual(
  queryClient.getQueryData<Row[]>(key)?.map((r) => r.body),
  ["a", "b"],
);

// ...and a failure puts back exactly what was there
append.onError(new Error("boom"), "b", ctx);
assert.deepEqual(queryClient.getQueryData<Row[]>(key), [{ id: 1, body: "a" }]);

// A patch on an empty cache starts from [] rather than throwing
queryClient.removeQueries({ queryKey: key });
await append.onMutate("first");
assert.deepEqual(
  queryClient.getQueryData<Row[]>(key)?.map((r) => r.body),
  ["first"],
);

// Temp ids are negative, so they can never collide with a real serial id
assert.ok(tempId() < 0);

// Each cached query holds a live gcTime timer, which would keep node running
// for ten minutes after the last assertion.
queryClient.clear();

console.log("optimistic: ok");
