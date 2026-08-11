# Learning Units & Course Notes Specification

- **Status:** Implementation-ready feature specification
- **Version:** 1.0
- **Last updated:** 2026-08-11
- **Product:** CrackedCourse
- **Feature area:** Course learning workspace and community study notes

---

## 1. Purpose

CrackedCourse turns a syllabus into a verified course workspace. This feature adds a learning-oriented layer: a course owner organizes the course into units, attaches working materials, and maintains both shareable course notes and private notes for each unit.

The course owner is the authenticated user who created the course. This feature has no additional administrator roles, real-time collaborators, or shared editing.

### 1.1 Canonical term: Learning Unit

Use **Learning Unit** as the product and data-model term. In the UI, use **Learning units** with helper copy: “Chapters, topics, weeks, or anything that helps you organize this course.”

A learning unit can be a textbook chapter, lecture week, concept, exam review, or a user-defined grouping. Do not assume courses use a textbook or a chronological structure.

---

## 2. Goals and boundaries

### 2.1 P0 goals

The course owner can:

1. Create, rename, reorder, hide, and restore learning units.
2. Add a private PDF, slide deck, or external link to the course or a learning unit.
3. Write one **public course note** and one **private note** per learning unit.
4. See which publishable edits are saved only locally and which are in the last Community snapshot.
5. Explicitly publish/update their course in Community with ordered learning units and public course notes.
6. Read published public course notes from a read-only Community course page.

### 2.2 P0 non-goals

- LLM summaries, study plans, questions, or automatic note edits.
- Real-time collaboration or roles beyond the course owner.
- Public distribution of uploaded unit-material files.
- OCR, highlighting, annotations, page comments, or a Notion-style block editor.
- Automatically extracting units from a syllabus or slides.
- Automatically syncing a Community update into an imported course.

### 2.3 P1 candidates

- Explicitly save an attributed private copy of published notes during Community import.
- Optional unit dates, progress state, and checklists.
- Sharing a material's metadata or external URL after separate rights design.
- LLM assistance grounded in selected material and notes, with citations and no silent owner-note changes.

---

## 3. Information architecture

```text
Course (owned by one user)
├── Course materials (optional; private)
├── Learning unit (ordered)
│   ├── Unit materials (optional; private)
│   ├── Public course note (optional; publishable)
│   └── Private note (optional; never publishable)
└── Community publication (read-only, versioned snapshot)
    └── Ordered learning units + public course notes only
```

| Content | In owner workspace | In Community snapshot | Default |
| --- | --- | --- | --- |
| Unit title and description | Yes | Yes | Local until published |
| Public course note | Yes | Yes | Local until published |
| Private note | Owner only | Never | Private |
| Uploaded material file | Owner only | Never in P0 | Private |
| External material link | Owner only | Never in P0 | Private |
| Existing syllabus PDF | Existing behavior | Existing behavior | Unchanged |

**Public** means eligible for the owner's next explicit Community update. Saving a public note never makes it immediately public.

---

## 4. User journeys

### 4.1 Create a learning workspace

1. Owner opens an active course and selects **Learning units**.
2. Empty state explains that units may be chapters, topics, or weeks.
3. Owner selects **Add learning unit**, enters required title and optional description.
4. Owner adds course-level or unit-level materials.
5. Inside a unit, owner writes public course notes and/or private notes.
6. Changes auto-save locally. The UI states when publishable changes have not been included in Community yet.

### 4.2 Update Community notes

1. A published course shows **Unpublished learning updates** when public units or notes have changed since its last snapshot.
2. Owner selects existing **Update public snapshot** action.
3. Confirmation states that learning-unit titles, descriptions, and public notes will be shared; private notes and materials will not.
4. Server writes a complete new snapshot into the existing `community_publications` row and increments `snapshot_version`.
5. Community viewers see the new read-only content on the next request.

### 4.3 Read community study notes

1. Signed-in viewer opens a published Community course.
2. A **Study notes** tab appears alongside Overview, Calendar, and Grades only when at least one public note was published.
3. It shows public notes in owner-defined unit order.
4. Viewer cannot edit, see materials, or see private notes.

### 4.4 Hide and restore

1. Owner chooses **Hide unit** from its menu.
2. Unit, notes, and materials disappear from the active workspace but are not destroyed.
3. Existing Community snapshot does not change automatically.
4. On next explicit publish, the hidden unit is removed from Community.
5. Owner can restore it, preserving its content and order.

---

## 5. Local workspace UX

### 5.1 Layout and navigation

Add a **Learning units** course tab. It is available for active courses and does not block syllabus review or existing publishing.

Desktop: unit list on the left; selected unit, materials, and notes in the main pane; course materials as a separate section. On small screens, show the list first and navigate into a selected unit rather than forcing a multi-column layout.

Each unit shows two note tabs:

- **Public course note** — an owner-authored explanation, summary, study advice, formula sheet, or link intended for Community readers.
- **Private note** — scratch work, reminders, questions, progress, or other owner-only content.

Editing the public tab always includes this compact disclosure:

> Saved privately until you update the Community snapshot. Private notes and materials are never published.

### 5.2 Unit management

- Title is required, trimmed, and 1–180 characters.
- Description is optional, trimmed, and at most 1,000 characters.
- New units are placed at the end of active units.
- Reordering requires accessible move-up/move-down controls; drag-and-drop is optional enhancement only.
- Reorder persists sequential `display_order` values in one transaction.
- Hide is preferred over destructive deletion. P0 may implement hide for all units; a future permanent delete needs explicit confirmation and must not break an already-published snapshot.

### 5.3 Notes

Each active unit has up to two separately stored note documents:

| Data visibility | UI label | Community behavior |
| --- | --- | --- |
| `public` | Public course note | Included only after explicit publication |
| `private` | Private note | Never read by publication code or Community UI |

Use Markdown in P0. Store source Markdown and render through a strict shared sanitizer; raw HTML is prohibited. Support headings, lists, emphasis, links, quotes, inline code, code blocks, and tables. Math rendering, embeds, and files inside notes are out of scope.

Autosave after a short debounce and on blur. Show `Saving…`, `Saved`, and recoverable `Couldn’t save` states. Failure leaves current editor text in place for retry. Enforce a 120,000-character note limit on client and server.

### 5.4 Materials

Materials may be course-level or assigned to one learning unit. They are private in P0, even when a unit has a public course note.

- Upload extensions: `.pdf`, `.ppt`, `.pptx`.
- Link input: valid `https:` URL only.
- Required title; prefill from a selected filename where possible.
- Reassigning material preserves the file/record.
- PDFs may open via signed private URL. PPT/PPTX are downloadable file cards in P0; no in-app slides rendering is required.
- Reuse the secure owner-scoped upload/storage approach, but do not reuse `syllabus_sources`: a syllabus is source evidence and a study material is not.

The uploader states: “Only you can access uploaded learning materials. They are not included when you publish course notes.”

---

## 6. Community publication and privacy

### 6.1 Snapshot contract

Extend existing `community_publications` with a `learning_units` JSONB array. It includes only non-hidden units with non-empty public notes, sorted by `display_order`.

```ts
type PublishedLearningUnit = {
  title: string;
  description: string | null;
  displayOrder: number;
  noteMarkdown: string;
  noteUpdatedAt: string;
};
```

Never include local table IDs, private notes, material metadata, file paths, material URLs, AI outputs, grades, or assessment data. Existing snapshot fields and existing syllabus-PDF publication behavior are unchanged.

### 6.2 Explicit publication rules

- Local saves never update `community_publications`.
- Each initial publish/update writes the complete current array, never a delta.
- Hidden units disappear only from the next explicit snapshot.
- Units with blank public notes are excluded.
- Existing `snapshot_version` increments once per successful publication request.
- Unpublishing preserves all local units, notes, and materials.

### 6.3 Rights and safety

Before every initial publish or update, owner confirms they have rights to share the public notes and course information. The confirmation warns against personal data, copyrighted material, and content the owner lacks permission to share.

Public Markdown is untrusted content:

- sanitize in a shared renderer before every render;
- no raw HTML, scripts, embeds, or event handlers;
- safe `http:`/`https:` links are allowed when rendering Markdown; material input remains `https:` only;
- private note content must never appear in a Community query, API payload, log, or client state.

### 6.4 Community import

P0 does not copy public course notes into another user's imported course. They remain readable on the source Community page. This avoids silently copying one contributor’s authored notes into another user’s publishable workspace.

P1 may add an explicit **Save a private copy** action with contributor attribution and provenance. It must not make copied content publishable by default.

---

## 7. Data model

### 7.1 New enums

```sql
create type public.learning_unit_note_visibility as enum ('public', 'private');
create type public.course_material_kind as enum ('file', 'link');
create type public.course_material_type as enum ('pdf', 'slides', 'link', 'other');
```

### 7.2 `learning_units`

```text
id               UUID primary key
course_id        UUID not null → courses(id), on delete cascade
owner_id         UUID not null → auth.users(id), on delete cascade
title            text not null
description      text nullable
display_order    integer not null
is_hidden        boolean not null default false
created_at       timestamptz not null default now()
updated_at       timestamptz not null default now()
```

- Title is non-blank and maximum 180 characters after trim.
- Description maximum is 1,000 characters.
- `display_order >= 0`.
- Add index `(course_id, is_hidden, display_order)` and standard `updated_at` trigger.
- Do not make `display_order` unique: reordering may temporarily duplicate values during its transaction.

### 7.3 `learning_unit_notes`

```text
id               UUID primary key
learning_unit_id UUID not null → learning_units(id), on delete cascade
owner_id         UUID not null → auth.users(id), on delete cascade
visibility       learning_unit_note_visibility not null
body_markdown    text not null default ''
created_at       timestamptz not null default now()
updated_at       timestamptz not null default now()
```

- Unique `(learning_unit_id, visibility)`: maximum one public and one private note per unit.
- Body maximum 120,000 characters.
- Add index `(owner_id, visibility)` and standard `updated_at` trigger.
- Create rows lazily when the owner first writes in that note tab; do not create empty records for every new unit.

### 7.4 `course_materials`

```text
id               UUID primary key
course_id        UUID not null → courses(id), on delete cascade
learning_unit_id UUID nullable → learning_units(id), on delete set null
owner_id         UUID not null → auth.users(id), on delete cascade
title            text not null
kind             course_material_kind not null
material_type    course_material_type not null
storage_path     text nullable
external_url     text nullable
original_name    text nullable
mime_type        text nullable
size_bytes       integer nullable
display_order    integer not null default 0
is_hidden        boolean not null default false
created_at       timestamptz not null default now()
updated_at       timestamptz not null default now()
```

- Title is non-blank and maximum 180 characters.
- `size_bytes` is non-negative when present.
- `kind = 'file'` requires `storage_path` and prohibits `external_url`.
- `kind = 'link'` requires `external_url` and prohibits `storage_path`.
- API validates `https:` links and validates uploaded MIME type plus file signature before persisting a path.
- Add index `(course_id, learning_unit_id, is_hidden, display_order)`.

### 7.5 Community migration

```sql
alter table public.community_publications
  add column learning_units jsonb not null default '[]'::jsonb;

alter table public.community_publications
  add constraint community_publications_learning_units_array_check
  check (jsonb_typeof(learning_units) = 'array');
```

Existing publications receive `[]` and remain valid. Application code validates each object before writing; a generic JSONB array constraint alone is insufficient.

### 7.6 RLS and storage

- Enable RLS on the three new local tables.
- All select/insert/update/delete policies require `owner_id = auth.uid()`.
- Every server mutation verifies that referenced course belongs to current user; never trust submitted `owner_id`.
- Add private owner-scoped storage for learning materials. Only its owner can upload/read/remove its paths.
- Community loaders select `learning_units` only from published snapshots; they never join local notes or materials.

---

## 8. API and implementation requirements

### 8.1 Owner-only APIs

Implement validated, authenticated routes or equivalent server actions for:

- list/create/update/reorder/hide/restore learning units;
- fetch/upsert one unit note by visibility;
- list/create/update/reassign/hide materials;
- secure material upload and private signed URL request.

Mutations return normalized records and use `Cache-Control: private, no-store`. Use current structured API error format. Validate UUIDs, strings, URLs, and note size on server as well as client.

### 8.2 Course data loading and demo

Extend course data loading with active learning units, optional public/private notes, and active materials. Query narrowly: Community paths must never fetch material paths or private note bodies.

Demo data includes at least two units, a public note, a private note, and PDF/link cards. Private demo note must not surface in Community data.

### 8.3 Existing publication route

Extend `POST /api/courses/[courseId]/community-publication`:

1. Load owner’s non-hidden units and only their `public` note records.
2. Exclude blank/whitespace-only public note bodies.
3. Normalize and sort entries by `display_order`.
4. Include `learning_units` in existing full snapshot upsert.
5. Preserve existing rights, owner, failure, revalidation, and version-increment guarantees.

Do not select private notes, materials, or material URLs in this publishing route. Add a test proving private note body cannot enter snapshot.

### 8.4 Community data/UI

- Extend `CommunityPublicationDetail` with validated `learningUnits`.
- Add `notes` to `CommunityCourseTab`; unknown values still fall back to Overview.
- Show **Study notes** only when at least one entry exists.
- Render in snapshot order through safe Markdown renderer.
- Page is read-only: no private-note, material, upload, or editor controls.

---

## 9. Acceptance criteria

### Learning units

- **LUN-001:** Owner creates a unit with title and optional description.
- **LUN-002:** Owner updates and reorders units via keyboard-accessible controls.
- **LUN-003:** Owner hides/restores a unit without losing notes or materials.
- **LUN-004:** A different user cannot read or mutate owner units, notes, or materials through UI or direct request.

### Notes

- **LNT-001:** At most one public and one private note exist independently per unit.
- **LNT-002:** Saving a public note does not update its Community page before explicit publish.
- **LNT-003:** Private notes are excluded from snapshots, Community responses, and Community UI.
- **LNT-004:** Markdown cannot execute scripts or render raw HTML.
- **LNT-005:** Autosave failure keeps editor contents and offers retry.

### Materials

- **LMT-001:** Owner adds private PDF, slides, or HTTPS link at course/unit level.
- **LMT-002:** Hidden material is absent from active workspace and Community snapshot.
- **LMT-003:** Community viewer cannot access material metadata, link, file path, or signed URL.

### Community

- **LCP-001:** Publish copies only non-hidden units with non-empty public notes, in `display_order`.
- **LCP-002:** Successful update increments version once and does not modify private local data.
- **LCP-003:** Community Study notes is ordered and read-only; it exposes no private notes/materials.
- **LCP-004:** Hiding a unit has no Community effect until explicit update.
- **LCP-005:** Existing publications with empty learning-unit arrays work normally and show no Study notes tab.

---

## 10. Verification plan

### Automated

1. Schema: note uniqueness/size, material file-vs-link shape, JSON-array default.
2. RLS and storage access for two distinct users.
3. Unit CRUD, hide/restore, and reorder.
4. Public/private note upsert including oversized rejection.
5. Publishing public + private notes, proving only public non-empty notes enter snapshot.
6. Hidden-unit omission and exactly-once version increment.
7. Community loader for valid, empty, and malformed JSON; Markdown sanitization.
8. Material validation and unauthorized signed URL request.

### Manual QA

1. Create “Chapter 1,” “Week 3,” and “Midterm review”; confirm naming stays flexible.
2. Publish a unit with both note types and inspect as second user: only public text is visible.
3. Edit public note locally without publishing: Community shows prior snapshot.
4. Publish update: note and snapshot version change.
5. Upload PDF/slides: owner accesses them; Community and its payloads do not expose them.
6. Hide/restore before and after publish: confirm explicit-update behavior.
7. Test keyboard unit ordering and narrow mobile viewport.

---

## 11. Future LLM boundary

Future generated content belongs in a separate `learning_unit_ai_outputs` model tied to a unit and explicitly selected materials. It records prompt/version and citations, remains distinct from authored notes, and requires an owner action to copy into a note. It must never silently alter authored notes or a Community snapshot.
