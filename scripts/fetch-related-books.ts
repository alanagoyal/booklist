import type { RelatedBook } from "@/types";

export const RELATED_BOOKS_BATCH_SIZE = 1000;

type RpcError = {
  code?: string;
  message: string;
};

type RpcClient = {
  rpc: (
    name: string,
    params: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
};

export type RelatedBooksByBookId = Record<string, RelatedBook[]>;

export async function fetchRelatedBooks(
  supabase: RpcClient,
  bookIds: string[],
  batchSize = RELATED_BOOKS_BATCH_SIZE
): Promise<RelatedBooksByBookId> {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("Related-books batch size must be a positive integer");
  }

  const relatedBooks: RelatedBooksByBookId = {};
  const batchCount = Math.ceil(bookIds.length / batchSize);

  for (let offset = 0; offset < bookIds.length; offset += batchSize) {
    const batchNumber = offset / batchSize + 1;
    const batchBookIds = bookIds.slice(offset, offset + batchSize);
    const { data, error } = await supabase.rpc("get_related_books", {
      book_ids: batchBookIds,
    });

    if (error) {
      const code = error.code ? ` ${error.code}` : "";
      throw new Error(
        `get_related_books batch ${batchNumber}/${batchCount} failed:${code} ${error.message}`
      );
    }

    // The RPC returns null when none of the requested books has a related book.
    if (data === null) continue;

    if (typeof data !== "object" || Array.isArray(data)) {
      throw new Error(
        `get_related_books batch ${batchNumber}/${batchCount} returned an unexpected payload`
      );
    }

    Object.assign(relatedBooks, data);
  }

  return relatedBooks;
}
