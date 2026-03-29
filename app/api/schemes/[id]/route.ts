import { NextRequest, NextResponse } from "next/server";
import { schemes } from "@/lib/data/schemes";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scheme = schemes.find(s => s.id === id);
  if (!scheme) return NextResponse.json({ success: false, error: "Scheme not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: scheme });
}
