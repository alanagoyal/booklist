import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  EssentialBook,
  ExtendedBook,
  FormattedRecommender,
} from "@/types";
import { bookRow, personRow } from "./catalog";

// The source files are deployment snapshots. Share successful reads across
// requests, but allow a failed read to be retried.
function once<T>(load: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return () =>
    (pending ??= load().catch((error) => {
      pending = undefined;
      throw error;
    }));
}

const getBooks = once(async () => {
  const books: EssentialBook[] = JSON.parse(
    await readFile(
      join(process.cwd(), "public/data/books-essential.json"),
      "utf8",
    ),
  );
  return {
    rows: books.map(bookRow),
    byId: new Map(books.map((book) => [book.id, book])),
    byTitle: new Map(books.map((book) => [book.title, book])),
  };
});
const getPeople = once(async () => {
  const people: FormattedRecommender[] = JSON.parse(
    await readFile(
      join(process.cwd(), "public/data/recommenders.json"),
      "utf8",
    ),
  );
  return {
    rows: people.map(personRow),
    byId: new Map(people.map((person) => [person.id, person])),
  };
});
const getRelated = once(async () => {
  const books: ExtendedBook[] = JSON.parse(
    await readFile(
      join(process.cwd(), "public/data/books-extended.json"),
      "utf8",
    ),
  );
  return new Map(books.map((book) => [book.id, book]));
});

export async function getCatalog(view: "books" | "people") {
  return view === "people"
    ? ({ view, rows: (await getPeople()).rows } as const)
    : ({ view, rows: (await getBooks()).rows } as const);
}

export async function getEntity(id: string) {
  const books = await getBooks();
  const book = books.byId.get(id) ?? books.byTitle.get(id);
  if (book) {
    const related = (await getRelated()).get(book.id);
    return {
      type: "book",
      entity: {
        ...book,
        related_books: related?.related_books ?? [],
        similar_books: related?.similar_books ?? [],
      },
    } as const;
  }
  const person = (await getPeople()).byId.get(id);
  return person ? ({ type: "person", entity: person } as const) : null;
}
