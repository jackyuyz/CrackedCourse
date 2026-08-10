# Design QA

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
