import { NextRequest, NextResponse } from "next/server";

interface ChatMessage { role: "user" | "assistant"; content: string }

// Multilingual knowledge base for scheme guidance
const schemeKnowledge: Record<string, Record<string, string>> = {
  "pm-kisan": {
    en: "PM-KISAN provides ₹6,000 per year to small & marginal farmers in 3 instalments of ₹2,000. You need Aadhaar, land records, and a bank account. Apply at pmkisan.gov.in or your nearest CSC.",
    hi: "PM-KISAN योजना छोटे और सीमांत किसानों को सालाना ₹6,000 देती है, जो 3 किस्तों में ₹2,000 के रूप में आती है। आधार, भूमि रिकॉर्ड और बैंक खाता चाहिए। pmkisan.gov.in पर आवेदन करें।",
  },
  "ayushman-bharat": {
    en: "Ayushman Bharat PM-JAY gives ₹5 lakh health coverage per family per year for hospital treatment. BPL families are eligible. Show your Ayushman card at any empanelled hospital.",
    hi: "आयुष्मान भारत PM-JAY हर परिवार को सालाना ₹5 लाख का स्वास्थ्य बीमा देती है। BPL परिवार पात्र हैं। किसी भी पैनल अस्पताल में आयुष्मान कार्ड दिखाएं।",
  },
};

const genericResponses: Record<string, { en: string; hi: string }> = {
  documents: {
    en: "Commonly required documents are: Aadhaar Card, Income Certificate, Caste Certificate (if applicable), Bank Passbook, and Passport-size photo. You can auto-fetch most from DigiLocker in Settings.",
    hi: "आमतौर पर आवश्यक दस्तावेज: आधार कार्ड, आय प्रमाण पत्र, जाति प्रमाण पत्र, बैंक पासबुक और पासपोर्ट फोटो। अधिकांश दस्तावेज सेटिंग्स में DigiLocker से प्राप्त कर सकते हैं।",
  },
  eligibility: {
    en: "Eligibility depends on your income, occupation, social category, and the specific scheme. Use our Eligibility Checker at /eligibility for a personalized assessment in under 2 minutes.",
    hi: "पात्रता आपकी आय, व्यवसाय, सामाजिक वर्ग और योजना पर निर्भर करती है। व्यक्तिगत मूल्यांकन के लिए /eligibility पर हमारा पात्रता परीक्षक उपयोग करें।",
  },
  deadline: {
    en: "Application deadlines vary by scheme. Check the specific scheme page for exact dates. Enable WhatsApp alerts in Settings to get reminders 7 days before any deadline.",
    hi: "आवेदन की अंतिम तिथि योजना के अनुसार अलग होती है। सटीक तारीखों के लिए विशिष्ट योजना पृष्ठ देखें। अंतिम तिथि से 7 दिन पहले याद दिलाने के लिए WhatsApp अलर्ट चालू करें।",
  },
  default: {
    en: "I'm here to help you find and apply for government schemes. You can ask me about eligibility, required documents, application steps, or specific schemes like PM-KISAN, Ayushman Bharat, or PMAY.",
    hi: "मैं आपको सरकारी योजनाओं को खोजने और आवेदन करने में मदद करने के लिए यहाँ हूँ। आप पात्रता, आवश्यक दस्तावेज, आवेदन चरणों या विशिष्ट योजनाओं के बारे में पूछ सकते हैं।",
  },
};

function getResponse(message: string, lang: string): string {
  const lower = message.toLowerCase();
  const isHindi = lang === "hi" || lang === "mr";
  const langKey = isHindi ? "hi" : "en";

  // Check scheme-specific knowledge
  for (const [key, responses] of Object.entries(schemeKnowledge)) {
    if (lower.includes(key.replace("-", " ")) || lower.includes(key.replace("-", ""))) {
      return responses[langKey] ?? responses.en;
    }
  }

  // Topic matching
  if (lower.includes("document") || lower.includes("doc") || lower.includes("कागज") || lower.includes("दस्तावेज")) {
    return genericResponses.documents[langKey];
  }
  if (lower.includes("eligible") || lower.includes("eligib") || lower.includes("पात्र")) {
    return genericResponses.eligibility[langKey];
  }
  if (lower.includes("deadline") || lower.includes("last date") || lower.includes("अंतिम")) {
    return genericResponses.deadline[langKey];
  }

  return genericResponses.default[langKey];
}

export async function POST(req: NextRequest) {
  try {
    const { message, lang = "en", schemeId, history = [] } = await req.json() as {
      message: string;
      lang?: string;
      schemeId?: string;
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    // Simulate AI processing delay
    await new Promise(r => setTimeout(r, 300));

    let response = getResponse(message, lang);

    // Add scheme-specific context
    if (schemeId && schemeKnowledge[schemeId]) {
      const isHindi = lang === "hi" || lang === "mr";
      const extra = schemeKnowledge[schemeId][isHindi ? "hi" : "en"];
      if (extra && !response.includes(extra.slice(0, 20))) {
        response = extra;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: response,
        lang,
        timestamp: new Date().toISOString(),
        sessionId: `chat-${Date.now()}`,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "AI service unavailable" }, { status: 500 });
  }
}
