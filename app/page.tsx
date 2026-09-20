import { BookList } from "@/components/book-list";
import { getCatalog } from "@/utils/catalog-server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = params.view === "people" ? "people" : "books";
  return <BookList initialCatalog={await getCatalog(view)} />;
}
