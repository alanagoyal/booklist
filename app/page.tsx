import { BookList } from '@/components/books';
import { FormattedBook, FormattedRecommender, RelatedBook } from "@/types";
import { supabase } from "@/utils/supabase/client";

// Force static generation and disable ISR
export const dynamic = 'force-static';
export const revalidate = false;
// Add fetchCache directive to ensure data is cached
export const fetchCache = 'force-cache';

// Create a cache for the data
let cachedBooks: FormattedBook[] | null = null;
let cachedRecommenders: FormattedRecommender[] | null = null;

// Fetch books at build time
async function getBooks(): Promise<FormattedBook[]> {
  // Return cached data if available
  if (cachedBooks) {
    return cachedBooks;
  }

  const pageSize = 1000;
  let allBooks: any[] = [];
  let page = 0;
  let hasMore = true;
  let totalBooks = 0;
  
  try {
    // First get the total count of books
    const { data: countData, error: countError } = await supabase
      .rpc('get_books_count');
    
    if (!countError && countData !== null) {
      totalBooks = countData;
      console.log(`Total books in database: ${totalBooks}`);
    }
    
    // Fetch books in batches
    while (hasMore) {
      const { data: books, error } = await supabase
        .rpc('get_books_by_recommendation_count', {
          p_limit: pageSize,
          p_offset: page * pageSize
        });
      
      if (error) {
        console.error('Error fetching books:', error);
        // If we hit an error but already have some books, continue with what we have
        if (allBooks.length > 0) {
          console.log(`Continuing with ${allBooks.length} books after encountering an error`);
          break;
        }
        return [];
      }
      
      if (books && books.length > 0) {
        allBooks = [...allBooks, ...books];
        page++;
        console.log(`Fetched batch ${page}, total books so far: ${allBooks.length}`);
      } else {
        hasMore = false;
      }
    }
    
    if (allBooks.length === 0) {
      console.error('No books fetched. Check database connection and function.');
      return [];
    }
    
    console.log(`Successfully fetched ${allBooks.length} books out of ${totalBooks} total`);
  } catch (e) {
    console.error('Unexpected error fetching books:', e);
    return [];
  }

  const formattedBooks: FormattedBook[] = allBooks.map((book: any) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    genres: book.genre,
    amazon_url: book.amazon_url,
    related_books: (book.related_books || []).map((rb: any) => ({
      id: rb.id,
      title: rb.title,
      author: rb.author,
      description: "",
      amazon_url: null,
      _recommendationCount: rb.recommender_count
    })),
    recommendations: book.recommendations.map((rec: any) => ({
      recommender: rec.recommender ? {
        id: rec.recommender.id || "",
        full_name: rec.recommender.full_name || "",
        url: rec.recommender.url,
        type: rec.recommender.type || "",
      } : null,
      source: rec.source,
      source_link: rec.source_link
    }))
  }));

  // Cache the results
  cachedBooks = formattedBooks;
  return formattedBooks;
}

async function getRecommenders(): Promise<FormattedRecommender[]> {
  // Return cached data if available
  if (cachedRecommenders) {
    return cachedRecommenders;
  }

  // Get all people from the database
  const { data: people, error: peopleError } = await supabase
    .from('people')
    .select('id, full_name, url, type')
    .order('full_name');

  if (peopleError) {
    throw peopleError;
  }

  // For each person, get their recommendations and related recommenders
  const formattedRecommenders = await Promise.all(
    (people || []).map(async (person) => {
      const { data, error } = await supabase
        .rpc('get_recommender_details', { p_recommender_id: person.id });

      if (error || !data?.[0]) {
        console.error('Error fetching recommender details:', error);
        return null;
      }

      // Transform the raw data into the correct types
      const rawData = data[0];
      const transformedData: FormattedRecommender = {
        id: rawData.id,
        full_name: rawData.full_name,
        url: rawData.url,
        type: rawData.type || 'Unknown',
        recommendations: (rawData.recommendations as any[]).map(rec => ({
          id: rec.id,
          title: rec.title,
          author: rec.author,
          description: rec.description,
          genre: rec.genre,
          amazon_url: rec.amazon_url,
          source: rec.source,
          source_link: rec.source_link
        })),
        related_recommenders: (rawData.related_recommenders as any[]).map(rec => ({
          id: rec.id,
          full_name: rec.full_name,
          url: rec.url,
          type: rec.type,
          shared_books: rec.shared_books,
          shared_count: rec.shared_count
        }))
      };

      return transformedData;
    })
  );

  const result = formattedRecommenders.filter((recommender): recommender is FormattedRecommender => recommender !== null);
  
  // Cache the results
  cachedRecommenders = result;
  return result;
}

// Use a global variable to track if we've already logged the build time message
let buildTimeLogged = false;

export default async function Home() {
  try {
    const [formattedBooks, formattedRecommenders] = await Promise.all([
      getBooks(),
      getRecommenders(),
    ]);

    // Only log this once
    if (!buildTimeLogged) {
      console.log('Page rendered at build time:', new Date().toISOString());
      buildTimeLogged = true;
    }

    return (
      <BookList 
        initialBooks={formattedBooks} 
        initialRecommenders={formattedRecommenders} 
      />
    );
  } catch (error) {
    console.error('Error fetching data:', error);
    return (
      <div className="p-4">
        <div className="text-text font-bold mb-2">Error loading data</div>
        <pre className="text-text/70 text-sm whitespace-pre-wrap">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}