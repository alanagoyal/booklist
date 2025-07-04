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

// Generic pagination function for RPC calls
async function fetchAllWithPagination<T>(
  supabase: any,
  rpcName: string,
  additionalParams: Record<string, any> = {},
  pageSize: number = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.rpc(rpcName, {
      p_limit: pageSize,
      p_offset: page * pageSize,
      ...additionalParams
    });

    if (error) {
      console.error(`Error fetching ${rpcName}:`, error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData.push(...data);
      page++;
    }
  }

  return allData;
}

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
      return "bg-[hsl(var(--background-l1))] md:hover:bg-[hsl(var(--background-l1-hover))]";
    case 1:
      return "bg-[hsl(var(--background-l2))] md:hover:bg-[hsl(var(--background-l2-hover))]";
    case 2:
      return "bg-[hsl(var(--background-l3))] md:hover:bg-[hsl(var(--background-l3-hover))]";
    case 3:
      return "bg-[hsl(var(--background-l4))] md:hover:bg-[hsl(var(--background-l4-hover))]";
    case 4:
      return "bg-[hsl(var(--background-l5))] md:hover:bg-[hsl(var(--background-l5-hover))]";
    case 5:
      return "bg-[hsl(var(--background-l6))] md:hover:bg-[hsl(var(--background-l6-hover))]";
    default:
      return "";
  }
}

async function dumpData() {
  console.log("Fetching data from Supabase...");
  const supabase = createClient();

  try {
    // Fetch books with pagination
    const allBooks = await fetchAllWithPagination(
      supabase,
      "get_books_with_counts"
    );

    // Only fetch recommendations and related books if we have books
    if (allBooks.length > 0) {
      // Add bucket to each book
      const booksWithBuckets = allBooks.map((book: any) => {
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
        { book_ids: booksWithBuckets.map((b: any) => b.id) }
      );

      if (recommendationsError) {
        console.error("Error fetching recommendations:", recommendationsError);
      }

      // Get related books for all books
      const { data: relatedBooksData, error: relatedError } = await supabase.rpc(
        "get_related_books",
        { book_ids: booksWithBuckets.map((b: any) => b.id) }
      );

      if (relatedError) {
        console.error("Error fetching related books:", relatedError);
      }
      
      // Combine all data
      const formattedBooks: FormattedBook[] = booksWithBuckets.map((book: any) => ({
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

      // Check for duplicate IDs in essentialBooks before writing
      const bookIds = essentialBooks.map(book => book.id);
      const seenIds = new Set<string>();
      const duplicateBookIdsFound: string[] = [];
      bookIds.forEach(id => {
        if (seenIds.has(id)) {
          duplicateBookIdsFound.push(id);
        } else {
          seenIds.add(id);
        }
      });

      if (duplicateBookIdsFound.length > 0) {
        const uniqueDuplicateIds = [...new Set(duplicateBookIdsFound)];
        console.warn(
          `\n⚠️ WARNING: Found ${uniqueDuplicateIds.length} duplicate book ID(s) in essentialBooks data:`
        );
        uniqueDuplicateIds.forEach(id => {
          const duplicates = essentialBooks.filter(book => book.id === id);
          console.warn(`  - ID: ${id} (appears ${duplicates.length} times)`);
          // Optionally, log the full duplicate objects for more detail
          // console.warn(duplicates);
        });
        console.warn(
          "Please investigate and fix the duplicate IDs in the data source (Supabase) or the get_books_with_counts RPC.\n"
        );
        // Optionally, throw an error to stop the script if duplicates are critical
        // throw new Error("Duplicate book IDs found. Halting script.");
      }

      // Write essential data first
      writeFileSync(
        join(process.cwd(), "public", "data", "books-essential.json"),
        JSON.stringify(essentialBooks, null, 2)
      );
      console.log(`✓ Wrote essential data for ${essentialBooks.length} books`);

      // Write initial data (first 50 books for fast initial load)
      const initialBooks = essentialBooks.slice(0, 50);
      writeFileSync(
        join(process.cwd(), "public", "data", "books-initial.json"),
        JSON.stringify(initialBooks, null, 2)
      );
      console.log(`✓ Wrote initial data for ${initialBooks.length} books`);

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
    const allRecommenders = await fetchAllWithPagination(
      supabase,
      "get_recommender_with_books"
    );

    if (allRecommenders.length > 0) {
      // Get all book counts for bucket calculation
      const allBookCounts = allRecommenders.map((recommender: any) => recommender._book_count);
      
      // Add bucket to each recommender
      const recommendersWithBuckets = allRecommenders.map((recommender: any) => {
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

      // Write initial recommenders data (first 50 recommenders for fast initial load)
      const initialRecommenders = formattedRecommenders.slice(0, 50);
      writeFileSync(
        join(process.cwd(), "public", "data", "recommenders-initial.json"),
        JSON.stringify(initialRecommenders, null, 2)
      );
      console.log(`✓ Wrote initial data for ${initialRecommenders.length} recommenders`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

dumpData();
