# CrackedCourse Community Courses V1

Status: Approved for implementation  
Product boundary confirmed: August 9, 2026

## 1. Outcome

Signed-in students can select a default U.S. or Canadian post-secondary
institution, publish a sanitized snapshot of one of their course workspaces to
that school's community, discover snapshots from other students, endorse useful
snapshots, access the published syllabus PDF while signed in, and import a
snapshot into a new private workspace.

V1 is not collaborative editing. A community snapshot is read-only and importing
it creates an independent, owner-scoped course.

## 2. Confirmed boundaries

- Institution coverage: United States and Canada only.
- Community access: authenticated users only; no anonymous browsing or files.
- Published content: confirmed structured course content plus the original PDF.
- Personal course status (`draft`, `active`, `archived`) remains independent from
  community publication state.
- A course is private unless its owner explicitly publishes it.

## 3. Data separation

### Always private

- Earned points, current grade, target grade, and grade projections.
- Personal notes and user-entered private assessment data.
- Account email, authentication data, and profile internals.
- Extraction raw results, review history, and rejected items.
- Private meeting URLs and any non-published workspace changes.

### Included in a public snapshot

- Institution, course code, course title, section, term, dates, and time zone.
- Confirmed calendar events without private notes or meeting URLs.
- Grading category names, weights, order, and supported policies.
- Course staff name and role. Email and office location are excluded in V1.
- Original syllabus file metadata and a gated authenticated download.

The snapshot is copied at publish time. Reads never traverse into the owner's
private course tables. Updating a private workspace does not change a published
snapshot until the owner chooses **Update published version**.

## 4. Information model

```text
Institution
└── Catalog course (institution + normalized course code)
    └── Offering (term + year + optional section)
        └── Published workspace snapshot (versioned contribution)
            ├── Endorsements
            ├── Reports
            └── Imports into private courses
```

V1 stores the catalog/offering identity directly on each publication to keep the
write path transactional and searchable. A later release may materialize catalog
course and offering tables when deduplication and moderation require them.

## 5. Institution directory

`institutions` contains canonical U.S. and Canadian post-secondary institutions.
Each institution has a stable internal UUID plus an external source identifier
(IPEDS UnitID for U.S. records or DLI identifier for Canadian records), canonical
name, country, region, city, optional campus, website domain, aliases, and a
default IANA time zone.

Search requirements:

- Match canonical name, aliases, domain, city, region, or external identifier.
- Case-insensitive prefix and substring matching.
- Show institution name, city, region, and country in every result.
- Return at most 12 results and require at least two search characters.
- Profiles and courses reference an institution UUID; arbitrary institution text
  is not accepted by mutation APIs.

V1 ships with an initial verified catalog focused on common U.S. and Canadian
institutions and a repeatable import path. Expanding to the complete official
IPEDS/DLI datasets does not require schema or UI changes.

## 6. UX flows

### Profile default school

Settings includes an accessible school combobox with predictions. Saving the
profile stores `default_institution_id`. A recognized academic email domain may
set the initial default, and the student can replace or clear it.

### Add course

New courses inherit the profile's default institution. The upload screen displays
the selected school and offers **Change school**. A user without a default school
must choose one before publishing, but may still create a private draft.

### Course settings

Course settings allow changing the institution. Changing the institution of an
already-published course does not silently rewrite the publication; the owner is
prompted to update or unpublish.

### Publish

The course options menu provides **Publish to community** for active courses with
an institution and processed syllabus. A confirmation dialog lists the included
and excluded fields and requires the uploader to confirm that they are allowed to
share the PDF. Publishing creates or replaces the snapshot atomically.

### Discover

The sidebar includes **Community**. The page defaults to the student's school and
supports school, course code/title, and term filters. Cards show institution,
course identity, term, contributor display name, endorsement count, update time,
and PDF availability.

### Use this course

Import creates a new private active course owned by the importer, copies the
structured snapshot into owner-scoped tables, copies the PDF into the importer's
private storage path, and records `imported_from_publication_id`. It never copies
grades or endorsements and never creates a live edit relationship.

## 7. Endorsements and reports

- One endorsement per user per publication.
- Owners cannot endorse their own publication.
- Endorsements are toggleable and authenticated-only.
- Reports accept a constrained reason and optional short details.
- One open report per reporter per publication.
- Reported content remains available in V1; moderation state is included so a
  later admin workflow can hide it without a schema rewrite.

## 8. Authorization and storage

- Existing private course RLS policies remain owner-only.
- Community tables enable RLS and grant explicit privileges to `authenticated`.
- Published snapshots are selectable only when `publication_status = 'published'`.
- Owners alone may insert, update, or delete their publication.
- Endorsement and report policies enforce `auth.uid()` ownership.
- The existing `syllabi` bucket remains private.
- A community PDF route first verifies an authenticated session and visible
  publication, then returns a short-lived signed URL for the snapshot's source.
- Anonymous roles receive no table or storage grants for community content.

## 9. API and route surface

- `GET /api/institutions?q=` — authenticated institution suggestions.
- `PATCH /api/profile` — display name and default institution.
- `PATCH /api/courses/:id` — course identity, institution, appearance, lifecycle.
- `POST /api/courses/:id/community-publication` — publish/update snapshot.
- `DELETE /api/courses/:id/community-publication` — unpublish.
- `GET /api/community/:publicationId/pdf` — authenticated PDF access.
- `POST /api/community/:publicationId/import` — create private copy.
- `POST /api/community/:publicationId/endorsement` — toggle endorsement.
- `POST /api/community/:publicationId/report` — submit report.
- `/community` — authenticated discovery.
- `/community/:publicationId` — authenticated snapshot detail.

All mutation inputs are schema-validated and re-authorized at the resource level.

## 10. Acceptance criteria

1. A signed-out request cannot list institutions, view publications, or access a
   community PDF.
2. Selecting a default institution persists and new course drafts inherit it.
3. A course may use a different institution from the profile default.
4. Publishing never copies grades, personal assessment values, raw extraction
   payloads, staff email, office location, or meeting links.
5. Community search filters by institution, code/title, and term.
6. Only the owner can update or unpublish a contribution.
7. Import produces a usable private course and preserves its source attribution.
8. Endorsements enforce one-per-user and reject self-endorsement.
9. PDF access requires authentication and uses an expiring URL.
10. All new exposed tables have explicit grants, RLS enabled, and tested policies.

## 11. Deferred from V1

- Mexico and institutions outside the U.S. and Canada.
- Anonymous or search-engine-visible community pages.
- Comments, messaging, collaborative editing, and study groups.
- Automatic merging of multiple student contributions.
- Public student profiles or follower counts.
- Automated copyright moderation and public CDN access.
