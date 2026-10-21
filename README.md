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
| Follow-ups / tracking | `schedule_follow_up`, `get_application_status`; `/applications` page; WhatsApp reminders sent by the server (`app/api/cron/reminders`) |
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

## Server persistence & WhatsApp reminders (optional)

Without any configuration everything stays on the device (localStorage). To keep applications on the
server and send the citizen real follow-up reminders:

1. **Database**: set `DATABASE_URL` in `.env.local`.
   * Local dev: `DATABASE_URL=file:./data/jansahay.db` (SQLite through Node's built-in `node:sqlite`,
     Node ≥ 22.5, nothing extra to install).
   * Production / Vercel: a [Neon](https://neon.tech) Postgres URL (`postgresql://…neon.tech/neondb?sslmode=require`).

   Tables (`citizens`, `applications`, `follow_ups`, `otp_codes`) are created automatically on first use
   (see `lib/server/db.server.ts`). Citizens are keyed by their verified mobile.
2. **Verify the mobile**: Settings → WhatsApp Connect sends an OTP (`/api/whatsapp/send-otp`), and
   `/api/whatsapp/verify-otp` sets a signed httpOnly session cookie (`SESSION_SECRET`). The consent
   checkbox on that screen is the **only** way to opt in to reminders. The citizen can switch it off there
   at any time, and "Disconnect" withdraws it.
3. **Sync**: once signed in, `contexts/UserDataContext.tsx` pushes the device's profile, applications
   and follow-ups to `/api/user/sync` and pulls back anything stored from another device. New
   submissions (`POST /api/applications`) are written straight to the database for signed-in citizens.
4. **Reminder sender**: `GET /api/cron/reminders` sends every open follow-up due within the next 24 h
   to citizens who opted in, in their language. `vercel.json` runs it daily at 09:00 IST. Set
   `CRON_SECRET` (Vercel sends it as a Bearer token). To try it locally, `asOf` pretends "now" is that
   date and always runs as a dry run:

   ```bash
   curl "http://localhost:3000/api/cron/reminders?asOf=2026-12-01"
   ```

5. **Provider**: `NOTIFY_PROVIDER` picks the sender behind one interface (`lib/server/notify.server.ts`):
   `console` (default: dry run, messages are only logged and the demo OTP is `123456`), `whatsapp` (Meta
   WhatsApp Business Cloud API), `twilio` or `msg91`. Their settings are listed in `.env.example`.
   WhatsApp only delivers business-initiated messages through approved templates, so register an OTP
   template and a reminder template (body `{{1}}` = task, `{{2}}` = due date) in each language you use.
   The live providers have not been tested against real accounts yet, so check them with your own
   credentials first.

## Privacy

Only the last 4 digits of Aadhaar / bank account are ever stored. On the server, any long digit run in a
form field is masked to `XXXX1234` before it is written. Without a database, profile, applications and
reminders are kept only in the browser's localStorage on the citizen's device. Application status progression is
simulated (there is no public government status API).
