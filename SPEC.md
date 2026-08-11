# CrackedCourse Product & Engineering Specification

- **Document status:** Implementation-ready product specification
- **Version:** 1.1
- **Last updated:** 2026-08-10
- **Product:** CrackedCourse
- **Repository name:** `cracked-course`

---

## 1. Product definition

CrackedCourse turns a static course syllabus into a verified, interactive course workspace. A student uploads a syllabus PDF, reviews the course facts extracted from it, and receives an actionable calendar, instructor/office-hour information, and a syllabus-specific grade calculator.

The product is not merely an AI PDF reader. Its core value is reducing the time, uncertainty, and administrative friction between receiving a syllabus and having a trustworthy semester plan.

### Product promise

> Crack the syllabus. Control the semester.

### Core experience principles

1. **Verified before trusted.** AI-extracted information must include its source and remain editable before it becomes part of the course workspace.
2. **Actionable, not summarized.** Dates become calendar events, weights become a grade calculator, and office hours become reusable schedule entries.
3. **Student-controlled.** The student can confirm, edit, reject, add, export, or delete extracted information.
4. **Transparent about uncertainty.** Missing, ambiguous, and unsupported information is labeled; the application must never silently invent it.
5. **Useful across courses.** Each course has its own workspace, while the main calendar and workload view combine every active course.

---

## 2. Problem statement

At the start of a semester, students receive multiple syllabi in inconsistent formats. Important information is spread across prose, tables, PDF pages, and course websites. Students must manually locate and transfer:

- instructor and teaching-assistant contact information;
- recurring office hours;
- exams, quizzes, assignments, and other important dates;
- category weights and grading policies;
- course-specific rules that affect grade calculations.

Manual transfer is slow and error-prone. Generic GPA calculators do not represent the grading scheme of a specific course. Existing calendars do not preserve the connection between an event and the syllabus statement from which it came.

CrackedCourse addresses this obstacle with extraction, source verification, and purpose-built course tools.

---

## 3. Goals, success criteria, and non-goals

### 3.1 MVP goals

The MVP must let a student:

1. Sign in securely.
2. Upload a text-based PDF syllabus.
3. See extraction progress and recover from failures.
4. Review extracted course details, people, office hours, key dates, and grading weights alongside source evidence.
5. Confirm, edit, reject, or manually add every extracted item.
6. Publish the reviewed data into a course workspace.
7. View a single-course calendar and an all-courses calendar.
8. Export confirmed events as a valid `.ics` file.
9. Enter grades in a syllabus-specific weighted grade calculator.
10. See current grade, projected grade, and the score needed to reach a selected target when the calculation is mathematically valid.

### 3.2 Product metrics

Instrumentation should support these metrics, even if a full analytics dashboard is not built for MVP:

- median time from upload to review-ready extraction;
- extraction completion rate;
- percentage of extracted items confirmed without editing;
- percentage edited or rejected by type;
- time from upload to published course;
- calendar export rate;
- percentage of published courses with at least one grade entered;
- user-reported trust in extracted data after source review.

### 3.3 Manual course editing and provenance

Every course fact has a provenance. A syllabus is evidence, not an immutable
source of truth: the course owner must be able to correct extracted data and
add information that the syllabus does not contain.

The product stores three distinct layers:

1. **Source evidence.** The original PDF, page text, extraction run, original
   extracted value, confidence, and quoted page evidence are preserved and are
   never overwritten by an edit.
2. **Course workspace data.** Course identity, people, office hours, calendar
   events, grading categories, grading policies, and assessments are the
   editable records that power the student workspace and published snapshot.
   Each record declares whether it came from the syllabus, was added manually,
   or was imported from a community publication.
3. **Personal learning data.** Scores, targets, earned/max points, and private
   notes belong only to the course owner. They are never included in a community
   publication or exposed to a viewer of a shared course.

#### P0 editing requirements

- The course owner can add, edit, and hide course people, office hours,
  calendar events, grading categories, policies, and assessments.
- Existing records preserve their source link. A manual edit must not erase the
  underlying PDF evidence.
- Removing a syllabus-derived record hides it from the workspace rather than
  deleting its extraction evidence. A future re-parse must not silently restore
  a record the owner intentionally hid.
- The editor labels each record as **From syllabus**, **Added manually**, or
  **Imported from community**.
- The public snapshot contains course structure only: no student scores,
  assessment points, private notes, meeting URLs, or non-instructor staff
  contact details. An instructor email recorded for the course may be shared
  so community members can contact the course instructor.
- Publishing remains an explicit owner action. Editing a private workspace does
  not silently change the currently published snapshot.

#### Deferred requirements

- Uploading a replacement syllabus produces a new extraction run and a
  side-by-side conflict-resolution view; it never overwrites manual edits.
- Collaborators may submit edits only through role-based permissions and an
  audit trail. Community viewers submit suggestions rather than directly
  modifying a contributor's workspace.

### 3.4 Non-goals for MVP

The following must not be implemented unless separately approved:

- native iOS or Android applications;
- degree audits, prerequisite graphs, or graduation planning;
- Canvas, Blackboard, Moodle, or Brightspace integrations;
- public professor-review feeds or scraping Rate My Professors;
- a public review community, moderation system, or anonymous comments;
- automatic study-block scheduling;
- live monitoring of syllabus changes;
- scanned-PDF OCR as a guaranteed feature;
- grade-rule execution for drop-lowest, replacement, curves, extra credit, or conditional policies;
- direct write access to Google Calendar or Outlook Calendar;
- institutional administrator dashboards;
- real-time multi-user editing.

---

## 4. Users and jobs to be done

### Primary user

A university student managing several courses at the beginning of or during a semester.

### Primary jobs

- “When I receive a syllabus, help me find everything I need to act on without rereading the entire document.”
- “Help me verify that automatically extracted information is correct before I rely on it.”
- “Put course dates and recurring office hours into one calendar I can export.”
- “Calculate my standing using this instructor’s actual grading weights.”
- “Warn me when the syllabus is unclear or the formula is too complex to calculate reliably.”

### Secondary user

A student deciding whether their current course combination creates unusually heavy weeks before an add/drop deadline. This user is served by the post-MVP Semester Pressure Map, not by degree-planning features.

---

## 5. Scope and priority

### P0 — product MVP

- Responsive web application.
- Supabase email-and-password registration and sign-in, with one-time email confirmation when enabled and password recovery. OAuth is optional after P0.
- PDF upload, validation, text extraction, and storage.
- LLM-assisted structured extraction behind a provider-independent interface.
- Course metadata, instructors/TAs, office hours, dated events, grading categories, and warnings.
- Evidence-backed review workflow.
- Manual editing and manual item creation.
- Course overview.
- Per-course and all-courses calendar.
- `.ics` export.
- Weighted-category grade calculator.
- Fictional development/test seed data and safe syllabus fixtures.
- Loading, empty, partial, error, and unsupported-document states.

### P1 — build only after P0 is complete and verified

- Syllabus webpage URL import.
- Read-only calendar share link with revoke control.
- Semester Pressure Map.
- Points-based grade aggregation.
- Simple recurring office-hour editor.
- Manual Rate My Professors URL or external search link.
- Basic OCR fallback for scanned PDFs.
- Simple supported policies such as drop one lowest score.

### P2 — roadmap

- LMS integrations.
- Change detection and re-import reconciliation.
- Native calendar-provider connections.
- Degree planning.
- Public course/professor reviews with moderation and enrollment verification.
- Personalized study-plan generation.
- Advanced grading-rule engine.

---

## 6. End-to-end user journeys

### 6.1 First course import

1. Student lands on the dashboard and selects **Add a course**.
2. Student uploads a PDF by dropping it into the uploader or choosing a file.
3. Client validates extension and size; server validates MIME type and file signature.
4. UI shows a three-stage status: **Reading document → Finding course details → Preparing review**.
5. The system creates a draft course and extraction run.
6. If extraction succeeds, the student enters the review workspace.
7. Review groups items into Course, People & office hours, Important dates, and Grading.
8. Each item shows its value, status, source page, short source quotation, and confidence label.
9. Student confirms, edits, rejects, or adds items. Ambiguous dates require explicit resolution.
10. Student selects **Create course workspace**.
11. Only confirmed or student-created items are written into active course records.
12. Student lands on the new course overview with a clear completion summary.

### 6.2 Calendar use

1. Student opens **Calendar** from global navigation.
2. Calendar initially shows all active courses.
3. Student filters courses or event types without changing stored data.
4. Selecting an event opens a detail panel with date/time, course, source, notes, and edit action.
5. Student may switch between month and agenda/list views.
6. Student can export the current course or all visible confirmed events to `.ics`.

### 6.3 Grade tracking

1. Student opens the Grades tab inside a course.
2. Extracted grading categories and weights are already present.
3. Student adds assessments or enters earned/max points for existing assessments.
4. Current grade updates immediately and excludes categories without graded work.
5. Student selects a desired final letter or numeric target.
6. The product displays the average required across remaining supported weight, or a clear explanation if the result is impossible, already secured, or not computable.
7. Unsupported syllabus policies remain visible as warnings and are never silently applied.

### 6.4 Failure recovery

1. If the PDF contains too little extractable text, the UI explains that it may be scanned.
2. Student can retry, replace the file, or create the course manually.
3. If the LLM provider fails, the uploaded source and draft course remain intact.
4. A retry creates a new extraction run; it does not duplicate the course.
5. Partial results may be reviewed when at least one valid section was extracted, with missing sections clearly labeled.

---

## 7. Information architecture and routes

The implementation may adjust folder names to match framework conventions, but user-visible routes and responsibilities should remain stable.

| Route | Purpose | Priority |
|---|---|---|
| `/` | Compact product introduction and sign-in entry | P0 |
| `/dashboard` | Active courses, upcoming events, add-course CTA, quick status | P0 |
| `/courses/new` | Upload/import entry | P0 |
| `/courses/[courseId]/review` | Evidence-backed extraction review | P0 |
| `/courses/[courseId]` | Course overview | P0 |
| `/courses/[courseId]/calendar` | Course-only calendar | P0 |
| `/courses/[courseId]/grades` | Course grade calculator | P0 |
| `/calendar` | Aggregate calendar with filters | P0 |
| `/settings` | Time zone, profile, data/export settings | P1 unless required for auth |
| `/share/calendar/[token]` | Read-only shared calendar | P1 |

### Global navigation

Desktop navigation contains:

- CrackedCourse wordmark;
- Dashboard;
- Calendar;
- Courses list;
- **Add course** primary action;
- user menu.

Mobile navigation may collapse to a bottom bar or drawer but must preserve the same primary tasks. Upload and review should be usable at 390 px width; dense calendar views may default to agenda mode on mobile.

---

## 8. Detailed functional requirements

Requirement IDs are stable references for implementation tasks and tests.

### 8.1 Authentication and ownership

- **AUTH-001:** A user must authenticate before accessing private course data.
- **AUTH-002:** Every private record must be owned directly or transitively by one authenticated user.
- **AUTH-003:** Database authorization must enforce ownership server-side; hiding UI controls is insufficient.
- **AUTH-004:** Unauthenticated users may access only public product and authentication routes; private application routes must redirect to sign-in.
- **AUTH-005:** Signing out returns the user to `/` and prevents access to cached private route content.
- **AUTH-006:** Registration creates a reusable password credential. Routine sign-ins use email and password and never require a new email link.
- **AUTH-007:** If email confirmation is enabled, it occurs once after registration. Password recovery uses an expiring, single-use email link.

### 8.2 Source upload

- **SRC-001:** P0 accepts one `.pdf` file per import.
- **SRC-002:** Default maximum size is 15 MB and is configurable with an environment variable.
- **SRC-003:** Validate extension, reported MIME type, and PDF magic bytes on the server.
- **SRC-004:** Store the original in a private bucket using a non-guessable path scoped to the owner.
- **SRC-005:** Persist file name, size, content hash, page count, upload time, and processing state.
- **SRC-006:** Duplicate content hash for the same user should offer reuse or reprocessing, not silently create duplicates.
- **SRC-007:** Extract text page-by-page and preserve page boundaries.
- **SRC-008:** If fewer than 100 useful text characters are found across the document, classify it as likely scanned and offer manual creation; OCR is P1.
- **SRC-009:** PDF text and model inputs are untrusted data. Embedded instructions in a syllabus must never alter system behavior.
- **SRC-010:** Deleting a source is a deliberate single-item action and must not automatically delete a published course without separate confirmation.

### 8.3 Extraction pipeline

- **EXT-001:** Extraction uses the pipeline: parse → candidate detection → structured model extraction → deterministic validation → student review.
- **EXT-002:** Model-specific code must implement a provider-neutral `SyllabusExtractor` interface.
- **EXT-003:** The model must return structured data validated against a versioned schema.
- **EXT-004:** Missing values must be `null` or empty arrays; the model must not infer facts not present in the source.
- **EXT-005:** Every extracted actionable item must include evidence: page number when available, exact or near-exact quote, and character offsets or a text-anchor identifier when available.
- **EXT-006:** The server must verify that an evidence quotation occurs in normalized extracted text. A missing match downgrades the item to **Needs review** and prevents one-click bulk confirmation.
- **EXT-007:** Internal confidence may be numeric, but the UI shows only **High confidence**, **Needs review**, or **Low confidence** to avoid false precision.
- **EXT-008:** Extraction runs are immutable records with schema version, provider, model identifier, prompt version, start/end timestamps, and error summary. Never store secret keys.
- **EXT-009:** A retry creates a new run attached to the same draft course.
- **EXT-010:** Deterministic validation produces warnings for invalid weights, ambiguous dates, missing years, dates outside the configured term, conflicting instructors, and unsupported grading rules.
- **EXT-011:** An extraction may succeed partially. Section-level failure does not discard valid sections.
- **EXT-012:** The application must not present unreviewed extracted data as confirmed calendar or grade data.

### 8.4 Review and verification

- **REV-001:** Review sections are Course details, People & office hours, Important dates, Grading structure, and Warnings.
- **REV-002:** Each extracted item supports Confirm, Edit, and Reject.
- **REV-003:** Each section supports manual item creation.
- **REV-004:** Editing an extracted item preserves original extracted value and evidence for audit/debug purposes.
- **REV-005:** Selecting the source reference opens the relevant PDF page or source-text excerpt beside the item when feasible.
- **REV-006:** Bulk confirm is allowed only for valid high-confidence items and must be reversible before publishing.
- **REV-007:** Dates without a year, time zone, or clear AM/PM value must surface the missing field instead of guessing silently.
- **REV-008:** For date-only academic deadlines, store the item as an all-day event unless the source specifies a time.
- **REV-009:** The publish action is disabled until the course name/code is present and all blocking ambiguities are resolved or rejected.
- **REV-010:** Publish only confirmed, edited-confirmed, or manually created items.
- **REV-011:** The review screen auto-saves decisions and clearly reports save state.
- **REV-012:** Returning to a draft resumes the last saved review state.

### 8.5 Course workspace

- **CRS-001:** A course has code, title, term, optional section, color, time zone, status, and owner.
- **CRS-002:** The overview shows the next important event, office hours, grading summary, unresolved warnings, and shortcuts to Calendar and Grades.
- **CRS-003:** Students can edit course metadata after publication.
- **CRS-004:** Archiving removes the course from default aggregate views without deleting its data.
- **CRS-005:** Course colors must remain accessible against the background and must not be the only indicator of course identity.
- **CRS-006:** A source panel shows the imported file name, import date, and extraction/review status.

### 8.6 People and office hours

- **PPL-001:** Supported roles are instructor, teaching assistant, and other course staff.
- **PPL-002:** A person may have name, role, email, office location, and optional external profile URL.
- **PPL-003:** Office hours may be one-time or recurring and may include location or meeting URL.
- **PPL-004:** Recurring office hours require day of week, local start time, optional end time, recurrence start/end dates, and course time zone.
- **PPL-005:** If recurrence boundaries are missing, the review UI requests term dates or allows the student to save the office hour as informational text without calendar recurrence.
- **PPL-006:** The course Overview may provide a Rate My Professors profile or search link for confirmed instructors only, never teaching assistants. The UI must label the destination as external, state that student-submitted information is for reference only, and provide a clear no-linked-profile or missing-school state. It must not scrape, proxy, reproduce, or persist third-party ratings.

### 8.7 Calendar and events

- **CAL-001:** Supported event types are exam, quiz, assignment, project, office hour, class session, deadline, and other.
- **CAL-002:** Only confirmed events appear in the published calendar.
- **CAL-003:** The global calendar combines all non-archived courses owned by the user.
- **CAL-004:** Filters support course and event type and update without a full page reload.
- **CAL-005:** Month and agenda/list views are required on desktop; agenda/list is required on mobile.
- **CAL-006:** Event details show title, course, type, start/end, location, notes, recurrence, and source evidence when present.
- **CAL-007:** Students can manually add, edit, and delete individual events.
- **CAL-008:** Times are stored in UTC plus an IANA time-zone identifier and rendered in the course/user time zone.
- **CAL-009:** All-day dates remain all-day dates and must not shift across time zones.
- **CAL-010:** Recurring events use an internal recurrence representation that can be serialized to iCalendar RRULE.
- **CAL-011:** `.ics` export follows RFC 5545 conventions, escapes text correctly, uses stable UIDs, and includes `DTSTAMP`.
- **CAL-012:** Export can target a course or the current all-courses view. Only confirmed, currently visible events are included when filters are active.
- **CAL-013:** The exported calendar must import successfully into Apple Calendar and Google Calendar in manual verification.
- **CAL-014:** P0 provides downloadable `.ics`; direct provider synchronization is out of scope.

### 8.8 Grade calculator

- **GRD-001:** P0 supports weighted grading categories whose course weights total approximately 100%.
- **GRD-002:** Each category has a name, course weight, aggregation mode, display order, and optional source evidence.
- **GRD-003:** P0 aggregation mode is `points`: category score equals total earned points divided by total possible points among graded assessments.
- **GRD-004:** A category may represent one assessment, such as Midterm (25%), or many assessments, such as Homework (20%).
- **GRD-005:** Students can create, edit, and delete assessments with name, optional due date, earned points, and maximum points.
- **GRD-006:** Earned points must be greater than or equal to zero. Maximum points must be greater than zero. Extra-credit behavior is unsupported in P0 and must be labeled rather than guessed.
- **GRD-007:** Current grade includes only categories with at least one graded assessment and renormalizes by their included course weights.
- **GRD-008:** Display both current grade and the percentage of total course weight currently represented so the normalized number is not misleading.
- **GRD-009:** Projected final grade uses entered grades plus explicit user-entered expected scores for remaining categories/assessments. It must not silently treat ungraded work as zero.
- **GRD-010:** Target-grade calculation solves for the uniform average needed across remaining supported work. It is exact only when completed categories are marked complete and the maximum points of every partially completed category are known.
- **GRD-011:** If required average is below or equal to 0%, display that the target is already secured under the current assumptions. If above 100%, display that the target is not reachable without extra credit or policy effects.
- **GRD-012:** Letter-grade thresholds are editable and optional. Numeric targets must work without them.
- **GRD-013:** Grading weights from extraction must be checked with tolerance: 99.5%–100.5% is valid; anything else creates a blocking warning until edited, accepted as intentionally incomplete, or switched to manual mode.
- **GRD-014:** Extracted policies such as drop-lowest, replacement exams, curves, attendance gates, or bonus points are displayed as unsupported policy notes in P0 and are not applied to calculations.
- **GRD-015:** Every displayed grade calculation must have an accessible explanation of its formula and assumptions.

#### Grade formulas

For each category `c` with at least one graded assessment:

```text
category_score(c) = sum(earned_points) / sum(max_points)
```

For the normalized current grade:

```text
included_weight = sum(weight(c) for categories with graded assessments)
current_grade = sum(category_score(c) * weight(c)) / included_weight
```

For target grade `T`, split every supported category into a fixed earned contribution and a remaining coefficient:

```text
fixed_contribution(c) = weight(c) * earned_points(c) / total_planned_points(c)
remaining_coefficient(c) = weight(c) * remaining_points(c) / total_planned_points(c)
```

For an untouched category with no item-level plan, its fixed contribution is zero and its remaining coefficient is the full category weight. For a completed category, its remaining coefficient is zero. A partially completed category is computable only when all remaining maximum points are known.

Then:

```text
required_remaining_average =
  (T - sum(fixed_contribution)) / sum(remaining_coefficient)
```

If a partially completed category has unknown remaining possible points, the product must ask for that information or report that an exact target cannot yet be calculated. All formulas operate internally on decimals, not rounded display percentages. Round only for display, to one decimal place by default.

### 8.9 Semester Pressure Map (P1)

- **PRS-001:** Aggregate confirmed exams, quizzes, assignments, projects, and deadlines by academic week.
- **PRS-002:** Show event count and known grade weight due in each week.
- **PRS-003:** Use a documented deterministic score; do not imply an AI risk prediction.
- **PRS-004:** Initial recommended score is `event points + known weight points`, where exams/projects = 3, quizzes = 2, assignments/deadlines = 1, plus one point per started 10% of known course weight due that week.
- **PRS-005:** Labels Low, Medium, and High must be configurable and accompanied by the underlying event summary.
- **PRS-006:** Missing grade weights must not be treated as zero-confidence safety; show “weight unknown.”

### 8.10 Sharing (P1)

- **SHR-001:** Calendar sharing is off by default.
- **SHR-002:** Enabling sharing creates a high-entropy, revocable token.
- **SHR-003:** Shared views are read-only and reveal only fields selected by the owner.
- **SHR-004:** Source files, source quotes, grades, and private notes are excluded by default.
- **SHR-005:** Revocation must immediately invalidate the public route.

---

## 9. Extraction contract

### 9.1 Provider interface

```ts
export interface SyllabusExtractor {
  extract(input: ExtractorInput): Promise<SyllabusExtractionV1>;
}

export interface ExtractorInput {
  sourceId: string;
  pages: Array<{ pageNumber: number; text: string }>;
  locale?: string;
  assumedTerm?: {
    name?: string;
    startDate?: string;
    endDate?: string;
    timeZone?: string;
  };
}
```

Application code outside the provider adapter must not depend on provider-specific response types.

### 9.2 Canonical structured output

The exact runtime schema should be implemented with a validator such as Zod and versioned. The following is the semantic contract, not copy-paste-complete source code:

```ts
type Evidence = {
  pageNumber: number | null;
  quote: string;
  startOffset?: number | null;
  endOffset?: number | null;
};

type ExtractedValue<T> = {
  value: T;
  confidence: number; // 0..1, never shown as a raw percentage by default
  evidence: Evidence[];
  ambiguity?: string | null;
};

type SyllabusExtractionV1 = {
  schemaVersion: "1";
  course: {
    code: ExtractedValue<string | null>;
    title: ExtractedValue<string | null>;
    section: ExtractedValue<string | null>;
    term: ExtractedValue<string | null>;
    timeZone: ExtractedValue<string | null>;
  };
  people: Array<ExtractedValue<{
    name: string;
    role: "instructor" | "teaching_assistant" | "other";
    email?: string | null;
    officeLocation?: string | null;
  }>>;
  officeHours: Array<ExtractedValue<{
    personName?: string | null;
    recurrenceText?: string | null;
    dayOfWeek?: number | null;
    startTime?: string | null;
    endTime?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    timeZone?: string | null;
    location?: string | null;
    meetingUrl?: string | null;
  }>>;
  events: Array<ExtractedValue<{
    title: string;
    type: "exam" | "quiz" | "assignment" | "project" | "deadline" | "class_session" | "other";
    startDate: string | null;
    startTime?: string | null;
    endDate?: string | null;
    endTime?: string | null;
    isAllDay: boolean;
    location?: string | null;
  }>>;
  gradingCategories: Array<ExtractedValue<{
    name: string;
    weightPercent: number | null;
  }>>;
  gradingPolicies: Array<ExtractedValue<{
    kind: "drop_lowest" | "replacement" | "curve" | "extra_credit" | "attendance" | "other";
    description: string;
    supportedByCalculator: false;
  }>>;
  warnings: Array<{
    code: string;
    message: string;
    severity: "info" | "review" | "blocking";
  }>;
};
```

### 9.3 Deterministic validation

After schema validation, the server must:

1. Normalize whitespace and verify evidence quotes against source text.
2. Validate email and URL syntax without making network requests.
3. Normalize dates to ISO-8601 only when all required parts are known.
4. Preserve unresolved date text and emit an ambiguity warning.
5. Validate time values and IANA time zones.
6. Detect duplicate people, office hours, and events using normalized fields.
7. Check that event dates fall within the selected term when term dates exist.
8. Check grading-weight totals and unsupported policy types.
9. Remove or neutralize executable HTML from imported web content in P1.
10. Keep the model’s original structured response for debugging, but render only validated fields to the user.

---

## 10. Data model

PostgreSQL is the source of truth. IDs are UUIDs. Every table includes `created_at` and `updated_at` unless it is explicitly append-only.

### Core tables

#### `profiles`

- `id` UUID, primary key, references auth user;
- `display_name` text nullable;
- `institution_name` text nullable;
- `time_zone` text not null default user-detected IANA zone.

#### `courses`

- `id` UUID primary key;
- `owner_id` UUID not null;
- `code`, `title`, `section` text;
- `term_name` text;
- `term_start`, `term_end` date nullable;
- `time_zone` text not null;
- `color_key` text not null;
- `status` enum: `draft`, `active`, `archived`;
- `published_at` timestamptz nullable.

#### `syllabus_sources`

- `id` UUID primary key;
- `course_id`, `owner_id` UUID not null;
- `source_type` enum: `pdf`, `url`;
- `original_name` text;
- `storage_path` text nullable;
- `source_url` text nullable;
- `mime_type`, `sha256` text;
- `size_bytes`, `page_count` integer nullable;
- `processing_status` enum: `uploaded`, `parsing`, `parsed`, `failed`, `unsupported`;
- `failure_code`, `failure_message` text nullable.

#### `source_pages`

- `id` UUID primary key;
- `source_id` UUID not null;
- `page_number` integer not null;
- `text` text not null;
- unique (`source_id`, `page_number`).

#### `extraction_runs`

- `id` UUID primary key;
- `source_id`, `course_id`, `owner_id` UUID not null;
- `status` enum: `queued`, `running`, `succeeded`, `partial`, `failed`;
- `schema_version`, `provider`, `model`, `prompt_version` text;
- `raw_result` JSONB nullable;
- `validation_warnings` JSONB not null default `[]`;
- `started_at`, `completed_at` timestamptz nullable;
- `error_code`, `error_message` text nullable.

#### `extraction_items`

- `id` UUID primary key;
- `run_id`, `course_id`, `owner_id` UUID not null;
- `item_type` enum: `course_field`, `person`, `office_hour`, `event`, `grading_category`, `grading_policy`;
- `original_payload`, `current_payload` JSONB not null;
- `confidence` numeric nullable;
- `confidence_label` enum: `high`, `review`, `low`;
- `evidence` JSONB not null default `[]`;
- `review_status` enum: `pending`, `confirmed`, `edited`, `rejected`;
- `reviewed_at` timestamptz nullable.

#### `course_people`

- `id`, `course_id`, `owner_id` UUID;
- `name` text not null;
- `role` enum: `instructor`, `teaching_assistant`, `other`;
- `email`, `office_location`, `external_profile_url` text nullable;
- `source_item_id` UUID nullable.

#### `office_hours`

- `id`, `course_id`, `person_id`, `owner_id` UUID;
- `recurrence_text` text nullable;
- `day_of_week` smallint nullable, 0–6;
- `start_time`, `end_time` time nullable;
- `start_date`, `end_date` date nullable;
- `time_zone`, `location`, `meeting_url` text nullable;
- `is_calendar_ready` boolean not null;
- `source_item_id` UUID nullable.

#### `calendar_events`

- `id`, `course_id`, `owner_id` UUID;
- `title` text not null;
- `event_type` enum from CAL-001;
- `starts_at`, `ends_at` timestamptz nullable for timed events;
- `start_date`, `end_date` date nullable for all-day events;
- `is_all_day` boolean not null;
- `time_zone` text not null;
- `location`, `notes`, `rrule` text nullable;
- `status` enum: `confirmed`, `cancelled`;
- `source_item_id` UUID nullable;
- `ical_uid` text unique not null.

Database checks must enforce either all-day date fields or timed timestamp fields, never an invalid mixture.

#### `grading_categories`

- `id`, `course_id`, `owner_id` UUID;
- `name` text not null;
- `weight_percent` numeric(6,3) not null;
- `aggregation_mode` enum: `points` for P0, later `equal`, `custom`;
- `is_complete` boolean not null default false;
- `display_order` integer not null;
- `source_item_id` UUID nullable.

#### `assessments`

- `id`, `course_id`, `category_id`, `owner_id` UUID;
- `name` text not null;
- `due_event_id` UUID nullable;
- `earned_points`, `max_points` numeric nullable;
- `expected_percent` numeric nullable;
- `status` enum: `planned`, `graded`, `excused`;
- `display_order` integer not null.

#### `grading_policies`

- `id`, `course_id`, `owner_id` UUID;
- `kind`, `description` text not null;
- `calculator_support` enum: `unsupported`, `supported`;
- `source_item_id` UUID nullable.

#### `calendar_shares` (P1)

- `id`, `course_id`, `owner_id` UUID;
- `token_hash` text unique not null;
- `is_active` boolean not null;
- `field_policy` JSONB not null;
- `expires_at`, `revoked_at` timestamptz nullable.

### Authorization requirements

- Enable Row Level Security on every user-data table.
- Authenticated users may select, insert, update, and delete only rows whose `owner_id` equals their auth user ID.
- Storage policies must use owner-scoped paths and private buckets.
- Public sharing must use a narrowly scoped server function or view; it must not weaken private-table RLS.
- Service-role credentials must never be shipped to the browser.

---

## 11. API contract

Use server-side route handlers. Responses use JSON unless returning a PDF page or `.ics` file. Error responses follow:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe user-facing message",
    "requestId": "uuid"
  }
}
```

### P0 endpoints

#### `POST /api/courses`

Creates a draft course. Returns `201` with the course ID.

#### `POST /api/courses/:courseId/sources`

Multipart PDF upload. Validates ownership and file constraints. Returns `201` with source metadata.

#### `POST /api/courses/:courseId/extractions`

Starts parsing and extraction for the latest uploaded source. The first implementation may hold the request open within the deployment platform’s supported duration, but the database status is authoritative so the UI can recover after navigation. Returns `202` or `200` with run ID and current status.

#### `GET /api/extractions/:runId`

Returns run status, section summaries, warnings, and review items. Must enforce ownership.

#### `PATCH /api/extraction-items/:itemId`

Updates current payload or review status. Validate payload according to item type.

#### `POST /api/courses/:courseId/publish`

Validates the review state and transactionally materializes accepted items into normalized course tables. Idempotent: repeated calls must not duplicate records.

#### `GET /api/courses`

Lists the current user’s draft, active, or archived courses.

#### `GET|PATCH|DELETE /api/courses/:courseId`

Reads, updates, or deletes one explicit course. Delete must require an explicit confirmation in the UI and be scoped to a single course.

#### `GET|POST /api/courses/:courseId/events`

Lists or creates confirmed events.

#### `PATCH|DELETE /api/events/:eventId`

Updates or deletes one event.

#### `GET /api/calendar`

Returns aggregate events with date range, course IDs, and event types as query filters.

#### `GET /api/calendars/export.ics`

Exports confirmed events. Query may contain one `courseId` or explicit current filters. Set safe download headers and UTF-8 calendar content type.

#### `GET|POST /api/courses/:courseId/grade-categories`

Lists or creates grade categories.

#### `PATCH|DELETE /api/grade-categories/:categoryId`

Updates or deletes one grade category.

#### `POST /api/grade-categories/:categoryId/assessments`

Creates an assessment.

#### `PATCH|DELETE /api/assessments/:assessmentId`

Updates or deletes one assessment.

Grade calculations should normally run through a shared pure TypeScript domain module on both server and client. Do not require an LLM or persist a calculation-only request.

### P1 endpoints

- `POST /api/courses/:courseId/sources/url`
- `POST /api/courses/:courseId/calendar-share`
- `DELETE /api/calendar-shares/:shareId`
- `GET /api/public/calendars/:token`

### URL-import security requirements (P1)

URL import must block localhost, link-local, private, reserved, and metadata-service IP ranges; limit redirects and response size; allow only HTTP(S); resolve and validate every redirect target; set strict timeouts; and sanitize extracted content. This is required to prevent server-side request forgery.

---

## 12. Architecture and technology decisions

### Recommended stack

- **Application:** Next.js App Router with TypeScript in strict mode.
- **Styling:** Tailwind CSS and CSS custom properties for tokens.
- **Components:** shadcn/ui primitives, customized to the CrackedCourse design system.
- **Icons:** Lucide React only; use a consistent stroke width.
- **Calendar:** FullCalendar using non-premium views, or an equivalently accessible calendar library.
- **Forms/validation:** React Hook Form plus Zod, with shared schemas where practical.
- **Dates:** date-fns plus a time-zone-capable companion; chrono-node may be used for candidate detection, not as the final authority.
- **PDF:** pdfjs-dist for page-aware text extraction and PDF rendering.
- **Database/auth/storage:** Supabase PostgreSQL, Auth, and private Storage with RLS.
- **AI:** provider adapter selected by environment configuration; structured outputs/tool calling required.
- **Deployment:** Vercel for the app/API and Supabase for data/auth/storage.
- **Testing:** Vitest for domain/unit tests, Testing Library for components, and Playwright for critical end-to-end flows.

Exact package versions should be pinned when implementation begins. Coding agents must use mutually compatible stable versions and commit the lockfile.

### Suggested code boundaries

```text
src/
  app/                    # routes and route handlers
  components/             # reusable UI
  features/
    import/
    review/
    courses/
    calendar/
    grades/
  lib/
    auth/
    db/
    pdf/
    extraction/
      schema.ts
      validate.ts
      providers/
    calendar/
      ics.ts
      recurrence.ts
    grades/
      calculations.ts
    security/
  styles/
supabase/
  migrations/
  seed.sql
tests/
  fixtures/
```

### Architectural rules

1. Server-only modules that access secrets must be clearly isolated and never imported by client components.
2. Domain calculations and validation must be pure functions where possible.
3. The UI never renders raw model output; it renders schema-validated application data.
4. Database migrations are append-only after merging; schema changes require a new migration.
5. Development and test seed data uses fictional names and courses or properly licensed/public source material.
6. Avoid a separate microservice for MVP unless a measured platform limit makes it necessary.

---

## 13. UI and visual specification

### 13.1 Experience target

The product should feel like complex course information has been quickly “cracked” and reorganized into a clear plan. It should feel intelligent but not oppressive, professional but still young and campus-oriented.

Design language:

- modern academic dashboard;
- editorial tech;
- flat design with subtle depth;
- clean structured layout;
- bold information hierarchy;
- modular card system;
- intelligent document workspace;
- student-first productivity tool;
- calm but energetic;
- trustworthy AI interface;
- playful precision;
- minimal but not sterile;
- data-rich but easy to scan;
- functional Gen Z aesthetic.

Borrow principles, not layouts or assets, from Linear’s hierarchy, Notion’s modularity, Arc’s youthfulness, Stripe’s information organization, Apple Calendar’s time visualization, Figma’s collaborative clarity, and Duolingo’s lightweight feedback.

### 13.2 Color tokens

| Token | Hex | Required usage |
|---|---|---|
| Deep Navy | `#023047` | Primary text, navigation, high-trust information |
| Ocean Blue | `#219EBC` | Primary buttons, links, selected states, main charts |
| Sky Blue | `#8ECAE6` | Background modules, informational callouts, pale cards |
| Golden Yellow | `#FFB703` | Reminders, items awaiting confirmation, important milestones |
| Warm Orange | `#FB8500` | Deadlines, exams, risk notices, highest-priority actions |

Additional neutral tokens may be derived for warm-white, pale blue-gray, borders, muted text, and focus rings. The page background must be warm white or very light blue-gray rather than pure white across the entire viewport.

Color must never be the sole carrier of status. Every status includes an icon, label, shape, or text equivalent. Contrast must meet WCAG 2.2 AA.

### 13.3 Components and layout

- Medium rounded corners, approximately 10–14 px.
- Flat cards with thin borders and subtle shadows.
- Strong grid alignment and generous whitespace.
- Pill-shaped metadata tags and compact status indicators.
- Bold, compact, editorial headings; readable medium-sized body text.
- Short paragraphs and concise labels.
- Prefer cards, progress bars, timelines, tables, and expandable sections over long prose.
- Responsive desktop-first layout; functional at 390 px mobile width.
- Use Lucide line icons only. Recommended icons include `file-text`, `calendar`, `calculator`, `graduation-cap`, `clock`, `users`, `upload`, `circle-check`, `circle-alert`, `chart-no-axes-column`, `book-open`, `share`, `download`, and `search`.

Avoid large gradients, rainbow palettes, glassmorphism, cyberpunk black, heavy corporate navy SaaS styling, a child-focused education-app look, excessive softness, and layouts that resemble a legacy school portal or a Canvas clone.

### 13.4 Key screen requirements

#### Dashboard

- Top summary: greeting, term, **Add course** action.
- Course cards: code/title, next event, current grade if available, unresolved review warning, and course color.
- Upcoming panel: next five confirmed items across courses.
- Empty state explains the upload-to-workspace value in no more than two short sentences.

#### Upload

- A single prominent drop zone.
- Accepted format and size visibly stated.
- Privacy note: source is private and extracted items require review.
- Progress uses named phases, not a fake precise percentage.
- Retry and manual-course paths are always visible after failure.

#### Review workspace

- Desktop uses a two-pane layout: structured items on the left, PDF/source evidence on the right.
- Mobile uses a stacked item list with a source bottom sheet or expandable evidence block.
- Sticky section navigation and persistent review progress.
- Statuses: Pending, Confirmed, Edited, Rejected, Needs review.
- The primary action states exactly what happens: **Create course workspace**.
- AI-related copy is transparent: “We found this on page 4,” not “AI knows.”

#### Calendar

- Clear date header, Today control, view switcher, and compact filter chips.
- Exams and high-priority deadlines may use Warm Orange, but retain text/icon event-type indicators.
- Event detail opens without losing the current calendar position.
- Default visualization shows only important information; source and full notes are progressive disclosure.

#### Grades

- Radial or compact headline progress for current grade, with the represented course weight beside it.
- Horizontal category weight bars.
- Structured assessment table optimized for fast numeric entry.
- Target-grade control with an immediate plain-language result.
- Unsupported policy warnings use Golden Yellow unless they invalidate the result, in which case use Warm Orange.

#### Semester Pressure Map (P1)

- Weekly heatmap or bar summary.
- Clicking a week reveals contributing events, courses, and known weights.
- Avoid dense multi-series financial-style charts.

### 13.5 Voice and copy

Voice is clear, confident, concise, helpful, slightly clever, student-friendly, and transparent. It is never condescending.

Avoid formal academic bureaucracy, forced slang, motivational clichés, corporate productivity jargon, and aggressive urgency.

Recommended examples:

- “Ready to review — we found 14 dates and 5 grading categories.”
- “This date has no year. Choose the correct semester before adding it.”
- “Your current grade is based on 45% of the course.”
- “This syllabus uses a drop-lowest rule. CrackedCourse found it, but the MVP calculator does not apply it yet.”

---

## 14. Accessibility and responsive behavior

- Meet WCAG 2.2 AA for contrast, keyboard navigation, focus visibility, labels, and error identification.
- All core flows must work without a pointer.
- Dialogs and drawers must trap focus, close predictably, and restore focus.
- Upload supports keyboard file selection; drag-and-drop is optional enhancement.
- Calendar events must have an accessible list alternative.
- Charts include text summaries and do not rely on color alone.
- Numeric grade inputs have visible labels, constraints, and inline error messages.
- Respect `prefers-reduced-motion`; motion is short and functional.
- At 390 px, no core action requires horizontal page scrolling. Wide grade tables may become stacked rows.
- At 1280 px and above, content remains readable and does not stretch cards into overly long lines.

---

## 15. Security, privacy, and safety

- Never expose LLM, database service-role, or storage secrets to client code.
- Treat uploaded files, extracted PDF text, imported URLs, model output, file names, and source metadata as untrusted input.
- Enforce authorization on every server operation and RLS on every user-data table.
- Use signed, short-lived URLs for private source previews.
- Sanitize rendered text; do not render source HTML with unrestricted `dangerouslySetInnerHTML`.
- Apply rate limits to upload and extraction endpoints by user and IP.
- Log request IDs and safe error metadata, not full syllabus content or grades by default.
- Define a configurable retention policy and provide single-course/source deletion controls.
- Shared calendars must exclude grades and source content by default.
- Do not scrape Rate My Professors or reproduce third-party reviews.
- Clearly label generated/extracted results and require review before publication.
- Prompt design must state that syllabus contents are data, not system or developer instructions.

---

## 16. Reliability, performance, and observability

### Performance targets for MVP

- Dashboard usable content: under 2.5 seconds on a typical broadband connection after authentication, excluding cold starts.
- Common UI interactions: visible response within 100 ms when local; loading feedback within 300 ms when networked.
- Text-based syllabus review ready: target median under 30 seconds for documents up to 30 pages; hard failure should surface before the platform request limit.
- Calendar navigation after initial load: no full-page reload.
- Grade calculation: under 50 ms for normal course sizes.

### Reliability requirements

- Draft and review decisions persist across refreshes.
- Publish is transactional and idempotent.
- Extraction retry does not duplicate normalized data.
- Calendar export is deterministic for unchanged records.
- Every asynchronous or long-running state has a timeout, failure code, and retry path.

### Observability

Capture structured events without document body or grade values:

- `source_upload_started`, `source_upload_succeeded`, `source_upload_failed`;
- `extraction_started`, `extraction_succeeded`, `extraction_partial`, `extraction_failed`;
- `review_item_confirmed`, `review_item_edited`, `review_item_rejected`;
- `course_published`;
- `calendar_exported`;
- `grade_entry_updated`, `target_grade_viewed`.

Server logs include request ID, authenticated user hash or internal ID, route, duration, status, and stable error code. Do not log raw model prompts or private document text in production by default.

---

## 17. Required states and error handling

Every core screen must intentionally implement:

- loading/skeleton;
- empty;
- populated;
- partial data;
- recoverable error;
- authorization failure;
- offline or lost-connection feedback where mutation may be affected.

Stable error codes should include at least:

- `FILE_TOO_LARGE`
- `INVALID_FILE_TYPE`
- `PDF_PARSE_FAILED`
- `LIKELY_SCANNED_PDF`
- `EXTRACTION_PROVIDER_TIMEOUT`
- `EXTRACTION_SCHEMA_INVALID`
- `EXTRACTION_PARTIAL`
- `EVIDENCE_NOT_FOUND`
- `AMBIGUOUS_DATE`
- `INVALID_GRADING_WEIGHTS`
- `UNSUPPORTED_GRADING_POLICY`
- `UNAUTHORIZED`
- `NOT_FOUND`
- `RATE_LIMITED`

User messages explain the recovery action and never expose a stack trace or raw provider response.

---

## 18. Testing strategy

### Unit tests

Required for:

- evidence normalization and quote matching;
- confidence-label mapping;
- date/time normalization and all-day behavior;
- event deduplication;
- grading-weight validation;
- current-grade, projected-grade, and target-grade formulas;
- impossible/already-secured target states;
- iCalendar escaping, time zones, all-day events, recurrence, and stable UIDs;
- authorization helper functions;
- extraction schema parsing.

### Integration tests

- PDF fixture → page-aware text.
- Valid structured model fixture → validated extraction items.
- Invalid/missing evidence → warning and review downgrade.
- Review decisions → idempotent transactional publish.
- RLS prevents cross-user reads and mutations.
- Private storage path cannot be fetched without authorization.
- Calendar query filters return correct events.

### End-to-end tests

At minimum:

1. Authenticate → upload PDF fixture → review → publish → see course.
2. Edit an ambiguous event before publish and verify the corrected calendar value.
3. Switch between course and aggregate calendars.
4. Export `.ics` and verify expected event content.
5. Enter assessment grades and verify current/target calculations.
6. Refresh during review and confirm decisions persist.
7. Attempt cross-user course access and receive a safe not-found/unauthorized response.
8. Upload invalid and scanned-like fixtures and verify recovery states.

### Manual visual and usability QA

- Desktop widths: 1280 and 1440 px.
- Mobile width: 390 px.
- Keyboard-only completion of upload, review, calendar inspection, and grade entry.
- Light-theme contrast and focus states.
- Long course titles, many categories, missing fields, and overlapping events.
- Import generated `.ics` into current Apple Calendar and Google Calendar.

---

## 19. Acceptance criteria by epic

### Epic A — Foundation

Complete when:

- App starts from a documented command.
- Environment variables are validated with a safe example file.
- Auth and protected routes work.
- Database migrations and RLS policies apply cleanly to an empty project.
- Seed command creates fictional development and test data.
- CI runs typecheck, lint, and unit tests.

### Epic B — Upload and extraction

Complete when:

- A valid text PDF is privately stored and parsed by page.
- Invalid and scanned-like files show actionable errors.
- Provider adapter returns schema-validated output.
- Evidence matching and deterministic warnings execute.
- Retry preserves the draft and creates a separate run.

### Epic C — Verification

Complete when:

- All supported item types render in grouped review sections.
- Confirm/edit/reject/manual-add and autosave work.
- Source evidence opens to the relevant page or excerpt.
- Blocking ambiguities prevent publish.
- Publish is idempotent and materializes only accepted data.

### Epic D — Course and calendar

Complete when:

- Course overview displays confirmed content.
- Per-course and aggregate calendar views work with filters.
- Event editing works.
- `.ics` output passes automated parsing and manual provider import.

### Epic E — Grade calculator

Complete when:

- Extracted categories are editable.
- Assessment CRUD and input validation work.
- Formulas match unit-test fixtures.
- Current grade discloses represented weight.
- Target result handles normal, impossible, secured, and non-computable cases.
- Unsupported policies remain visible and unapplied.

### Epic F — Product readiness

Complete when:

- Seed data includes at least two fictional courses so aggregate calendar behavior is testable.
- Full core flow works at desktop and mobile target widths.
- Empty/loading/error/partial states exist.
- No secrets or private source data appear in client bundles or logs.
- A clean deployment can be created from repository documentation.
- The complete primary journey can be completed on a fresh deployment without manual database intervention.

---

## 20. Implementation sequence for AI coding agents

Agents should execute in this order because later phases depend on earlier contracts:

1. **Repository foundation:** scaffold app, strict TypeScript, formatting/linting, tests, environment validation, CI, base design tokens.
2. **Database and auth:** migrations, generated types, RLS, private storage, protected app shell, seed data.
3. **Domain contracts:** extraction schema, normalized types, grade formulas, date/event model, `.ics` serializer, unit tests.
4. **Upload and PDF parsing:** secure upload, page extraction, source persistence, scanned-PDF detection.
5. **Extraction adapter:** one provider implementation, structured output, evidence validation, run status, fixtures and retry.
6. **Review workspace:** two-pane review UI, source display, editing, autosave, blocking validation, transactional publish.
7. **Course workspace and calendar:** overview, event CRUD, single/all calendar, filters, `.ics` download.
8. **Grade calculator:** category/assessment CRUD, formulas, target scenarios, unsupported-policy warnings.
9. **Hardening:** authorization tests, input limits, rate limiting, safe logging, accessibility, responsive states.
10. **Product readiness and deployment:** representative syllabus fixtures, multi-course seed data, production configuration, end-to-end deployment verification.

### Agent execution rules

- Each agent/task must cite the requirement IDs it implements.
- Do not implement P1/P2 while any P0 epic acceptance criterion is incomplete.
- Prefer small, reviewable changes that leave the repository runnable.
- Add or update tests in the same change as domain behavior.
- Do not change canonical schemas or formulas implicitly. Propose and document a specification amendment first.
- Preserve provider independence and server/client security boundaries.
- Use realistic fictional data; never commit secrets or private syllabi.
- Never report a UI feature complete without checking its loading, empty, error, and mobile states.
- Run the most relevant tests after each task and the complete suite at epic boundaries.

### Suggested task handoff format

```text
Objective:
Requirements implemented:
Files changed:
Migrations/configuration added:
Tests added and commands run:
Acceptance criteria verified:
Known limitations or follow-ups:
```

---

## 21. Definition of done

The MVP is done only when all P0 requirements relevant to the shipped configuration are implemented and:

- the full primary journey succeeds on a fresh deployment;
- no core step requires direct database edits;
- extraction results always expose evidence or an explicit warning;
- unconfirmed items never enter the published calendar or calculator;
- grade math is deterministic and covered by unit tests;
- private records and files pass ownership tests;
- calendar export imports correctly into two major calendar products;
- desktop and mobile core flows are usable and accessible;
- all required states are intentionally designed;
- repository setup, environment variables, migrations, seeding, testing, and deployment are documented;
- the primary journey is covered by repository-owned safe fixtures and end-to-end tests.

---

## 22. Default assumptions and decisions still open

The following defaults allow implementation to begin without blocking. They may be changed through an explicit SPEC update:

- Product UI language is English.
- The first release is a responsive web app, not a native app.
- P0 authentication uses Supabase email-and-password credentials with optional one-time email confirmation and password recovery.
- A course uses one primary time zone; user settings provide the fallback.
- P0 guarantees text-based PDFs only.
- P0 grade aggregation is points within weighted categories.
- The first AI provider is selected through environment configuration; no provider name appears in core domain types.
- Students must review extracted data before publishing.
- Rate My Professors is an external link only.
- `.ics` download is the only calendar integration in P0.
- Public sharing and Semester Pressure Map wait until P0 is complete.

Before public launch, the team must make explicit decisions about data-retention duration, deletion semantics, support contact, privacy policy, terms, model-provider data handling, and institutional requirements.
