import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateGenreAndDescription,
  generateAmazonUrl,
  sanitizeTwitterUrl,
  createBookEmbeddings,
} from "@/lib/book-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findOrCreateBook(book: { title: string; author: string }) {
  // First generate embeddings to check for similar books
  console.log(`Processing book: "${book.title}" by ${book.author}`);

  const embeddings = await createBookEmbeddings(book.title, book.author, "");
  if (!embeddings) {
    throw new Error("Failed to create embeddings");
  }

  // Check for similar books using embeddings
  const { data: similarBooks, error: similarBooksError } = await supabase.rpc(
    "get_best_matching_book",
    {
      p_title_embedding: embeddings.title_embedding,
      p_author_embedding: embeddings.author_embedding,
    }
  );

  if (similarBooksError) {
    console.error("Similar books check failed:", similarBooksError);
    throw new Error(
      `Error checking for similar books: ${similarBooksError.message}`
    );
  }

  if (similarBooks && similarBooks.length > 0) {
    const similarBook = similarBooks[0];
    console.log(
      `Found similar book: "${similarBook.title}" by ${similarBook.author}`
    );
    console.log(
      `Title similarity: ${(similarBook.title_similarity * 100).toFixed(1)}%`
    );
    console.log(
      `Author similarity: ${(similarBook.author_similarity * 100).toFixed(1)}%`
    );
    return similarBook.id;
  }

  // If no similar book found, generate metadata and create new book
  console.log("No similar book found, generating metadata...");
  const { genre, description } = await generateGenreAndDescription(
    book.title,
    book.author
  );
  const amazonUrl = generateAmazonUrl(book.title, book.author);

  // Create new book with all metadata
  const { data: newBook, error: bookError } = await supabase
    .from("books")
    .insert({
      title: book.title,
      author: book.author,
      description,
      genre,
      amazon_url: amazonUrl,
      title_embedding: embeddings.title_embedding,
      author_embedding: embeddings.author_embedding,
      description_embedding: embeddings.description_embedding,
    })
    .select()
    .single();

  if (bookError) {
    console.error("Failed to create new book:", bookError);
    throw new Error(`Error creating new book: ${bookError.message}`);
  }

  console.log(`Created new book: "${book.title}" by ${book.author}`);
  return newBook.id;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invalid approval token" },
        { status: 400 }
      );
    }

    // Get the pending contribution
    const { data: contribution, error: fetchError } = await supabase
      .from("pending_contributions")
      .select("*")
      .eq("approval_token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !contribution) {
      return NextResponse.json(
        { error: "Invalid or expired approval token" },
        { status: 400 }
      );
    }

    // Check if person already exists
    const { data: existingPerson, error: existingPersonError } = await supabase
      .from("people")
      .select("id")
      .eq("full_name", contribution.person_name)
      .single();

    if (existingPersonError && existingPersonError.code !== "PGRST116") {
      throw existingPersonError;
    }

    // Create or use existing person
    let person;
    if (existingPerson) {
      person = existingPerson;
      console.log(`Using existing person: ${contribution.person_name}`);

      // Update URL if provided and different
      if (contribution.person_url) {
        const { error: updateError } = await supabase
          .from("people")
          .update({
            url: sanitizeTwitterUrl(contribution.person_url),
          })
          .eq("id", person.id);

        if (updateError) throw updateError;
      }
    } else {
      const { data: newPerson, error: personError } = await supabase
        .from("people")
        .insert({
          full_name: contribution.person_name,
          url: sanitizeTwitterUrl(contribution.person_url) || null,
        })
        .select()
        .single();

      if (personError) throw personError;
      person = newPerson;
      console.log(`Created new person: ${contribution.person_name}`);
    }

    // Process each book
    const bookIds = [];
    for (const book of contribution.books) {
      const bookId = await findOrCreateBook(book);
      bookIds.push(bookId);

      // Create recommendation
      const { error: recError } = await supabase
        .from("recommendations")
        .insert({
          person_id: person.id,
          book_id: bookId,
          source: "Personal",
        });

      if (recError) throw recError;
    }

    // Update contribution status
    const { error: updateError } = await supabase
      .from("pending_contributions")
      .update({
        status: "approved",
      })
      .eq("id", contribution.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
