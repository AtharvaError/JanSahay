# JanSahay — Scheme Saathi (PS-01)

A voice-first welfare-scheme agent for Indian citizens. It talks in **Hindi and regional languages**
(Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, English) by **voice or text**, works out
which government schemes the citizen qualifies for, builds a personalised **document checklist**,
**pre-fills the application form**, asks for **human confirmation before anything is submitted**,
and **tracks follow-ups**.

## How the PS-01 requirements map to the code

| Requirement | Where |
|---|---|
| Voice in (speech-to-text) | `lib/voice.ts` → `useSpeechRecognition` (Web Speech API, `hi-IN`, `ta-IN`, …) |
| Voice out (text-to-speech) & hands-free speech-to-speech loop | `lib/voice.ts` → `speak()`; "Voice conversation" mode in `components/agent/SchemeSaathiChat.tsx` |
| Hindi / regional languages | Agent replies in the selected language (`lib/agent/i18n.ts`); understands native script, native digits (४२, ৩), Hinglish, lakh/hazaar, acre/bigha (`lib/agent/nlu.ts`) |
| Tool call: eligibility rules | `check_eligibility` → rules engine for all 18 schemes (`lib/agent/eligibility.ts`) |
| Tool call: form filling | `prefill_application_form` (`lib/agent/documents.ts`, `lib/agent/tools.server.ts`) |
| Document checklist | `get_document_checklist` (personalised; marks DigiLocker-fetchable documents) |
| Follow-ups / tracking | `schedule_follow_up`, `get_application_status`; `/applications` page |
| **Human confirmation before submit** | Agent can only create a *signed draft*. `components/agent/DraftReviewCard.tsx` requires the citizen to review/edit every field and tick a confirmation box; `POST /api/applications` rejects anything without `confirmedByUser: true` (403) or with a tampered draft signature (400). The agent has no submit tool. |

## Agent engines

* **Claude (recommended)** — set `ANTHROPIC_API_KEY` in `.env.local`. `lib/agent/claude.ts` runs a
  tool-use loop with Claude (`claude-opus-5-5`) over the same tools, replying in the user's language.
* **Offline** — with no key, `lib/agent/offline.ts` runs a deterministic multilingual agent that calls
  the same tools. The tool calls are shown as chips under each reply in both modes.

## Running

```bash
npm install
cp .env.example .env.local   # optionally add ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000/eligibility. Use **Chrome or Edge** for voice. Hindi voices ship with
Chrome/Edge; for other languages install the OS language voice pack (or use Edge's online voices).

## Privacy

Only the last 4 digits of Aadhaar / bank account are ever stored. Profile, applications and reminders
are kept in the browser's localStorage on the citizen's device. Application status progression is
simulated (there is no public government status API).
