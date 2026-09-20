"use client";

import type { FormattedBook, FormattedRecommender } from "@/types";
import type { ComponentProps } from "react";
import useSWRImmutable from "swr/immutable";
import fetcher from "@/utils/fetcher";
import BookDetail from "./book-detail";
import RecommenderDetail from "./recommender-detail";

type Detail =
  | { type: "book"; entity: FormattedBook }
  | { type: "person"; entity: FormattedRecommender };
const detailKey = (id: string) =>
  `/booklist/api/entities/${encodeURIComponent(id)}`;

export function EntityTitle({ id }: { id: string }) {
  const { data } = useSWRImmutable<Detail>(detailKey(id), fetcher);
  return (
    <>
      {data
        ? data.type === "book"
          ? data.entity.title
          : data.entity.full_name
        : "Loading…"}
    </>
  );
}

export function EntityDetail({
  id,
  ...props
}: { id: string } & Omit<ComponentProps<typeof BookDetail>, "book">) {
  const { data, error, mutate } = useSWRImmutable<Detail>(
    detailKey(id),
    fetcher,
  );
  if (data)
    return data.type === "book" ? (
      <BookDetail book={data.entity} {...props} />
    ) : (
      <RecommenderDetail recommender={data.entity} {...props} />
    );

  return (
    <div
      className="fixed inset-0 z-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onBackdropClick?.();
      }}
    >
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 bg-background border-border md:border-l p-12">
        <button
          aria-label="Close details"
          className="absolute top-4 right-4"
          onClick={props.onClose}
        >
          ×
        </button>
        {error ? (
          <div role="alert">
            <p>Couldn’t load this item.</p>
            <button className="underline mt-2" onClick={() => void mutate()}>
              Try again
            </button>
          </div>
        ) : (
          <p role="status">Loading…</p>
        )}
      </div>
    </div>
  );
}
