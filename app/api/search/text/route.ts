import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();

export async function POST(req: NextRequest) {
  try {
    const { query, viewMode } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Call text-only search function - much faster than semantic search
    const functionName =
      viewMode === "people"
        ? "text_search_people"
        : "text_search_books";

    const { data, error } = await supabase.rpc(functionName, {
      search_query: query,
      match_count: 100, // Fewer results for instant search
    });

    if (error) {
      console.error("Text search error:", error);
      return NextResponse.json(
        {
          error: "Text search failed",
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