import { NextRequest, NextResponse } from "next/server";
import { notifications } from "@/lib/data/schemes";

const readSet = new Set<string>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const unread = searchParams.get("unread") === "true";

  let results = notifications.map(n => ({ ...n, read: readSet.has(n.id) }));
  if (type) results = results.filter(n => n.type === type);
  if (unread) results = results.filter(n => !n.read);

  return NextResponse.json({ success: true, data: results, unreadCount: results.filter(n => !n.read).length });
}

export async function POST(req: NextRequest) {
  try {
    const { ids, markAll } = await req.json() as { ids?: string[]; markAll?: boolean };
    if (markAll) notifications.forEach(n => readSet.add(n.id));
    else ids?.forEach(id => readSet.add(id));
    return NextResponse.json({ success: true, message: "Notifications marked as read" });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
