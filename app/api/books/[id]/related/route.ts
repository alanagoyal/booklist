import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtendedBook } from "@/types";

// Index the build-time snapshot once on the server. The browser receives only
// the selected book's related data, never the entire related-book catalog.
let booksById: Promise<Map<string, ExtendedBook>> | undefined;

function getBooksById() {
  booksById ??= readFile(
    join(process.cwd(), "public/data/books-extended.json"),
    "utf8"
  ).then((json) => {
    const books: ExtendedBook[] = JSON.parse(json);
    return new Map(books.map((book) => [book.id, book]));
  }).catch((error) => {
    booksById = undefined;
    throw error;
  });
  return booksById;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = (await getBooksById()).get(id);
  if (!book) {
    return Response.json({ error: "Book not found" }, { status: 404 });
  }
  return Response.json(book);
}
