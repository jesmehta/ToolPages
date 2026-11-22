// Resistance Calculator for running LEDs
//
// Single LED:   I_LED = P_LED / V_LED, dV = V_source - V_LED, R = dV / I_LED, P_R = dV * I_LED
// Multiple LED: n_series LEDs per string, n_parallel strings, one resistor per string.
//               V_string = n_series * V_LED, dV = V_source - V_string, R and P_R as above (per string),
//               I_total = n_parallel * I_LED.
// The single-LED tab is the same calculation with n_series = n_parallel = 1.

const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
             3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];

// Standard resistor power ratings, in watts.
const POWER_RATINGS = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10, 25, 50, 100];

const COLOURS = [
  { name: "Black",  hex: "#000000" },
  { name: "Brown",  hex: "#7b3f00" },
  { name: "Red",    hex: "#d32f2f" },
  { name: "Orange", hex: "#f57c00" },
  { name: "Yellow", hex: "#fbc02d" },
  { name: "Green",  hex: "#388e3c" },
  { name: "Blue",   hex: "#1976d2" },
  { name: "Violet", hex: "#7b1fa2" },
  { name: "Grey",   hex: "#808080" },
  { name: "White",  hex: "#ffffff" },
];
const GOLD   = { name: "Gold",   hex: "#c9a227" };
const SILVER = { name: "Silver", hex: "#c0c0c0" };

// ---------- DOM helpers ----------

const $ = id => document.getElementById(id);

// Sets text only if the element exists (the single tab has fewer outputs).
function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

// Reads a radio group with an optional "custom" number box.
function readGroup(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  const custom = $(`${name}-custom`);
  custom.disabled = checked.value !== "custom";
  return checked.value === "custom" ? parseFloat(custom.value) : parseFloat(checked.value);
}

// ---------- maths ----------

// All E24 values from 0.1 Ω up to 91 MΩ, ascending.
function e24Values() {
  const out = [];
  for (let exp = -1; exp <= 7; exp++) {
    for (const v of E24) out.push(+(v * Math.pow(10, exp)).toPrecision(3));
  }
  return out;
}
const E24_ALL = e24Values();

function closestStandard(r) {
  let best = E24_ALL[0];
  for (const v of E24_ALL) {
    // Compare on a log scale so "closest" means closest in ratio.
    if (Math.abs(Math.log(v / r)) < Math.abs(Math.log(best / r))) best = v;
  }
  return best;
}

function nextHigherStandard(r) {
  return E24_ALL.find(v => v >= r * 0.9999) ?? E24_ALL[E24_ALL.length - 1];
}

function suggestedRating(p) {
  // Recommend at least 2x headroom so the resistor doesn't run hot.
  return POWER_RATINGS.find(w => w >= p * 2) ?? null;
}

// Encodes r as `digits` significant digits + a multiplier band.
// Returns { digitVals, digitBands, exp, mult, value } or null if it can't be shown
// (multiplier bands only run from silver ×0.01 to white ×1G).
function bandCode(r, digits = 2) {
  if (!(r > 0) || !isFinite(r)) return null;
  let exp = Math.floor(Math.log10(r) + 1e-9) - (digits - 1);
  let n = Math.round(r / Math.pow(10, exp));
  if (n >= Math.pow(10, digits)) { exp += 1; n = Math.round(r / Math.pow(10, exp)); }
  if (exp < -2 || exp > 9) return null;
  const digitVals = String(n).padStart(digits, "0").split("").map(Number);
  const mult = exp === -2 ? SILVER : exp === -1 ? GOLD : COLOURS[exp];
  const value = +(n * Math.pow(10, exp)).toPrecision(digits + 1);
  return { digitVals, digitBands: digitVals.map(d => COLOURS[d]), exp, mult, value };
}

// 4-band code: digit, digit, multiplier, tolerance (gold = ±5%).
function colourBands(r) {
  const c = bandCode(r, 2);
  return c ? [...c.digitBands, c.mult, GOLD] : null;
}


// Parses "220", "4.7k", "4k7", "4R7", "1M", "2.2 kΩ", "470 ohm". Returns ohms or NaN.
// m/M both mean mega here: nobody buys milliohm resistors from a colour code.
function parseOhms(str) {
  const s = String(str).trim().toLowerCase().replace(/ohms?|ω|Ω/g, "").replace(/\s+/g, "");
  const mult = { "": 1, r: 1, k: 1e3, m: 1e6, g: 1e9 };
  let m = s.match(/^(\d+(?:\.\d*)?|\.\d+)([rkmg]?)$/);
  if (m) return parseFloat(m[1]) * mult[m[2]];
  m = s.match(/^(\d*)([rkmg])(\d+)$/);            // RKM notation: 4k7, 4R7, k47
  if (m) return parseFloat((m[1] || "0") + "." + m[3]) * mult[m[2]];
  return NaN;
}

// ---------- formatting ----------

function fmtOhms(r) {
  if (r >= 1e6) return trim(r / 1e6) + " MΩ";
  if (r >= 1e3) return trim(r / 1e3) + " kΩ";
  return trim(r) + " Ω";
}

function fmtWatts(w) {
  if (w < 1) return trim(w * 1000) + " mW";
  return trim(w) + " W";
}

function fmtRating(w) {
  const fractions = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
  return (fractions[w] ? fractions[w] + " W" : w + " W");
}

function fmtAmps(i) {
  if (i < 1) return trim(i * 1000) + " mA";
  return trim(i) + " A";
}

function trim(n) {
  return parseFloat(n.toPrecision(4)).toString();
}

const bandNames = bands => bands.map(b => b.name).join(" – ");

// ---------- drawing: single resistor ----------

// Draws a large 4- or 5-band resistor; the tolerance band sits apart.
function drawResistor(svgId, bands) {
  const xs = bands.length === 5 ? [94, 118, 142, 166, 214] : [100, 128, 156, 214];
  let s = `
    <line x1="0" y1="40" x2="320" y2="40" stroke="var(--wire)" stroke-width="5"/>
    <rect x="70" y="14" width="180" height="52" rx="22" fill="var(--resistor-body)" stroke="rgba(0,0,0,0.25)"/>`;
  bands.forEach((b, i) => {
    s += `<rect x="${xs[i]}" y="14" width="14" height="52" fill="${b.hex}" stroke="rgba(0,0,0,0.2)">
            <title>${b.name}</title></rect>`;
  });
  $(svgId).innerHTML = s;
}

// ---------- drawing: circuit diagram ----------

// Draws n_parallel rows between a + bus (left) and a GND bus (right).
// Each row: one resistor, then n_series LEDs. `bands` colours the resistors (or null).
function drawCircuit(svgId, nSeries, nParallel, vs, bands) {
  const svg = $(svgId);
  const ROW = 56, TOP = 46, LED_PITCH = 50;
  const busL = 30;
  const resX = 60, resW = 56;
  const ledStart = resX + resW + 30;
  const busR = ledStart + Math.max(nSeries, 1) * LED_PITCH + 10;
  const W = busR + 40;
  const rows = Math.max(nParallel, 1);
  const H = TOP + (rows - 1) * ROW + 40;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  // Keep small circuits from being scaled up huge.
  svg.style.maxWidth = `${Math.max(W * 1.3, 320)}px`;

  const wire = `stroke="var(--wire)" stroke-width="2.5" fill="none"`;
  let s = "";

  const yFirst = TOP, yLast = TOP + (rows - 1) * ROW;
  const vsLabel = vs > 0 ? `+${trim(vs)} V` : "+V";
  s += `<text x="${busL}" y="16" class="dg-label" text-anchor="middle">${vsLabel}</text>`;
  s += `<text x="${busR}" y="16" class="dg-label" text-anchor="middle">GND</text>`;
  s += `<line x1="${busL}" y1="22" x2="${busL}" y2="${yLast}" ${wire}/>`;
  s += `<line x1="${busR}" y1="22" x2="${busR}" y2="${yLast}" ${wire}/>`;

  if (nSeries === 0 || nParallel === 0) {
    s += `<text x="${(busL + busR) / 2}" y="${yFirst + 4}" class="dg-empty" text-anchor="middle">No LEDs</text>`;
    svg.innerHTML = s;
    return;
  }

  for (let p = 0; p < nParallel; p++) {
    const y = TOP + p * ROW;
    s += `<line x1="${busL}" y1="${y}" x2="${busR}" y2="${y}" ${wire}/>`;
    s += `<circle cx="${busL}" cy="${y}" r="3.5" fill="var(--wire)"/>`;
    s += `<circle cx="${busR}" cy="${y}" r="3.5" fill="var(--wire)"/>`;

    // Resistor
    s += `<rect x="${resX}" y="${y - 9}" width="${resW}" height="18" rx="6" fill="var(--resistor-body)" stroke="rgba(0,0,0,0.3)"/>`;
    if (bands) {
      [resX + 10, resX + 18, resX + 26, resX + 42].forEach((bx, i) => {
        s += `<rect x="${bx}" y="${y - 9}" width="5" height="18" fill="${bands[i].hex}"/>`;
      });
    }
    if (p === 0) s += `<text x="${resX + resW / 2}" y="${y - 15}" class="dg-small" text-anchor="middle">R</text>`;

    // LEDs (anode on the left, pointing towards GND)
    for (let k = 0; k < nSeries; k++) {
      const x = ledStart + k * LED_PITCH;
      s += `<polygon points="${x},${y - 11} ${x},${y + 11} ${x + 20},${y}" fill="var(--led)" stroke="var(--text)" stroke-width="1.5"/>`;
      s += `<line x1="${x + 20}" y1="${y - 11}" x2="${x + 20}" y2="${y + 11}" stroke="var(--text)" stroke-width="2"/>`;
      // light arrows
      s += `<path d="M${x + 8} ${y - 13} l7 -8 m-4 0 h4 v4 M${x + 15} ${y - 11} l7 -8 m-4 0 h4 v4" stroke="var(--accent)" stroke-width="1.3" fill="none"/>`;
    }
  }

  svg.innerHTML = s;
}

// ---------- resistor choice ----------

function showStandard(prefix, key, value, dv, iTarget) {
  const bands = colourBands(value);
  drawResistor(`${prefix}-svg-${key}`, bands);
  setText(`${prefix}-out-${key}`, fmtOhms(value));
  setText(`${prefix}-bands-${key}`, bandNames(bands));
  const iActual = dv / value;
  const pct = (iActual / iTarget - 1) * 100;
  setText(`${prefix}-cur-${key}`,
    `LED current ${fmtAmps(iActual)} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`);
}

// ---------- main calculation (shared by both tabs) ----------

function calculate(prefix, nSeries, nParallel) {
  const vs = readGroup(`${prefix}-vsource`);
  const p = readGroup(`${prefix}-power`);
  const vled = readGroup(`${prefix}-vled`);
  const multi = prefix === "m";

  const err = $(`${prefix}-error`);
  const results = $(`${prefix}-results`);

  let msg = "";
  if (nSeries === 0 || nParallel === 0) {
    msg = "Set at least 1 LED in series and 1 string in parallel.";
  } else if (!(vs > 0) || !(p > 0) || !(vled > 0)) {
    msg = "Enter positive values for all inputs.";
  } else if (vs <= nSeries * vled) {
    if (multi) {
      const maxSeries = Math.ceil(vs / vled) - 1;
      msg = `${nSeries} LEDs in series need ${trim(nSeries * vled)} V, but the source is only ${trim(vs)} V. ` +
            (maxSeries > 0
              ? `With this source you can put at most ${maxSeries} LED${maxSeries > 1 ? "s" : ""} in series.`
              : `The source is too low for even one LED.`);
    } else {
      msg = `The source voltage (${trim(vs)} V) must be higher than the LED voltage (${trim(vled)} V) to use a series resistor.`;
    }
  }

  if (msg) {
    err.textContent = msg;
    err.hidden = false;
    results.hidden = true;
    drawCircuit(`${prefix}-diagram`, nSeries, nParallel, vs, null);
    return;
  }
  err.hidden = true;
  results.hidden = false;

  const i = p / vled;
  const vString = nSeries * vled;
  const dv = vs - vString;
  const r = dv / i;
  const pr = dv * i;
  const iTotal = nParallel * i;
  const pTotal = vs * iTotal;
  const pLeds = nSeries * nParallel * p;

  setText(`${prefix}-out-i`, fmtAmps(i));
  setText(`${prefix}-out-vstring`, trim(vString) + " V");
  setText(`${prefix}-out-dv`, trim(dv) + " V");
  setText(`${prefix}-out-r`, fmtOhms(r));
  const rating = suggestedRating(pr);
  setText(`${prefix}-out-pr`, rating
    ? `${fmtRating(rating)} (dissipates ${fmtWatts(pr)})`
    : `${fmtWatts(pr)} — too hot, use an LED driver`);
  setText(`${prefix}-out-itotal`, fmtAmps(iTotal));
  setText(`${prefix}-out-ptotal`, fmtWatts(pTotal));
  setText(`${prefix}-out-pleds`, `${fmtWatts(pLeds)} / ${Math.round(pLeds / pTotal * 100)}%`);

  setText(`${prefix}-out-req`, fmtOhms(r));
  setText(`${prefix}-cur-req`, `LED current ${fmtAmps(i)}`);

  const closest = closestStandard(r);
  const up = nextHigherStandard(r);
  showStandard(prefix, "closest", closest, dv, i);
  showStandard(prefix, "up", up, dv, i);

  if (multi) {
    setText("m-out-count",
      `You need ${nParallel} resistor${nParallel > 1 ? "s" : ""} — one per string. ` +
      `Your power source must supply at least ${fmtAmps(iTotal)} (${fmtWatts(pTotal)}).`);
  }
  drawCircuit(`${prefix}-diagram`, nSeries, nParallel, vs, colourBands(up));
}

function updateSingle() {
  calculate("s", 1, 1);
}

function updateMulti() {
  const nSeries = parseInt($("m-series").value, 10);
  const nParallel = parseInt($("m-parallel").value, 10);
  $("m-series-val").textContent = nSeries;
  $("m-parallel-val").textContent = nParallel;
  calculate("m", nSeries, nParallel);
}

// ---------- tab 3: equivalent resistance ----------
//
// The circuit diagram is the editor. Every resistor has four + buttons:
// left/right add a resistor in series next to it, above/below add one in
// parallel with it; a dropdown sets its value and × removes it.
//
// Underneath is a tree:
//   { id, type: "r", v }                              a resistor (ohms)
//   { id, type: "series" | "parallel", children }     a group (2+ children)
// Growing one resistor at a time this way can build any series/parallel
// network. (Bridges, e.g. a Wheatstone bridge, are not series/parallel.)

let nextNodeId = 1;
const R = v => ({ id: nextNodeId++, type: "r", v });
const G = (type, children) => ({ id: nextNodeId++, type, children });
const isGroup = n => n.type !== "r";

let equivRoot = R(100);

// Each resistor's value is picked with two short dropdowns: an E24 number
// (1.0 … 9.1) and a multiplier (× 1 Ω … × 10 MΩ), so 1 Ω … 91 MΩ.
const MULTIPLIERS = [
  [0, "× 1 Ω"], [1, "× 10 Ω"], [2, "× 100 Ω"], [3, "× 1 kΩ"],
  [4, "× 10 kΩ"], [5, "× 100 kΩ"], [6, "× 1 MΩ"], [7, "× 10 MΩ"],
];

// 4700 -> { nom: 4.7, exp: 3 }
function splitValue(v) {
  const exp = Math.floor(Math.log10(v) + 1e-9);
  return { nom: +(v / Math.pow(10, exp)).toFixed(1), exp };
}

const joinValue = (nom, exp) => +(nom * Math.pow(10, exp)).toPrecision(3);

function valuePicker(n, at) {
  const { nom, exp } = splitValue(n.v);
  return `
    <span class="net-pick" ${at}>
      <select class="net-value net-nom" data-id="${n.id}" aria-label="Resistor value">
        ${E24.map(d => `<option value="${d}"${d === nom ? " selected" : ""}>${d.toFixed(1)}</option>`).join("")}
      </select>
      <select class="net-value net-mult" data-id="${n.id}" aria-label="Multiplier">
        ${MULTIPLIERS.map(([e, label]) => `<option value="${e}"${e === exp ? " selected" : ""}>${label}</option>`).join("")}
      </select>
    </span>`;
}

function findNode(id, node = equivRoot, parent = null) {
  if (node.id === id) return { node, parent };
  if (!isGroup(node)) return null;
  for (const c of node.children) {
    const hit = findNode(id, c, node);
    if (hit) return hit;
  }
  return null;
}

function replaceNode(oldNode, newNode, parent) {
  if (!parent) { equivRoot = newNode; return; }
  const i = parent.children.indexOf(oldNode);
  // keep the tree tidy: a series group inside a series group is just a longer series
  if (isGroup(newNode) && newNode.type === parent.type) parent.children.splice(i, 1, ...newNode.children);
  else parent.children[i] = newNode;
}

// + next to resistor `id`: dir is left/right (series) or above/below (parallel).
function addResistor(id, dir) {
  const { node, parent } = findNode(id);
  const kind = dir === "left" || dir === "right" ? "series" : "parallel";
  const before = dir === "left" || dir === "above";
  const fresh = R(node.v);
  if (parent && parent.type === kind) {
    const i = parent.children.indexOf(node);
    parent.children.splice(before ? i : i + 1, 0, fresh);
  } else {
    replaceNode(node, G(kind, before ? [fresh, node] : [node, fresh]), parent);
  }
}

// The resistors whose outer series + would duplicate the + beside A / B:
// the first / last item of the whole circuit, when that item is a single resistor.
function edgeResistors() {
  if (!isGroup(equivRoot)) return { first: equivRoot, last: equivRoot };
  if (equivRoot.type !== "series") return { first: null, last: null };
  const kids = equivRoot.children, a = kids[0], b = kids[kids.length - 1];
  return { first: isGroup(a) ? null : a, last: isGroup(b) ? null : b };
}

// + beside A (end = "start") or B (end = "end"): a resistor in series with the
// whole circuit, copying the value of the nearest resistor.
function addAtEnd(end) {
  const leaves = [];
  const collect = n => (isGroup(n) ? n.children.forEach(collect) : leaves.push(n));
  collect(equivRoot);
  const fresh = R((end === "start" ? leaves[0] : leaves[leaves.length - 1]).v);
  if (isGroup(equivRoot) && equivRoot.type === "series") {
    if (end === "start") equivRoot.children.unshift(fresh); else equivRoot.children.push(fresh);
  } else {
    equivRoot = G("series", end === "start" ? [fresh, equivRoot] : [equivRoot, fresh]);
  }
}

function deleteResistor(id) {
  const { node, parent } = findNode(id);
  if (!parent) return;                          // never delete the last resistor
  parent.children.splice(parent.children.indexOf(node), 1);
  if (parent.children.length === 1) {           // a group of one is just that one thing
    const grand = findNode(parent.id).parent;
    replaceNode(parent, parent.children[0], grand);
  }
}

function nodeValue(n) {
  if (!isGroup(n)) return n.v;
  const vs = n.children.map(nodeValue);
  return n.type === "series" ? vs.reduce((a, b) => a + b, 0) : 1 / vs.reduce((a, b) => a + 1 / b, 0);
}

// One-line summary, e.g. "100 Ω + (220 Ω ∥ 220 Ω)".
function summaryOf(n, nested = false) {
  if (!isGroup(n)) return fmtOhms(n.v);
  const inner = n.children.map(c => summaryOf(c, true)).join(n.type === "series" ? " + " : " ∥ ");
  return nested ? `(${inner})` : inner;
}

// Resistor symbol at (cx, y) with optional colour bands, plus an optional label beneath.
function smallResistorSvg(cx, y, bands, label) {
  const w = 56, x = cx - w / 2;
  let s = `<rect x="${x}" y="${y - 9}" width="${w}" height="18" rx="6" fill="var(--resistor-body)" stroke="rgba(0,0,0,0.3)"/>`;
  if (bands) {
    [x + 10, x + 18, x + 26, x + 42].forEach((bx, i) => {
      s += `<rect x="${bx}" y="${y - 9}" width="5" height="18" fill="${bands[i].hex}"/>`;
    });
  }
  if (label) s += `<text x="${cx}" y="${y + 24}" class="dg-small" text-anchor="middle">${label}</text>`;
  return s;
}

// ---------- layout ----------
//
// Each node measures to { w, h, up }: width, height, and how far below its top
// the through-wire runs. Series: side by side, wires aligned. Parallel: stacked
// between two rails, the through-wire halfway between the first and last branch.

// Edit mode leaves room round each resistor for its + buttons and dropdown;
// view mode packs resistors tightly with just a value label.
const CELLS = { edit: { w: 170, h: 120, up: 46 }, view: { w: 84, h: 54, up: 20 } };
const RAILS = { edit: 16, view: 12 };
let equivMode = "edit";
let CELL = CELLS.edit, RAIL = RAILS.edit;

function setEquivMode(mode) {
  equivMode = mode;
  CELL = CELLS[mode];
  RAIL = RAILS[mode];
  document.querySelectorAll("#e-mode button").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === mode));
  $("panel-equiv").classList.toggle("net-viewing", mode === "view");
  updateEquiv();
}

function measure(n) {
  if (!isGroup(n)) return { ...CELL };
  const ms = n.children.map(measure);
  if (n.type === "series") {
    const up = Math.max(...ms.map(m => m.up));
    const down = Math.max(...ms.map(m => m.h - m.up));
    return { w: ms.reduce((a, m) => a + m.w, 0), h: up + down, up };
  }
  let off = 0;
  const wires = ms.map(m => { const y = off + m.up; off += m.h; return y; });
  return { w: Math.max(...ms.map(m => m.w)) + 2 * RAIL, h: off, up: (wires[0] + wires[wires.length - 1]) / 2 };
}

// Draws n with its box's top-left at (x, top). Returns { svg, html }.
// `parent` lets a resistor skip a + that would duplicate its neighbour's.
function layout(n, x, top, parent = null) {
  const m = measure(n);
  const y = top + m.up;
  const wire = (x1, y1, x2, y2) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--wire)" stroke-width="2.5"/>`;
  const dot = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="3.5" fill="var(--wire)"/>`;
  const at = (px, py) => `style="left:${px}px;top:${py}px"`;

  if (!isGroup(n) && equivMode === "view") {
    const cx = x + m.w / 2;
    return { svg: wire(x, y, x + m.w, y) + smallResistorSvg(cx, y, colourBands(n.v), fmtOhms(n.v)), html: "" };
  }

  if (!isGroup(n)) {
    const cx = x + m.w / 2;
    const plus = (dir, px, py, title) =>
      `<button type="button" class="net-add net-add-${dir}" data-act="add" data-dir="${dir}" data-id="${n.id}"
               ${at(px, py)} title="${title}" aria-label="${title}">+</button>`;
    // If the previous sibling is a plain resistor, its right (series) or below
    // (parallel) + already adds at this exact spot, so don't show a second one.
    const i = parent ? parent.children.indexOf(n) : -1;
    const prevIsResistor = i > 0 && !isGroup(parent.children[i - 1]);
    // The + beside A / B already adds at the very start / end of the circuit.
    const edge = edgeResistors();
    const showLeft = !(prevIsResistor && parent.type === "series") && n !== edge.first;
    const showRight = n !== edge.last;
    const showAbove = !(prevIsResistor && parent.type === "parallel");
    return {
      svg: wire(x, y, x + m.w, y) + smallResistorSvg(cx, y, colourBands(n.v), null),
      html:
        (showLeft ? plus("left", x + 16, y, "Add a resistor in series (before)") : "") +
        (showRight ? plus("right", x + m.w - 16, y, "Add a resistor in series (after)") : "") +
        (showAbove ? plus("above", cx, y - 34, "Add a resistor in parallel (above)") : "") +
        plus("below", cx, y + 58, "Add a resistor in parallel (below)") +
        (n === equivRoot ? "" :
          `<button type="button" class="net-del" data-act="del" data-id="${n.id}" ${at(cx + 36, y - 16)}
                   title="Remove this resistor" aria-label="Remove this resistor">×</button>`) +
        valuePicker(n, at(cx, y + 28)),
    };
  }

  let svg = "", html = "";
  if (n.type === "series") {
    let cx = x;
    n.children.forEach(c => {
      const cm = measure(c);
      const part = layout(c, cx, y - cm.up, n);
      svg += part.svg; html += part.html;
      cx += cm.w;
    });
    return { svg, html };
  }

  // parallel
  const xl = x + RAIL / 2, xr = x + m.w - RAIL / 2;
  let off = top;
  const ys = [];
  n.children.forEach(c => {
    const cm = measure(c);
    const cy = off + cm.up;
    ys.push(cy);
    const part = layout(c, x + RAIL, off, n);
    svg += part.svg + wire(xl, cy, x + RAIL, cy) + wire(x + RAIL + cm.w, cy, xr, cy);
    html += part.html;
    off += cm.h;
  });
  svg += wire(x, y, xl, y) + wire(xr, y, x + m.w, y);
  svg += wire(xl, ys[0], xl, ys[ys.length - 1]) + wire(xr, ys[0], xr, ys[ys.length - 1]);
  svg += dot(xl, y) + dot(xr, y);
  return { svg, html };
}

function renderNetwork() {
  const editing = equivMode === "edit";
  const PAD = editing ? 62 : 34;                 // edit mode leaves room for the + beside A and B
  const m = measure(equivRoot);
  const W = m.w + 2 * PAD, H = m.h + 6;
  const y = m.up + 3;
  const xA = 16, xB = W - 16;
  const { svg, html } = layout(equivRoot, PAD, 3);

  const term = (cx, label) =>
    `<circle cx="${cx}" cy="${y}" r="5" fill="var(--card, #fff)" stroke="var(--wire)" stroke-width="2.5"/>` +
    `<text x="${cx}" y="${y - 12}" class="dg-label" text-anchor="middle">${label}</text>`;
  const stubs =
    `<line x1="${xA + 5}" y1="${y}" x2="${PAD}" y2="${y}" stroke="var(--wire)" stroke-width="2.5"/>` +
    `<line x1="${PAD + m.w}" y1="${y}" x2="${xB - 5}" y2="${y}" stroke="var(--wire)" stroke-width="2.5"/>`;
  const endPlus = (end, px, title) =>
    `<button type="button" class="net-add net-add-${end}" data-act="add-end" data-end="${end}"
             style="left:${px}px;top:${y}px" title="${title}" aria-label="${title}">+</button>`;

  const canvas = $("e-canvas");
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.innerHTML =
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${stubs}${svg}` +
    `${term(xA, "A")}${term(xB, "B")}</svg>` + html +
    (editing
      ? endPlus("start", xA + 24, "Add a resistor in series at the start (after A)") +
        endPlus("end", xB - 24, "Add a resistor in series at the end (before B)")
      : "");
}

// ---------- results ----------

function updateEquiv() {
  renderNetwork();
  setText("e-summary", `A ── ${summaryOf(equivRoot)} ── B`);

  // Working, innermost groups first: one row per series/parallel group.
  const rows = [];
  const walk = n => {
    if (!isGroup(n)) return;
    n.children.forEach(walk);
    const parts = n.children.map(c => fmtOhms(nodeValue(c)));
    const formula = n.type === "series" ? parts.join(" + ") : "1 / (" + parts.map(p => "1/" + p).join(" + ") + ")";
    rows.push(`
      <tr>
        <th>${n.type === "series" ? "Series" : "Parallel"}</th>
        <td class="formula">${formula}</td>
        <td class="value">${fmtOhms(nodeValue(n))}</td>
      </tr>`);
  };
  walk(equivRoot);
  $("e-working").innerHTML = rows.length ? rows.join("")
    : `<tr><th>Single resistor</th><td class="formula">add more with the + buttons</td><td class="value">${fmtOhms(equivRoot.v)}</td></tr>`;

  const total = nodeValue(equivRoot);
  setText("e-out-total", fmtOhms(total));
  const closest = closestStandard(total);
  const bands = colourBands(closest);
  setText("e-out-closest", fmtOhms(closest));
  drawResistor("e-svg-closest", bands);
  setText("e-bands-closest", bandNames(bands));
}

// ---------- events ----------

$("e-canvas").addEventListener("click", e => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = +btn.dataset.id;
  if (btn.dataset.act === "add") addResistor(id, btn.dataset.dir);
  if (btn.dataset.act === "del") deleteResistor(id);
  if (btn.dataset.act === "add-end") addAtEnd(btn.dataset.end);
  updateEquiv();
});

$("e-mode").addEventListener("click", e => {
  const btn = e.target.closest("button[data-mode]");
  if (btn) setEquivMode(btn.dataset.mode);
});

$("e-canvas").addEventListener("change", e => {
  const sel = e.target.closest("select.net-value");
  if (!sel) return;
  const pick = sel.closest(".net-pick");
  const nom = +pick.querySelector(".net-nom").value;
  const exp = +pick.querySelector(".net-mult").value;
  findNode(+sel.dataset.id).node.v = joinValue(nom, exp);
  updateEquiv();
  const which = sel.classList.contains("net-nom") ? "net-nom" : "net-mult";
  $("e-canvas").querySelector(`select.${which}[data-id="${sel.dataset.id}"]`)?.focus();
});

// ---------- tab 4: resistor finder ----------

// One row: value typed -> closest E24 value -> its 4-band colour code.

function updateFinder() {
  const r = parseOhms($("f-value").value);
  const ok = r > 0;
  $("f-value").classList.toggle("invalid", !ok);

  if (!ok) {
    setText("f-parsed", "Not understood");
    setText("f-out-closest", "—");
    setText("f-bands", "");
    $("f-svg").innerHTML = "";
    return;
  }

  const closest = closestStandard(r);
  const exact = Math.abs(closest - r) / r < 1e-6;
  setText("f-parsed", exact ? `${fmtOhms(r)} · standard value` : `${fmtOhms(r)}`);
  setText("f-out-closest", fmtOhms(closest));
  const bands = colourBands(closest);
  drawResistor("f-svg", bands);
  setText("f-bands", bandNames(bands));
}

$("f-value").addEventListener("input", updateFinder);

// ---------- tab 4: resistor identifier (colours -> value) ----------

const MULT_LABEL = { "-2": "0.01", "-1": "0.1", 0: "1", 1: "10", 2: "100", 3: "1k", 4: "10k",
                     5: "100k", 6: "1M", 7: "10M", 8: "100M", 9: "1G" };

// Options for each kind of band: { band, value, label }
const ID_OPTIONS = {
  digit: COLOURS.map((c, i) => ({ band: c, value: i, label: `${c.name} · ${i}` })),
  mult: [
    ...COLOURS.map((c, i) => ({ band: c, value: i, label: `${c.name} · ×${MULT_LABEL[i]}` })),
    { band: GOLD, value: -1, label: "Gold · ×0.1" },
    { band: SILVER, value: -2, label: "Silver · ×0.01" },
  ],
  tol: [
    { band: COLOURS[1], value: 1,    label: "Brown · ±1%" },
    { band: COLOURS[2], value: 2,    label: "Red · ±2%" },
    { band: COLOURS[5], value: 0.5,  label: "Green · ±0.5%" },
    { band: COLOURS[6], value: 0.25, label: "Blue · ±0.25%" },
    { band: COLOURS[7], value: 0.1,  label: "Violet · ±0.1%" },
    { band: COLOURS[8], value: 0.05, label: "Grey · ±0.05%" },
    { band: GOLD,       value: 5,    label: "Gold · ±5%" },
    { band: SILVER,     value: 10,   label: "Silver · ±10%" },
  ],
};

// Band roles and default picks (by option label) for each band count.
const ID_LAYOUTS = {
  4: { roles: ["digit", "digit", "mult", "tol"],
       titles: ["Band 1 · digit", "Band 2 · digit", "Band 3 · multiplier", "Band 4 · tolerance"],
       defaults: ["Yellow · 4", "Violet · 7", "Red · ×100", "Gold · ±5%"] },
  5: { roles: ["digit", "digit", "digit", "mult", "tol"],
       titles: ["Band 1 · digit", "Band 2 · digit", "Band 3 · digit", "Band 4 · multiplier", "Band 5 · tolerance"],
       defaults: ["Yellow · 4", "Violet · 7", "Black · 0", "Brown · ×10", "Brown · ±1%"] },
};

// Dark text on light bands, white text on dark ones.
function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 140 ? "#1b1a2e" : "#ffffff";
}

function buildIdentifier() {
  const count = document.querySelector('input[name="id-count"]:checked').value;
  const layout = ID_LAYOUTS[count];
  $("id-selects").innerHTML = layout.roles.map((role, k) => `
    <label class="id-band">
      <span>${layout.titles[k]}</span>
      <select data-role="${role}">
        ${ID_OPTIONS[role].map((o, i) =>
          `<option value="${i}"${o.label === layout.defaults[k] ? " selected" : ""}>${o.label}</option>`).join("")}
      </select>
    </label>`).join("");
  updateIdentifier();
}

function updateIdentifier() {
  const picks = [...document.querySelectorAll("#id-selects select")].map(sel => {
    const opt = ID_OPTIONS[sel.dataset.role][+sel.value];
    sel.style.background = opt.band.hex;      // the dropdown takes its band's colour
    sel.style.color = textOn(opt.band.hex);
    return { role: sel.dataset.role, ...opt };
  });

  const digits = picks.filter(p => p.role === "digit").map(p => p.value);
  const exp = picks.find(p => p.role === "mult").value;
  const tol = picks.find(p => p.role === "tol").value;
  const n = parseInt(digits.join(""), 10);
  const r = +(n * Math.pow(10, exp)).toPrecision(6);

  drawResistor("id-svg", picks.map(p => p.band));
  setText("id-value", `${fmtOhms(r)} ±${tol}%`);
  setText("id-range", r > 0
    ? `Anywhere from ${fmtOhms(r * (1 - tol / 100))} to ${fmtOhms(r * (1 + tol / 100))}.` +
      (digits.length === 2 && Math.abs(closestStandard(r) - r) / r < 1e-6 ? " A standard E24 value." : "")
    : "All digit bands black gives 0 Ω (a zero-ohm link is usually a single black band).");
}

document.querySelectorAll('input[name="id-count"]').forEach(el => el.addEventListener("change", buildIdentifier));
$("id-selects").addEventListener("change", updateIdentifier);

// ---------- tabs ----------

const TABS = ["single", "multi", "equiv", "finder"];

function showTab(name) {
  if (!TABS.includes(name)) name = "single";
  for (const t of TABS) {
    const on = t === name;
    $(`tab-${t}`).setAttribute("aria-selected", on);
    $(`panel-${t}`).hidden = !on;
  }
  history.replaceState(null, "", name === "single" ? location.pathname + location.search : `#${name}`);
}

TABS.forEach(t => $(`tab-${t}`).addEventListener("click", () => showTab(t)));

// ---------- palette trial (temporary) ----------
//
// Two dropdowns: a background (the page's surface colours) and a colour set
// (the theme's four colours: accent, second, third, and fourth = the "violet"
// slot for the selected tab and toggles). Sets made for light backgrounds are
// lightened a little on midnight blue; the midnight sets are used as they are.
// Remove once a background and palette are chosen.

const PAL_BACKGROUNDS = {
  "Warm paper": { dark: false, vars: {
    "--bg": "#f3ede2", "--card": "#fffaf1", "--text": "#1b1a2e", "--muted": "#5d5a70", "--border": "#1b1a2e",
    "--rule": "#d8cfc0", "--error-bg": "#ffe1d6", "--error-text": "#8c2a10", "--resistor-body": "#e9d3a3", "--wire": "#3d3b52" } },
  "Cool white": { dark: false, vars: {
    "--bg": "#f3f5f9", "--card": "#ffffff", "--text": "#18203a", "--muted": "#58627a", "--border": "#18203a",
    "--rule": "#d6dce7", "--error-bg": "#fde4e4", "--error-text": "#8a1c1c", "--resistor-body": "#e9d3a3", "--wire": "#38415a" } },
  "Midnight blue": { dark: true, vars: {
    "--bg": "#0d1830", "--card": "#14223f", "--text": "#e8eefa", "--muted": "#9eb0cf", "--border": "#d7e2f5",
    "--rule": "#2a3c60", "--error-bg": "#4a1f2a", "--error-text": "#ffb4bd", "--resistor-body": "#d1bb8c", "--wire": "#b6c5de" } },
  "Midnight green": { dark: true, vars: {
    "--bg": "#0b1f1a", "--card": "#122a24", "--text": "#e8f3ee", "--muted": "#9dbdb1", "--border": "#d4e9e0",
    "--rule": "#25443a", "--error-bg": "#4a1f22", "--error-text": "#ffb4b4", "--resistor-body": "#d1bb8c", "--wire": "#b1cfc2" } },
};

// [accent, second, third, fourth]; `forDark` sets are designed for midnight blue.
const PAL_SETS = {
  "Current (tomato · teal · mustard · violet)": { c: ["#E4572E", "#1F8A85", "#F2B134", "#6C4AB6"] },
  "1. Resistor code":           { c: ["#E8731A", "#2F8F46", "#E9B91F", "#2A62C9"] },
  "2. Bauhaus":                 { c: ["#D62828", "#1D4E89", "#F2B705", "#2B2D42"] },
  "3. Risograph":               { c: ["#F2539B", "#00838A", "#F7D417", "#3255A4"] },
  "4. Circuit board":           { c: ["#C8743A", "#1E6B3A", "#D9A93B", "#22356B"] },
  "5. Resistor code + violet":  { c: ["#E8731A", "#2F8F46", "#E9B91F", "#6C4AB6"] },
  "6. Bauhaus + violet":        { c: ["#D62828", "#1D4E89", "#F2B705", "#6C4AB6"] },
  "7. Risograph + violet":      { c: ["#F2539B", "#00838A", "#F7D417", "#6C4AB6"] },
  "8. Circuit board + violet":  { c: ["#C8743A", "#1E6B3A", "#D9A93B", "#6C4AB6"] },
  "M1. Neon (coral · cyan · amber · lavender)":  { forDark: true, c: ["#FF6B6B", "#4CC9F0", "#FFC857", "#B392F0"] },
  "M2. Aurora (mint · sky · lemon · orchid)":    { forDark: true, c: ["#4FE0A0", "#6FA8FF", "#F2E86D", "#D17BE8"] },
  "M3. Ember (orange · aqua · gold · violet)":   { forDark: true, c: ["#FF8F4D", "#3DD6C6", "#F2C94C", "#9D7BFF"] },
  "G1. Lantern (apricot · sky · lemon · lavender)": { forDark: true, green: true, c: ["#FF9E5E", "#7FC8F8", "#F4E285", "#B8A1F2"] },
  "G2. Reef (coral · turquoise · gold · orchid)":   { forDark: true, green: true, c: ["#FF6F61", "#4FD8C8", "#F6C744", "#E58BD8"] },
  "G3. Copper (copper · mint · cream · violet)":    { forDark: true, green: true, c: ["#E8895A", "#7BE0AD", "#F1E3B5", "#A88BFA"] },
};

const PAL_VARS = ["--accent", "--teal", "--mustard", "--violet"];

function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = c => Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
  return `#${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

function applyPalette() {
  let bgName = $("pal-bg").value, setName = $("pal-set").value;
  if (!PAL_BACKGROUNDS[bgName]) bgName = "Warm paper";
  if (!PAL_SETS[setName]) setName = Object.keys(PAL_SETS)[0];
  const bg = PAL_BACKGROUNDS[bgName], set = PAL_SETS[setName];
  const root = document.documentElement.style;

  Object.entries(bg.vars).forEach(([k, v]) => root.setProperty(k, v));
  root.colorScheme = bg.dark ? "dark" : "light";

  const colours = set.c.map(hex => (bg.dark && !set.forDark ? lighten(hex, 0.25) : hex));
  colours.forEach((hex, k) => root.setProperty(PAL_VARS[k], hex));
  root.setProperty("--on-violet", textOn(colours[3]));

  $("pal-hex").textContent = colours.join(" · ");
  try { localStorage.setItem("rescalc-palette-trial", JSON.stringify({ bg: bgName, set: setName })); } catch (e) { /* storage blocked */ }
}

$("pal-bg").innerHTML = Object.keys(PAL_BACKGROUNDS).map(n => `<option>${n}</option>`).join("");
const setOption = n => `<option>${n}</option>`;
const setNames = Object.keys(PAL_SETS);
$("pal-set").innerHTML =
  `<optgroup label="For light backgrounds">${setNames.filter(n => !PAL_SETS[n].forDark).map(setOption).join("")}</optgroup>` +
  `<optgroup label="For midnight blue">${setNames.filter(n => PAL_SETS[n].forDark && !PAL_SETS[n].green).map(setOption).join("")}</optgroup>` +
  `<optgroup label="For midnight green">${setNames.filter(n => PAL_SETS[n].green).map(setOption).join("")}</optgroup>`;
$("pal-bg").addEventListener("change", applyPalette);
$("pal-set").addEventListener("change", applyPalette);
{
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("rescalc-palette-trial")); } catch (e) { /* storage blocked */ }
  const osDark = matchMedia("(prefers-color-scheme: dark)").matches;
  $("pal-bg").value = saved?.bg || (osDark ? "Midnight blue" : "Warm paper");
  $("pal-set").value = saved?.set || setNames[0];
  applyPalette();
}

// ---------- wiring ----------

document.querySelectorAll("#panel-single input").forEach(el => el.addEventListener("input", updateSingle));
document.querySelectorAll("#panel-multi input").forEach(el => el.addEventListener("input", updateMulti));

updateSingle();
updateMulti();
updateEquiv();
updateFinder();
buildIdentifier();
showTab(location.hash.slice(1) || "single");
