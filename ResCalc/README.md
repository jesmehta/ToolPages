# Resistance Calculator for running LEDs

A simple tool to calculate the resistor required to control voltage and current for LEDs.

Open [index.html](index.html) in a browser. It is plain HTML/CSS/JS with no libraries or build step.

## Why it exists

Running an LED from a fixed supply (USB 5 V, a 12 V wall adaptor) needs a series resistor to drop the
extra voltage and limit the current. The maths is simple but tedious to repeat, and the result then has
to be matched to a resistor you can actually buy and read off its colour bands. This page does all of that
in one place.

## What it does

The page has four tabs; each can be opened directly with a hash:

1. **Single LED** (`index.html`) — one LED and one resistor.
2. **Multiple LEDs** (`#multi`) — an array of LED strings.
3. **Equivalent resistance** (`#equiv`) — combine resistors in series and parallel.
4. **Resistor finder** (`#finder`) — type a value, see the colour bands to look for.

### Single LED

**Inputs** (each has presets plus a custom entry):

| Input | Symbol | Presets |
| --- | --- | --- |
| Power source | V_source | USB 5 V, Wall adaptor 12 V |
| LED power | P_LED | 1 W, 3 W |
| LED forward voltage | V_LED | 3.2 V |

**Calculated:**

- LED current: I_LED = P_LED / V_LED
- Voltage to drop: ΔV = V_source − V_LED
- Required resistance: R = ΔV / I_LED
- Resistor power: P_R = ΔV × I_LED

**Resistor choice** (E24 series, ±5%):

Shown as three columns: value, colour-band drawing and band names, and the LED current each one gives.

- **Calculated:** the exact R (no bands; it's rarely a real part) and the target LED current.
- **Closest standard:** nearest E24 value, with its 4-band colour code and the actual LED current (± % vs target).
- **Closest standard up (safer):** smallest E24 value ≥ R, so the current never exceeds the target.

**Resistor power rating** (in the results table): the smallest standard rating (1/8 W … 100 W) that gives at
least 2× headroom over P_R, with P_R shown alongside.

Example with defaults (5 V, 1 W, 3.2 V): I = 312.5 mA, ΔV = 1.8 V, R = 5.76 Ω, P_R = 562.5 mW.
Closest 5.6 Ω (Green–Blue–Gold–Gold), up 6.2 Ω (Blue–Red–Gold–Gold), use a 2 W resistor.

### Multiple LEDs

**Inputs:** sliders for LEDs in series per string (0–12, default 3) and strings in parallel (0–10, default 1),
plus the same source / LED power / LED voltage choices. Defaults: 3 × 1 W LEDs in series on 12 V.

A **circuit diagram** redraws as the sliders move: + bus on the left, GND on the right, one row per string,
each row a resistor (coloured with the "closest standard up" bands) followed by the LEDs.

**Calculated** (one resistor per string):

- I_LED = P_LED / V_LED (the same current flows through every LED in a string)
- V_string = n_series × V_LED
- ΔV = V_source − V_string
- R = ΔV / I_LED, P_R = ΔV × I_LED (per string resistor)
- I_total = n_parallel × I_LED, P_total = V_source × I_total
- Power in LEDs = n_series × n_parallel × P_LED, and efficiency = that / P_total

Then the same resistor choice as the single tab, plus how many resistors are needed and the minimum supply
current/power. If the string needs more voltage than the source, it says the maximum LEDs in series that fit.

Defaults: R = 7.68 Ω, closest 7.5 Ω (Violet–Green–Gold–Gold), up 8.2 Ω (Grey–Red–Gold–Gold), 750 mW each → 2 W,
supply 312.5 mA / 3.75 W, 80% efficiency.

### Equivalent resistance

The network is a chain of **blocks in series**; each block holds **one or more resistors in parallel**
(e.g. 100 Ω + (220 Ω ∥ 220 Ω) = 210 Ω). Buttons add a resistor to a block ("+ parallel"), add a block
("+ Add block in series"), or remove either. The diagram (terminals A and B) redraws live, with each resistor
in its own colour bands.

- Block: R = 1 / (1/R1 + 1/R2 + …)
- Total: R_eq = R_block1 + R_block2 + …

Results show the working per block, the total, and the closest E24 value with its bands.

### Resistor finder

One row, three columns: **Resistor needed** (type a value) → **Closest standard** (E24) → **Look for**
(4-band ±5% colour drawing plus band names). Under the input it says when the value is already a standard one.

**Value input** (tabs 3 and 4): `220`, `4.7k`, `4k7`, `4R7`, `1M`, `2.2 kΩ`, `470 ohm`. `m`/`M` both mean mega.
Bad values get a red outline; the equivalent tab shows an error, the finder shows "Not understood".

## Design decisions

- **E24 series**: the common ±5% range that hobby resistor kits are sold in. 4-band codes match it (two
  digits, multiplier, gold tolerance band).
- **"Closest" uses a log-scale (ratio) distance**, because E-series values are spaced logarithmically.
- **Both closest and closest-up are shown**: the closest value may be below R, which lets more current through
  than intended. The value above R is the safe default; the closest is shown for when the user knows the margin is fine.
- **2× power headroom**: resistors at their full rating run very hot; doubling is a common rule of thumb.
- **Validation**: if V_source ≤ V_LED or any input isn't positive, the results are hidden and an error explains why.
- **One resistor per string** in the multiple-LED tab: LEDs in parallel sharing one resistor don't split current
  evenly (small V_LED differences), so one string can be over-driven. The page explains this under the diagram.
- **Each tab has its own inputs**, so the multiple tab can default to 12 V while the single tab keeps 5 V.
  Both tabs run the same `calculate()`; the single tab is n_series = n_parallel = 1.
- **Sliders go down to 0** as asked; at 0 the diagram shows "No LEDs" and the results ask for at least 1.
- **Equivalent resistance as "series of parallel blocks"**: covers most real hobby networks with a simple UI.
  Arbitrary nesting (parallel of series of parallel…) would need a tree editor; not worth it yet.
- **Values typed as text** (not number boxes) so `4k7` and `2.2k` work the way they're printed on parts lists.
- **Finder kept to one row** (user request, 2026-11-22): the first version had 4/5-band and tolerance choices and
  a band-by-band key; that was more than people need when hunting through a parts box. It now always shows the
  closest E24 value as a 4-band ±5% code. 5-band/E96 could come back as an option if wanted.
- **One band encoder** (`bandCode`, takes a digit count, currently always 2); colour bands everywhere use it. Multiplier is limited to
  silver (×0.01) … white (×1G); outside that the finder says it can't be shown.
- **No libraries**: unlike the other ToolPages tools, this needs no canvas drawing, so p5.js isn't used. The resistor
  is a small inline SVG.

## Files

- `index.html` — page structure and inputs
- `style.css` — base layout and plain light/dark colours (the page still works with only this)
- `theme.css` — the look, layered on top: Google Fonts (Bricolage Grotesque, Instrument Sans/Serif, IBM Plex Mono),
  tomato / teal / mustard / violet palette, ink outlines, stepped accent lines left of each card
- `bg-symbols.svg` — faint Memphis-style background tile of electrical symbols, used by `theme.css`
- `script.js` — LED calculation (shared by tabs 1–2), equivalent-resistance network, resistor finder, value parsing,
  E24 lookup, colour-band encoding, resistor / circuit / network SVG drawing, tabs

## Changelog

- 2026-11-21 — First version: inputs, calculations, closest E24 resistor with colour bands, power rating.
- 2026-11-21 — Renamed P to P_LED. Results show required, closest standard and closest standard up, each with colour bands.
- 2026-11-21 — Description reworded ("simple tool"). Added this README.
- 2026-11-21 — Split into tabs. Added the Multiple LEDs tab: series/parallel sliders, live circuit diagram,
  string calculations, supply totals and efficiency.
- 2026-11-21 — Resistor choice laid out as 3 columns (calculated | closest | closest safer). Results row renamed
  "Resistor power rating" and now shows the rating to buy plus the dissipation. Single LED tab gets the circuit
  diagram too (one resistor, one LED).
- 2026-11-21 — Theme trial: base CSS split from looks; four themes in `themes/` (postmodern, notebook, datasheet,
  memphis) with a temporary picker (bottom right, or `?theme=name`). All share the tomato / teal / mustard / violet
  palette. The first "postmodern" attempt read as generic, which is why the other three exist.
- 2026-11-21 — Postmodern background: faint Memphis-style tile of electrical symbols replaces the dot grid.
- 2026-11-21 — Added tabs 3 (Equivalent resistance: series of parallel blocks, live network diagram) and
  4 (Resistor finder: value → 4/5-band colour code with a band-by-band key). Text value input with k/M/RKM parsing.
- 2026-11-22 — Resistor finder simplified to one row: resistor needed | closest standard (E24) | colour bands.
  Removed band-count and tolerance options and the band key.
- 2026-11-22 — Look finalised. Solid drop shadows replaced by stepped left-edge lines (5→1px, 6px gaps; 3→1px on
  phones); rule under the tab pills removed. Theme trial closed: postmodern kept as `theme.css`, the notebook /
  datasheet / memphis themes and the picker removed (they're in git history, commits 7928cd7, f00a7fe, 262ddeb).

## To do / watch out for

- The stepped lines sit outside the card, so they need the left gutter: 45px on desktop, 15px on phones. If the
  page's side padding shrinks, they'll be clipped.
- The page title and subtitle still talk only about LEDs, but tabs 3 and 4 are general resistor tools.
- Possible: a reverse finder (pick colours → value), E96 suggestions for 5-band, nested networks.

- Slider maxima (12 series, 10 parallel) are arbitrary; raise them in `index.html` if needed. Large arrays make the
  diagram small on phones.
- A small ΔV (string voltage close to the source) makes the current very sensitive to V_LED variation and supply
  tolerance. The page doesn't warn about this yet.
- The forward voltage varies by LED colour and part (red ~2 V, white/blue ~3.2 V). The 3.2 V preset suits white/blue.
- For 1 W+ LEDs a resistor wastes a lot of power as heat; the page notes that a constant-current driver is usually better.
- Possible additions: E12/E96 series choice, 5-band codes, a low-headroom warning.
