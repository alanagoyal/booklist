import assert from "node:assert/strict";
import test from "node:test";
import { bookRow, personRow } from "./catalog";
import type { EssentialBook, FormattedRecommender } from "@/types";

test("book rows preserve filtering, ordering and counts without detail payloads", () => {
  const book: EssentialBook = {
    id: "book-1",
    title: "A Book",
    author: "An Author",
    description: "The complete description, including a searchable ending.",
    genres: ["History"],
    amazon_url: "https://example.com/book",
    _recommendation_count: 3,
    _bucket: 4,
    recommendation_percentile: 0.96,
    _background_color: "redundant CSS",
    recommendations: [
      {
        recommender: {
          id: "p1",
          full_name: "First Person",
          url: "https://example.com",
          type: "Founder",
        },
        source: "Interview",
        source_link: "https://example.com/interview",
      },
      { recommender: null, source: null, source_link: null },
      {
        recommender: {
          id: "p2",
          full_name: "Another Person",
          url: null,
          type: "Writer",
        },
        source: null,
        source_link: null,
      },
    ],
  };
  const row = bookRow(book);
  assert.equal(row.description, book.description);
  assert.equal(row.recommendations.length, book.recommendations.length);
  assert.deepEqual(row.recommendations, [
    { id: "p1", full_name: "First Person" },
    null,
    { id: "p2", full_name: "Another Person" },
  ]);
  assert.deepEqual(row.genres, book.genres);
  assert.equal(row._bucket, book._bucket);
  assert.equal(row.recommendation_percentile, book.recommendation_percentile);
  assert.equal("amazon_url" in row, false);
  assert.equal("_background_color" in row, false);
  assert.ok(!JSON.stringify(row).includes("source_link"));
});

test("people rows keep every recommendation title for filtering and the original count", () => {
  const person: FormattedRecommender = {
    id: "p1",
    full_name: "A Person",
    type: null,
    description: null,
    url: "https://example.com",
    _book_count: 7,
    _bucket: 3,
    recommendation_percentile: 0.91,
    recommendations: [
      {
        id: "b1",
        title: "A Book",
        author: "Author",
        description: "Detail only",
        genre: ["History"],
        amazon_url: null,
        source: "Interview",
        source_link: null,
      },
    ],
    related_recommenders: [],
    similar_recommenders: [],
  };
  const row = personRow(person);
  assert.deepEqual(row.recommendations, [{ id: "b1", title: "A Book" }]);
  assert.equal(row._book_count, 7);
  assert.equal(row.description, null);
  assert.equal("related_recommenders" in row, false);
  assert.equal("similar_recommenders" in row, false);
  assert.equal("url" in row, false);
});
