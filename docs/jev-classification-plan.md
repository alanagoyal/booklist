# the simple Jev plan for Booklist

## decision

Replace the old book classifications directly.

Keep the existing `books.genre text[]` field, use Jev to produce a better array of labels, overwrite the old values, and update the filter list. Do not add a parallel taxonomy system, classification history, review UI, compatibility views, or a schema migration.

```text
book title + author + description
                ↓
        one Jev API request
                ↓
        [shelf, tag, tag]
                ↓
          books.genre
```

## implementation

- `config/book-genres.ts` owns the labels, definitions, pinned model, threshold, and tag cap.
- `scripts/classify-books-with-jev.ts` fetches books, calls Jev, prints a dry-run diff, saves rollback data, and updates `books.genre` only with explicit write flags.
- `utils/constants.ts` uses the same label list for the UI filters.

The Jev request contains one `Choice` for the broad shelf and one parallel `Noul` per optional tag. Tags with probability at least `0.75` are retained, capped at four in addition to the shelf. If the broad shelf confidence is below `0.75`, or Jev chooses `other`, the existing genres are kept instead of forcing a guess.

## rollout

1. Add `TYPESAFE_API_KEY` to `.env.local`.
2. Run `npm run classify-books` to inspect the default 100-book sample.
3. Adjust label definitions only if the sample shows a repeated error.
4. Run `npm run classify-books -- --write --all` to classify the full catalog.
5. Run `npm run dump-data` and verify the genre filters and recommendations.

Write mode automatically saves every existing `id` and `genre` to a dated rollback JSON file. It also records completed IDs in `book-genres-progress.jsonl`, so an interrupted run can resume without paying to classify finished books again. Use `--restart` only when intentionally rerunning the full catalog with the same configuration.

## what this does not add

- no new Supabase tables or columns;
- no taxonomy hierarchy;
- no review queue or confidence dashboard;
- no classification calls in the user-facing application;
- no second model or permanent legacy path.

## references

- [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice)
- [TypeSafe Noul](https://docs.typesafe.ai/primitives/noul)
- [Jev models](https://docs.typesafe.ai/models)
- [TypeSafe JavaScript SDK](https://docs.typesafe.ai/sdk/javascript)
