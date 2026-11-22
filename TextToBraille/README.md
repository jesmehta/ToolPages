# Text to Braille

Type text, get braille (UEB Grade 1) as clean dots in real millimetres, and download it as SVG, PNG or ZIP
for a laser engraver, plotter, 3D print or hand embossing.

Live at <https://cabinetofcuriosities.in/text-to-braille/> (Cabinet of Curiosities, under Machines & Makings).
Locally, open [index.html](index.html) in a browser. Plain HTML/CSS/JS, no build step; JSZip is fetched from
cdnjs only the first time a ZIP is asked for.

## Why it exists

The first version (2021 p5.js sketch, rebuilt 2024) drew braille for a typed line onto a 400 × 400 canvas and
saved it as a JPG. That's fine to look at but not to make anything with: the output had no real size, wrapped at
a fixed pixel width, and knew only a–z and three punctuation marks. The rebuild (2026-11-22) makes the output a
proper drawing — vector dots at real braille dimensions, adjustable, with the layers separated — so it can go
straight to a machine.

## What it does

- **Text in** (multi-line). Translated to UEB Grade 1 (uncontracted):
  - letters a–z; **capital sign** ⠠ before a capital, **capital word** ⠠⠠ for a word of 2+ letters in capitals;
  - **numbers**: number sign ⠼ + a–j; `.` and `,` between digits stay in the number (`3.5`, `1,000`);
    a–j straight after a number get the **letter sign** ⠰ (`3d` → ⠼⠉⠰⠙);
  - punctuation `, ; : . ! ? ' - " ( ) / & @ # % + = *`, curly quotes and en/em dashes. `"` opens (⠦) at the
    start of a word and closes (⠴) elsewhere.
  - Anything else is left out and listed in a warning (e.g. accented letters, `~`).
- **Layout**: row 1 text | Unicode braille, row 2 controls | preview. The preview stays in view (sticky) while
  the controls scroll. Phones: one column, text → Unicode → preview → controls.
- **Unicode braille** of the text (one line per input line, blank cells as U+2800), with a Copy button.
- **Preview**: the drawing at a fixed zoom — 1:1 (CSS millimetres, roughly real size; default), 1.5×, 2×, 3× —
  or Fit (scaled to the card width). It scrolls when bigger than the card. Readout of cell pitch, line pitch,
  file size in mm and cell count.
- **Size & spacing** (slider + number box each):

  | Control | Default | Meaning |
  | --- | --- | --- |
  | Dot diameter | 1.5 mm | |
  | Dot spacing | 2.5 mm | centre to centre inside one cell, across and down |
  | Cell gap (kerning) | 3.5 mm | right dots of one cell → left dots of the next; 3.5 gives the standard 6.0 mm cell pitch |
  | Line gap | 5 mm | bottom dots → next line's top dots; 5 gives the standard 10 mm line pitch (letters add their own room) |
  | Scale | 1× | multiplies the four above and the letter size |
  | Letter size | 2.6 mm | height of the roman letters |
  | Cells per line | 24 | wraps at word breaks; a longer word is split |
  | Margin | 5 mm | round the file; not scaled |

  **Reset to standard braille size** resets the first five (Marburg Medium: dot 1.5, 2.5, 6.0, 10.0 mm).
  Warnings when dots touch, and when real-size dots are outside ~1.2–1.7 mm.
- **Show**: roman letters under the cells (and, separately, labels on the signs: `^` capital, `#` number,
  `;` letter sign — the Braille ASCII characters for those cells); capital signs on/off (off = ignore case, for
  decorative use); empty dot positions (screen only, or in downloads too); **mirror** for embossing from the back
  with a slate and stylus (whole layout flipped, letters still readable).
- **Download**: SVG, PNG, ZIP (SVG + PNG + a .txt of the text and its Unicode braille). Dot and letter colours,
  PNG density in px/mm. File names `braille_<first words>_YYYY_MMDD_HHMMSS`.

## Design decisions

- **Millimetres throughout.** The SVG's width/height are in mm and its viewBox is in mm, so it imports at the
  right size into Inkscape / LightBurn / a slicer.
- **Layers as groups** in the SVG: `#braille-dots`, `#letters`, `#empty-positions`, so a laser program can give
  them different operations (e.g. engrave dots, skip letters).
- **Dots are `<circle>`s**, not paths; every tool handles them.
- **Letters are SVG `<text>`** (font: Overpass, the page's font, falling back to Arial). Whatever opens the file
  supplies the font, so letters may look different elsewhere; the PNG uses a system font for the same reason
  (an SVG drawn into a canvas can't see the page's web fonts). Origami tools convert text to outlines with
  opentype.js; not done here yet (see To do).
- **Kerning = gap, not pitch.** The controls are the gaps people see between cells and lines; the readout shows
  the resulting pitches, which is what braille standards quote.
- **Grade 1 only.** Contracted (Grade 2) braille has many context rules; it would be a separate phase.
- **Capital word sign** only for 2+ letters, so `I` and `A` get a single ⠠.
- **Mirror flips the whole layout** (not just each cell), because slate-and-stylus writing runs right to left
  from the back.
- **Downloads use the colour inputs, the preview uses the theme**, so the preview can show domed silver dots on
  a dark plate without changing what goes to the machine. SVG background transparent, PNG white (same as the origami tools).
- **No p5.js.** The old sketch needed a canvas; the new one draws SVG directly. Same no-library approach as ResCalc.
- **Download code copied from origami-tools `common.js`** (stamp, download, svg→png, lazy JSZip) rather than
  shared: ToolPages and origami-tools are separate repos and separate Cabinet mounts.
- **Preview at a fixed zoom, not fit-to-width** (2026-11-22, user report "canvas shrinks as more words are
  added"): fitting to the card meant every added word made the whole drawing smaller. 1:1 uses CSS mm
  (96 px per inch), so it's only approximately real size on a given screen.
- **Sticky preview selector is `.workspace > .area-preview`** (two classes) because the theme sets
  `.card { position: relative }`, which, loading later at equal specificity, silently cancelled `sticky`.
- **Look: "Signage", signal orange on concrete** (chosen 2026-11-22). Braille is met most often on room signs,
  so: a concrete wall, the title on a light brushed-aluminium sign (orange band, two screws), cards as dark
  sign plates (corner screws, orange stripe on top), domed silver dots in the preview, title dots in orange.
  Overpass throughout (an open version of the US highway sign lettering). How it was chosen:
  1. Theme trial of four, with a temporary picker: **embossed paper** (blind-embossed braille-word background,
     indigo + vermilion, Atkinson Hyperlegible), **midnight** (ResCalc's sibling: midnight blue, Neon colours,
     stepped card lines), **risograph** (fluorescent pink + blue, misregistered overprint, grain, Anybody), and
     **signage** (brushed-aluminium wall, mustard yellow). Midnight was a straight no; risograph "great but not
     quite there"; signage the best but needing "a splash of colour" instead of the mustard and a more textural
     background.
  2. Signage accent × wall trial: accents signal orange, teal, cobalt, exit green, riso pink `#ff48b0`, mustard;
     walls terrazzo, concrete, stronger brushed metal. **Signal orange + concrete** chosen.
  The other themes, tiles and the picker were deleted before the first commit; screenshots are in CHANGELOG.md.
- **Title animation repeats**: the title's braille dots press up one by one, hold, sink back in the same order,
  every 8 s (user request: periodically, not only once). Each pop is cartoon-mushroom style (user request):
  up — grow past full size to 1.4×, plop to 0.9×, settle at 1×; down — puff up to 1.25×, then shrink to
  nothing while fading. Keyframes `dot-cycle` in `style.css`. One infinite CSS animation per dot, offset by its
  index, so the stagger holds on every cycle. With reduced motion turned on, the dots just stay up.

## Files

- `index.html` — page structure, Cabinet back link, link-preview tags
- `style.css` — base layout and plain colours; works on its own. `theme.css` overrides its variables.
- `theme.css` — the look (Signage, signal orange, concrete): Google Fonts (Overpass, Overpass Mono), colours,
  title sign, sign plates, domed dots
- `concrete-bg.svg` — the wall tile (420 px)
- `script.js` — braille tables, translate → wrap → layout, preview, download SVG/PNG/ZIP, title braille
- `og-preview.jpg` — the link-preview image (1200 × 630, ~80 KB) named by the `og:` tags
- `dev-tools/make-bg-tile.mjs` — remakes `concrete-bg.svg`; `dev-tools/make-og-preview.js` — remakes
  `og-preview.jpg` (Playwright). Neither is loaded by the page.
- `CHANGELOG.md` — visual changelog; screenshots in `dev-screenshots/`

## Changelog

Stage-by-stage with screenshots: [CHANGELOG.md](CHANGELOG.md).

- 2021-01-15 — p5.js sketch: a–z, space, `. , ?` on a 400 px canvas, letters toggle, JPG save on `s`.
- 2024-04-08 — Input box, convert / reset buttons, show-letters checkbox.
- 2026-11-22 — Rebuilt without p5: UEB Grade 1 (capitals, numbers, punctuation), SVG preview in mm, size and
  spacing controls, letters / signs / empty positions / mirror toggles, SVG / PNG / ZIP download, Unicode braille
  with copy, Cabinet back link and link-preview tags. Theme trial with four themes.
- 2026-11-22 — Layout: text | Unicode on row 1, controls | preview on row 2. Sticky preview fixed (themes had
  cancelled it). Preview zoom (1:1 default, 1.5×, 2×, 3×, Fit) so dots don't shrink as text grows. Button renamed
  "Reset to standard braille size". Midnight theme dropped. Signage: accent choices instead of mustard, wall
  textures (terrazzo / concrete / brushed metal), aluminium title sign, accent stripe on plates. Riso pink added
  to the accents.
- 2026-11-22 — Look settled: Signage, signal orange on concrete, as `theme.css` + `concrete-bg.svg`; trial themes
  and picker removed. Title animation repeats every 8 s. Downloaded letters use Overpass (was Atkinson). Link
  preview image `og-preview.jpg`.
- 2026-11-22 — Title braille: every position has its empty circle under the raised dot, so the cell outline
  stays visible while the dots are sunk.
- 2026-11-22 — Title dots pop like cartoon mushrooms: overshoot and plop back on the way up, puff up then
  shrink away on the way down.
- 2026-11-22 — Published on the Cabinet of Curiosities at `/text-to-braille/` (Machines & Makings), as a pinned
  external mount of this folder.

## To do / watch out for

- At 1:1 the dots are small on screen (1.5 mm ≈ 6 px); that's real size. Use the zoom for a closer look.
- **Cabinet shows a pinned commit.** A push here does not change the live page: in CabinetOfCuriosities run
  `npm run update-externals`, check the report, and add any new file the page loads to
  `content/external-allowlists/text-to-braille.txt` (today: index.html, style.css, theme.css, concrete-bg.svg,
  script.js, og-preview.jpg). The repo has GitHub Pages on, so a copy also sits at
  jesmehta.github.io/ToolPages/TextToBraille/; the Cabinet URL is the one to share.
- **Link previews:** the `og:` URLs are absolute and point at the Cabinet. If the title or look changes, re-run `dev-tools/make-og-preview.js`; keep the image under ~300 KB (WhatsApp).
  Test from WhatsApp on a phone (WhatsApp Web doesn't build previews).
- Letters as outlines (opentype.js text-to-path, as in the origami tools) so the SVG doesn't depend on fonts.
- Possible: Grade 2 contractions; other braille codes (Bharati braille for Indian scripts); a "dots only as
  holes" mode or dot height for 3D printing (an STL/OpenSCAD export); a page-size option (A4 sheets with
  standard 40 × 25 cell lines).
- The capital word sign follows the simple rule "2+ letters, all capitals". UEB's capital passage (⠠⠠⠠ for
  3+ words) and the capital terminator aren't done.
- `"` open/close is guessed from position; text with unusual quoting may come out wrong.
