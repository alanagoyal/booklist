import assert from "node:assert/strict";
import test from "node:test";

import { fetchRelatedBooks } from "./fetch-related-books";

test("fetches related books in bounded batches and combines the keyed objects", async () => {
  const calls: string[][] = [];
  const supabase = {
    async rpc(_name: string, params: Record<string, unknown>) {
      const ids = params.book_ids as string[];
      calls.push(ids);
      return {
        data: Object.fromEntries(ids.map((id) => [id, [{ id: `related-${id}` }]])),
        error: null,
      };
    },
  };

  const result = await fetchRelatedBooks(supabase, ["a", "b", "c", "d", "e"], 2);

  assert.deepEqual(calls, [["a", "b"], ["c", "d"], ["e"]]);
  assert.deepEqual(Object.keys(result), ["a", "b", "c", "d", "e"]);
});

test("accepts a null payload when a batch has no related books", async () => {
  const supabase = {
    async rpc() {
      return { data: null, error: null };
    },
  };

  assert.deepEqual(await fetchRelatedBooks(supabase, ["a"]), {});
});

test("throws instead of returning partial data when a batch fails", async () => {
  let callCount = 0;
  const supabase = {
    async rpc() {
      callCount += 1;
      return callCount === 1
        ? { data: { a: [] }, error: null }
        : {
            data: null,
            error: { code: "57014", message: "canceling statement due to statement timeout" },
          };
    },
  };

  await assert.rejects(
    fetchRelatedBooks(supabase, ["a", "b"], 1),
    /get_related_books batch 2\/2 failed: 57014 canceling statement due to statement timeout/
  );
});

test("rejects a response that does not match the object-keyed RPC shape", async () => {
  const supabase = {
    async rpc() {
      return { data: [], error: null };
    },
  };

  await assert.rejects(
    fetchRelatedBooks(supabase, ["a"]),
    /returned an unexpected payload/
  );
});
