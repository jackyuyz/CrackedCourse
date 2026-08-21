# LLM Learning Assistant Specification

- **Status:** Implementation-ready feature specification
- **Version:** 1.1
- **Last updated:** 2026-08-20
- **Product:** CrackedCourse
- **Feature area:** Grounded learning assistance and syllabus extraction enhancement

---

## 1. Purpose

CrackedCourse already converts a syllabus into a verified course workspace. This feature adds an optional **Learning Assistant** that helps a course owner understand their own course materials and notes without turning the product into a generic chatbot.

The assistant is grounded in sources that the owner explicitly selects. It can explain a concept, answer a question, summarize a learning unit, and generate practice questions. Every substantive response must link back to the selected material or note so the student can check it.

The assistant is a private learning aid. It does not silently edit notes, change course facts, update grades or calendars, or publish any content to Community.

### 1.1 Product promise

> Ask about your materials. Learn with evidence.

### 1.2 Core principles

1. **Grounded before fluent.** The assistant must use retrieved source passages, not present unsupported claims as material-based facts.
2. **Student-controlled.** The owner chooses the unit, sources, and request. They explicitly choose whether to copy an output into a note.
3. **Private by default.** Private notes, materials, prompts, and generated outputs stay in the owner workspace and never enter a Community snapshot.
4. **Transparent about limits.** The UI distinguishes a cited answer from a general explanation, identifies unavailable/unsupported sources, and says when the materials do not answer the question.
5. **Learning-oriented.** The assistant explains, asks, and practices; it does not claim to replace the instructor, course policy, or an assessment's authorized rules.

### 1.3 Initial implementation slice

The first vertical slice may prepare and retrieve selected source chunks in memory for each request and persist citations as verified JSON on `learning_unit_ai_outputs`. The normalized source-version/chunk/citation tables in section 8 remain the target when extraction caching, output history at scale, or embedding retrieval is introduced. This staging choice must not weaken owner authorization, citation verification, private-by-default behavior, or Community exclusion.

---

## 2. Scope and release boundaries

### 2.1 P1 goals

For an active course and selected learning unit, the course owner can:

1. Select one or more eligible private sources: uploaded text-based PDFs and/or that unit's public/private notes.
2. Ask a free-form question about those sources.
3. Request a plain-language explanation, concise unit summary, or a set of practice questions.
4. Read a generated response with source citations that identify the material or note and its location.
5. Open a cited PDF at the cited page when applicable.
6. Explicitly copy a generated response, or a selected excerpt, into either note. The default target is the private note.
7. Reopen prior generated outputs for the same learning unit while they are retained.

### 2.2 P1 non-goals

- Automatic edits to public or private notes.
- Automatic creation, renaming, reordering, or hiding of learning units.
- Automatic study plans, reminders, calendar events, grade predictions, or assessment submissions.
- Chat over every course source by default; each request is deliberately scoped to one unit and selected sources.
- Analysis of external material links, webpages, Canvas pages, Google Drive content, or authenticated third-party URLs.
- Analysis of uploaded `.ppt`/`.pptx` files. They remain downloadable materials until slide-text extraction is separately implemented.
- OCR as a guaranteed feature. A scanned or text-poor PDF is unavailable to the assistant in P1.
- Public sharing of prompts, generated outputs, citations, material text, or conversation history.
- Replacing the existing syllabus extraction review workflow with an LLM.

### 2.3 Future candidates

- Slide-text extraction for `.pptx`, preserving slide-number citations.
- Opt-in material highlighting and selection-based explanation.
- Flashcards and spaced-repetition exports, created only after owner review.
- Unit-level learning plans using owner-supplied availability and deadlines.
- A separate, low-confidence LLM enhancement for syllabus extraction, defined in section 13.

---

## 3. Information architecture and visibility

```text
Course (owned by one user)
├── Learning unit
│   ├── Private materials and notes
│   ├── Source text/chunks (private processing data)
│   └── AI outputs + citations (private)
├── Owner-authored public course note (locally editable)
└── Community publication (explicit, versioned)
    └── Unit titles/descriptions + owner-authored public notes only
```

| Content | Owner workspace | Sent to model provider | Community snapshot | Default |
| --- | --- | --- | --- | --- |
| Selected PDF text | Yes | Only for the active request's retrieved passages | Never | Private |
| Selected public/private note text | Yes | Only for the active request's retrieved passages | Never as AI context/output | Private |
| Prompt and generated output | Yes | Prompt and grounded context only | Never | Private |
| Citation locator and short quote | Yes | May be generated/validated | Never | Private |
| Copied private-note content | Yes | No additional sharing | Never | Private |
| Copied public-note content | Yes | No automatic sharing; requires existing explicit publish action | Only after explicit publish | Local |

An AI output is not an authored course note. It is not publishable data, even if it was generated from a public course note. The user must actively copy it into a note before it can become authored workspace content; the existing Community confirmation still applies before any public note is shared.

---

## 4. Primary user journeys

### 4.1 Ask a grounded question

1. Owner opens **Learning units** and selects a unit.
2. Owner opens the **Ask AI** panel and sees the unit's eligible sources, all initially unselected.
3. Owner selects one or more PDFs and/or the public or private note, then asks a question.
4. The UI states that selected content will be sent to the configured AI provider only to answer this request.
5. The server retrieves relevant passages only from the selected sources and asks the provider for a structured, cited response.
6. The assistant presents its answer and citations. A citation opens the relevant material page or scrolls to the note location.
7. If the selected sources do not support an answer, the response says so and may suggest a narrower question or different source; it must not invent a material-based answer.

### 4.2 Explain a difficult concept

1. Owner selects sources, then chooses **Explain simply**.
2. They optionally add the concept or question they find difficult.
3. The assistant gives a plain-language explanation, an example only when distinguishable from course material, and cited source support.
4. The response labels any illustrative example that is not stated in the source as an assistant-created example.

### 4.3 Generate practice questions

1. Owner selects sources and chooses **Practice me**.
2. They select a count from 3, 5, or 10 and optionally a difficulty: introductory, standard, or challenge.
3. The assistant returns questions first, each with source coverage citations. It does not show answers by default.
4. Owner selects **Reveal answer** for an individual question. The answer includes its own cited rationale.
5. The output clearly says that it is practice material, not an instructor-authored assessment or prediction of an exam.

### 4.4 Copy into a note

1. Owner selects **Copy to note** from a completed output or highlights an excerpt.
2. A confirmation dialog shows the exact Markdown that will be inserted and offers **Private note** (default) or **Public course note** as the target.
3. The user confirms the insertion. The app inserts it at the end of the current target note under an `AI draft — review before sharing` heading.
4. The note follows its existing autosave behavior. The app never changes a note without this confirmation.
5. When the public target is selected, the dialog repeats that copying locally does not publish anything; the existing explicit Community update is still required.

---

## 5. Learning Assistant UX

### 5.1 Entry point and layout

Add an **Ask AI** action within the selected-unit workspace, adjacent to the existing notes/materials area. It must not replace the note editor or alter the established public/private-note tabs.

On desktop, the assistant may open in a right-side panel or a focused modal. On small screens, it opens as a full-width, navigable panel. The source selector must remain visible before generation and available when starting a new request.

The empty state says:

> Select notes or text-based PDFs from this unit, then ask for help understanding them. Answers include links back to your sources.

### 5.2 Source selector

- Show only active materials attached to the selected unit and that unit's two notes.
- Show each source's name, type, and readiness: **Ready**, **Preparing**, **No readable text**, or **Unavailable**.
- Do not preselect private notes or materials.
- Require at least one ready source before enabling a request.
- Clearly show whether the public note and/or private note is selected; both are private assistant context for the request.
- Course-level materials and materials attached to another unit are excluded in P1. A later release may add an explicit course-wide scope.

### 5.3 Actions and prompt behavior

Provide four mutually clear starting actions:

| Action | Prompt behavior | Expected result |
| --- | --- | --- |
| Ask a question | Owner writes a question | Concise cited answer or an honest insufficiency statement |
| Explain simply | Owner may name a concept | Plain-language explanation with cited support |
| Summarize unit | No free-form prompt required | Core ideas, terminology, and source-based cautions |
| Practice me | Owner selects count/difficulty | Questions first, per-question answer reveal |

The user can write in the course's language. The assistant replies in the language of the request unless the user asks otherwise.

### 5.4 Result presentation

- Render output as sanitized Markdown using the shared strict renderer; raw HTML is prohibited.
- Every nontrivial factual statement about selected materials must have one or more nearby citation chips.
- A citation chip identifies `Material title · p. N` or `Private note · paragraph N` and opens the exact source where possible.
- Separate **From your sources** content from **Assistant-created example** content.
- Show the generation time and source count, but never expose provider credentials or hidden prompts.
- Offer **Copy to note**, **Try again**, and **Start new request**. Do not offer direct Community publication.
- If generation fails, preserve the request text, selected sources, and any safely received partial output. Offer retry without duplicating a completed output.

### 5.5 Accessibility

- Source controls, action selectors, citations, answer-reveal controls, and copy dialog are keyboard operable and have accessible names.
- Generation states use non-color status text such as `Preparing sources…`, `Finding relevant passages…`, and `Writing cited answer…`.
- Cited PDF links include the page number in their accessible label.
- Practice answers are hidden semantically as well as visually until revealed.

---

## 6. Grounding and response contract

### 6.1 Retrieval pipeline

For each request:

1. Authenticate owner and verify the course, unit, and every selected source belong to that owner and unit.
2. Obtain current source text from the eligible note or the material's completed text-extraction record.
3. Split text into bounded, source-locatable chunks. PDF chunks never span a page in P1.
4. Retrieve the most relevant chunks for the requested action and question. Retrieval can initially use deterministic lexical ranking; an embedding index is optional and must retain the same ownership boundaries.
5. Send only the selected request, small course/unit context, and retrieved chunks to a provider adapter.
6. Validate the provider's structured result and every citation against the retrieved chunk set before returning it.

The server must cap source context and response output. The exact model-dependent limits are configuration values, but P1 must support at most 8 retrieved chunks and 24,000 total source characters per request. If useful sources exceed this limit, retrieve the best-supported subset and state that the answer is based on selected excerpts.

### 6.2 Provider-neutral interface

Model-specific code implements a server-only adapter. The application does not call a provider from the browser and never exposes a provider API key.

```ts
export interface StudyAssistantProvider {
  generate(input: StudyAssistantInput): Promise<StudyAssistantResult>;
}

type StudyAssistantInput = {
  action: "question" | "explain" | "summary" | "practice";
  question: string | null;
  practice?: { count: 3 | 5 | 10; difficulty: "introductory" | "standard" | "challenge" };
  locale: string;
  sources: Array<{
    chunkId: string;
    sourceLabel: string;
    locator: { pageNumber?: number; noteParagraph?: number };
    text: string;
  }>;
};

type StudyAssistantResult = {
  answerMarkdown: string;
  claims: Array<{
    text: string;
    citationChunkIds: string[];
    kind: "grounded" | "assistant_example" | "limitation";
  }>;
  practiceItems?: Array<{
    question: string;
    citationChunkIds: string[];
    answerMarkdown: string;
    answerCitationChunkIds: string[];
  }>;
  insufficiency: string | null;
};
```

The provider must receive a system instruction that source documents are untrusted reference content, not instructions. It must never obey source text that asks it to change policy, reveal secrets, call tools, or ignore the user's request.

### 6.3 Citation requirements

- A citation may reference only a chunk supplied to that generation.
- Each citation stores the source kind, source ID, source content version, locator, quoted excerpt, and character offsets within the stored chunk.
- PDF citations require a page number. Note citations require a stable paragraph number plus offsets from the note version used for generation.
- The server verifies the cited quote and offsets against the stored chunk text. Invalid or missing citations are removed; if a required claim then has no citation, the generation fails safely rather than presenting the claim as grounded.
- Source quotes shown in the UI are short: at most 280 characters per citation and only what is needed to orient the owner. The full material remains accessible through its existing private access path.
- The assistant must not claim a source says something when it only gives a plausible inference. It may present an inference only when labeled as an inference and cite its basis.

### 6.4 Insufficient-source behavior

When selected material does not contain an answer, respond substantially as:

> I couldn't find support for that in the sources you selected. Try adding the relevant lecture notes or ask your instructor if this is a course-policy question.

It may give a clearly labeled general-learning explanation only if the user explicitly asks for one. That explanation must not be framed as being from the course materials and must never fabricate a citation.

---

## 7. Source preparation

### 7.1 Eligible P1 sources

| Source | Eligibility | Preparation | Citation locator |
| --- | --- | --- | --- |
| Unit public note | Current, non-empty note | Markdown normalized into paragraphs | Paragraph and offsets |
| Unit private note | Current, non-empty note | Markdown normalized into paragraphs | Paragraph and offsets |
| Unit PDF material | Active text-based PDF file | Extract text page-by-page using existing PDF parser | PDF page and offsets |

Only the owner may initiate preparation or read prepared source text. Prepared text is private processing data, not a Community asset.

### 7.2 Preparation lifecycle

- PDF text preparation starts only after the owner first selects the material for AI use, or through a future explicit **Prepare for AI** action.
- A material status is `queued`, `processing`, `ready`, `unavailable`, or `failed`.
- A PDF with insufficient extractable text is `unavailable` with a message that scanned PDFs are not supported yet; do not send empty or low-quality text to the model.
- Creating a new note version invalidates that note's old prepared chunks. Re-saving an unchanged note does not need a new version.
- Hiding a unit or material makes its prepared text ineligible for new requests immediately. Retained historical outputs may display their saved citation snapshot to the owner but cannot open a hidden material as an active source.
- Source extraction must enforce the existing file validation and ownership rules. It must not process arbitrary storage paths supplied by the browser.

### 7.3 Deferred sources

- `.ppt` and `.pptx`: add only after a safe parser can extract slide text and preserve slide-number locators.
- External HTTPS links: excluded until a separately approved ingestion design handles permissions, copyright, redirect validation, SSRF controls, content changes, and content retention.
- Syllabus PDF: it remains available to the existing evidence/review workflow. Adding it as an assistant source requires an explicit UX and rights review; it is not implicitly included in a unit request.

---

## 8. Data model

All tables below are owner-scoped, have `created_at`/`updated_at` timestamps where applicable, enable RLS, and use UUID primary keys. Exact SQL names may vary, but visibility and retention semantics may not.

### 8.1 Enums

```sql
create type public.learning_ai_source_status as enum (
  'queued', 'processing', 'ready', 'unavailable', 'failed'
);

create type public.learning_ai_output_action as enum (
  'question', 'explain', 'summary', 'practice'
);

create type public.learning_ai_output_status as enum (
  'queued', 'running', 'succeeded', 'partial', 'failed'
);
```

### 8.2 `learning_ai_source_versions`

Represents a private, immutable source snapshot usable for a generation.

```text
id                         uuid primary key
owner_id                   uuid not null
course_id                  uuid not null
learning_unit_id           uuid not null
source_kind                'material' | 'note'
material_id                uuid nullable
note_id                    uuid nullable
note_visibility            'public' | 'private' nullable
source_version             text not null
status                     learning_ai_source_status not null
page_count                 integer nullable
useful_character_count     integer nullable
failure_code               text nullable
failure_message            text nullable
created_at                 timestamptz not null
completed_at               timestamptz nullable
```

Exactly one of `material_id` or `note_id` is non-null. A source version belongs to the same owner, course, and unit as its source. It stores no public share flag.

### 8.3 `learning_ai_source_chunks`

```text
id                         uuid primary key
source_version_id          uuid not null
owner_id                   uuid not null
chunk_index                integer not null
page_number                integer nullable
note_paragraph             integer nullable
text                       text not null
text_start                 integer not null
text_end                   integer not null
content_hash               text not null
```

Chunks are private server data. The client receives only chunks needed for a citation preview and only after owner authorization. PDF chunks may not span pages in P1.

### 8.4 `learning_unit_ai_outputs`

```text
id                         uuid primary key
owner_id                   uuid not null
course_id                  uuid not null
learning_unit_id           uuid not null
action                     learning_ai_output_action not null
status                     learning_ai_output_status not null
prompt                     text nullable
request_options            jsonb not null default '{}'
answer_markdown            text nullable
insufficiency_message      text nullable
provider                   text not null
model                      text not null
prompt_version             text not null
source_version_ids         uuid[] not null
error_code                 text nullable
error_message              text nullable
created_at                 timestamptz not null
completed_at               timestamptz nullable
```

Prompt and output length limits are enforced server-side. `answer_markdown` is an immutable generation result once `succeeded`; creating a revised result creates a new row. This table is never selected by Community loaders or publication code.

### 8.5 `learning_unit_ai_citations`

```text
id                         uuid primary key
ai_output_id               uuid not null
source_version_id          uuid not null
source_chunk_id            uuid not null
claim_index                integer nullable
practice_item_index        integer nullable
page_number                integer nullable
note_paragraph             integer nullable
quote                      text not null
quote_start                integer not null
quote_end                  integer not null
created_at                 timestamptz not null
```

The server validates all locator and quote fields before insert. Citation rows are not provider-provided truth; they are verified references to stored chunks.

### 8.6 Copy provenance

P1 records a lightweight audit event when content is copied into a note:

```text
ai_output_id               uuid not null
target_note_id             uuid not null
copied_by                  uuid not null
copied_at                  timestamptz not null
```

This audit is private and informational. It does not make copied text immutable, does not expose it to Community, and does not modify authorship claims in the editor.

---

## 9. API and server requirements

### 9.1 Owner-only endpoints

Implement authenticated, validated route handlers or equivalent server actions:

| Method and route | Purpose |
| --- | --- |
| `POST /api/courses/:courseId/learning-units/:unitId/ai-sources/:sourceId/prepare` | Prepare a selected PDF or note source version for private retrieval |
| `GET /api/courses/:courseId/learning-units/:unitId/ai-sources` | List eligible sources and readiness; never return full source text |
| `POST /api/courses/:courseId/learning-units/:unitId/ai-outputs` | Validate request, retrieve chunks, generate, validate, and persist output |
| `GET /api/courses/:courseId/learning-units/:unitId/ai-outputs` | List owner-visible output summaries for the unit |
| `GET /api/courses/:courseId/learning-units/:unitId/ai-outputs/:outputId` | Return one output with validated citations |
| `POST /api/courses/:courseId/learning-units/:unitId/ai-outputs/:outputId/copy` | Return explicit insertion payload or record an already-confirmed copy event |

All mutable responses use `Cache-Control: private, no-store`. Requests validate UUIDs, action values, source ownership, source/unit matching, source count, prompt size, and practice options on the server. Do not trust browser-provided extracted text, page numbers, chunks, source labels, model names, or owner IDs.

### 9.2 Generation behavior

- Generation may use streaming only after the server has created an owner-scoped `running` output record. A disconnected browser must not make the record publicly accessible.
- A provider timeout, malformed result, invalid citation, quota condition, or retrieval error updates the output status and returns a structured recoverable error.
- Server retries must use an idempotency key to avoid charging twice or creating duplicate successful outputs.
- Keep provider/model/prompt-version fields for debugging and future quality evaluation. Never store credentials.
- Use a per-user rate limit and a per-request source/output cap. Initial product limits are 20 generation attempts per user per rolling hour and 10 selected sources per request.

### 9.3 Logging and analytics

- Never log full private notes, PDF text, prompts, or generated output in application logs, error trackers, or client analytics.
- Operational events may include opaque IDs, action, source count, status, latency, model identifier, token/cost bucket, and normalized error code.
- Product analytics may track request completion, citation-open rate, copy-to-note rate, retry rate, and insufficient-source rate. It must not include source content or prompt text.

---

## 10. Privacy, rights, and safety

### 10.1 Privacy and provider disclosure

- Before the first generation in a workspace, show a concise disclosure that selected source excerpts and the request are sent to the configured AI provider to provide the response.
- The disclosure links to the applicable privacy terms and gives the user a way to cancel before sending.
- Use provider settings/contracts that prohibit training on customer content and minimize provider retention where available. Document the exact provider's data-retention behavior before launch.
- Send the minimum relevant content, not the entire course, all material files, grades, calendar data, or unrelated notes.
- AI functionality is unavailable when no provider is configured; the rest of the learning workspace continues normally.

### 10.2 Ownership and Community boundary

- Only the owner can query, prepare, retrieve, or copy their AI data.
- Community pages, Community APIs, publication transactions, demo data, and export paths must never query or serialize AI tables, source chunks, prompt text, citations, or outputs.
- Private note text must not enter a Community query, payload, log, or client state through this feature.
- Generated content is not automatically eligible for Community publishing. A user who copies content into a public note remains responsible for reviewing it and explicitly publishing the note through the existing flow.

### 10.3 Copyright and academic integrity

- The source selector is limited to material the owner has already uploaded or authored in their private workspace.
- Citation previews use short excerpts only. The assistant must not reproduce long consecutive passages from a source when an explanation or summary would suffice.
- Practice questions are clearly labeled assistant-generated. Do not imply they are official questions, likely exam questions, or authorized answers.
- For questions about assignment or exam rules, the assistant may cite the source but should encourage the owner to verify with the instructor when the policy is ambiguous or consequential.

### 10.4 Prompt injection and untrusted source content

- Treat every source, including user notes, as untrusted data. Source text cannot change the system instruction, authorization, source scope, tool behavior, or data-access policy.
- The provider adapter receives no credentials, internal schema, signed URLs, other users' data, or unrestricted tools.
- Retrieved content is delimited and identified as reference material. The model is instructed to ignore instructions embedded in sources.
- Validate output Markdown and citation identifiers before display; never render provider output as raw HTML.

---

## 11. Acceptance criteria

### Source scope and privacy

- **LLM-001:** The owner must actively select at least one ready source before generating an output.
- **LLM-002:** A selected source must belong to the owner, course, and selected unit; cross-course, hidden, or another user's source is rejected server-side.
- **LLM-003:** A Community response, publication payload, or Community page never contains AI output, citation, prompt, source chunk, private note text, material path, or provider metadata.
- **LLM-004:** The browser never receives an AI provider credential or arbitrary private source text.

### Grounding and quality

- **LLM-005:** A material-based factual claim has at least one validated citation to a supplied chunk, or the output fails safely.
- **LLM-006:** Every PDF citation includes a valid page number and a quote found at the stored offsets on that page.
- **LLM-007:** When sources are insufficient, the response says so without invented citations or claims that the course material answers the question.
- **LLM-008:** Assistant-created examples and inferences are visibly labeled and do not masquerade as quoted course material.
- **LLM-009:** Practice answers are hidden by default and have independently validated citations when revealed.

### User control

- **LLM-010:** A generation never writes to any note, unit, material, grade, calendar, or Community snapshot.
- **LLM-011:** Copying into a note requires an explicit confirmation and defaults to the private note.
- **LLM-012:** Copying into a public note stays local until the existing explicit publication confirmation succeeds.
- **LLM-013:** Failed or canceled generation preserves the unsent question and source selection for retry, without persisting a misleading successful result.

### Reliability

- **LLM-014:** A scanned/text-poor PDF is marked unavailable and does not trigger a low-quality model request.
- **LLM-015:** An invalid provider schema result, citation mismatch, rate limit, or timeout produces a recoverable structured error and does not expose provider internals.
- **LLM-016:** Repeated submission with the same idempotency key does not create duplicate successful outputs.

---

## 12. Verification plan

### Automated

1. RLS for two distinct users across every AI source, chunk, output, citation, and copy-audit table.
2. Source-selector eligibility for active/hidden units, course-level materials, another unit, another course, and another owner.
3. PDF preparation preserves page boundaries; text-poor PDFs become unavailable.
4. Note preparation detects versions and invalidates stale chunks after an edit.
5. Retrieval respects source and character caps and never uses an unselected source.
6. Provider adapter accepts only versioned structured output; malformed JSON/schema output fails safely.
7. Citation quote, offset, page, note-paragraph, and chunk ownership validation.
8. Insufficient-source result has no fabricated citation and renders an appropriate state.
9. Practice output initially hides answers; reveal returns validated citations.
10. Copy-to-note endpoint requires explicit target/confirmation and never performs an implicit Community update.
11. Community loader, publication route, export routes, and logs are regression-tested to prove that AI/private data cannot appear.
12. Rate-limit and idempotency behavior for retries, timeout, and disconnected streaming clients.

### Manual QA

1. Upload a text-based lecture PDF, ask a question, open every citation, and verify the referenced page and quote.
2. Select only a private note and verify its answer/citations remain private after publishing the course.
3. Ask a question not covered by selected sources and verify the assistant does not invent a material-based answer.
4. Generate practice questions; confirm answers do not display until individually revealed.
5. Copy an output into both note types; confirm the public-note copy is not visible in Community until a separate explicit update.
6. Try an image-only scanned PDF and verify a clear unavailable state rather than a vague or hallucinated response.
7. Put prompt-injection-style text in a private note and verify it does not alter source boundaries or output policy.
8. Test keyboard operation, screen-reader labels, narrow mobile layout, slow generation, provider failure, and retry.

---

## 13. Future syllabus LLM enhancement

The existing syllabus-import workflow is designed around evidence-backed extraction and student review. Its current deterministic/heuristic parser remains the default path. A future LLM is an **enhancement for difficult documents**, not a replacement for the review contract.

### 13.1 When to invoke it

Invoke the enhancement only when one or more conditions is true:

- deterministic extraction has low field coverage or low confidence;
- table or prose layout is too irregular for reliable heuristic parsing;
- the owner explicitly retries extraction after an incomplete result; or
- quality evaluation demonstrates a material improvement for a defined document class.

Do not invoke it merely because a syllabus was uploaded. Standard documents should retain the faster, cheaper deterministic path.

### 13.2 Required contract

```text
PDF text extraction
  -> deterministic candidates with page evidence
  -> optional LLM candidate extraction for low-confidence gaps
  -> schema validation and exact evidence-quote verification
  -> student review: confirm, edit, or reject
  -> canonical course data only after review
```

- The LLM returns structured candidates through the existing provider-neutral extraction interface.
- Every actionable candidate has a page number and an exact or near-exact source quote.
- The server verifies that the quote occurs in normalized extracted PDF text. A failure downgrades the candidate to `Needs review` and prevents bulk confirmation.
- LLM candidates never directly write calendar events, grades, people, office hours, or course facts.
- Scanned-syllabus support remains primarily an OCR problem. OCR must yield usable page text before LLM enhancement can be expected to help.
- Store provider/model/prompt version and error summary on the existing immutable extraction run, never API keys.

### 13.3 Rollout gate

Before enabling it by default, evaluate a representative, rights-cleared syllabus corpus against the deterministic baseline. Measure field coverage, evidence-verification rate, student edit/reject rate, latency, and cost. Release behind a feature flag; retain the existing fallback and review UI.

---

## 14. Implementation sequence

1. Add owner-scoped source-version/chunk/output/citation schema, migrations, RLS, and exclusion regression tests for Community/publication paths.
2. Implement safe PDF and note preparation with page/paragraph locators and readiness state.
3. Implement retrieval, a server-only provider adapter, structured-result validation, citation verification, rate limiting, and idempotency.
4. Add the unit-level source selector and grounded question/explanation UI.
5. Add summary, practice-question, answer-reveal, output history, and explicit copy-to-note flow.
6. Instrument privacy-safe metrics; conduct a small quality evaluation and user test before wider rollout.
7. Evaluate `.pptx` extraction and the separately gated syllabus LLM enhancement only after P1 acceptance criteria pass.

---

## 15. Open product decisions before implementation

1. Which provider/model and data-retention terms meet the product's privacy requirements?
2. What retention period should apply to AI outputs, prompts, and prepared source chunks, and should the owner have a delete-history control in P1?
3. Should the first release stream responses or use a simpler non-streaming completion endpoint within platform time limits?
4. What paid-plan, quota, or fair-use model will cover per-user generation cost after the initial release?
5. Should generated content copied to a public note carry a private provenance marker in the editor, or is the copy confirmation and publication warning sufficient?
