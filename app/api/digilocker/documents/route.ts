import { NextResponse } from "next/server";

// Mock DigiLocker document fetch
// In production: OAuth2 flow with https://api.digitallocker.gov.in/
const digilockerDocs = [
  { id: "aadhaar", name: "Aadhaar Card", issuer: "UIDAI", docType: "ADHAR", issuedOn: "2023-01-15", verified: true, fileUrl: "#" },
  { id: "pan", name: "PAN Card", issuer: "Income Tax Department", docType: "PANCR", issuedOn: "2022-08-20", verified: true, fileUrl: "#" },
  { id: "dl", name: "Driving Licence", issuer: "Ministry of Road Transport & Highways", docType: "DRILIC", issuedOn: "2024-03-10", verified: true, fileUrl: "#" },
  { id: "income-cert", name: "Income Certificate", issuer: "State Government - UP", docType: "INCCRT", issuedOn: "2024-11-01", verified: true, fileUrl: "#" },
  { id: "caste-cert", name: "Caste Certificate", issuer: "District Collector - Varanasi", docType: "CSCAST", issuedOn: "2024-09-15", verified: false, fileUrl: "#" },
  { id: "birth-cert", name: "Birth Certificate", issuer: "Municipal Corporation Varanasi", docType: "BRTCRT", issuedOn: "2023-06-22", verified: true, fileUrl: "#" },
];

export async function GET() {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 500));
  return NextResponse.json({
    success: true,
    data: digilockerDocs,
    total: digilockerDocs.length,
    source: "DigiLocker — Government of India",
    fetchedAt: new Date().toISOString(),
  });
}
