import { NextResponse } from 'next/server';
import { getRandomBook } from '@/lib/books';

export async function GET() {
  try {
    const book = await getRandomBook();
    
    if (!book) {
      return NextResponse.json(
        { error: 'No books found' },
        { status: 404 }
      );
    }

    return NextResponse.json(book);
  } catch (error) {
    console.error('Error in random-book API:', error);
    return NextResponse.json(
      { error: 'Failed to get random book' },
      { status: 500 }
    );
  }
}
