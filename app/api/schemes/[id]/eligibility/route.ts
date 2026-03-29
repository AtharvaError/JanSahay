import { NextRequest, NextResponse } from "next/server";
import { schemes } from "@/lib/data/schemes";

interface UserProfile {
  age?: number;
  occupation?: string;
  income?: string;
  category?: string;
  landholding?: string;
  bpl?: boolean;
  state?: string;
}

function checkEligibility(schemeId: string, profile: UserProfile) {
  const scheme = schemes.find(s => s.id === schemeId);
  if (!scheme) return { eligible: false, score: 0, reasons: ["Scheme not found"] };

  const passed: string[] = [];
  const failed: string[] = [];

  // Rule engine per scheme
  switch (schemeId) {
    case "pm-kisan":
      if (profile.occupation?.toLowerCase().includes("farm")) passed.push("Farmer occupation ✓");
      else failed.push("Must be a farmer");
      if (profile.landholding && profile.landholding !== "More than 5") passed.push("Land holding within limit ✓");
      else failed.push("Land holding must be ≤ 2 hectares");
      break;
    case "ayushman-bharat":
      if (profile.bpl) passed.push("BPL card holder ✓");
      else failed.push("BPL card required");
      passed.push("No age restriction ✓");
      break;
    case "pmay":
      if (parseInt(String(profile.income ?? "0")) < 18) passed.push("Income within limit ✓");
      passed.push("First-time buyer criteria assumed ✓");
      break;
    case "nsp":
      if (profile.category && profile.category !== "General") passed.push(`${profile.category} category eligible ✓`);
      else failed.push("SC/ST/OBC/Minority category required");
      break;
    default:
      passed.push("Basic eligibility met ✓");
  }

  const score = Math.round((passed.length / Math.max(passed.length + failed.length, 1)) * 100);
  return { eligible: score >= 50, score, passed, failed, scheme: { id: scheme.id, title: scheme.title } };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json() as UserProfile;
    const result = checkEligibility(id, body);
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
