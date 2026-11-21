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

// 4-band code: digit, digit, multiplier, tolerance (gold = ±5%).
function colourBands(r) {
  const exp = Math.floor(Math.log10(r) + 1e-9) - 1;   // so that r / 10^exp is two digits
  const twoDigits = Math.round(r / Math.pow(10, exp));
  const d1 = Math.floor(twoDigits / 10);
  const d2 = twoDigits % 10;
  let mult;
  if (exp === -1) mult = GOLD;
  else if (exp === -2) mult = SILVER;
  else mult = COLOURS[exp];
  return [COLOURS[d1], COLOURS[d2], mult, GOLD];
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

function drawResistor(svgId, bands) {
  const xs = [100, 128, 156, 214];
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

// ---------- tabs ----------

function showTab(name) {
  for (const t of ["single", "multi"]) {
    const on = t === name;
    $(`tab-${t}`).setAttribute("aria-selected", on);
    $(`panel-${t}`).hidden = !on;
  }
  history.replaceState(null, "", name === "multi" ? "#multi" : location.pathname + location.search);
}

$("tab-single").addEventListener("click", () => showTab("single"));
$("tab-multi").addEventListener("click", () => showTab("multi"));

// ---------- wiring ----------

document.querySelectorAll("#panel-single input").forEach(el => el.addEventListener("input", updateSingle));
document.querySelectorAll("#panel-multi input").forEach(el => el.addEventListener("input", updateMulti));

updateSingle();
updateMulti();
showTab(location.hash === "#multi" ? "multi" : "single");
