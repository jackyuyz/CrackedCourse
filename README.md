# CrackedCourse

CrackedCourse turns a static syllabus into a verified course calendar and a syllabus-specific grade workspace.

The product and engineering contract is in [SPEC.md](./SPEC.md). The current implementation is a production-oriented P0 foundation: authenticated course workspaces, private syllabus ingestion, evidence-backed extraction review, transactional publishing, calendar views and `.ics` export, and a weighted grade calculator.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui
- Supabase Auth, Postgres, Row Level Security, and private Storage
- Vercel-ready server routes with browser-to-Supabase uploads for large PDFs
- Zod validation, Vitest unit tests, ESLint, and strict TypeScript checks

## Quick start

Use Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase credentials, development automatically opens in a fictional demo workspace. To force that behavior, set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`.

Open [http://localhost:3000](http://localhost:3000). The main demo workflow is available through **Explore the demo** on the landing page.

## Connect Supabase

Create a dedicated Supabase project for CrackedCourse, then populate `.env.local` from `.env.example`. Link the CLI and apply the checked-in migrations:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migrations create the complete P0 schema, indexes, private syllabus bucket, storage policies, table RLS policies, auth profile trigger, and the transactional `publish_course` RPC. `supabase/seed.sql` contains fictional development data and is not required in production.

Enable the Supabase Email provider, then configure the Auth site URL and redirect allowlist for `/auth/callback` in each environment. Users register with an email and password; when email confirmations are enabled they confirm their address once, then use that password for future sign-ins. Configure custom SMTP before production if confirmations or password recovery are enabled. Never expose the service-role key to the browser.

## Environment

| Variable                               | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key                 |
| `NEXT_PUBLIC_APP_URL`                  | Canonical app origin for auth and calendars  |
| `NEXT_PUBLIC_DEMO_MODE`                | Optional explicit demo-mode switch           |
| `MAX_SYLLABUS_SIZE_MB`                 | Server-enforced PDF limit; defaults to 15 MB |

## Quality commands

```bash
npm run check       # TypeScript + ESLint + unit tests
npm run build       # Next.js production build (webpack)
npm run test:watch  # Interactive unit tests
```

CI runs the same checks and production build on pushes and pull requests.

## Architecture notes

- PDF bytes upload directly from the browser to a user-scoped private Supabase path. The server then downloads and independently validates ownership, size, MIME type, extension, PDF magic bytes, and SHA-256 before extraction.
- Extracted facts are always staged as review items with page-aware evidence. Confirmed data becomes canonical only through a database transaction.
- All user-owned tables and storage objects are protected with ownership-based RLS. Route handlers repeat the same authorization checks.
- The extraction provider boundary is deliberately vendor-neutral. The checked-in fixture provider makes local/demo flows deterministic; connect a production document/LLM provider before processing real syllabi.

The explicit spec interpretation for direct uploads is documented in [docs/SPEC-AMENDMENTS.md](./docs/SPEC-AMENDMENTS.md).
