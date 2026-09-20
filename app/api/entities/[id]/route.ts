import { getEntity } from "@/utils/catalog-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getEntity(id);
  return detail
    ? Response.json(detail)
    : Response.json({ error: "Item not found" }, { status: 404 });
}
