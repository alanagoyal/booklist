import { createClient } from "@/utils/supabase/server";
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { FormattedBook, FormattedRecommender } from "@/types";

// Load environment variables from .env.local
config({ path: join(process.cwd(), ".env.local") });

async function dumpData() {
  console.log("Fetching data from Supabase...");
  const supabase = createClient();

  try {
    // Fetch books with pagination
    const pageSize = 1000;
    let allBooks = [];
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

      // Get similar books for all books
      const similarBooksPromises = allBooks.map(book => 
        supabase.rpc("get_similar_books_to_book_by_description", { book_id_arg: book.id })
      );
      const similarBooksResults = await Promise.all(similarBooksPromises);
      const similarBooksData = similarBooksResults.reduce<Record<string, any>>((acc, result, index) => {
        if (result.error) {
          console.error("Error fetching similar books:", result.error);
          return acc;
        }
        acc[allBooks[index].id] = result.data || [];
        return acc;
      }, {});

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
            url: string;
            type: string;
          };
          source: string;
          source_link: string;
        }) => ({
          recommender: rec.recommender
            ? {
                id: rec.recommender.id || "",
                full_name: rec.recommender.full_name || "",
                url: rec.recommender.url || "",
                type: rec.recommender.type || "",
              }
            : null,
          source: rec.source || "",
          source_link: rec.source_link || "",
        })),
        _recommendation_count: book._recommendation_count,
        _percentile: book._percentile,
        related_books: (relatedBooksData?.[book.id] || []).map((rb: {
          id: string;
          title: string;
          author: string;
          description?: string;
          amazon_url?: string;
          _recommendationCount: number;
        }) => ({
          id: rb.id,
          title: rb.title,
          author: rb.author,
          description: rb.description || "",
          amazon_url: rb.amazon_url || "",
          _recommendationCount: rb._recommendationCount,
        })),
        similar_books: (similarBooksData?.[book.id] || []).map((sb: {
          id: string;
          title: string;
          author: string;
          genre: string[];
          description: string;
          amazon_url: string;
          similarity: number;
        }) => ({
          id: sb.id,
          title: sb.title,
          author: sb.author,
          genre: sb.genre,
          description: sb.description || "",
          amazon_url: sb.amazon_url || "",
          similarity: sb.similarity,
        })),
      }));

      writeFileSync(
        join(process.cwd(), "public", "data", "books.json"),
        JSON.stringify(formattedBooks, null, 2)
      );
      console.log(`✓ Wrote ${formattedBooks.length} books to public/data/books.json`);
    }

    // Fetch recommenders with their recommendations
    const { data: recommenders, error: recommendersError } = await supabase
      .rpc("get_recommender_with_books")
      .order("full_name");

    if (recommendersError) {
      console.error("Error fetching recommenders:", recommendersError);
    } else if (recommenders) {
      // Get similar recommenders for each recommender
      const similarRecommendersPromises = recommenders.map((recommender: {
        id: string;
        full_name: string;
        type: string | null;
        url: string | null;
        description: string | null;
        recommendations: any[];
        related_recommenders: any[];
        _book_count: number;
        _percentile: number;
      }) => 
        supabase.rpc("get_similar_people_by_description_embedding", { person_id_arg: recommender.id })
      );
      const similarRecommendersResults = await Promise.all(similarRecommendersPromises);
      const similarRecommendersData = similarRecommendersResults.reduce<Record<string, any>>((acc, result, index) => {
        if (result.error) {
          console.error("Error fetching similar recommenders:", result.error);
          return acc;
        }
        acc[recommenders[index].id] = result.data || [];
        return acc;
      }, {});

      // Format the recommenders data
      const formattedRecommenders: FormattedRecommender[] = recommenders.map((recommender: {
        id: string;
        full_name: string;
        type: string | null;
        url: string | null;
        description: string | null;
        recommendations: any[];
        related_recommenders: any[];
        _book_count: number;
        _percentile: number;
      }) => ({
        id: recommender.id,
        full_name: recommender.full_name,
        type: recommender.type || "",
        url: recommender.url || "",
        description: recommender.description || "",
        recommendations: recommender.recommendations || [],
        related_recommenders: recommender.related_recommenders || [],
        similar_recommenders: similarRecommendersData[recommender.id] || [],
        _book_count: recommender._book_count,
        _percentile: recommender._percentile,
      }));

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
