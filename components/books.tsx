'use client';

import { DataGrid } from "@/components/grid";

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

type BookGridProps = {
  data: Array<{
    id: number;
    title: string;
    author: string;
    description: string;
    genres: string;
    recommender: string;
    source: string;
    source_link: string;
  }>;
};

export function BookGrid({ data }: BookGridProps) {
  return (
    <div className="w-full h-dvh">
      <DataGrid data={data} columns={columns} />
    </div>
  );
}
