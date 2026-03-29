import { NextRequest, NextResponse } from "next/server";

// In-memory store (replace with DB in production)
let userProfile = {
  id: "user-001",
  name: "Ramesh Kumar Sharma",
  age: 42,
  gender: "Male",
  mobile: "9876543210",
  email: "",
  state: "Uttar Pradesh",
  district: "Varanasi",
  occupation: "Farmer",
  income: "1–3 lakh",
  category: "OBC",
  landholding: "1–2",
  bpl: false,
  aadhaar_last4: "3456",
  language: "hi",
  whatsapp_connected: false,
  digilocker_connected: false,
  createdAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json({ success: true, data: userProfile });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    userProfile = { ...userProfile, ...body, id: "user-001" };
    return NextResponse.json({ success: true, data: userProfile, message: "Profile updated" });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }
}
