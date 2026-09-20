import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQuestions,
  parseOptions,
  resolveGenres,
  selectDryRunSample,
  shouldKeepExistingGenres,
} from "./classify-books-with-jev";

test("builds one shelf question and one question per optional tag", () => {
  const questions = buildQuestions();

  assert.equal(questions.broad_shelf.type, "choice");
  assert.equal(Object.keys(questions).length, 22);
});

test("keeps existing genres when the broad shelf is uncertain", () => {
  assert.equal(shouldKeepExistingGenres("fiction", 0.74), true);
  assert.equal(shouldKeepExistingGenres("other", 0.99), true);
  assert.equal(shouldKeepExistingGenres("nonfiction", 0.75), false);
});

test("keeps only tags above the threshold", () => {
  const genres = resolveGenres(
    "nonfiction",
    [
      { key: "biography", label: "Biography", probability: 0.95 },
      { key: "business", label: "Business", probability: 0.8 },
      { key: "history", label: "History", probability: 0.7 },
    ],
    ["Business"],
  );

  assert.deepEqual(genres, ["Nonfiction", "Biography", "Business"]);
});

test("requires the full-catalog flag before writes", () => {
  assert.throws(() => parseOptions(["--write"]), /requires --all/);
  assert.equal(parseOptions(["--write", "--all"]).write, true);
});

test("selects a deterministic, duplicate-free dry-run sample", () => {
  const books = Array.from({ length: 20 }, (_, index) => ({
    id: String(index),
    title: `Book ${index}`,
    author: "Author",
    description: "Description",
    genre: index === 19 ? ["Misc"] : ["Fiction"],
    _recommendation_count: index,
  }));

  const first = selectDryRunSample(books, 10);
  const second = selectDryRunSample(books, 10);

  assert.equal(first.length, 10);
  assert.equal(new Set(first.map((book) => book.id)).size, 10);
  assert.deepEqual(
    first.map((book) => book.id),
    second.map((book) => book.id),
  );
  assert.ok(first.some((book) => book.genre.includes("Misc")));
});
