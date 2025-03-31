import { initLogger, invoke } from "braintrust"
import { z } from "zod"
import OpenAI from "openai"

// Initialize Braintrust logger
initLogger({
  projectName: "booklist",
  apiKey: process.env.BRAINTRUST_API_KEY,
})

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface BookEmbeddings {
  title_embedding: number[]
  author_embedding: number[]
  description_embedding: number[]
}

export async function generateGenreAndDescription(title: string, author: string) {
  const result = await invoke({
    projectName: "booklist",
    slug: "genre-and-description-0680",
    input: { title, author },
    schema: z.object({
      genre: z.array(z.string()),
      description: z.string()
    }),
  })
  return result
}

// Helper function to create embeddings for a single field
export async function createFieldEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  })
  return response.data[0].embedding
}

// Helper function to create embeddings for a book
export async function createBookEmbeddings(
  title: string,
  author: string,
  description: string
): Promise<BookEmbeddings> {
  const [title_embedding, author_embedding, description_embedding] =
    await Promise.all([
      createFieldEmbedding(title),
      createFieldEmbedding(author),
      createFieldEmbedding(description),
    ])

  return {
    title_embedding,
    author_embedding,
    description_embedding,
  }
}

export function sanitizeTwitterUrl(url: string | null): string | null {
  if (!url) return null

  // Only process Twitter/X URLs
  if (
    !url.toLowerCase().includes('twitter.com') &&
    !url.toLowerCase().includes('x.com')
  ) {
    return url
  }

  try {
    // If it's a full URL, parse it and extract just the username
    if (url.startsWith('http')) {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split('/').filter((part) => part)
      // If we have a username in the path, use it
      if (pathParts.length > 0) {
        return `https://x.com/${pathParts[0]}`
      }
    }

    // If it's just a username (with or without @)
    if (url.match(/^@?[a-zA-Z0-9_]+$/)) {
      return `https://x.com/${url.replace('@', '')}`
    }

    // Try to extract username from twitter.com/username format
    const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i)
    if (match && match[1]) {
      return `https://x.com/${match[1]}`
    }

    // If we can't parse it in any known format, return unchanged
    return url
  } catch (error) {
    // If URL parsing fails, return unchanged
    return url
  }
}

export function generateAmazonUrl(title: string, author: string): string {
  const searchQuery = `${title} ${author}`.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '+')
  return `https://www.amazon.com/s?k=${searchQuery}&i=stripbooks`
}
