import { NextResponse } from 'next/server';
import { initLogger, invoke } from 'braintrust';
import { z } from 'zod';

// Initialize Braintrust logger
initLogger({
  projectName: "booklist",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

// Define input schema
const inputSchema = z.object({
  book: z.string(),
  recommenders: z.array(z.object({
    name: z.string(),
    type: z.string()
  }))
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { book, recommenders } = inputSchema.parse(body);

    const result = await invoke({
      projectName: "booklist",
      slug: "explain-recommenders-1228",
      input: { book, recommenders },
      schema: z.object({
        summary: z.string()
      }),
    });

    return NextResponse.json({ summary: result.summary });
  } catch (error) {
    console.error('Error in recommender explanation:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate recommender explanation' },
      { status: 500 }
    );
  }
}
