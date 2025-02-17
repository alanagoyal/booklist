"use client";

import { DataGrid } from "@/components/data-grid";
import { createClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Book = {
  id: number;
  title: string;
  author: string;
  description: string;
  genre: string[];
  recommendations: {
    source: string;
    source_link: string;
    recommender: {
      full_name: string;
    };
  }[];
};

const columns = [
  { field: "title", header: "Title", width: 150 },
  { field: "author", header: "Author", width: 120 },
  { field: "description", header: "Description", width: 200 },
  { field: "genres", header: "Genres", width: 150 },
  { field: "recommender", header: "Recommender", width: 150 },
  { 
    field: "source", 
    header: "Source", 
    width: 150,
    cell: (props: any) => {
      const sourceLink = props.row.original.source_link;
      const sourceText = props.row.original.source;
      return sourceLink ? (
        <a 
          href={sourceLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {sourceText || 'Link'}
        </a>
      ) : (
        <span>{sourceText || 'N/A'}</span>
      );
    }
  }
];

export default function Home() {
  const { data: books, isLoading, error } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          recommendations (
            source,
            source_link,
            recommender:people(full_name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  if (isLoading) return <div className="w-full h-dvh flex items-center justify-center">Loading...</div>;
  if (error) return <div className="w-full h-dvh flex items-center justify-center">Error loading books</div>;

  const formattedBooks = books?.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description || 'N/A',
    genres: book.genre?.join(', ') || 'N/A',
    recommender: book.recommendations?.[0]?.recommender?.full_name || 'N/A',
    source: book.recommendations?.[0]?.source || 'N/A',
    source_link: book.recommendations?.[0]?.source_link || ''
  })) || [];

  return (
    <div className="w-full h-dvh">
      <DataGrid data={formattedBooks} columns={columns} />
    </div>
  );
}
