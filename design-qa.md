# Design QA

## Scope

- Community course discovery search-row alignment.
- Settings default-school autocomplete visibility and usable result height.

## Visual truth

- Community reference: `/var/folders/gg/m56sp7p91czcgcqrkcgbd5800000gn/T/TemporaryItems/NSIRD_screencaptureui_Yf0gwI/截屏2026-08-09 21.40.44.png` (1103 × 241 px).
- Settings reference: `/var/folders/gg/m56sp7p91czcgcqrkcgbd5800000gn/T/TemporaryItems/NSIRD_screencaptureui_pVu8Wu/截屏2026-08-09 21.43.16.png` (700 × 220 px).
- Community implementation capture: `output/design-qa/community-search-after.png` (2326 × 1125 px).
- Settings implementation capture: `output/design-qa/settings-school-dropdown-after.png` (2326 × 1125 px).
- Browser viewport: 2327 × 1125 CSS px at device-pixel ratio 1.1.

## Verified states

- Community: signed-in discovery page, Carnegie Mellon University selected, course query and year empty.
- Settings: signed-in Profile page, Default school query set to `university`, result list open.

## Comparison history

### Pass 1 findings

- P1: The community search icon was vertically shifted because the institution field's location helper text stretched the grid row while sibling controls remained vertically centered against that taller row.
- P1: The settings autocomplete was clipped at the Profile card boundary because the shared Card component uses hidden overflow.
- P2: The school result list exposed too few rows for a broad query.

### Fixes

- Aligned community filter controls to the start of the grid row so all input shells share the same vertical origin.
- Allowed visible overflow on the Settings Profile card so the autocomplete can extend beyond the card without changing the card layout.
- Increased the autocomplete's scrollable maximum height from 18rem to 20rem.

### Post-fix evidence

- Community search icon center Y: 222.670453 px.
- Community input center Y: 222.670450 px.
- Alignment delta: less than 0.001 px.
- Settings listbox height: 320 px with 12 options rendered for `university`.
- The list extends 209.1 px beyond the Profile card and remains independently scrollable (`overflow-y: auto`).

## Fidelity surface review

- Typography: unchanged; existing product type scale and weights retained.
- Spacing and alignment: corrected only at the affected controls.
- Color, borders, radius, and shadows: existing design tokens retained.
- Icons: existing Lucide icons retained; no replacement assets required.
- Copy and interaction behavior: unchanged except for the taller visible result area.
- Responsive behavior: grid alignment applies at every breakpoint; dropdown remains constrained to its combobox width and viewport-scrollable through its own list.

final result: passed
