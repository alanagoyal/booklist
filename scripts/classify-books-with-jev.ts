import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { config } from "dotenv";
import pLimit from "p-limit";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  choice,
  noul,
  TypeSafeClient,
  type Questions,
} from "@typesafe-ai/sdk";

import {
  BOOK_GENRE_CONFIG_VERSION,
  BOOK_GENRE_TAGS,
  BROAD_SHELVES,
  JEV_MODEL,
  MAX_TAGS_PER_BOOK,
  TAG_PROBABILITY_THRESHOLD,
  type BroadShelfKey,
} from "@/config/book-genres";
import type { Database } from "@/types/supabase";

config({ path: join(process.cwd(), ".env.local") });

const DEFAULT_LIMIT = 100;
const DEFAULT_CONCURRENCY = 8;
const PAGE_SIZE = 1000;
const PROGRESS_PATH = join(process.cwd(), "book-genres-progress.jsonl");

type Book = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  genre: string[];
  _recommendation_count: number;
};

type TagScore = {
  key: string;
  label: string;
  probability: number;
};

type Classification = {
  genres: string[];
  shelf: BroadShelfKey;
  shelfConfidence: number;
  tagScores: TagScore[];
  model: string;
  inputTokens: number;
};

type Options = {
  all: boolean;
  concurrency: number;
  help: boolean;
  limit: number;
  restart: boolean;
  write: boolean;
};

function printHelp() {
  console.log(`Classify Booklist genres with Jev.

Usage:
  npm run classify-books
  npm run classify-books -- --limit=100
  npm run classify-books -- --write --all

Options:
  --limit=N       Dry-run sample size (default: ${DEFAULT_LIMIT})
  --concurrency=N Parallel Jev requests (default: ${DEFAULT_CONCURRENCY})
  --all           Process the complete catalog
  --write         Update books.genre; requires --all
  --restart       Ignore the current progress file; requires --write --all
  --help          Show this message

Without --write, the script only prints old and proposed genres.`);
}

export function parseOptions(args: string[]): Options {
  const knownFlags = new Set(["--all", "--help", "--restart", "--write"]);
  const unknown = args.filter(
    (arg) =>
      !knownFlags.has(arg) &&
      !arg.startsWith("--limit=") &&
      !arg.startsWith("--concurrency="),
  );

  if (unknown.length > 0) {
    throw new Error(`Unknown option${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`);
  }

  const readPositiveInteger = (name: string, fallback: number) => {
    const raw = args.find((arg) => arg.startsWith(`${name}=`))?.split("=")[1];
    if (raw === undefined) return fallback;

    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive integer.`);
    }
    return value;
  };

  const options: Options = {
    all: args.includes("--all"),
    concurrency: readPositiveInteger("--concurrency", DEFAULT_CONCURRENCY),
    help: args.includes("--help"),
    limit: readPositiveInteger("--limit", DEFAULT_LIMIT),
    restart: args.includes("--restart"),
    write: args.includes("--write"),
  };

  if (options.write && !options.all) {
    throw new Error("--write requires --all so a partial sample cannot be written accidentally.");
  }

  if (options.restart && (!options.write || !options.all)) {
    throw new Error("--restart requires --write --all.");
  }

  return options;
}

function createSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchBooks(supabase: SupabaseClient<Database>): Promise<Book[]> {
  const books: Book[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.rpc("get_books_with_counts", {
      p_limit: PAGE_SIZE,
      p_offset: offset,
    });

    if (error) throw new Error(`Could not fetch books: ${error.message}`);
    if (!data || data.length === 0) break;

    books.push(
      ...data.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        genre: book.genre ?? [],
        _recommendation_count: book._recommendation_count,
      })),
    );
  }

  return books;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function awkwardness(book: Book): number {
  if (book.genre.includes("Misc")) return 0;
  if (book.genre.includes("Historical")) return 1;
  if (
    book.genre.length === 1 &&
    (book.genre[0] === "Fiction" || book.genre[0] === "Nonfiction")
  ) {
    return 2;
  }
  return 3;
}

export function selectDryRunSample(books: Book[], requested: number): Book[] {
  const size = Math.min(requested, books.length);
  const topTarget = Math.min(Math.round(size * 0.5), size);
  const awkwardTarget = Math.min(Math.round(size * 0.25), size - topTarget);
  const selected: Book[] = [];
  const selectedIds = new Set<string>();

  const add = (book: Book) => {
    if (!selectedIds.has(book.id) && selected.length < size) {
      selected.push(book);
      selectedIds.add(book.id);
    }
  };

  [...books]
    .sort(
      (left, right) =>
        right._recommendation_count - left._recommendation_count ||
        left.id.localeCompare(right.id),
    )
    .slice(0, topTarget)
    .forEach(add);

  [...books]
    .filter((book) => !selectedIds.has(book.id))
    .sort(
      (left, right) =>
        awkwardness(left) - awkwardness(right) ||
        stableHash(left.id) - stableHash(right.id),
    )
    .slice(0, awkwardTarget)
    .forEach(add);

  [...books]
    .filter((book) => !selectedIds.has(book.id))
    .sort((left, right) => stableHash(left.id) - stableHash(right.id))
    .forEach(add);

  return selected;
}

export function buildQuestions(): Questions {
  const questions: Questions = {
    broad_shelf: choice(
      "Which single broad shelf best describes this book? Choose other only when none of the named shelves fits.",
      Object.fromEntries(
        Object.entries(BROAD_SHELVES).map(([key, value]) => [key, value.description]),
      ),
    ),
  };

  for (const tag of BOOK_GENRE_TAGS) {
    questions[`tag_${tag.key}`] = noul(
      {
        question: `Does the label "${tag.label}" materially help a reader understand this book?`,
        rule: "Answer yes only when the label is substantively true, not merely mentioned or weakly related.",
      },
      {
        true: tag.definition,
        false: `The book is not substantively ${tag.label}.`,
      },
    );
  }

  return questions;
}

function isBroadShelfKey(value: string): value is BroadShelfKey {
  return value in BROAD_SHELVES;
}

export function resolveGenres(
  shelf: BroadShelfKey,
  tagScores: TagScore[],
  oldGenres: string[],
): string[] {
  const shelfLabel = BROAD_SHELVES[shelf].label;
  const tags = tagScores
    .filter((tag) => tag.probability >= TAG_PROBABILITY_THRESHOLD)
    .sort((left, right) => right.probability - left.probability)
    .slice(0, MAX_TAGS_PER_BOOK)
    .map((tag) => tag.label);

  const genres = [...new Set([...(shelfLabel ? [shelfLabel] : []), ...tags])];
  return genres.length > 0 ? genres : oldGenres;
}

async function classifyBook(client: TypeSafeClient, book: Book): Promise<Classification> {
  const response = await client.systemOne({
    model: JEV_MODEL,
    state: {
      title: book.title,
      author: book.author,
      description: book.description ?? "",
    },
    questions: buildQuestions(),
  });

  const shelfAnswer = response.answers.broad_shelf;
  if (shelfAnswer.type !== "choice" || !isBroadShelfKey(shelfAnswer.choice)) {
    throw new Error("Jev returned an invalid broad shelf.");
  }

  const tagScores = BOOK_GENRE_TAGS.map((tag) => {
    const answer = response.answers[`tag_${tag.key}`];
    if (!answer || answer.type !== "noul") {
      throw new Error(`Jev returned an invalid answer for ${tag.label}.`);
    }
    return { key: tag.key, label: tag.label, probability: answer.noul };
  });

  return {
    genres: resolveGenres(shelfAnswer.choice, tagScores, book.genre),
    shelf: shelfAnswer.choice,
    shelfConfidence: shelfAnswer.confidence,
    tagScores,
    model: response.model,
    inputTokens: response.usage.input_tokens,
  };
}

function backupBooks(books: Book[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(process.cwd(), `book-genres-backup-${timestamp}.json`);
  writeFileSync(
    path,
    `${JSON.stringify(books.map(({ id, genre }) => ({ id, genre })), null, 2)}\n`,
    "utf8",
  );
  return path;
}

function loadProgress(): Set<string> {
  if (!existsSync(PROGRESS_PATH)) return new Set();

  return new Set(
    readFileSync(PROGRESS_PATH, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { id: string; configVersion: string; model: string })
      .filter(
        (entry) =>
          entry.configVersion === BOOK_GENRE_CONFIG_VERSION && entry.model === JEV_MODEL,
      )
      .map((entry) => entry.id),
  );
}

function markProcessed(id: string) {
  appendFileSync(
    PROGRESS_PATH,
    `${JSON.stringify({ id, configVersion: BOOK_GENRE_CONFIG_VERSION, model: JEV_MODEL })}\n`,
    "utf8",
  );
}

function sameGenres(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((genre, index) => genre === right[index]);
}

function printDryRun(book: Book, classification: Classification, position: number, total: number) {
  const acceptedTags = classification.tagScores
    .filter((tag) => classification.genres.includes(tag.label))
    .map((tag) => `${tag.label} ${tag.probability.toFixed(2)}`)
    .join(", ");

  console.log(`\n[${position}/${total}] ${book.title} — ${book.author}`);
  console.log(`old: ${book.genre.join(", ") || "(none)"}`);
  console.log(`new: ${classification.genres.join(", ") || "(none)"}`);
  console.log(
    `shelf: ${classification.shelf} (${classification.shelfConfidence.toFixed(2)})${
      acceptedTags ? ` · tags: ${acceptedTags}` : ""
    }`,
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const typesafeApiKey = process.env.TYPESAFE_API_KEY;
  if (!typesafeApiKey) {
    throw new Error("Missing TYPESAFE_API_KEY in .env.local.");
  }

  const supabase = createSupabase();
  const typesafe = new TypeSafeClient({
    apiKey: typesafeApiKey,
    defaultModel: JEV_MODEL,
    timeout: 30_000,
  });

  console.log("Fetching books from Supabase...");
  const allBooks = await fetchBooks(supabase);
  const targetBooks = options.all
    ? allBooks
    : selectDryRunSample(allBooks, options.limit);

  console.log(
    `${options.write ? "Writing" : "Dry-running"} ${targetBooks.length} of ${allBooks.length} books with ${JEV_MODEL}.`,
  );

  if (options.write) {
    const backupPath = backupBooks(allBooks);
    console.log(`Saved rollback data to ${backupPath}.`);
    if (options.restart) writeFileSync(PROGRESS_PATH, "", "utf8");
  }

  const processed = options.write && !options.restart ? loadProgress() : new Set<string>();
  const limiter = pLimit(options.concurrency);
  let failed = 0;
  let skipped = 0;
  let updated = 0;

  const results = await Promise.all(
    targetBooks.map((book, index) =>
      limiter(async () => {
        if (processed.has(book.id)) {
          skipped += 1;
          return;
        }

        try {
          const classification = await classifyBook(typesafe, book);

          if (!options.write) {
            return { book, classification, index };
          }

          if (!sameGenres(book.genre, classification.genres)) {
            const { data, error } = await supabase
              .from("books")
              .update({ genre: classification.genres })
              .eq("id", book.id)
              .select("id")
              .single();

            if (error) throw new Error(`Supabase update failed: ${error.message}`);
            if (data.id !== book.id) throw new Error("Supabase did not confirm the updated book.");
            updated += 1;
          }

          markProcessed(book.id);
          console.log(
            `[${index + 1}/${targetBooks.length}] ${book.title}: ${classification.genres.join(", ")}`,
          );
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[${index + 1}/${targetBooks.length}] ${book.title}: ${message}`);
        }
      }),
    ),
  );

  if (!options.write) {
    results
      .filter(
        (result): result is { book: Book; classification: Classification; index: number } =>
          result !== undefined,
      )
      .sort((left, right) => left.index - right.index)
      .forEach(({ book, classification, index }) =>
        printDryRun(book, classification, index + 1, targetBooks.length),
      );
  }

  console.log(
    `\nDone. ${updated} updated, ${skipped} skipped, ${failed} failed.${
      options.write ? ` Progress: ${PROGRESS_PATH}` : ""
    }`,
  );

  if (failed > 0) process.exitCode = 1;
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
