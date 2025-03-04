"use client";

import { Fragment } from 'react';
import { DataGrid } from "@/components/grid";

interface FormattedBook {
  id: number;
  title: string;
  author: string;
  description: string;
  genres: string;
  recommender: string;
  source: string;
  source_link: string;
  website_url: string;
  twitter_url: string;
  wiki_url: string;
  amazon_url: string;
}

interface CellProps {
  row: {
    original: FormattedBook;
  };
}

const columns = [
  { 
    field: "title", 
    header: "Title", 
    width: 150,
    cell: ({ row: { original } }: CellProps) => {
      const title = original.title;
      const amazonUrl = original.amazon_url;
      
      return amazonUrl ? (
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0000EE] hover:underline"
        >
          {title}
        </a>
      ) : (
        <span>{title}</span>
      );
    },
  },
  { field: "author", header: "Author", width: 120 },
  { field: "description", header: "Description", width: 200 },
  { field: "genres", header: "Genres", width: 150 },
  {
    field: "recommender",
    header: "Recommender",
    width: 150,
    cell: ({ row: { original } }: CellProps) => {
      const recommenderText = original.recommender;
      
      // Split recommender text into array if it contains commas
      const recommenders = recommenderText.split(',').map(r => r.trim());
      
      // Split URLs and ensure they match the number of recommenders by padding with nulls
      const websiteUrls = (original.website_url?.split(',').map(url => url.trim()) || [])
        .concat(Array(recommenders.length).fill(null));
      const twitterUrls = (original.twitter_url?.split(',').map(url => url.trim()) || [])
        .concat(Array(recommenders.length).fill(null));
      const wikiUrls = (original.wiki_url?.split(',').map(url => url.trim()) || [])
        .concat(Array(recommenders.length).fill(null));
      
      // If no recommenders, return empty
      if (recommenders.length === 0) {
        return <span></span>;
      }

      return (
        <span>
          {recommenders.map((rec, i) => {
            // Get the corresponding URL for this recommender (prefer twitter > website > wiki)
            const recommenderUrl = twitterUrls[i] || websiteUrls[i] || wikiUrls[i];
            
            return (
              <Fragment key={i}>
                {i > 0 && ", "}
                {recommenderUrl ? (
                  <a
                    href={recommenderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0000EE] hover:underline"
                  >
                    {rec}
                  </a>
                ) : (
                  <span>{rec}</span>
                )}
              </Fragment>
            );
          })}
        </span>
      );
    },
  },
  {
    field: "source",
    header: "Source",
    width: 150,
    cell: ({ row: { original } }: CellProps) => {
      const sourceText = original.source;
      
      // Split source text into array if it contains commas
      const sources = sourceText.split(',').map(s => s.trim());
      
      // Split source links and ensure they match the number of sources by padding with nulls
      const sourceLinks = (original.source_link?.split(',').map(l => l.trim()) || [])
        .concat(Array(sources.length).fill(null));
      
      // If no sources, return empty
      if (sources.length === 0) {
        return <span></span>;
      }

      return (
        <span>
          {sources.map((source, i) => (
            <Fragment key={i}>
              {i > 0 && ", "}
              {sourceLinks[i] ? (
                <a
                  href={sourceLinks[i]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0000EE] hover:underline"
                >
                  {source}
                </a>
              ) : (
                <span>{source}</span>
              )}
            </Fragment>
          ))}
        </span>
      );
    },
  },
];

interface BookGridProps {
  data: FormattedBook[];
}

export function BookGrid({ data }: BookGridProps) {
  return <DataGrid columns={columns} data={data} />;
}
