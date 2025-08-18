import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();

export async function POST(req: NextRequest) {
  try {
    const { query, embedding, viewMode } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Call the enhanced semantic search function that includes text matching
    const functionName =
      viewMode === "people"
        ? "semantic_search_people"
        : "semantic_search_books";

    const { data, error } = await supabase.rpc(functionName, {
      embedding_input: embedding || null,
      search_query: query,
      match_count: 500,
      min_similarity: 0.85,
    });

    if (error) {
      console.error("Search error:", error);
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
