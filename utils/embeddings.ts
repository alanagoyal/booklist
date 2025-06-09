
// Client-side embedding generation via secure API endpoint
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('/booklist/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to generate embedding: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}
