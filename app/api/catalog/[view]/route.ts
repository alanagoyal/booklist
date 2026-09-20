import { getCatalog } from "@/utils/catalog-server";

// Generate the two catalogs as static responses. View switches can use the
// CDN rather than a function serving a multi-megabyte JSON response.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ view: "books" }, { view: "people" }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ view: string }> },
) {
  const { view } = await params;
  if (view !== "books" && view !== "people") {
    return Response.json({ error: "Unknown catalog" }, { status: 404 });
  }
  return Response.json(await getCatalog(view));
}
