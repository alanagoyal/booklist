import { NextResponse } from 'next/server'
import { generateAmazonUrl } from '@/lib/book-utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const author = searchParams.get('author') || ''

    if (!title) {
      return NextResponse.json(
        { error: 'Missing title' },
        { status: 400 }
      )
    }

    const amazonUrl = generateAmazonUrl(title, author)
    return NextResponse.json({ amazonUrl })
  } catch (error) {
    console.error('Error generating Amazon URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate Amazon URL' },
      { status: 500 }
    )
  }
}
