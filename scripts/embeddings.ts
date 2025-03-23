import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import OpenAI from 'openai';
import pLimit from 'p-limit';

// Load .env.local file
dotenv.config({ path: join(process.cwd(), '.env.local') });

// To run: npx tsx scripts/embeddings.ts

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables');
}

if (!openaiKey) {
  throw new Error('Missing OPENAI_API_KEY in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// Rate limiter: 10 concurrent requests
const limit = pLimit(10);

interface BookEmbeddings {
  title_embedding: number[];
  author_embedding: number[];
  description_embedding: number[];
}

async function createFieldEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

async function createBookEmbeddings(title: string, author: string, description: string): Promise<BookEmbeddings> {
  const [title_embedding, author_embedding, description_embedding] = await Promise.all([
    createFieldEmbedding(title),
    createFieldEmbedding(author),
    createFieldEmbedding(description)
  ]);

  return {
    title_embedding,
    author_embedding,
    description_embedding
  };
}

async function processBatch(books: any[]) {
  const updates = books.map(book => limit(async () => {
    try {
      const { title, author, description } = book;
      
      if (title && author && description) {
        console.log(`Creating embeddings for: "${title}" by ${author}`);

        const embeddings = await createBookEmbeddings(title, author, description);
        const { error: updateError } = await supabase
          .from('books')
          .update(embeddings)
          .eq('id', book.id);
        
        if (updateError) {
          console.error(`Failed to update book ${book.id}:`, updateError);
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error processing book ${book.id}:`, error);
      return false;
    }
  }));

  const results = await Promise.all(updates);
  return results.filter(Boolean).length;
}

async function run() {
  try {
    const batchSize = 50;
    let processedCount = 0;
    let hasMore = true;
    let lastProcessedId: string | null = null;

    while (hasMore) {
      // Get next batch of books
      let query = supabase
        .from('books')
        .select()
        .is('title_embedding', null)
        .order('id')
        .limit(batchSize);

      if (lastProcessedId) {
        query = query.gt('id', lastProcessedId);
      }

      const { data: books, error: queryError } = await query;

      if (queryError) {
        console.error('Error querying books:', queryError);
        return;
      }

      if (!books || books.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`\nProcessing batch of ${books.length} books...`);
      const successCount = await processBatch(books);
      processedCount += successCount;
      lastProcessedId = books[books.length - 1].id;

      console.log(`Batch complete. ${successCount}/${books.length} books processed successfully.`);
      console.log(`Total books processed so far: ${processedCount}`);

      // Optional: Add a small delay between batches to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\nEmbeddings creation complete!');
    console.log(`Total books processed: ${processedCount}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

run().catch(console.error);
