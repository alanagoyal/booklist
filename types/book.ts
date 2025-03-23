export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  genre: string[];
  amazon_url?: string;
  created_at: string;
  updated_at: string;
  recommendations?: {
    person_id: string;
    source: string;
    source_link?: string;
  }[];
}
