/* Text to Braille — UEB Grade 1 (uncontracted) text → braille cells → SVG in millimetres.
   Code is copyright Jesal Mehta (first sketch 15/01/2021). No libraries; JSZip is fetched
   from cdnjs only the first time a ZIP is asked for.

   Pipeline:  text ─translate()→ cells per input line ─wrapLines()→ layout lines
              ─layout()→ geometry in mm (dots, empty positions, labels)
              ─ renderPreview() (screen, themed by CSS classes)
              ─ buildSVG()      (downloads, plain attributes, colours from the inputs)            */

'use strict';

/* ================= braille tables ================= */

// Cells are written as their raised dot numbers, e.g. 'h' = dots 1,2,5 → '125'.
// Dots 1-2-3 are the left column top→bottom, 4-5-6 the right column.
const LETTERS = {
  a: '1', b: '12', c: '14', d: '145', e: '15', f: '124', g: '1245', h: '125', i: '24', j: '245',
  k: '13', l: '123', m: '134', n: '1345', o: '135', p: '1234', q: '12345', r: '1235', s: '234', t: '2345',
  u: '136', v: '1236', w: '2456', x: '1346', y: '13456', z: '1356',
};
const DIGIT_LETTER = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h', 9: 'i', 0: 'j' };

// Indicators (signs that change the meaning of what follows). label = what the preview prints under them.
const SIGN = {
  capital: { dots: '6', label: '^' },
  number: { dots: '3456', label: '#' },
  letter: { dots: '56', label: ';' },     // UEB grade 1 indicator: a–j straight after a number are letters
};

// UEB punctuation and symbols. Several are two cells (a prefix + a cell).
const PUNCT = {
  ',': ['2'], ';': ['23'], ':': ['25'], '.': ['256'], '!': ['235'], '?': ['236'],
  "'": ['3'], '’': ['3'], '‘': ['3'],
  '-': ['36'], '–': ['6', '36'], '—': ['6', '36'],
  '(': ['5', '126'], ')': ['5', '345'],
  '/': ['456', '34'], '&': ['4', '12346'], '@': ['4', '1'], '#': ['456', '1456'], '%': ['46', '356'],
  '+': ['5', '235'], '=': ['5', '2356'], '*': ['5', '35'],
};
// Double quotes: opening ⠦ (236) / closing ⠴ (356), chosen by what comes before.
const QUOTE_OPEN = '236', QUOTE_CLOSE = '356';

/* ================= translate ================= */

const cell = (dots, label = '', kind = 'char') => ({ dots, label, kind });
const SPACE = () => cell('', '', 'space');

/* One input line → { cells, unsupported:Set }.
   Words are handled one at a time so a capitalised word (2+ letters, all capitals) gets the
   capital word sign ⠠⠠ once instead of ⠠ before every letter. Number mode starts with ⠼ and
   ends at anything that isn't a digit, or a . / , between digits. */
function translateLine(line, opts) {
  const cells = [], unsupported = new Set();
  const tokens = line.match(/\s+|\S+/g) || [];
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) { for (const _ of tok.replace(/\t/g, '  ')) cells.push(SPACE()); continue; }
    translateWord(tok, cells, unsupported, opts, cells.length === 0 || cells[cells.length - 1].kind === 'space');
  }
  return { cells, unsupported };
}

function translateWord(w, out, unsupported, opts, atWordStart) {
  const letters = w.match(/[A-Za-z]/g) || [];
  const capsWord = opts.capitals && letters.length >= 2 && letters.every(c => c >= 'A' && c <= 'Z');
  let capsWordStarted = false, numeric = false;
  const chars = [...w];

  chars.forEach((ch, i) => {
    const prev = chars[i - 1], next = chars[i + 1];
    const isDigit = /[0-9]/.test(ch), isLetter = /[A-Za-z]/.test(ch);

    if (isDigit) {
      if (!numeric) { out.push(cell(SIGN.number.dots, SIGN.number.label, 'sign')); numeric = true; }
      out.push(cell(LETTERS[DIGIT_LETTER[ch]], ch));
      return;
    }
    // decimal point / thousands comma inside a number keeps number mode
    if (numeric && (ch === '.' || ch === ',') && next && /[0-9]/.test(next)) {
      out.push(cell(PUNCT[ch][0], ch));
      return;
    }
    if (isLetter) {
      const lower = ch.toLowerCase();
      if (numeric && lower <= 'j') out.push(cell(SIGN.letter.dots, SIGN.letter.label, 'sign'));
      numeric = false;
      if (capsWord) {
        if (!capsWordStarted) {
          out.push(cell(SIGN.capital.dots, SIGN.capital.label, 'sign'), cell(SIGN.capital.dots, SIGN.capital.label, 'sign'));
          capsWordStarted = true;
        }
      } else if (opts.capitals && ch !== lower) {
        out.push(cell(SIGN.capital.dots, SIGN.capital.label, 'sign'));
      }
      out.push(cell(LETTERS[lower], ch));
      return;
    }
    numeric = false;
    if (ch === '"' || ch === '“' || ch === '”') {
      const opening = ch === '“' || (ch === '"' && (i === 0 ? atWordStart : /[(\[{]/.test(prev)));
      out.push(cell(opening ? QUOTE_OPEN : QUOTE_CLOSE, ch));
      return;
    }
    if (PUNCT[ch]) {
      PUNCT[ch].forEach((d, k) => out.push(cell(d, k === 0 ? ch : '', 'char')));
      return;
    }
    unsupported.add(ch);
  });
}

function translate(text, opts) {
  const unsupported = new Set();
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(l => {
    const r = translateLine(l, opts);
    r.unsupported.forEach(c => unsupported.add(c));
    return r.cells;
  });
  return { lines, unsupported };
}

// Unicode braille: U+2800 + one bit per raised dot (dot n → bit n-1)
const toUnicode = dots => String.fromCharCode(0x2800 + [...dots].reduce((b, d) => b | (1 << (d - 1)), 0));

/* ================= wrap ================= */

// Wrap each input line at word boundaries to at most maxCols cells. A word longer than a whole
// line is split. Spaces at the start of a wrapped line are dropped.
function wrapLines(lines, maxCols) {
  const out = [];
  for (const line of lines) {
    // split into runs: words (non-space cells) and spaces
    const runs = [];
    for (const c of line) {
      const sp = c.kind === 'space', last = runs[runs.length - 1];
      if (last && last.sp === sp) last.cells.push(c); else runs.push({ sp, cells: [c] });
    }
    let cur = [];
    for (const run of runs) {
      if (run.sp) { if (cur.length) cur.push(...run.cells); continue; }
      let word = run.cells;
      if (cur.length && cur.length + word.length > maxCols) { out.push(trimEnd(cur)); cur = []; }
      while (word.length > maxCols) { out.push(word.slice(0, maxCols)); word = word.slice(maxCols); }
      cur.push(...word);
    }
    out.push(trimEnd(cur));
  }
  return out;
}
function trimEnd(cells) {
  let n = cells.length;
  while (n && cells[n - 1].kind === 'space') n--;
  return cells.slice(0, n);
}

/* ================= layout (all in mm) ================= */

// Dot k (1..6) → [column, row] inside a cell
const DOT_POS = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2] };

function layout(lines, s) {
  const k = s.scale;
  const d = s.dot * k, p = s.pitch * k, r = d / 2;
  const adv = p + s.cellGap * k;                       // cell pitch: dot 1 to the next cell's dot 1
  const ls = s.labelSize * k, labelGap = ls * 0.45;
  const labelBand = s.letters ? labelGap + ls : 0;      // room under each line for the letters
  const lineAdv = 2 * p + s.lineGap * k + labelBand;    // line pitch: dot 1 to the next line's dot 1
  const m = s.margin;
  const cols = Math.max(1, ...lines.map(l => l.length));
  const rows = Math.max(1, lines.length);
  const W = 2 * m + (cols - 1) * adv + p + d;
  const H = 2 * m + (rows - 1) * lineAdv + 2 * p + d + labelBand;
  const mx = x => (s.mirror ? W - x : x);

  const dots = [], empty = [], labels = [];
  let cellCount = 0;
  lines.forEach((line, row) => {
    line.forEach((c, col) => {
      if (c.kind === 'space') return;
      cellCount++;
      const x0 = m + r + col * adv, y0 = m + r + row * lineAdv;
      for (let n = 1; n <= 6; n++) {
        const [cx, cy] = DOT_POS[n];
        const pt = { x: mx(x0 + cx * p), y: y0 + cy * p };
        (c.dots.includes(String(n)) ? dots : empty).push(pt);
      }
      if (s.letters && c.label && (c.kind !== 'sign' || s.signLabels)) {
        labels.push({ x: mx(x0 + p / 2), y: y0 + 2 * p + r + labelGap + ls * 0.78, text: c.label, sign: c.kind === 'sign' });
      }
    });
  });
  return { W, H, r, ls, dots, empty, labels, adv, lineAdv, cellCount, rows, cols };
}

/* ================= settings ================= */

// Real-world reference: Marburg Medium — dot 1.5 mm, 2.5 mm between dots in a cell,
// 6.0 mm cell to cell (so a 3.5 mm gap), 10.0 mm line to line (a 5.0 mm gap below the bottom dots).
const SIZES = [
  { key: 'dot',       label: 'Dot diameter',      unit: 'mm', min: 0.4, max: 5,  step: 0.1,  def: 1.5, std: true },
  { key: 'pitch',     label: 'Dot spacing',       unit: 'mm', min: 1,   max: 8,  step: 0.1,  def: 2.5, std: true,
    tip: 'Centre to centre, between the dots inside one cell (both across and down).' },
  { key: 'cellGap',   label: 'Cell gap (kerning)', unit: 'mm', min: 0,  max: 15, step: 0.1,  def: 3.5, std: true,
    tip: 'From the right-hand dots of one cell to the left-hand dots of the next. 3.5 mm gives the standard 6.0 mm cell pitch.' },
  { key: 'lineGap',   label: 'Line gap',          unit: 'mm', min: 0,   max: 30, step: 0.5,  def: 5.0, std: true,
    tip: 'From the bottom dots of one line to the top dots of the next, centre to centre. 5 mm gives the standard 10 mm line pitch. Letters, when shown, add their own room.' },
  { key: 'scale',     label: 'Scale',             unit: '×',  min: 0.25, max: 10, step: 0.05, def: 1, std: true,
    tip: 'Multiplies the four sizes above and the letter size. 1× is real braille; larger is decorative and no longer readable by touch.' },
  { key: 'labelSize', label: 'Letter size',       unit: 'mm', min: 1,   max: 8,  step: 0.1,  def: 2.6 },
  { key: 'cols',      label: 'Cells per line',    unit: '',   min: 4,   max: 80, step: 1,    def: 24 },
  { key: 'margin',    label: 'Margin',            unit: 'mm', min: 0,   max: 30, step: 0.5,  def: 5,
    tip: 'Round the edge of the downloaded file. Not scaled.' },
];

const $ = id => document.getElementById(id);
const S = {};   // current settings

function buildSizeRows() {
  const host = $('size-rows');
  SIZES.forEach(z => {
    S[z.key] = z.def;
    const row = document.createElement('div');
    row.className = 'size-row';
    row.innerHTML = `
      <label for="n-${z.key}"${z.tip ? ` title="${z.tip}"` : ''}>${z.label}${z.tip ? ' <span class="tip" aria-hidden="true">?</span>' : ''}</label>
      <input type="range" id="r-${z.key}" min="${z.min}" max="${z.max}" step="${z.step}" value="${z.def}" aria-label="${z.label}">
      <span class="num"><input type="number" id="n-${z.key}" min="${z.min}" max="${z.max}" step="${z.step}" value="${z.def}"><span class="unit">${z.unit}</span></span>`;
    host.appendChild(row);
    const rng = row.querySelector('input[type=range]'), num = row.querySelector('input[type=number]');
    rng.addEventListener('input', () => { num.value = rng.value; S[z.key] = +rng.value; update(); });
    num.addEventListener('input', () => {
      const v = parseFloat(num.value);
      if (!isFinite(v) || v < z.min) return;            // ignore half-typed values
      S[z.key] = Math.min(v, z.max); rng.value = S[z.key]; update();
    });
    num.addEventListener('change', () => { num.value = S[z.key]; });
  });
}

function setSize(key, v) {
  S[key] = v; $('r-' + key).value = v; $('n-' + key).value = v;
}

function readToggles() {
  S.letters = $('opt-letters').checked;
  S.signLabels = $('opt-signlabels').checked;
  S.capitals = $('opt-capitals').checked;
  S.ghost = $('opt-ghost').checked;
  S.ghostExport = $('opt-ghost-export').checked;
  S.mirror = $('opt-mirror').checked;
  $('opt-signlabels').disabled = !S.letters;
  $('opt-ghost-export').disabled = !S.ghost;
}

/* ================= render ================= */

const f3 = v => +v.toFixed(3);
const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let current = null;   // { text, tr, L } for the export buttons

function update() {
  readToggles();
  const text = $('text-in').value;
  const tr = translate(text, S);
  const wrapped = wrapLines(tr.lines, Math.round(S.cols));
  const L = layout(wrapped, S);
  current = { text, tr, L };

  renderPreview(L, !text.trim());

  // Unicode braille: one output line per input line (not wrapped), blank cells as U+2800
  $('unicode-out').textContent = tr.lines.map(l => l.map(c => toUnicode(c.dots)).join('')).join('\n');

  const un = $('unsupported');
  un.hidden = !tr.unsupported.size;
  if (tr.unsupported.size) un.textContent = 'Left out (no Grade 1 braille here): ' + [...tr.unsupported].map(c => `“${c}”`).join(' ');

  const pitch = S.pitch * S.scale + S.cellGap * S.scale;
  $('readout').innerHTML =
    `<span>cell pitch <b>${pitch.toFixed(1)} mm</b></span>` +
    `<span>line pitch <b>${L.lineAdv.toFixed(1)} mm</b></span>` +
    `<span>file <b>${L.W.toFixed(1)} × ${L.H.toFixed(1)} mm</b></span>` +
    `<span><b>${L.cellCount}</b> cells, <b>${L.rows}</b> line${L.rows === 1 ? '' : 's'}</span>`;

  const sw = $('size-warn'), warns = [];
  if (S.dot >= S.pitch) warns.push('Dots touch or overlap: make the dot smaller than the dot spacing.');
  if (S.scale === 1 && (S.dot < 1.2 || S.dot > 1.7)) warns.push('Readable-by-touch dots are about 1.2–1.7 mm across.');
  sw.hidden = !warns.length; sw.textContent = warns.join(' ');
  $('sign-legend').hidden = !(S.letters && S.signLabels);
}

const PX_PER_MM = 96 / 25.4;   // CSS reference pixels per mm (1:1 zoom)

// Screen only: a radial gradient a theme can use to make dots look domed / raised
// (fill: var(--dot-fill) = url(#pv-dome)). Stop colours come from CSS (.dome-hi/-mid/-lo).
const domeDefs = id => `<defs><radialGradient id="${id}" cx="0.36" cy="0.32" r="0.75">` +
  `<stop offset="0" class="dome-hi"/><stop offset="0.5" class="dome-mid"/><stop offset="1" class="dome-lo"/></radialGradient></defs>`;

function renderPreview(L, isEmpty) {
  const svg = $('preview');
  svg.setAttribute('viewBox', `0 0 ${f3(L.W)} ${f3(L.H)}`);
  // Fixed zoom (default 1:1 = CSS mm, ~real size) so dots don't shrink as the text gets longer;
  // the preview scrolls when the drawing is bigger. "Fit" scales to the card width instead.
  const z = $('zoom').value;
  svg.classList.toggle('fit', z === 'fit');
  if (z === 'fit') { svg.style.width = ''; }
  else { svg.style.width = (L.W * PX_PER_MM * +z).toFixed(1) + 'px'; }
  if (isEmpty) {
    svg.innerHTML = `<rect class="sheet" width="${f3(L.W)}" height="${f3(L.H)}"/>`;
    return;
  }
  const r = f3(L.r);
  const parts = [domeDefs('pv-dome'), `<rect class="sheet" width="${f3(L.W)}" height="${f3(L.H)}"/>`];
  // outline width follows the dot size (in mm), so it stays visible at 1:1 and doesn't get heavy when scaled up
  if (S.ghost) parts.push(`<g class="empty" stroke-width="${f3(Math.max(0.15, L.r * 0.2))}">${L.empty.map(p => `<circle cx="${f3(p.x)}" cy="${f3(p.y)}" r="${r}"/>`).join('')}</g>`);
  parts.push(`<g class="dots">${L.dots.map(p => `<circle cx="${f3(p.x)}" cy="${f3(p.y)}" r="${r}"/>`).join('')}</g>`);
  if (L.labels.length) parts.push(`<g class="labels" font-size="${f3(L.ls)}">${L.labels.map(t =>
    `<text x="${f3(t.x)}" y="${f3(t.y)}"${t.sign ? ' class="sign"' : ''}>${esc(t.text)}</text>`).join('')}</g>`);
  svg.innerHTML = parts.join('');
}

/* Download SVG: sized in mm, one group per layer (useful as layers in a laser/plotter program).
   Letters stay <text>; whatever opens the file supplies the font (see README, to-do). */
function buildSVG(L, { pngBg = false } = {}) {
  const r = f3(L.r), dotCol = $('col-dots').value, letCol = $('col-letters').value;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f3(L.W)}mm" height="${f3(L.H)}mm" viewBox="0 0 ${f3(L.W)} ${f3(L.H)}">`,
    `<title>${esc(current.text.slice(0, 120))}</title>`,
    `<desc>Braille, UEB Grade 1. Dot ${S.dot} mm, dot spacing ${S.pitch} mm, cell gap ${S.cellGap} mm, line gap ${S.lineGap} mm, scale ${S.scale}${S.mirror ? ', mirrored' : ''}. Made with Text to Braille, cabinetofcuriosities.in/text-to-braille/</desc>`,
  ];
  if (pngBg) out.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
  if (S.ghost && S.ghostExport) out.push(`<g id="empty-positions" fill="none" stroke="${dotCol}" stroke-opacity="0.35" stroke-width="${f3(Math.max(0.05, L.r * 0.12))}">` +
    L.empty.map(p => `<circle cx="${f3(p.x)}" cy="${f3(p.y)}" r="${r}"/>`).join('') + '</g>');
  out.push(`<g id="braille-dots" fill="${dotCol}">` + L.dots.map(p => `<circle cx="${f3(p.x)}" cy="${f3(p.y)}" r="${r}"/>`).join('') + '</g>');
  if (L.labels.length) out.push(`<g id="letters" fill="${letCol}" font-family="Overpass, Arial, Helvetica, sans-serif" font-size="${f3(L.ls)}" text-anchor="middle">` +
    L.labels.map(t => `<text x="${f3(t.x)}" y="${f3(t.y)}">${esc(t.text)}</text>`).join('') + '</g>');
  out.push('</svg>');
  return out.join('\n');
}

/* ================= downloads (same pattern as origami-tools common.js) ================= */

const stamp = (d = new Date()) => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}_${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const baseName = () => {
  const slug = current.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24).replace(/-$/, '');
  return `braille${slug ? '_' + slug : ''}_${stamp()}`;
};
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const svgBlob = () => new Blob([buildSVG(current.L)], { type: 'image/svg+xml' });
function pngBlob() {
  const L = current.L, ppm = Math.max(1, Math.min(40, +$('ppm').value || 10));
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(new Blob([buildSVG(L, { pngBg: true })], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(L.W * ppm); c.height = Math.round(L.H * ppm);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(resolve, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}
const jszip = () => window.JSZip ? Promise.resolve(window.JSZip) : new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js';
  s.onload = () => resolve(window.JSZip); s.onerror = () => reject(new Error('Could not load JSZip'));
  document.head.appendChild(s);
});

function wireDownloads() {
  $('x-svg').onclick = () => download(svgBlob(), baseName() + '.svg');
  $('x-png').onclick = async () => download(await pngBlob(), baseName() + '.png');
  $('x-zip').onclick = async () => {
    const name = baseName();
    try {
      const [Z, png] = await Promise.all([jszip(), pngBlob()]), zip = new Z();
      zip.file(name + '.svg', svgBlob());
      zip.file(name + '.png', png);
      zip.file(name + '.txt', current.text + '\n\n' + $('unicode-out').textContent + '\n');
      download(await zip.generateAsync({ type: 'blob' }), name + '.zip');
    } catch (e) { alert(e.message); }
  };
}

/* ================= title in braille ================= */

function drawHero() {
  const { lines } = translate('Text to Braille', { capitals: true });
  const cells = lines[0], p = 2.5, adv = 6, r = 0.75;
  const W = (cells.length - 1) * adv + p + 2 * r, H = 2 * p + 2 * r;
  const svg = $('hero-braille');
  svg.setAttribute('viewBox', `0 0 ${f3(W)} ${f3(H)}`);
  let i = 0, html = domeDefs('hero-dome');
  cells.forEach((c, col) => {
    for (let n = 1; n <= 6; n++) {
      const [cx, cy] = DOT_POS[n], on = c.dots.includes(String(n));
      if (c.kind === 'space') continue;
      const x = f3(r + col * adv + cx * p), y = f3(r + cy * p);
      // every position gets an empty circle, so it shows when a raised dot sinks in the animation
      html += `<circle class="off" cx="${x}" cy="${y}" r="${r}"/>`;
      if (on) html += `<circle class="on" cx="${x}" cy="${y}" r="${r}" style="--i:${i++}"/>`;
    }
  });
  svg.innerHTML = html;
}

/* ================= start ================= */

function init() {
  buildSizeRows();
  $('text-in').addEventListener('input', update);
  $('zoom').addEventListener('change', update);
  document.querySelectorAll('.toggles input').forEach(el => el.addEventListener('change', update));
  $('reset-sizes').onclick = () => { SIZES.filter(z => z.std).forEach(z => setSize(z.key, z.def)); update(); };
  $('copy-unicode').onclick = async () => {
    const b = $('copy-unicode');
    try { await navigator.clipboard.writeText($('unicode-out').textContent); b.textContent = 'Copied'; }
    catch (e) { b.textContent = 'Copy failed'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1500);
  };
  wireDownloads();
  drawHero();
  update();
}
init();
