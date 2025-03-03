"use client";

import { DataGrid } from "@/components/grid";

const columns = [
  { 
    field: "title", 
    header: "Title", 
    width: 150,
    cell: (props: any) => {
      const title = props.row.original.title;
      const amazonUrl = props.row.original.amazon_url;
      
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
    cell: (props: any) => {
      const recommenderText = props.row.original.recommender;
      const websiteUrl = props.row.original.website_url;
      const twitterUrl = props.row.original.twitter_url;
      const wikiUrl = props.row.original.wiki_url;
      const linkUrl = websiteUrl || twitterUrl || wikiUrl;
      
      return linkUrl ? (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#0000EE] hover:underline"
        >
          {recommenderText}
        </a>
      ) : (
        <span>{recommenderText}</span>
      );
    },
  },
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
          className="text-[#0000EE] hover:underline"
        >
          {sourceText || "Link"}
        </a>
      ) : (
        <span>{sourceText || "N/A"}</span>
      );
    },
  },
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
    website_url: string;
    twitter_url: string;
    wiki_url: string;
    amazon_url: string;
  }>;
};

export function BookGrid({ data }: BookGridProps) {
  return <DataGrid data={data} columns={columns} />;
}
