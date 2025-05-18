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

// Calculate bucket (0-5) based on percentile ranges
function calculateBucket(percentile: number | null, bucketCount = 6): number {
  if (percentile === null || percentile === undefined) return 0;
  
  // Cap percentile at 0.99 to avoid showing 100th percentile
  const cappedPercentile = Math.min(0.99, percentile);
  
  // Convert to percentile (0-99)
  const asPercentile = cappedPercentile * 100;
  
  // Assign bucket based on percentile ranges
  if (asPercentile >= 98) return 5;     // 98-99th
  if (asPercentile >= 95) return 4;     // 95-98th
  if (asPercentile >= 90) return 3;     // 90-95th
  if (asPercentile >= 80) return 2;     // 80-90th
  if (asPercentile >= 50) return 1;     // 50-80th
  return 0;                             // 0-50th
}

// Calculate background color based on bucket (0-5)
function getBackgroundColor(bucket: number): string {
  if (bucket === undefined || bucket === null) return "";

  switch (bucket) {
    case 0:
      return "bg-[hsl(151,80%,95%)] hover:bg-[hsl(151,80%,92%)] dark:bg-[hsl(160,84%,5%)] dark:hover:bg-[hsl(160,84%,7%)]";
    case 1:
      return "bg-[hsl(151,80%,90%)] hover:bg-[hsl(151,80%,88%)] dark:bg-[hsl(160,84%,9%)] dark:hover:bg-[hsl(160,84%,11%)]";
    case 2:
      return "bg-[hsl(151,80%,85%)] hover:bg-[hsl(151,80%,84%)] dark:bg-[hsl(160,84%,13%)] dark:hover:bg-[hsl(160,84%,15%)]";
    case 3:
      return "bg-[hsl(151,80%,80%)] hover:bg-[hsl(151,80%,80%)] dark:bg-[hsl(160,84%,17%)] dark:hover:bg-[hsl(160,84%,19%)]";
    case 4:
      return "bg-[hsl(151,80%,75%)] hover:bg-[hsl(151,80%,76%)] dark:bg-[hsl(160,84%,21%)] dark:hover:bg-[hsl(160,84%,23%)]";
    case 5:
      return "bg-[hsl(151,80%,70%)] hover:bg-[hsl(151,80%,72%)] dark:bg-[hsl(160,84%,25%)] dark:hover:bg-[hsl(160,84%,27%)]";
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
      // Add bucket to each book
      allBooks = allBooks.map(book => {
        // Ensure recommendation_percentile is a number between 0 and 1
        const percentile = book.recommendation_percentile;
        
        return {
          ...book,
          recommendation_percentile: percentile,
          _bucket: calculateBucket(percentile)
        };
      });
      
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
        recommendation_percentile: book.recommendation_percentile,
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
        _bucket: book._bucket,
        _background_color: getBackgroundColor(book._bucket),
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
        recommendation_percentile: book.recommendation_percentile,
        _bucket: book._bucket,
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
      // Get all book counts for bucket calculation
      const allBookCounts = recommenders.map((recommender: any) => recommender._book_count);
      
      // Add bucket to each recommender
      const recommendersWithBuckets = recommenders.map((recommender: any) => {
        // Ensure recommendation_percentile is a number between 0 and 1
        const percentile = recommender.recommendation_percentile;
        const validPercentile = typeof percentile === 'number' && !isNaN(percentile) ? percentile : null;
        
        return {
          ...recommender,
          _bucket: calculateBucket(validPercentile)
        };
      });
      
      // Format the recommenders data
      const formattedRecommenders: FormattedRecommender[] = recommendersWithBuckets.map((recommender: {
        id: string;
        full_name: string;
        type: string | null;
        url: string | null;
        description: string | null;
        recommendations: any[];
        related_recommenders: RelatedRecommender[];
        similar_people: SimilarRecommender[];
        _book_count: number;
        _bucket: number;
        recommendation_percentile: number | null;
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
        _bucket: recommender._bucket,
        _background_color: getBackgroundColor(recommender._bucket),
        recommendation_percentile: recommender.recommendation_percentile
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
