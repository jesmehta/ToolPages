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
// Model: a list of blocks joined in series; each block holds one or more
// resistors in parallel. Values are kept as the text the user typed.

let equivBlocks = [["100"], ["220", "220"]];

function parallelOf(rs) {
  return 1 / rs.reduce((sum, r) => sum + 1 / r, 0);
}

function renderEquivInputs() {
  const host = $("e-blocks");
  host.innerHTML = equivBlocks.map((block, b) => `
    <div class="block">
      <div class="block-head">
        <span>Block ${b + 1}${block.length > 1 ? " <em>(parallel)</em>" : ""}</span>
        ${equivBlocks.length > 1
          ? `<button type="button" class="btn-x" data-action="del-block" data-b="${b}" aria-label="Remove block ${b + 1}">×</button>`
          : ""}
      </div>
      <div class="block-items">
        ${block.map((v, i) => `
          <span class="r-item">
            <input type="text" class="r-input" value="${v.replace(/"/g, "&quot;")}" data-b="${b}" data-i="${i}"
                   autocomplete="off" spellcheck="false" aria-label="Block ${b + 1} resistor ${i + 1}">
            ${block.length > 1
              ? `<button type="button" class="btn-x" data-action="del-r" data-b="${b}" data-i="${i}" aria-label="Remove resistor">×</button>`
              : ""}
          </span>`).join("")}
        <button type="button" class="btn small" data-action="add-r" data-b="${b}">+ parallel</button>
      </div>
    </div>`).join("");
}

// Resistor symbol at (cx, y) with optional colour bands, plus a value label beneath.
function smallResistorSvg(cx, y, bands, label) {
  const w = 56, x = cx - w / 2;
  let s = `<rect x="${x}" y="${y - 9}" width="${w}" height="18" rx="6" fill="var(--resistor-body)" stroke="rgba(0,0,0,0.3)"/>`;
  if (bands) {
    [x + 10, x + 18, x + 26, x + 42].forEach((bx, i) => {
      s += `<rect x="${bx}" y="${y - 9}" width="5" height="18" fill="${bands[i].hex}"/>`;
    });
  }
  s += `<text x="${cx}" y="${y + 24}" class="dg-small" text-anchor="middle">${label}</text>`;
  return s;
}

function drawNetwork(svgId, blocks) {
  const svg = $(svgId);
  const BLOCK_W = 110, ROW = 50, PAD = 26;
  const maxN = Math.max(...blocks.map(b => b.length));
  const H = maxN * ROW + 34;
  const midY = H / 2 - 4;
  const W = PAD * 2 + blocks.length * BLOCK_W;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.maxWidth = `${Math.max(W * 1.3, 320)}px`;

  const wire = `stroke="var(--wire)" stroke-width="2.5" fill="none"`;
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--wire)"/>`;
  let s = "";

  // terminals
  s += `<circle cx="${PAD - 10}" cy="${midY}" r="5" fill="var(--card, #fff)" stroke="var(--wire)" stroke-width="2.5"/>`;
  s += `<text x="${PAD - 10}" y="${midY - 12}" class="dg-label" text-anchor="middle">A</text>`;
  s += `<line x1="${PAD - 5}" y1="${midY}" x2="${PAD}" y2="${midY}" ${wire}/>`;

  blocks.forEach((rs, b) => {
    const xl = PAD + b * BLOCK_W, xr = xl + BLOCK_W, cx = (xl + xr) / 2;
    const label = r => (r > 0 ? fmtOhms(r) : "?");
    const bandsOf = r => (r > 0 ? colourBands(r) : null);
    if (rs.length === 1) {
      s += `<line x1="${xl}" y1="${midY}" x2="${xr}" y2="${midY}" ${wire}/>`;
      s += smallResistorSvg(cx, midY, bandsOf(rs[0]), label(rs[0]));
      return;
    }
    const ys = rs.map((_, k) => midY + (k - (rs.length - 1) / 2) * ROW);
    const xa = xl + 10, xb = xr - 10;
    s += `<line x1="${xl}" y1="${midY}" x2="${xa}" y2="${midY}" ${wire}/>`;
    s += `<line x1="${xb}" y1="${midY}" x2="${xr}" y2="${midY}" ${wire}/>`;
    s += `<line x1="${xa}" y1="${ys[0]}" x2="${xa}" y2="${ys[ys.length - 1]}" ${wire}/>`;
    s += `<line x1="${xb}" y1="${ys[0]}" x2="${xb}" y2="${ys[ys.length - 1]}" ${wire}/>`;
    s += dot(xa, midY) + dot(xb, midY);
    rs.forEach((r, k) => {
      s += `<line x1="${xa}" y1="${ys[k]}" x2="${xb}" y2="${ys[k]}" ${wire}/>`;
      s += smallResistorSvg(cx, ys[k], bandsOf(r), label(r));
    });
  });

  const xEnd = PAD + blocks.length * BLOCK_W;
  s += `<line x1="${xEnd}" y1="${midY}" x2="${xEnd + 5}" y2="${midY}" ${wire}/>`;
  s += `<circle cx="${xEnd + 10}" cy="${midY}" r="5" fill="var(--card, #fff)" stroke="var(--wire)" stroke-width="2.5"/>`;
  s += `<text x="${xEnd + 10}" y="${midY - 12}" class="dg-label" text-anchor="middle">B</text>`;
  svg.innerHTML = s;
}

function updateEquiv() {
  const values = equivBlocks.map(block => block.map(parseOhms));

  // mark bad inputs
  let bad = 0;
  document.querySelectorAll("#e-blocks .r-input").forEach(el => {
    const r = values[el.dataset.b][el.dataset.i];
    const ok = r > 0;
    el.classList.toggle("invalid", !ok);
    if (!ok) bad++;
  });

  drawNetwork("e-diagram", values);

  const err = $("e-error"), results = $("e-results");
  if (bad) {
    err.textContent = `${bad} value${bad > 1 ? "s" : ""} not understood. Use numbers like 220, 4.7k, 4k7 or 1M (all above zero).`;
    err.hidden = false;
    results.hidden = true;
    return;
  }
  err.hidden = true;
  results.hidden = false;

  const blockR = values.map(rs => (rs.length === 1 ? rs[0] : parallelOf(rs)));
  const total = blockR.reduce((a, b) => a + b, 0);

  let rows = values.map((rs, b) => `
    <tr>
      <th>Block ${b + 1}${rs.length > 1 ? " (parallel)" : ""}</th>
      <td class="formula">${rs.length > 1 ? "1 / (" + rs.map(r => "1/" + fmtOhms(r)).join(" + ") + ")" : "single resistor"}</td>
      <td class="value">${fmtOhms(blockR[b])}</td>
    </tr>`).join("");
  if (values.length > 1) {
    rows += `
    <tr>
      <th>Blocks in series</th>
      <td class="formula">${blockR.map(fmtOhms).join(" + ")}</td>
      <td class="value">${fmtOhms(total)}</td>
    </tr>`;
  }
  $("e-working").innerHTML = rows;

  setText("e-out-total", fmtOhms(total));
  const closest = closestStandard(total);
  const bands = colourBands(closest);
  setText("e-out-closest", fmtOhms(closest));
  drawResistor("e-svg-closest", bands);
  setText("e-bands-closest", bandNames(bands));
}

$("e-blocks").addEventListener("input", e => {
  const el = e.target;
  if (!el.classList.contains("r-input")) return;
  equivBlocks[el.dataset.b][el.dataset.i] = el.value;
  updateEquiv();
});

$("e-blocks").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const b = +btn.dataset.b, i = +btn.dataset.i;
  if (btn.dataset.action === "add-r") equivBlocks[b].push(equivBlocks[b][equivBlocks[b].length - 1]);
  if (btn.dataset.action === "del-r") equivBlocks[b].splice(i, 1);
  if (btn.dataset.action === "del-block") equivBlocks.splice(b, 1);
  renderEquivInputs();
  updateEquiv();
  // put the cursor in the resistor that was just added
  if (btn.dataset.action === "add-r") {
    const inputs = document.querySelectorAll(`#e-blocks .r-input[data-b="${b}"]`);
    inputs[inputs.length - 1].select();
  }
});

$("e-add-block").addEventListener("click", () => {
  equivBlocks.push(["100"]);
  renderEquivInputs();
  updateEquiv();
  const inputs = document.querySelectorAll("#e-blocks .r-input");
  inputs[inputs.length - 1].select();
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

// ---------- wiring ----------

document.querySelectorAll("#panel-single input").forEach(el => el.addEventListener("input", updateSingle));
document.querySelectorAll("#panel-multi input").forEach(el => el.addEventListener("input", updateMulti));

updateSingle();
updateMulti();
renderEquivInputs();
updateEquiv();
updateFinder();
buildIdentifier();
showTab(location.hash.slice(1) || "single");
