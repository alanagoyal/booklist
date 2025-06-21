import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();

export async function POST(req: NextRequest) {
  try {
    const { embedding, viewMode } = await req.json();

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: "Missing or invalid embedding" },
        { status: 400 }
      );
    }

    // Call the appropriate semantic search function
    const functionName =
      viewMode === "people"
        ? "semantic_search_people"
        : "semantic_search_books";

    const { data, error } = await supabase.rpc(functionName, {
      embedding_input: embedding,
      match_count: 500,
      min_similarity: 0.8, // Only return results with 80%+ similarity
    });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        {
          error: "Search failed",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
