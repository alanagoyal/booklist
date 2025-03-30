import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateGenreAndDescription, generateAmazonUrl, sanitizeTwitterUrl, createBookEmbeddings } from '@/lib/book-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid approval token' },
        { status: 400 }
      )
    }

    // Get the pending contribution
    const { data: contribution, error: fetchError } = await supabase
      .from('pending_contributions')
      .select('*')
      .eq('approval_token', token)
      .eq('status', 'pending')
      .single()

    if (fetchError || !contribution) {
      return NextResponse.json(
        { error: 'Invalid or expired approval token' },
        { status: 400 }
      )
    }

    // Start a transaction
    const { data: person, error: personError } = await supabase
      .from('people')
      .insert({
        full_name: contribution.person_name,
        url: sanitizeTwitterUrl(contribution.person_url) || null
      })
      .select()
      .single()

    if (personError) throw personError

    // Insert books and create recommendations
    for (const book of contribution.books) {
      // Check if book exists
      let { data: existingBook } = await supabase
        .from('books')
        .select('id')
        .ilike('title', book.title)
        .ilike('author', book.author)
        .single()

      let bookId

      if (existingBook) {
        bookId = existingBook.id
      } else {
        // Generate genre and description
        const bookInfo = await generateGenreAndDescription(book.title, book.author)
        const amazonUrl = generateAmazonUrl(book.title, book.author)
        
        // Generate embeddings
        const embeddings = await createBookEmbeddings(
          book.title,
          book.author,
          bookInfo.description
        )

        // Insert new book
        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            title: book.title,
            author: book.author,
            description: bookInfo.description,
            genre: bookInfo.genre,
            amazon_url: amazonUrl,
            title_embedding: embeddings.title_embedding,
            author_embedding: embeddings.author_embedding,
            description_embedding: embeddings.description_embedding
          })
          .select()
          .single()

        if (bookError) throw bookError
        bookId = newBook.id
      }

      // Create recommendation
      const { error: recError } = await supabase
        .from('recommendations')
        .insert({
          person_id: person.id,
          book_id: bookId,
          source: "Personal"
        })

      if (recError) throw recError
    }

    // Update contribution status
    await supabase
      .from('pending_contributions')
      .update({ status: 'approved' })
      .eq('id', contribution.id)

    return NextResponse.json({
      success: true,
      message: 'Contribution approved and processed successfully'
    })
  } catch (error) {
    console.error('Error processing approval:', error)
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
