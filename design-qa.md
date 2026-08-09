# Design QA — Course overview policy notes

## Evidence

- Source visual truth: `/var/folders/gg/m56sp7p91czcgcqrkcgbd5800000gn/T/TemporaryItems/NSIRD_screencaptureui_CSH1XS/截屏2026-08-09 16.55.42.png`
- Browser-rendered implementation: `/private/tmp/cracked-course-overview-policy-final.png`
- Side-by-side comparison: `/private/tmp/cracked-course-policy-comparison.png`
- Expanded-state capture: `/private/tmp/cracked-course-overview-policy-expanded-1422.png`
- Source pixels: `1423 × 1138`
- Implementation pixels: `1422 × 1135`, normalized to `1423 × 1138` only for the comparison board
- Browser CSS viewport: `1422 × 1135`; device pixel ratio: `1.1`
- State: authenticated course Overview; policy group collapsed by default

## Full-view comparison

The requested hierarchy is visible in the right rail: Grading structure, then the saved syllabus PDF, then one compact policy summary. The reference screen's established type, card radii, ocean/gold tokens, borders, and spacing are preserved. The global sidebar is present in the implementation capture but outside the scope of the supplied main-content crop.

No separate focused crop was required because the right rail is fully legible at the original comparison resolution and is the only changed region.

## Required fidelity surfaces

- Fonts and typography: existing Geist hierarchy, weights, sizes, line heights, and truncation are retained.
- Spacing and layout rhythm: the PDF card precedes the policy section with the existing `space-y-5` rhythm; the collapsed summary does not stretch the page.
- Colors and visual tokens: existing gold warning, ocean status, navy text, border, and muted tokens are reused.
- Image quality and asset fidelity: no raster assets were introduced or replaced; existing Lucide UI icons remain consistent with the product.
- Copy and content: the policy count and saved-reference explanation are visible without exposing the full policy text until requested.

## Interaction and runtime checks

- Default state: closed.
- Open action: clicking the summary sets the native `details` element to open.
- Content: all 7 saved policies render.
- Overflow: the list is capped at `420px` and scrolls internally (`881px` content height in the tested course).
- Console: no errors or warnings after reload and interaction.

## Findings

No actionable P0, P1, or P2 differences remain for the requested change.

## Comparison history

- Before: each unsupported policy rendered as a separate full-height alert above the PDF card.
- Fix: extracted a shared collapsible policy component, moved the PDF before it on Overview, and reused the same interaction in Grades.
- Post-fix evidence: the final collapsed capture shows one compact summary beneath the PDF; the expanded capture confirms the bounded scrolling list.

## Implementation checklist

- [x] PDF displayed above policy notes
- [x] Policy notes collapsed by default
- [x] Count visible in the collapsed state
- [x] All policies available after expansion
- [x] Long lists scroll inside the component
- [x] Overview and Grades share one policy-note implementation

final result: passed
