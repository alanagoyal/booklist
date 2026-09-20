"use client";

import { memo } from "react";
import { useSearchParams } from "next/navigation";
import useSWRImmutable from "swr/immutable";
import type { Catalog } from "@/utils/catalog";
import fetcher from "@/utils/fetcher";
import BookGrid from "./book-grid";
import RecommenderGrid from "./recommender-grid";
import { GridSkeleton } from "./grid-skeleton";

export const CatalogView = memo(function CatalogView({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const params = useSearchParams();
  const view = params.get("view") === "people" ? "people" : "books";
  const { data, error, mutate } = useSWRImmutable<Catalog>(
    `/booklist/api/catalog/${view}`,
    fetcher,
    {
      fallbackData: initialCatalog.view === view ? initialCatalog : undefined,
      revalidateOnMount: initialCatalog.view === view ? false : undefined,
    },
  );

  if (error)
    return (
      <div role="alert" className="p-6">
        <p>Couldn’t load the {view}.</p>
        <button className="mt-2 underline" onClick={() => void mutate()}>
          Try again
        </button>
      </div>
    );
  if (!data) return <GridSkeleton />;
  return data.view === "books" ? (
    <BookGrid data={data.rows} />
  ) : (
    <RecommenderGrid data={data.rows} />
  );
});
