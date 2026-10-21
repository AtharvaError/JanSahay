import { NextRequest, NextResponse } from "next/server";
import type { ApplicationStatus, TrackedApplication } from "@/lib/agent/types";

// Simulated department-side progression (no public government status API is available).
// submitted → under_verification (after 30 s) → approved (after 3 min) — demo-speed timings.
const STEPS: { after: number; status: ApplicationStatus; note: string }[] = [
  { after: 30_000, status: "under_verification", note: "Documents received by the department; verification in progress" },
  { after: 180_000, status: "approved", note: "Application approved — benefit will be credited by DBT" },
];

export async function POST(req: NextRequest) {
  let apps: TrackedApplication[];
  try {
    apps = (await req.json()).applications ?? [];
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const now = Date.now();
  const updated = apps.map((app): TrackedApplication => {
    if (app.status === "rejected" || app.status === "action_required") return app;
    const elapsed = now - new Date(app.submittedAt).getTime();
    const timeline = [...app.timeline];
    let status: ApplicationStatus = app.status;
    for (const step of STEPS) {
      if (elapsed >= step.after && !timeline.some(t => t.status === step.status)) {
        timeline.push({
          status: step.status,
          at: new Date(new Date(app.submittedAt).getTime() + step.after).toISOString(),
          note: step.note,
        });
        status = step.status;
      }
    }
    return { ...app, status, timeline };
  });

  return NextResponse.json({ success: true, data: updated });
}
