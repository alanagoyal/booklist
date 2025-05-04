import { createClient } from "@/utils/supabase/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { 
  FormattedBook, 
  FormattedRecommender, 
  RelatedRecommender, 
  SimilarRecommender,
  RecommenderRecommendation,
  RelatedBook,
  SimilarBook,
  EssentialBook,
  ExtendedBook
} from "@/types";

// Load environment variables from .env.local
config({ path: join(process.cwd(), ".env.local") });

// Calculate background color based on count
// This function is identical to the one in the grid components
function getBackgroundColor(count: number): string {
  if (!count) return "";

  let intensity = 0;
  if (count >= 1) intensity = 1;
  if (count >= 2) intensity = 2;
  if (count >= 3) intensity = 3;
  if (count >= 5) intensity = 4;
  if (count >= 8) intensity = 5;
  if (count >= 13) intensity = 6;

  switch (intensity) {
    case 1:
      return "bg-[hsl(151,80%,95%)] hover:bg-[hsl(151,80%,92%)] dark:bg-[hsl(160,84%,5%)] dark:hover:bg-[hsl(160,84%,7%)] transition-colors duration-200";
    case 2:
      return "bg-[hsl(151,80%,90%)] hover:bg-[hsl(151,80%,88%)] dark:bg-[hsl(160,84%,9%)] dark:hover:bg-[hsl(160,84%,11%)] transition-colors duration-200";
    case 3:
      return "bg-[hsl(151,80%,85%)] hover:bg-[hsl(151,80%,84%)] dark:bg-[hsl(160,84%,13%)] dark:hover:bg-[hsl(160,84%,15%)] transition-colors duration-200";
    case 4:
      return "bg-[hsl(151,80%,80%)] hover:bg-[hsl(151,80%,80%)] dark:bg-[hsl(160,84%,17%)] dark:hover:bg-[hsl(160,84%,19%)] transition-colors duration-200";
    case 5:
      return "bg-[hsl(151,80%,75%)] hover:bg-[hsl(151,80%,76%)] dark:bg-[hsl(160,84%,21%)] dark:hover:bg-[hsl(160,84%,23%)] transition-colors duration-200";
    case 6:
      return "bg-[hsl(151,80%,70%)] hover:bg-[hsl(151,80%,72%)] dark:bg-[hsl(160,84%,25%)] dark:hover:bg-[hsl(160,84%,27%)] transition-colors duration-200";
    default:
      return "";
  }
}

async function dumpData() {
  console.log("Fetching data from Supabase...");
  const supabase = createClient();

  try {
    // Fetch books with pagination
    const pageSize = 1000;
    let allBooks: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: books, error: booksError } = await supabase.rpc(
        "get_books_with_counts",
        { p_limit: pageSize, p_offset: page * pageSize }
      );

      if (booksError) {
        console.error("Error fetching books:", booksError);
        break;
      }

      if (!books || books.length === 0) {
        hasMore = false;
      } else {
        allBooks.push(...books);
        page++;
      }
    }

    // Only fetch recommendations and related books if we have books
    if (allBooks.length > 0) {
      // Get recommendations for all books
      const { data: recommendationsData, error: recommendationsError } = await supabase.rpc(
        "get_book_recommendations",
        { book_ids: allBooks.map(b => b.id) }
      );

      if (recommendationsError) {
        console.error("Error fetching recommendations:", recommendationsError);
      }

      // Get related books for all books
      const { data: relatedBooksData, error: relatedError } = await supabase.rpc(
        "get_related_books",
        { book_ids: allBooks.map(b => b.id) }
      );

      if (relatedError) {
        console.error("Error fetching related books:", relatedError);
      }

      // Combine all data
      const formattedBooks: FormattedBook[] = allBooks.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        genres: book.genre || [],
        amazon_url: book.amazon_url || "",
        recommendations: (recommendationsData?.[book.id] || []).map((rec: {
          recommender?: {
            id: string;
            full_name: string;
            url: string | null;
            type: string;
          };
          source: string | null;
          source_link: string | null;
        }): RecommenderRecommendation => ({
          recommender: rec.recommender
            ? {
                id: rec.recommender.id,
                full_name: rec.recommender.full_name,
                url: rec.recommender.url,
                type: rec.recommender.type,
              }
            : null,
          source: rec.source,
          source_link: rec.source_link,
        })),
        _recommendation_count: book._recommendation_count,
        _percentile: book._percentile,
        _background_color: getBackgroundColor(book._recommendation_count),
        related_books: (relatedBooksData?.[book.id] || []).map((rb: {
          id: string;
          title: string;
          author: string;
          description: string | null;
          amazon_url: string | null;
          _recommendation_count: number;
          _shared_count: number;
        }): RelatedBook => ({
          id: rb.id,
          title: rb.title,
          author: rb.author,
          description: rb.description,
          amazon_url: rb.amazon_url,
          _recommendation_count: rb._recommendation_count,
          _shared_count: rb._shared_count
        })),
        similar_books: (book.similar_books || []).map((sb: {
          id: string;
          title: string;
          author: string;
          genre: string[];
          description: string;
          amazon_url: string;
          similarity: number;
        }): SimilarBook => ({
          id: sb.id,
          title: sb.title,
          author: sb.author,
          genre: sb.genre,
          description: sb.description || "",
          amazon_url: sb.amazon_url || "",
          similarity: sb.similarity,
        })),
      }));

      // Split books into essential and extended data
      const essentialBooks: EssentialBook[] = formattedBooks.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        genres: book.genres,
        amazon_url: book.amazon_url,
        recommendations: book.recommendations,
        _recommendation_count: book._recommendation_count,
        _percentile: book._percentile,
        _background_color: book._background_color
      }));

      const extendedBooks: ExtendedBook[] = formattedBooks.map(book => ({
        id: book.id,
        related_books: book.related_books,
        similar_books: book.similar_books
      }));

      // Ensure the data directory exists
      const dataDir = join(process.cwd(), "public", "data");
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      // Write essential data first
      writeFileSync(
        join(process.cwd(), "public", "data", "books-essential.json"),
        JSON.stringify(essentialBooks, null, 2)
      );
      console.log(`✓ Wrote essential data for ${essentialBooks.length} books`);

      // Write extended data
      writeFileSync(
        join(process.cwd(), "public", "data", "books-extended.json"),
        JSON.stringify(extendedBooks, null, 2)
      );
      console.log(`✓ Wrote extended data for ${extendedBooks.length} books`);

      // Write metadata
      writeFileSync(
        join(process.cwd(), "public", "data", "books-meta.json"),
        JSON.stringify({ totalBooks: formattedBooks.length })
      );
      console.log(`✓ Wrote metadata to public/data/books-meta.json`);
    }

    // Fetch recommenders with their recommendations
    const { data: recommenders, error: recommendersError } = await supabase
      .rpc("get_recommender_with_books")
      .order("full_name");

    if (recommendersError) {
      console.error("Error fetching recommenders:", recommendersError);
    } else if (recommenders) {
      // Format the recommenders data
      const formattedRecommenders: FormattedRecommender[] = recommenders.map((recommender: {
        id: string;
        full_name: string;
        type: string | null;
        url: string | null;
        description: string | null;
        recommendations: any[];
        related_recommenders: RelatedRecommender[];
        similar_people: SimilarRecommender[];
        _book_count: number;
        _percentile: number;
      }) => ({
        id: recommender.id,
        full_name: recommender.full_name,
        type: recommender.type,
        url: recommender.url,
        description: recommender.description,
        recommendations: recommender.recommendations || [],
        related_recommenders: recommender.related_recommenders || [],
        similar_recommenders: recommender.similar_people || [],
        _book_count: recommender._book_count,
        _percentile: recommender._percentile,
        _background_color: getBackgroundColor(recommender._book_count)
      }));

      // Ensure the data directory exists (for recommenders.json)
      const dataDir = join(process.cwd(), "public", "data");
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      writeFileSync(
        join(process.cwd(), "public", "data", "recommenders.json"),
        JSON.stringify(formattedRecommenders, null, 2)
      );
      console.log(`✓ Wrote ${formattedRecommenders.length} recommenders to public/data/recommenders.json`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

dumpData();
