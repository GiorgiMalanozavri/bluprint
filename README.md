# bluprint

bluprint is an AI-powered career planning platform for university students. This app now supports a real end-to-end AI workflow:

- CV upload and text extraction
- AI profile extraction from the uploaded CV
- profile review and confirmation
- AI roadmap generation
- AI CV analysis
- AI job description analysis
- AI assistant chat with saved history

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase Auth
- Prisma + SQLite for app data
- Google Gemini API for AI features

## Required environment variables

Create `.env.local` with:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace_me"

NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"

GEMINI_API_KEY="your_gemini_api_key"
GEMINI_MODEL="gemini-2.0-flash"
```

`GEMINI_API_KEY` is the only AI secret required to make the AI features work.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Push the Prisma schema into the local SQLite database:

```bash
set -a && source .env.local && set +a && npx prisma db push
```

3. Generate Prisma client:

```bash
set -a && source .env.local && set +a && npx prisma generate
```

4. Start the app:

```bash
npm run dev
```

## Core AI routes

- `POST /api/parse-resume`
- `POST /api/extract-profile`
- `POST /api/generate-roadmap`
- `POST /api/resume-copilot`
- `POST /api/job-analyzer`
- `POST /api/assistant-chat`
- `GET /api/bootstrap`
- `GET/PATCH /api/profile`

## Notes

- Auth still runs through Supabase, so you need working Supabase env vars to log in.
- App data is stored locally through Prisma/SQLite.
- If `GEMINI_API_KEY` is missing, the AI routes will return an error when called.
