import { NextRequest, NextResponse } from "next/server";
import { schemes } from "@/lib/data/schemes";

const savedSchemeIds = new Set(["pm-kisan", "ayushman-bharat", "pmay"]);

export async function GET() {
  const saved = schemes.filter(s => savedSchemeIds.has(s.id));
  return NextResponse.json({ success: true, data: saved, count: saved.length });
}

export async function POST(req: NextRequest) {
  try {
    const { schemeId, action } = await req.json() as { schemeId: string; action: "save" | "unsave" };
    if (!schemeId) return NextResponse.json({ success: false, error: "schemeId required" }, { status: 400 });
    action === "save" ? savedSchemeIds.add(schemeId) : savedSchemeIds.delete(schemeId);
    return NextResponse.json({ success: true, saved: savedSchemeIds.has(schemeId), message: `Scheme ${action}d` });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
