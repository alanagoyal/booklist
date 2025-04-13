import { NextResponse } from 'next/server';
import { initLogger, invoke } from 'braintrust';
import { z } from 'zod';

// Initialize Braintrust logger
initLogger({
  projectName: "booklist",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { book, recommenders } = await request.json();

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
    return NextResponse.json(
      { error: 'Failed to generate recommender explanation' },
      { status: 500 }
    );
  }
}
