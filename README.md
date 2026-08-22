<div align="center">
  <img src="public/brand/crackedcourse-mark.svg" alt="CrackedCourse logo" width="88" />

# CrackedCourse

### Crack the syllabus. Control the semester.

Turn a static course PDF into a verified calendar, a clear course workspace, and grade math students can actually trust.

[![Live App](https://img.shields.io/badge/Live-crackedcourse.vercel.app-219EBC?style=for-the-badge)](https://crackedcourse.vercel.app/)
[![Pathfinders Challenge](https://img.shields.io/badge/Stellic-Pathfinders_Challenge_2026-F28C28?style=for-the-badge)](https://www.stellic.com/pathfinders)
[![Next.js](https://img.shields.io/badge/Next.js-16-023047?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Source Available](https://img.shields.io/badge/License-Source_Available-F7B32B?style=flat-square)](#copyright-and-use)

**[Open CrackedCourse](https://crackedcourse.vercel.app/)** · [Product specification](./SPEC.md) · [Learning workspace specification](./LEARNING_UNITS_SPEC.md)

</div>

## The problem

A university semester often begins as a pile of documents. Every course has a different syllabus, and the information students need most—deadlines, exam dates, office hours, grading weights, and policies—is scattered across paragraphs, tables, footnotes, and course portals.

Before students can focus on learning, they must perform hours of administrative archaeology: rereading PDFs, copying dates into calendars, rebuilding grading formulas in spreadsheets, and hoping nothing important was missed. With several courses at once, a single overlooked sentence can become a missed deadline or an unexpected final grade.

This is a real obstacle hiding in plain sight: the information exists, but it is not yet usable.

## The solution

CrackedCourse turns each syllabus into a living, student-controlled course workspace. A student uploads a PDF, reviews the facts extracted from it, and decides what becomes part of their semester plan.

The product is built around **evidence, not guesses**. Extracted dates, weights, staff details, and policies remain connected to their source page and quotation. Students can confirm, edit, reject, or manually add information before trusting it. Confirmed facts then become practical tools:

- a unified calendar across every active course, with portable `.ics` export;
- a syllabus-specific weighted grade calculator with targets and projections;
- a searchable home for instructors, office hours, policies, and course details;
- learning units for notes, private materials, and source-grounded study assistance;
- privacy-aware Community snapshots for sharing useful course structure and public study notes without exposing personal grades or private work.

CrackedCourse is not simply a PDF summarizer. It closes the gap between *reading information* and *acting on it*.

## Intended impact

CrackedCourse is designed for university students balancing several courses, especially during the first overwhelming weeks of a term. It reduces repetitive setup, lowers the risk of missed commitments, and gives students a clearer picture of both their time and academic standing.

At scale, a task repeated independently by thousands of students can become shared academic infrastructure: each student keeps control of their private workspace while contributing safe, reusable course knowledge to their campus community.

The goal is simple: replace a semester carried as a stack of documents with one coherent path—what is ahead, where the student stands, and what to do next.

## Pathfinders Challenge

CrackedCourse was prepared for the [2026 Stellic Pathfinders Challenge](https://www.stellic.com/pathfinders), whose prompt asks students to create something that helps people navigate college and what comes after.

The project aligns most directly with **Category 02: Overcoming Obstacles** by reducing the scheduling, paperwork, and planning friction created by fragmented course information. It also supports **Campus Connection** through institution-based course discovery and privacy-conscious Community contributions.

## Core experience

1. **Upload** — Add a text-based syllabus PDF to a private course draft.
2. **Extract** — CrackedCourse identifies course details, people, office hours, important dates, grading structures, and unclear policies.
3. **Verify** — Review every proposed item beside page-aware source evidence; confirm, edit, reject, or add facts manually.
4. **Organize** — Publish verified facts into a personal course workspace and an all-courses dashboard.
5. **Act** — Track deadlines, export calendars, calculate grades, organize learning units, and use a citation-backed Learning Assistant.
6. **Share intentionally** — Publish a sanitized Community snapshot only when the course owner explicitly chooses to do so.

## Technology and tools

| Layer | Technology | Role |
| --- | --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript 5.9 | Full-stack web application and typed UI |
| Interface | Tailwind CSS 4, shadcn/ui, Radix UI, Lucide | Responsive, accessible design system |
| Forms and validation | React Hook Form, Zod | Client/server input validation |
| Data and authentication | Supabase Auth, PostgreSQL, Row Level Security | Accounts, relational data, and owner-scoped authorization |
| File storage | Supabase private Storage | User-scoped syllabus and learning-material files |
| PDF processing | PDF.js | Text extraction and page-aware source evidence |
| Learning assistance | OpenAI API | Private, source-grounded study guides with validated citations |
| Dates and calendars | date-fns, date-fns-tz, custom iCalendar export | Time-zone-aware events and `.ics` files |
| Deployment | Vercel | Production hosting and server routes |
| Quality | Vitest, Testing Library, Playwright, ESLint, strict TypeScript | Unit, integration, end-to-end, lint, and type checks |

## Architecture and trust model

```text
Syllabus PDF
    │
    ▼
Private, owner-scoped upload
    │
    ▼
Validated PDF text + evidence-first extraction
    │
    ▼
Human review: confirm / edit / reject / add
    │
    ▼
Transactional course workspace
    ├── Calendar and .ics export
    ├── Course-specific grade calculator
    ├── Learning units, materials, and notes
    └── Optional sanitized Community snapshot
```

- PDF bytes upload to a user-scoped private path. The server independently validates ownership, file size, MIME type, extension, PDF signature, and SHA-256.
- Extracted facts are staged as review items. Nothing becomes canonical course data until the student confirms it.
- Original evidence is preserved even when a student corrects a value, so provenance is not erased by editing.
- User-owned records and storage objects are protected by Row Level Security, with authorization repeated in server routes.
- Personal grades, targets, private notes, meeting links, and private learning materials are never included in Community publications.
- The Learning Assistant is grounded only in eligible course sources, validates returned citations, caches guides until sources change, and never silently edits student notes.

## Run locally

### Requirements

- Node.js 22 or newer
- npm
- A Supabase project for the complete authenticated experience
- An OpenAI API key for the Learning Assistant

### Setup

```bash
git clone <your-fork-or-repository-url>
cd CrackedCourse
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase credentials, development automatically opens in a fictional demo workspace. Set `NEXT_PUBLIC_DEMO_MODE=true` to force demo mode.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_APP_URL` | Canonical application origin for authentication and calendars |
| `NEXT_PUBLIC_DEMO_MODE` | Optional explicit demo-mode switch |
| `OPENAI_API_KEY` | Server-only key for the Learning Assistant |

### Database setup

Link the Supabase CLI to a dedicated project and apply the checked-in migrations:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migrations create the application schema, indexes, authentication profile trigger, private storage policies, table-level Row Level Security policies, and transactional publishing functions. `supabase/seed.sql` contains fictional development data and is not required in production.

## Quality checks

```bash
npm run check         # TypeScript + ESLint + Vitest
npm run build         # Production Next.js build
npm run test:e2e      # Playwright end-to-end tests
npm run test:coverage # Coverage report
```

## Project documentation

- [Product and engineering specification](./SPEC.md)
- [Learning units and course notes specification](./LEARNING_UNITS_SPEC.md)
- [Community Courses V1 specification](./docs/COMMUNITY-COURSES-V1-SPEC.md)
- [Learning Assistant specification](./docs/LLM_LEARNING_ASSISTANT_SPEC.md)
- [Specification amendments](./docs/SPEC-AMENDMENTS.md)

## Privacy and responsible use

CrackedCourse is **private by default**. Uploading a syllabus does not publish it, add dates to an external calendar, or expose personal academic data. Community sharing is an explicit action and uses a sanitized snapshot that separates reusable course structure from private student data.

Students should upload or share only materials they are authorized to use. Automatically extracted information may be incomplete or ambiguous and must be reviewed before it is relied upon. CrackedCourse is an independent student project and is not affiliated with, endorsed by, or an official service of any university, Stellic, or the Pathfinders Challenge.

## Copyright and use

Copyright © 2026 CrackedCourse contributors. All rights reserved except for the permissions stated below.

The source code is publicly viewable and may be studied, forked, and adapted for **personal, educational, evaluation, and non-commercial use**, provided that appropriate attribution to CrackedCourse is retained. Commercial use, redistribution as a competing hosted service, or use of the CrackedCourse name and brand assets requires prior written permission.

Public repository access does not place course materials, uploaded documents, user data, or Community contributions in the public domain. Those remain subject to their respective owners' rights and the application's privacy rules.

> This repository currently uses a source-available permission statement rather than an OSI-approved open-source license. If broader reuse is desired later, add a formal license file and update this section accordingly.

---

<div align="center">
  <strong>Syllabus in. Semester sorted.</strong><br />
  <a href="https://crackedcourse.vercel.app/">Try CrackedCourse</a>
</div>
