// Lightweight multilingual understanding for the offline agent.
// Extracts profile facts from Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada and English
// (including Hinglish / romanised input and native-script digits).
import { schemes } from "@/lib/data/schemes";
import type { AskField } from "./i18n";
import type { UserProfile } from "./types";

const DIGIT_BLOCKS = [0x0966, 0x09e6, 0x0ae6, 0x0be6, 0x0c66, 0x0ce6]; // Devanagari, Bengali, Gujarati, Tamil, Telugu, Kannada

export function normalizeDigits(text: string): string {
  return text.replace(/[०-९০-৯૦-૯௦-௯౦-౯೦-೯]/g, ch => {
    const code = ch.charCodeAt(0);
    const base = DIGIT_BLOCKS.find(b => code >= b && code <= b + 9)!;
    return String(code - base);
  });
}

const any = (text: string, words: (string | RegExp)[]) =>
  words.some(w => (typeof w === "string" ? text.includes(w) : w.test(text)));

// ─── Vocabulary ──────────────────────────────────────────────────────────────

const OCCUPATIONS: [UserProfile["occupation"], (string | RegExp)[]][] = [
  ["govt_employee", ["government job", "govt job", "sarkari naukri", "सरकारी नौकरी", "सरकारी कर्मचारी", "सरकारी नोकरी"]],
  ["farmer", [/\bfarm/, /\bkisan/, "किसान", "खेती", "कृषक", "शेतकरी", "शेती", "কৃষক", "চাষি", "চাষ", "விவசாய", "రైతు", "వ్యవసాయ", "ખેડૂત", "ખેતી", "ರೈತ", "ಕೃಷಿ"]],
  ["student", [/\bstudent/, /\bstudy/, /\bpadh/, "छात्र", "विद्यार्थी", "पढ़ाई", "पढ़ता", "पढ़ती", "शिक्षण", "ছাত্র", "ছাত্রী", "পড়াশোনা", "மாணவ", "படிக்கி", "విద్యార్థి", "చదువు", "વિદ્યાર્થી", "ભણ", "ವಿದ್ಯಾರ್ಥಿ", "ಓದು"]],
  ["daily_wage", [/\blabou?r/, /\bmazdoor/, /\bmajdoor/, /daily wage/, "मजदूर", "मज़दूर", "दिहाड़ी", "मजूर", "मजुरी", "শ্রমিক", "মজুর", "கூலி", "కూలీ", "కూలి", "મજૂર", "ಕೂಲಿ"]],
  ["unemployed", [/unemploy/, /no job/, /berozgar/, "बेरोजगार", "बेरोज़गार", "काम नहीं", "नौकरी नहीं", "बेकार", "বেকার", "வேலையில்லை", "வேலை இல்லை", "నిరుద్యోగ", "ఉద్యోగం లేదు", "બેરોજગાર", "ನಿರುದ್ಯೋಗ"]],
  ["business", [/business/, /\bshop/, /dukaan|dukan/, /vyapar/, "दुकान", "व्यापार", "व्यवसाय", "धंधा", "धंदा", "ব্যবসা", "দোকান", "வியாபார", "கடை", "தொழில்", "వ్యాపార", "దుకాణ", "વેપાર", "દુકાન", "ધંધો", "ವ್ಯಾಪಾರ", "ಅಂಗಡಿ"]],
  ["self_employed", [/self.?employ/, /freelanc/, "स्वरोजगार", "खुद का काम", "স্বনির্ভর", "சுயதொழில்", "స్వయం ఉపాధి", "સ્વરોજગાર", "ಸ್ವಉದ್ಯೋಗ"]],
  ["homemaker", [/house ?wife/, /home ?maker/, "गृहिणी", "गृहणी", "घर का काम", "গৃহিণী", "இல்லத்தரசி", "గృహిణి", "ગૃહિણી", "ಗೃಹಿಣಿ"]],
  ["retired", [/retire/, "सेवानिवृत्त", "रिटायर", "নিবৃত্ত", "ஓய்வு", "పదవీ విరమణ", "નિવૃત્ત", "ನಿವೃತ್ತ"]],
  ["private_employee", [/private job/, /\bnaukri\b/, "प्राइवेट नौकरी", "नौकरी करता", "नौकरी करती", "নোকরি", "চাকরি", "வேலை செய்கிறேன்", "ఉద్యోగం చేస్తాను", "નોકરી", "ಉದ್ಯೋಗ"]],
];

const STATES: [string, (string | RegExp)[]][] = [
  ["Uttar Pradesh", [/uttar pradesh/, /\bup\b/, "उत्तर प्रदेश", "यूपी"]],
  ["Madhya Pradesh", [/madhya pradesh/, /\bmp\b/, "मध्य प्रदेश"]],
  ["Andhra Pradesh", [/andhra/, "आंध्र", "ఆంధ్ర", "ஆந்திர"]],
  ["Himachal Pradesh", [/himachal/, "हिमाचल"]],
  ["Arunachal Pradesh", [/arunachal/, "अरुणाचल"]],
  ["West Bengal", [/west bengal|bengal/, "पश्चिम बंगाल", "बंगाल", "পশ্চিমবঙ্গ", "পশ্চিম বঙ্গ", "மேற்கு வங்க", "పశ్చిమ బెంగాల్"]],
  ["Bihar", [/bihar/, "बिहार", "বিহার"]],
  ["Maharashtra", [/maharashtra/, "महाराष्ट्र"]],
  ["Rajasthan", [/rajasthan/, "राजस्थान"]],
  ["Haryana", [/haryana/, "हरियाणा", "हरियाना"]],
  ["Gujarat", [/gujarat/, "गुजरात", "ગુજરાત"]],
  ["Tamil Nadu", [/tamil ?nadu/, "तमिलनाडु", "தமிழ்நா", "தமிழ் நா"]],
  ["Karnataka", [/karnataka/, "कर्नाटक", "ಕರ್ನಾಟಕ"]],
  ["Telangana", [/telangana/, "तेलंगाना", "తెలంగాణ"]],
  ["Kerala", [/kerala/, "केरल", "கேரள", "ಕೇರಳ"]],
  ["Punjab", [/punjab/, "पंजाब"]],
  ["Odisha", [/odisha|orissa/, "ओडिशा", "उड़ीसा"]],
  ["Jharkhand", [/jharkhand/, "झारखंड", "झारखण्ड"]],
  ["Chhattisgarh", [/chhattisgarh/, "छत्तीसगढ़"]],
  ["Assam", [/assam/, "असम", "অসম"]],
  ["Delhi", [/delhi/, "दिल्ली"]],
  ["Uttarakhand", [/uttarakhand/, "उत्तराखंड"]],
  ["Jammu & Kashmir", [/kashmir/, "कश्मीर"]],
  ["Goa", [/\bgoa\b/, "गोवा"]],
];

/** Canonical English state name for any spelling/script we recognise (e.g. "उत्तर प्रदेश", "UP"). */
export function normalizeState(text: string): string | undefined {
  const t = normalizeDigits(text).toLowerCase();
  for (const [state, words] of STATES) if (state.toLowerCase() === t || any(t, words)) return state;
  return undefined;
}

const YES = [/^(yes|yeah|yep|haan?|ha|ji|hanji|ho)\b/, "हाँ", "हां", "जी", "होय", "हो ", "হ্যাঁ", "হাঁ", "ஆம்", "ஆமா", "అవును", "హా", "હા", "ಹೌದು"];
const NO = [/^(no|nope|nahi|nahin|nai|na)\b/, "नहीं", "नही", "नाही", "ना ", "না", "নেই", "இல்லை", "లేదు", "కాదు", "ના", "નથી", "ಇಲ್ಲ"];

export function yesNo(text: string): boolean | undefined {
  const t = ` ${text.toLowerCase().trim()} `;
  const tt = text.toLowerCase().trim();
  if (any(tt, NO) || any(t, NO)) return false;
  if (any(tt, YES) || any(t, YES)) return true;
  return undefined;
}

// ─── Number parsing (lakh / thousand / monthly) ──────────────────────────────

const MONEY_UNIT = "lakh|lac|लाख|লাখ|லட்ச|లక్ష|લાખ|ಲಕ್ಷ|हजार|हज़ार|thousand|k\\b|হাজার|ஆயிரம்|వేల|వెయ్యి|હજાર|ಸಾವಿರ|crore|करोड़|रुपये|रुपए|rupees|rs\\b";
const INCOME_WORD = "income|kamai|aamdani|आय|आमदनी|कमाई|उत्पन्न|আয়|வருமான|ఆదాయ|આવક|ಆದಾಯ";

function parseMoney(text: string, strict = false): number | undefined {
  const t = text.toLowerCase().replace(/,/g, "");
  // Prefer "<number> <money unit>", then "₹<number>", then "<income word> … <number>".
  const m =
    t.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${MONEY_UNIT})`)) ??
    t.match(/₹\s*(\d+(?:\.\d+)?)()/) ??
    t.match(new RegExp(`(?:${INCOME_WORD})\\D{0,20}?(\\d+(?:\\.\\d+)?)()`)) ??
    (strict ? null : t.match(/(\d+(?:\.\d+)?)()/));
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  const unit = m[2] ?? "";
  if (/lakh|lac|लाख|লাখ|லட்ச|లక్ష|લાખ|ಲಕ್ಷ/.test(unit)) n *= 100000;
  else if (/हजार|हज़ार|thousand|^k$|হাজার|ஆயிரம்|వేల|వెయ్యి|હજાર|ಸಾವಿರ/.test(unit)) n *= 1000;
  else if (/crore|करोड़/.test(unit)) n *= 10000000;
  const monthly = /month|mahin|महीन|मासिक|महिन|মাস|மாத|నెల|મહિન|ತಿಂಗಳ|per ?m|\/m/.test(t);
  return Math.round(monthly ? n * 12 : n);
}

function parseLand(text: string): number | undefined {
  const t = text.toLowerCase();
  const units = "hectare|हेक्टेयर|हेक्टर|হেক্টর|ஹெக்டேர்|హెక్టార్|હેક્ટર|ಹೆಕ್ಟೇರ್|ha\\b|acre|एकड़|एकर|একর|ஏக்கர்|ఎకర|એકર|ಎಕರೆ|bigha|बीघा|বিঘা|વીઘા|guntha|गुंठा";
  // Prefer a number that carries a land unit; a bare number only when the whole answer is a number.
  const m = t.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${units})`)) ?? t.match(/^\s*(\d+(?:\.\d+)?)\s*()$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const u = m[2] ?? "";
  if (/acre|एकड़|एकर|একর|ஏக்கர்|ఎకర|એકર|ಎಕರೆ/.test(u)) return +(n * 0.405).toFixed(2);
  if (/bigha|बीघा|বিঘা|વીઘા/.test(u)) return +(n * 0.25).toFixed(2);
  if (/guntha|गुंठा/.test(u)) return +(n * 0.0101).toFixed(2);
  return n;
}

// ─── Extraction ──────────────────────────────────────────────────────────────

export function extractFacts(raw: string, asked?: AskField): Partial<UserProfile> {
  const text = normalizeDigits(raw);
  const t = text.toLowerCase();
  const out: Partial<UserProfile> = {};

  for (const [occ, words] of OCCUPATIONS) if (any(t, words)) { out.occupation = occ; break; }
  for (const [state, words] of STATES) if (any(t, words)) { out.state = state; break; }

  // Gender
  if (any(t, [/\b(female|woman|lady|girl)\b/, "महिला", "औरत", "स्त्री", "छात्रा", "पढ़ती", "विधवा", "गृहिणी", "मुलगी", "बाई", "মহিলা", "নারী", "ছাত্রী", "பெண்", "స్త్రీ", "మహిళ", "સ્ત્રી", "મહિલા", "ಮಹಿಳೆ", "ಹೆಣ್ಣು"]))
    out.gender = "female";
  else if (any(t, [/\b(male|man|boy)\b/, "पुरुष", "आदमी", "লোক", "পুরুষ", "ஆண்", "పురుష", "પુરુષ", "ಪುರುಷ"]))
    out.gender = "male";

  // Age
  const ageM = t.match(/(\d{1,3})\s*(?:years?|yrs?|साल|वर्ष|वर्षे|वय|বছর|வயது|ஆண்டு|ఏళ్ళ|ఏళ్ల|సంవత్సర|વર્ષ|ವರ್ಷ)/) ??
    t.match(/(?:age|umar|umr|उम्र|आयु|वय|বয়স|வயது|వయస్సు|ઉંમર|ವಯಸ್ಸು)\D{0,6}(\d{1,3})/);
  if (ageM) out.age = parseInt(ageM[1], 10);

  // Category
  if (/\bobc\b|ओबीसी|पिछड़ा|पिछड़ी|इतर मागास/.test(t)) out.category = "obc";
  else if (/\bst\b|अनुसूचित जनजाति|आदिवासी|जनजाति|আদিবাসী|பழங்குடி|గిరిజన|આદિવાસી|ಪರಿಶಿಷ್ಟ ಪಂಗಡ/.test(t)) out.category = "st";
  else if (/\bsc\b|अनुसूचित जाति|दलित|তফসিলি|ஆதிதிராவிடர்|దళిత|ದಲಿತ/.test(t)) out.category = "sc";
  else if (/minority|अल्पसंख्य|সংখ্যালঘু|சிறுபான்மை|మైనారిటీ|લઘુમતી|ಅಲ್ಪಸಂಖ್ಯಾತ/.test(t)) out.category = "minority";
  else if (/\bgeneral\b|सामान्य|जनरल|खुला|সাধারণ|பொது|జనరల్|સામાન્ય|ಸಾಮಾನ್ಯ/.test(t)) out.category = "general";

  // Income & land (with units in the sentence)
  if (/(income|kamai|aamdani|आय|आमदनी|कमाई|उत्पन्न|কামাই|আয়|வருமான|ఆదాయ|આવક|ಆದಾಯ|lakh|लाख|हजार|हज़ार|thousand|₹|rs\.?|रुपये|rupees)/.test(t)) {
    const money = parseMoney(t.replace(/\d+\s*(साल|वर्ष|years?)/g, ""), true);
    if (money !== undefined && money >= 1000) out.annualIncome = money;
  }
  if (/(acre|एकड़|एकर|hectare|हेक्टेयर|हेक्टर|bigha|बीघा|guntha|गुंठा|জমি|বিঘা|ஏக்கர்|ఎకర|એકર|વીઘા|ಎಕರೆ|ज़मीन|जमीन|land)/.test(t)) {
    const land = parseLand(t);
    if (land !== undefined) out.landHectares = land;
    else if (/(no land|ज़मीन नहीं|जमीन नहीं)/.test(t)) out.landHectares = 0;
  }

  // Booleans / statuses
  if (/\bbpl\b|बीपीएल|गरीबी रेखा|अंत्योदय|antyodaya/.test(t)) out.bpl = !/(नहीं|no|not|nahi|नाही)/.test(t);
  if (/disab|handicap|विकलांग|दिव्यांग|অক্ষম|প্রতিবন্ধ|மாற்றுத்திறன்|వికలాంగ|દિવ્યાંગ|ಅಂಗವಿಕಲ/.test(t)) out.disability = !/(नहीं|no|not|nahi|नाही)/.test(t);
  if (/widow|विधवा|বিধবা|விதவை|వితంతు|વિધવા|ವಿಧವೆ/.test(t)) out.maritalStatus = "widow";
  else if (/divorc|तलाक|घटस्फोट|বিবাহবিচ্ছেদ|விவாகரத்து|విడాకు|છૂટાછેડા|ವಿಚ್ಛೇದ/.test(t)) out.maritalStatus = "divorced";
  else if (/separat|परित्यक्त/.test(t)) out.maritalStatus = "separated";
  else if (/unmarried|अविवाहित|कुंवारा|कुंवारी|অবিবাহিত|திருமணமாகாத|అవివాహిత|અપરિણીત|ಅವಿವಾಹಿತ/.test(t)) out.maritalStatus = "unmarried";
  else if (/married|विवाहित|शादीशुदा|बिवाहित|বিবাহিত|திருமணமான|వివాహిత|પરિણીત|ವಿವಾಹಿತ/.test(t)) out.maritalStatus = "married";

  if (/kutcha|kachcha|कच्चा|कच्चे|झोपड़ी|কাঁচা|குடிசை|కచ్చా|ગારાનું|કાચું|ಕಚ್ಚಾ/.test(t)) out.houseType = "kutcha";
  else if (/rent|किराय|भाड्या|ভাড়া|வாடகை|అద్దె|ભાડ|ಬಾಡಿಗೆ/.test(t)) out.houseType = "rented";
  else if (/no house|घर नहीं|बेघर|घर नाही|বাড়ি নেই|வீடு இல்லை|ఇల్లు లేదు|ઘર નથી|ಮನೆ ಇಲ್ಲ/.test(t)) out.houseType = "none";
  else if (/pucca|pakka|पक्का|पक्के|পাকা|கான்கிரீட்|పక్కా|પાકું|ಪಕ್ಕಾ/.test(t)) out.houseType = "pucca";

  if (/daughter|beti|बेटी|मुलगी|কন্যা|মেয়ে|மகள்|కూతురు|దీకరి|દીકરી|ಮಗಳು/.test(t)) {
    out.hasGirlChild = !/(नहीं|no |nahi|नाही|না|இல்லை|లేదు|નથી|ಇಲ್ಲ)/.test(t);
    const ga = t.match(/(\d{1,2})\s*(?:साल|वर्ष|years?|वर्षांची|বছর|வயது|ఏళ్ళ|વર્ષ|ವರ್ಷ)/);
    if (ga && out.hasGirlChild) { out.girlChildAge = parseInt(ga[1], 10); delete out.age; }
  }
  if (/\bshg\b|self.?help|स्वयं सहायता|बचत गट|স্বনির্ভর গোষ্ঠী|சுய உதவி|స్వయం సహాయక|સ્વસહાય|ಸ್ವಸಹಾಯ/.test(t)) out.shgMember = !/(नहीं|no|not|nahi|नाही)/.test(t);
  if (/bank (account|khata)|बैंक खाता|बँक खाते|ব্যাংক অ্যাকাউন্ট|வங்கிக் கணக்கு|బ్యాంక్ ఖాతా|બેંક ખાતું|ಬ್ಯಾಂಕ್ ಖಾತೆ|jan dhan|जन धन/.test(t)) out.hasBankAccount = !/(नहीं|no|not|nahi|नाही)/.test(t);

  // Name
  const nameM = text.match(/(?:my name is|i am called|naam|नाम|नाव|নাম|பெயர்|పేరు|નામ|ಹೆಸರು)\s*(?:है|hai|आहे|is|:)?\s*([\p{L}\p{M}][\p{L}\p{M} .]{1,40}?)(?:\s+(?:है|hai|आहे|।|\.|$))/u);
  if (nameM) out.name = nameM[1].trim();

  // Mobile / Aadhaar (only last 4 kept)
  const digits = text.replace(/[\s-]/g, "");
  const aadhaar = digits.match(/(?<!\d)\d{12}(?!\d)/);
  if (aadhaar) out.aadhaarLast4 = aadhaar[0].slice(-4);
  const mobile = digits.match(/(?<!\d)[6-9]\d{9}(?!\d)/);
  if (mobile && !aadhaar) out.mobile = mobile[0];

  // ── Answer to the specific question that was asked ──
  if (asked) applyDirectAnswer(text, asked, out);
  return out;
}

function applyDirectAnswer(text: string, asked: AskField, out: Partial<UserProfile>) {
  const t = text.toLowerCase().trim();
  const num = t.match(/\d+(?:\.\d+)?/);
  const yn = yesNo(t);
  switch (asked) {
    case "age": if (out.age === undefined && num) out.age = parseInt(num[0], 10); break;
    case "girlChildAge": if (num) { out.girlChildAge = parseInt(num[0], 10); delete out.age; } break;
    case "annualIncome":
      if (out.annualIncome === undefined) { const m = parseMoney(t); if (m !== undefined) out.annualIncome = m < 1000 ? m * 1000 : m; }
      break;
    case "landHectares":
      if (out.landHectares === undefined) { const l = parseLand(t); if (l !== undefined) out.landHectares = l; else if (yn === false) out.landHectares = 0; }
      break;
    case "bpl": case "disability": case "hasGirlChild": case "shgMember": case "hasBankAccount":
      if (out[asked] === undefined && yn !== undefined) (out as Record<string, unknown>)[asked] = yn;
      break;
    case "name": case "fatherOrHusbandName": case "district": case "village":
      if (!out[asked]) {
        const cleaned = text.replace(/^(my name is|मेरा नाम|माझे नाव|আমার নাম|என் பெயர்|నా పేరు|મારું નામ|ನನ್ನ ಹೆಸರು)\s*/i, "")
          .replace(/\s*(है|hai|आहे|।|\.)\s*$/, "").trim();
        if (cleaned && cleaned.length <= 60) (out as Record<string, unknown>)[asked] = cleaned;
        if (asked !== "name") delete out.name;
      }
      break;
    case "aadhaarLast4": {
      const d = t.replace(/\D/g, "");
      if (d.length >= 4) out.aadhaarLast4 = d.slice(-4);
      break;
    }
    case "mobile": {
      const d = t.replace(/\D/g, "");
      if (d.length >= 10) out.mobile = d.slice(-10);
      break;
    }
  }
}

export function isSkip(text: string): boolean {
  return /\b(skip|later|pass)\b|छोड़|बाद में|वगळा|নাহ|বাদ|தவிர்|వదిలే|છોડ|ಬಿಡಿ/.test(text.toLowerCase());
}

// ─── Intent detection ────────────────────────────────────────────────────────

const SCHEME_ALIASES: [string, RegExp][] = [
  ["pm-kisan", /pm.?kisan|किसान सम्मान|किसान निधि|সম্মান নিধি|kisan samman/],
  ["ayushman-bharat", /ayushman|आयुष्मान|আয়ুষ্মান|ஆயுஷ்மான்|ఆయుష్మాన్|આયુષ્માન|ಆಯುಷ್ಮಾನ್|pm.?jay|health card|स्वास्थ्य/],
  ["pmay", /awas|आवास|pmay|housing|घर योजना|আবাস|வீட்டுவசதி|ఆవాస్|આવાસ|ವಸತಿ/],
  ["nsp", /scholarship|छात्रवृत्ति|शिष्यवृत्ती|বৃত্তি|உதவித்தொகை|స్కాలర్‌షిప్|શિષ્યવૃત્તિ|ವಿದ್ಯಾರ್ಥಿವೇತನ|nsp/],
  ["pm-mudra", /mudra|मुद्रा|মুদ্রা|முத்ரா|ముద్ర|મુદ્રા|ಮುದ್ರಾ/],
  ["beti-bachao", /beti bachao|बेटी बचाओ|sukanya|सुकन्या/],
  ["stand-up-india", /stand.?up/],
  ["pm-suraksha-bima", /suraksha|सुरक्षा बीमा|pmsby/],
  ["nps-traders", /nps|pension.*trader|व्यापारी पेंशन/],
  ["skill-loan", /skill loan|कौशल ऋण/],
  ["post-matric-scholarship-pwd", /post.?matric|disab.*scholar/],
  ["kanyashree-prakalpa", /kanyashree|कन्याश्री|কন্যাশ্রী/],
  ["bihar-student-credit-card", /student credit|स्टूडेंट क्रेडिट/],
  ["old-age-samman-allowance", /old age|वृद्धावस्था|बुढ़ापा पेंशन/],
  ["mahila-utkarsh-yojana", /utkarsh|उत्कर्ष/],
  ["aapki-beti-hamari-beti", /aapki beti|आपकी बेटी/],
  ["gatidhara", /gatidhara|গতিধারা/],
  ["cm-ekal-nari-pension", /ekal nari|एकल नारी/],
];

export function detectScheme(text: string, offered: string[] = []): string | undefined {
  const t = normalizeDigits(text).toLowerCase();
  for (const [id, re] of SCHEME_ALIASES) if (re.test(t)) return id;
  for (const s of schemes) if (t.includes(s.title.toLowerCase())) return s.id;
  // "1", "पहली", "first", "number 2"
  const ordinals: [number, RegExp][] = [
    [0, /\b(first|1st|one)\b|पहल|पहिल|প্রথম|முதல்|మొదటి|પહેલ|ಮೊದಲ/],
    [1, /\b(second|2nd|two)\b|दूसर|दुसर|দ্বিতীয়|இரண்டாவது|రెండవ|બીજ|ಎರಡನೇ/],
    [2, /\b(third|3rd|three)\b|तीसर|तिसर|তৃতীয়|மூன்றாவது|మూడవ|ત્રીજ|ಮೂರನೇ/],
  ];
  const n = t.match(/^\s*(\d)\b/) ?? t.match(/(?:number|no\.?|नंबर|क्रमांक)\s*(\d)/);
  if (n) return offered[parseInt(n[1], 10) - 1];
  for (const [i, re] of ordinals) if (re.test(t)) return offered[i];
  return undefined;
}

export type Intent = "status" | "documents" | "reset" | "apply" | null;

export function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/\b(status|track)\b|स्थिति|स्टेटस|ट्रैक|स्थिती|অবস্থা|நிலை|స్థితి|સ્થિતિ|ಸ್ಥಿತಿ/.test(t)) return "status";
  if (/\b(start over|reset|restart)\b|फिर से शुरू|नए सिरे/.test(t)) return "reset";
  if (/document|दस्तावेज|कागज|कागदपत्र|কাগজ|নথি|ஆவண|పత్రా|દસ્તાવેજ|ದಾಖಲೆ/.test(t)) return "documents";
  if (/\bapply\b|आवेदन|अर्ज|আবেদন|விண்ணப்ப|దరఖాస్తు|અરજી|ಅರ್ಜಿ/.test(t)) return "apply";
  return null;
}
