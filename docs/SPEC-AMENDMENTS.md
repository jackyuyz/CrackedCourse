# CrackedCourse specification amendments

## A-001 — Direct-to-Supabase PDF upload transport

- **Status:** Accepted for implementation
- **Date:** 2026-08-05
- **Affected requirements:** SRC-001 through SRC-006; `POST /api/courses/:courseId/sources`

### Decision

The browser uploads the PDF directly to the private Supabase `syllabi` bucket under an authenticated, owner-scoped path. It then calls `POST /api/courses/:courseId/sources` with the resulting private path and client-computed metadata.

The registration route downloads the private object with the authenticated user's Supabase session and independently verifies:

- course and storage-path ownership;
- configured maximum size;
- reported and stored MIME type;
- `.pdf` extension;
- `%PDF-` magic bytes;
- SHA-256 content hash.

Only after those checks pass is `syllabus_sources` written. Invalid uploads are removed by their single exact object path.

### Rationale

Routing a 15 MB request body through a Vercel Function is less reliable and conflicts with the platform's recommended client-upload architecture. Direct upload keeps large file bytes off the application function request path without weakening server-side validation, private storage, duplicate detection, or RLS.

### API compatibility

The endpoint and response responsibilities remain stable. Its request content type is JSON registration metadata rather than multipart form data. This transport detail should be reflected in future public API documentation.
