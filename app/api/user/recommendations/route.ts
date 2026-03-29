import { NextResponse } from "next/server";
import { schemes } from "@/lib/data/schemes";

export async function GET() {
  // Sort by match percentage, filter open/closing-soon
  const recommendations = schemes
    .filter(s => s.status !== "closed")
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, 4);

  return NextResponse.json({
    success: true,
    data: recommendations,
    profile_match: "87%",
    based_on: ["occupation", "income", "category", "state"],
  });
}
