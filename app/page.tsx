import { BookList } from "@/components/books";
import { FormattedBook, FormattedRecommender, RawBook, RecommenderPair, RawRecommendation } from "@/types";
import { supabase } from "@/utils/supabase/client";

// Force static generation and disable ISR
export const dynamic = 'force-static';
export const revalidate = false;

// Precompute recommendation counts for each recommender
function getRecommenderCounts(books: RawBook[]): Record<string, number> {
  const counts: Record<string, number> = {};
  books.forEach(book => {
    book.recommendations?.forEach((rec: RawRecommendation) => {
      if (rec.recommender) {
        const name = rec.recommender.full_name;
        counts[name] = (counts[name] || 0) + 1;
      }
    });
  });
  return counts;
}

// Precompute sorted recommender pairs for each book
function getSortedRecommenders(book: RawBook, recommenderCounts: Record<string, number>): RecommenderPair[] {
  return book.recommendations
    ?.filter((rec: RawRecommendation) => rec.recommender)
    .map((rec: RawRecommendation) => ({
      id: rec.recommender!.id,
      recommender: rec.recommender!.full_name,
      recommendationCount: recommenderCounts[rec.recommender!.full_name] || 0
    }))
    .sort((a: RecommenderPair, b: RecommenderPair) => b.recommendationCount - a.recommendationCount) || [];
}

// Fetch books at build time
async function getBooks(): Promise<FormattedBook[]> {
  // Get sorted books
  const { data: books, error } = await supabase
    .rpc('get_books_by_recommendation_count');

  if (error) {
    throw error;
  }

  // Precompute all recommender counts once
  const recommenderCounts = getRecommenderCounts(books as RawBook[]);
  
  const formattedBooks: FormattedBook[] = (books as RawBook[]).map((book) => {
    // Precompute sorted recommenders for this book
    const sortedRecommenders = getSortedRecommenders(book, recommenderCounts);
    
    return {
      id: book.id,
      title: book.title || "",
      author: book.author || "",
      description: book.description || "",
      genres: book.genre?.join(", ") || "",
      amazon_url: book.amazon_url || "",
      related_books: (book.related_books || []).map((rb) => ({
        id: rb.id,
        title: rb.title,
        author: rb.author,
        description: "",
        amazon_url: null,
        _recommendationCount: rb.recommender_count
      })),
      recommendations: sortedRecommenders.map((sr: RecommenderPair) => ({
        recommender: {
          id: sr.id,
          full_name: sr.recommender,
          url: book.recommendations?.find((r: RawRecommendation) => 
            r.recommender?.id === sr.id
          )?.recommender?.url || null,
          type: book.recommendations?.find((r: RawRecommendation) => 
            r.recommender?.id === sr.id
          )?.recommender?.type || "",
        },
        source: book.recommendations?.find((r: RawRecommendation) => 
          r.recommender?.id === sr.id
        )?.source || "",
        source_link: book.recommendations?.find((r: RawRecommendation) => 
          r.recommender?.id === sr.id
        )?.source_link || null,
      })),
      _sortedRecommenders: sortedRecommenders,
      _recommendationCount: book.recommendations?.length || 0,
    };
  });

  return formattedBooks;
}

async function getRecommenders(): Promise<FormattedRecommender[]> {
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

  return formattedRecommenders.filter((recommender): recommender is FormattedRecommender => recommender !== null);
}

export default async function Home() {
  try {
    const [formattedBooks, formattedRecommenders] = await Promise.all([
      getBooks(),
      getRecommenders(),
    ]);

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