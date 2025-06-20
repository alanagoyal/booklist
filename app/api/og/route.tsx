import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "edge";

interface BookData {
  id: string;
  title: string;
  author: string;
  description?: string;
  genres?: string[];
}

interface PersonData {
  id: string;
  full_name: string;
  type?: string;
  description?: string;
}

const primaryTextColor = "hsl(151, 80%, 90%)";
const mutedTextColor = "hsl(151, 35%, 75%)";
const backgroundColor = "hsl(160, 84%, 5%)";
const booklistTextColor = "white";
const booklistColor = "hsl(151, 80%, 70%)";

async function fetchBookData(id: string): Promise<BookData | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, description, genre")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      author: data.author,
      description: data.description,
      genres: data.genre,
    };
  } catch (error) {
    console.error("Error fetching book data:", error);
    return null;
  }
}

async function fetchPersonData(id: string): Promise<PersonData | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("people")
      .select("id, full_name, type, description")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      full_name: data.full_name,
      type: data.type,
      description: data.description,
    };
  } catch (error) {
    console.error("Error fetching person data:", error);
    return null;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  console.log("OG API called with key:", key);

  try {
    // Load font with better error handling
    let fontData: ArrayBuffer;
    try {
      const fontUrl = process.env.NEXT_PUBLIC_VERCEL_URL
        ? new URL(
            "/booklist/fonts/SpecialElite-Regular.ttf",
            process.env.NEXT_PUBLIC_VERCEL_URL
          )
        : new URL(
            "/booklist/fonts/SpecialElite-Regular.ttf",
            "http://localhost:3001"
          );

      console.log("Loading font from:", fontUrl.toString());
      const fontResponse = await fetch(fontUrl);
      if (!fontResponse.ok) {
        throw new Error(`Font fetch failed: ${fontResponse.status}`);
      }
      fontData = await fontResponse.arrayBuffer();
      console.log("Font loaded successfully, size:", fontData.byteLength);
    } catch (fontError) {
      console.error("Font loading error:", fontError);
      // Continue without custom font
      fontData = new ArrayBuffer(0);
    }

    // Extract ID from key parameter (format: "id--timestamp")
    const entityId = key?.split("--")[0];
    console.log("Extracted entity ID:", entityId);

    let bookData: BookData | null = null;
    let personData: PersonData | null = null;

    if (entityId) {
      try {
        console.log("Attempting to fetch book data for ID:", entityId);
        // Try to fetch as book first, then as person
        bookData = await fetchBookData(entityId);
        console.log("Book data result:", bookData ? "found" : "not found");

        if (!bookData) {
          console.log("Attempting to fetch person data for ID:", entityId);
          personData = await fetchPersonData(entityId);
          console.log(
            "Person data result:",
            personData ? "found" : "not found"
          );
        }
      } catch (dbError) {
        console.error("Database query error:", dbError);
        // Continue to default image
      }
    }

    // Generate appropriate image based on data type
    if (bookData) {
      console.log("Generating book OG image for:", bookData.title);
      return new ImageResponse(
        (
          <div
            style={{
              background: backgroundColor,
              color: primaryTextColor,
              fontFamily: fontData.byteLength > 0 ? "Special Elite" : "serif",
              width: "100%",
              height: "100%",
              display: "flex",
              position: "relative",
            }}
          >
            {/* Booklist. in top right */}
            <div
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                fontSize: 48,
                color: booklistTextColor,
              }}
            >
              Booklist.
            </div>

            {/* Book content in bottom left */}
            <div
              style={{
                position: "absolute",
                bottom: "80px",
                left: "40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                maxWidth: "1040px", // 1200 - 160px (40px margins on each side)
              }}
            >
              {/* Title */}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: "bold",
                  marginBottom: 80,
                  color: primaryTextColor,
                }}
              >
                {truncateText(bookData.title, 50)}
              </div>

              {/* Author */}
              <div
                style={{
                  fontSize: 42,
                  color: mutedTextColor,
                  marginBottom: 40,
                }}
              >
                {truncateText(bookData.author, 40)}
              </div>

              {/* Genres */}
              {bookData.genres && bookData.genres.length > 0 && (
                <div
                  style={{
                    fontSize: 32,
                    color: mutedTextColor,
                    marginBottom: 40,
                  }}
                >
                  {bookData.genres.slice(0, 3).join(" / ")}
                </div>
              )}

              {/* Description */}
              {bookData.description && (
                <div
                  style={{
                    fontSize: 24,
                    color: primaryTextColor,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.4,
                  }}
                >
                  {truncateText(bookData.description, 200)}
                </div>
              )}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          fonts:
            fontData.byteLength > 0
              ? [
                  {
                    name: "Special Elite",
                    data: fontData,
                    style: "normal",
                  },
                ]
              : [],
        }
      );
    }

    if (personData) {
      console.log("Generating person OG image for:", personData.full_name);
      return new ImageResponse(
        (
          <div
            style={{
              background: backgroundColor,
              color: primaryTextColor,
              fontFamily: fontData.byteLength > 0 ? "Special Elite" : "serif",
              width: "100%",
              height: "100%",
              display: "flex",
              position: "relative",
            }}
          >
            {/* Booklist. in top right */}
            <div
              style={{
                position: "absolute",
                top: "40px",
                right: "40px",
                fontSize: 48,
                color: booklistTextColor,
              }}
            >
              Booklist.
            </div>

            {/* Person content in bottom left */}
            <div
              style={{
                position: "absolute",
                bottom: "100px",
                left: "40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                maxWidth: "1040px", // 1200 - 160px (40px margins on each side)
              }}
            >
              {/* Name */}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: "bold",
                  marginBottom: 20,
                  color: primaryTextColor,
                }}
              >
                {truncateText(personData.full_name, 50)}
              </div>

              {/* Type */}
              <div
                style={{
                  fontSize: 48,
                  color: mutedTextColor,
                  marginBottom: 40,
                }}
              >
                {truncateText(personData.type || "", 40)}
              </div>

              {/* Description */}
              {personData.description && (
                <div
                  style={{
                    fontSize: 24,
                    color: primaryTextColor,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.4,
                  }}
                >
                  {truncateText(personData.description, 400)}
                </div>
              )}
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          fonts:
            fontData.byteLength > 0
              ? [
                  {
                    name: "Special Elite",
                    data: fontData,
                    style: "normal",
                  },
                ]
              : [],
        }
      );
    }

    // Default fallback image
    console.log("Generating default OG image");
    return new ImageResponse(
      (
        <div
          style={{
            background: booklistColor,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: "bold",
              color: booklistTextColor,
              fontFamily: fontData.byteLength > 0 ? "Special Elite" : "serif",
            }}
          >
            Booklist.
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts:
          fontData.byteLength > 0
            ? [
                {
                  name: "Special Elite",
                  data: fontData,
                  style: "normal",
                },
              ]
            : [],
      }
    );
  } catch (error) {
    console.error("OG image generation error:", error);

    // Return a simple fallback image on any error
    return new ImageResponse(
      (
        <div
          style={{
            background: booklistColor,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: "bold",
              color: booklistTextColor,
            }}
          >
            Booklist.
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
