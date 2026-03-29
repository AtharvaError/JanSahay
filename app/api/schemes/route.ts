import { NextRequest, NextResponse } from "next/server";
import { schemes } from "@/lib/data/schemes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const category = searchParams.get("category")?.toLowerCase() ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  let results = [...schemes];
  if (q) results = results.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  if (category) results = results.filter(s => s.category === category);

  const total = results.length;
  const paginated = results.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ success: true, data: paginated, total, page, limit }, { status: 200 });
}
