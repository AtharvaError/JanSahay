import { NextRequest, NextResponse } from "next/server";
import { documents } from "@/lib/data/schemes";
import type { Document } from "@/lib/data/schemes";

const docStore: Document[] = [...documents];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const schemeId = searchParams.get("schemeId");

  let results = [...docStore];
  if (status) results = results.filter(d => d.status === status);
  if (schemeId) results = results.filter(d => d.schemeId === schemeId);

  const stats = {
    total: results.length,
    verified: results.filter(d => d.status === "verified").length,
    pending: results.filter(d => d.status === "pending").length,
    needsAction: results.filter(d => d.status === "needs-action").length,
  };

  return NextResponse.json({ success: true, data: results, stats });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<Document>;
    const newDoc: Document = {
      id: `d-${Date.now()}`,
      name: body.name ?? "Unknown",
      type: body.type ?? "PDF",
      size: body.size ?? "0 KB",
      status: "pending",
      uploadedAt: new Date().toLocaleDateString("en-IN"),
      schemeId: body.schemeId,
    };
    docStore.unshift(newDoc);
    return NextResponse.json({ success: true, data: newDoc, message: "Document uploaded" }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 400 });
  }
}
