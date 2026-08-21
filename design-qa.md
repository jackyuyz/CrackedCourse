# Design QA — AI Study Guide collapse placement

## Scope

- Keep the existing AI Study Guide visual system and behavior.
- Move the collapse/expand control from a wrapped row to the card header’s top-right corner.

## Visual truth and captures

- Source visual truth: `/var/folders/gg/m56sp7p91czcgcqrkcgbd5800000gn/T/TemporaryItems/NSIRD_screencaptureui_MZeW1Q/截屏2026-08-20 23.54.44.png` (938 × 230 px).
- Implementation screenshot: `/private/tmp/crackedcourse-ai-study-guide-button-right.png` (911 × 320 px).
- Side-by-side comparison: `/private/tmp/crackedcourse-ai-study-guide-comparison.png` (1896 × 364 px).
- Browser CSS viewport: 2560 × 1238 at device-pixel ratio 1.
- Density normalization: both sources were 1× captures. The implementation crop was scaled from 911 px to 938 px wide only for the side-by-side comparison; its native screenshot was inspected separately.
- State: authenticated course Learning units page, AI Study Guide expanded, saved guide stale, two sources, Update control visible.

## Full-view and focused comparison

- Full-view evidence: the implementation keeps the same card, guide content, typography, badges, borders, colors, spacing tokens, and expanded state as the source screen.
- Focused evidence: the card header was compared directly because button placement was the only requested change. The revised control sits 20 px from the card’s right edge and 16 px from its top edge, aligned with the title row. No additional focused region was needed.

## Findings and comparison history

### Pass 1 — blocked

- [P1] The collapse control wrapped beneath the title and metadata, expanding the header and weakening the control’s relationship to the card.
- Cause: `CardHeader` defaults to CSS Grid; `flex-row` set direction but did not change the display mode.
- Fix: add the existing Tailwind `flex` utility to the AI Study Guide header while preserving its current alignment and responsive sizing.

### Pass 2 — passed

- Post-fix evidence shows the collapse control in the upper-right corner, with the stale-state Update control immediately to its left.
- Expanded and collapsed interactions both passed; collapse hides the guide body, expansion restores it, and the control remains at the same upper-right coordinates.
- Browser console errors: none.
- No actionable P0, P1, or P2 issues remain.

## Required fidelity surfaces

- Fonts and typography: unchanged; the existing Geist hierarchy, weight, size, line height, and wrapping are preserved.
- Spacing and layout rhythm: corrected; header content now occupies one aligned row, with 20 px horizontal and 16 px vertical card insets.
- Colors and visual tokens: unchanged; existing background, border, badge, button, and semantic stale-state tokens are retained.
- Image quality and asset fidelity: no raster assets were added or replaced; the existing Lucide chevron remains crisp at its intended size.
- Copy and content: unchanged.
- Accessibility: the existing descriptive label, `aria-expanded`, and `aria-controls` behavior remains intact in both states.

final result: passed

---

# Archived Design QA — Signup school selector

## Scope

- Add the existing U.S./Canada school selector to the Create account flow.
- Preserve the established login-page visual system while accommodating the additional required field and its dropdown.

## Visual truth and captures

- Source: `/var/folders/gg/m56sp7p91czcgcqrkcgbd5800000gn/T/TemporaryItems/NSIRD_screencaptureui_d8GEu8/截屏2026-08-09 22.08.26.png` (1919 × 947 px).
- Implementation: `output/design-qa/signup-school-selector-after.png` (1265 × 712 px).
- Open-dropdown implementation: `output/design-qa/signup-school-dropdown-after.png` (1265 × 712 px).
- Focused source card: `output/design-qa/signup-reference-card-focused.png` (500 × 540 px).
- Focused implementation card: `output/design-qa/signup-school-selector-focused.png` (450 × 612 px).
- Browser CSS viewport: 1280 × 720 at device-pixel ratio 1. The in-app browser capped the requested 1920 × 947 viewport, so the full views were compared at the same desktop breakpoint and the auth cards were additionally compared as focused native-resolution regions.

## State and interaction coverage

- Route: `/login`, unauthenticated, Create account mode.
- Empty school state displays a directory-search combobox between email and password.
- Query `Carnegie` returned one visible option: Carnegie Mellon University, Pittsburgh, PA, US.
- Selecting the option closed the list, populated the school name, and displayed the school location.
- Page remained vertically scrollable at the shorter verification viewport; no horizontal overflow was introduced.
- Browser console errors and warnings: none.
- Account creation itself was not submitted during browser QA to avoid creating a test user. Submission behavior and validation are covered by automated tests.

## Full-view and focused comparison

- The original two-column composition, editorial grid, hero typography, authentication tabs, card width, field styling, and primary CTA were retained.
- The new School field follows the same label, input height, icon, border, radius, spacing, and helper-copy language used by the existing authentication form and Settings school picker.
- The taller card is an intentional consequence of the requested field. At 1280 × 720, the page scrolls instead of clipping the CTA or helper text; at the larger source viewport, the card fits within the available page height.
- The open dropdown uses the established popover, active-school iconography, location sublabel, and elevation treatment. It overlays following fields without reflow and remains inside the card width.

## Findings and comparison history

### Pass 1

- No actionable P0, P1, or P2 fidelity issues were found.
- Expected difference: the Create account card is taller and includes the requested School field.
- P3: The verification browser renders the focused capture slightly softer than the source screenshot; this is capture-density variance, not a CSS or asset change.

## Required fidelity surfaces

- Fonts and typography: existing Geist-based hierarchy, weights, sizes, and line heights retained.
- Spacing and layout rhythm: original card and field rhythm retained; one field group added with the same 1rem form gap.
- Colors and visual tokens: existing navy, ocean, muted, border, focus-ring, radius, and shadow tokens retained.
- Image and asset quality: no new raster assets required; the existing Lucide School icon is reused consistently with Settings.
- Copy and content: concise English label and helper copy explain that the selection becomes the new-course default and remains editable later.
- Accessibility: School has an associated label, combobox semantics, `aria-required`, expanded/listbox state, and keyboard-focusable options.

final result: passed
