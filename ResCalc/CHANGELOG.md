# ResCalc — visual changelog

How the tool developed, stage by stage, with a screenshot of each. The screenshots were
taken afterwards from the code at each listed commit (900 px wide, cropped at 1500 px tall),
so they show exactly what that commit looked like. They live in [dev-screenshots/](dev-screenshots/).

The text changelog, with every small change, is in [README.md](README.md#changelog).

---

## 1. First version — 2026-11-21 · `5cb5066`

One page: power source, LED power and forward voltage in; current, voltage drop, required
resistance and resistor power out, plus the closest standard (E24) resistor and its colour bands.

![First version](dev-screenshots/01-first-version.jpg)

## 2. Three resistor choices — 2026-11-21 · `a8228b7`

P renamed P_LED. The results show the required value, the closest standard value, and the
closest standard value *above* it (the safer choice), each with its colour bands.

![Resistor choices](dev-screenshots/02-resistor-choices.jpg)

## 3. Multiple LEDs tab — 2026-11-21 · `d360d81`

Tabs. Multiple LEDs: sliders for LEDs in series and strings in parallel, a live circuit diagram,
string voltage, supply totals and efficiency. Resistor choice laid out as three columns.

![Multiple LEDs tab](dev-screenshots/03-multiple-leds-tab.jpg)

## 4. First theme: "postmodern" — 2026-11-21 · `fa3ca09`

Warm paper with a dot grid, ink outlines, hard offset shadows, tomato / teal / mustard / violet,
a circle and triangle beside the title. Judged too much like a default look, so a trial followed.

![Postmodern theme](dev-screenshots/04-postmodern-theme.jpg)

## 5. Theme trial — 2026-11-21 · `262ddeb`

Three alternatives, switchable live: engineer's notebook, component datasheet, Memphis print.
Postmodern was kept, taking the Memphis idea of a patterned background (next stage).

| Engineer's notebook | Component datasheet | Memphis print |
| --- | --- | --- |
| ![Notebook](dev-screenshots/05a-trial-notebook.jpg) | ![Datasheet](dev-screenshots/05b-trial-datasheet.jpg) | ![Memphis](dev-screenshots/05c-trial-memphis.jpg) |

## 6. Electrical-symbol background — 2026-11-21 · `dcd79d9`

The dot grid replaced by a faint, scattered tile of circuit symbols (resistor, LED, capacitor,
ground, battery, switch, coil, lamp).

![Symbol background](dev-screenshots/06-symbol-background.jpg)

## 7. Equivalent resistance and Resistor finder — 2026-11-21 · `e8b4b21`

Two more tabs. Equivalent resistance v1: blocks in series, resistors in parallel inside a block.
Finder v1: type a value, pick 4/5-band and tolerance, get a band-by-band key.

| Equivalent resistance (blocks) | Resistor finder v1 |
| --- | --- |
| ![Equivalent blocks](dev-screenshots/07a-equivalent-blocks.jpg) | ![Finder v1](dev-screenshots/07b-finder-v1.jpg) |

## 8. Finder in one row — 2026-11-22 · `6fd3f0e`

Simplified to resistor needed → closest standard → colour bands.

![Finder one row](dev-screenshots/08-finder-one-row.jpg)

## 9. Stepped lines instead of shadows — 2026-11-22 · `1b625fa`

The theme trial closed (postmodern kept). Solid drop shadows replaced by stepped lines of
5 → 1 px to the left of each card; tabs became rounded rectangles with small gaps.

![Stepped lines](dev-screenshots/09-stepped-lines.jpg)

## 10. Resistor identifier — 2026-11-22 · `0a74d9a`

The reverse direction on the finder tab: pick each band's colour (4 or 5 bands) and read the
value, tolerance and range. Each dropdown takes its band's colour.

![Resistor identifier](dev-screenshots/10-resistor-identifier.jpg)

## 11. Aligned inputs — 2026-11-22 · `2cce390`

Power source, LED power and forward voltage options line up in columns, with the Custom boxes
under each other. (Later tightened, and "Wall adaptor 12 V" shortened to "12 V".)

![Aligned inputs](dev-screenshots/11-aligned-inputs.jpg)

## 12. Any series/parallel network, as nested boxes — 2026-11-22 · `77a45ad`

Equivalent resistance v2: a tree of groups, each with a Series / Parallel switch, nesting to
any depth. Complete, but it looked complicated.

![Equivalent tree](dev-screenshots/12-equivalent-tree.jpg)

## 13. The circuit diagram as the editor — 2026-11-22 · `4edf28c`

Equivalent resistance v3: build the circuit on the diagram itself. Each resistor has + buttons
(left/right = series, above/below = parallel), a value list and ×. Edit | View toggle.

| Edit | View |
| --- | --- |
| ![Diagram editor](dev-screenshots/13a-diagram-editor.jpg) | ![View mode](dev-screenshots/13b-diagram-view-mode.jpg) |

## 14. Number × multiplier dropdowns — 2026-11-22 · `1208415`

The 169-entry value list replaced by an E24 number (1.0 … 9.1) and a multiplier (× 1 Ω … × 10 MΩ).
Terminals A and B gained + buttons for adding at the very start or end.

![Two value dropdowns](dev-screenshots/14-two-value-dropdowns.jpg)

## 15. Midnight blue, Neon palette, title circuit — 2026-11-22 · `3a9b244`

Chosen from a live trial of four backgrounds and ~15 colour sets: midnight blue with coral,
cyan, amber and lavender. The circle and triangle replaced by an animated circuit drawn as the
title's border — the switch opens and closes, and the LED lights while it's closed.

![Midnight and title circuit](dev-screenshots/15-midnight-title-circuit.jpg)

## 16. Current — 2026-11-22 · `aef2bf3`

Three LEDs in series along the bottom of the title circuit, pointing right (battery flipped to
match), spread over the middle 40%. Title and tagline centred with balanced line wrapping.
Stepped lines mirrored on the right of each card.

| LED tabs | Equivalent resistance |
| --- | --- |
| ![Current, single LED](dev-screenshots/16a-current-single.jpg) | ![Current, equivalent](dev-screenshots/16b-current-equivalent.jpg) |
