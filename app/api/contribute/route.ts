import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, url, books } = body

    // Insert into pending_contributions
    const { data: contribution, error: contributionError } = await supabase
      .from('pending_contributions')
      .insert({
        person_name: name,
        person_url: url,
        books: books,
        status: 'pending'
      })
      .select()
      .single()

    if (contributionError) throw contributionError

    // Send approval email
    const approvalUrl = `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/contribute/approve?token=${contribution.approval_token}`
    
    await resend.emails.send({
      from: 'Booklist <hi@basecase.vc>',
      to: 'alana@basecase.vc',
      subject: 'New Book Recommendation Submission',
      html: `
        <h2>New submission from ${name}</h2>
        <p><strong>URL:</strong> ${url || 'Not provided'}</p>
        <h3>Books:</h3>
        <ul>
          ${books.map((book: any) => `
            <li>
              <strong>${book.title}</strong> by ${book.author}
            </li>
          `).join('')}
        </ul>
        <p>
          <a href="${approvalUrl}" style="display: inline-block; background: #f3f4f6; color: #111827; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Click to approve
          </a>
        </p>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing submission:', error)
    return NextResponse.json(
      { error: 'Failed to process submission' },
      { status: 500 }
    )
  }
}
