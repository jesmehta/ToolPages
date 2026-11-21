// Resistance Calculator for running LEDs
// I_LED = P_LED / V_LED, dV = V_source - V_LED, R = dV / I, P_R = dV * I

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

// ---------- inputs ----------

function readGroup(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  const custom = document.getElementById(`${name}-custom`);
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

// ---------- drawing ----------

function drawResistor(svgId, bands) {
  const svg = document.getElementById(svgId);
  const xs = [100, 128, 156, 214];
  let s = `
    <line x1="0" y1="40" x2="320" y2="40" stroke="var(--wire)" stroke-width="5"/>
    <rect x="70" y="14" width="180" height="52" rx="22" fill="var(--resistor-body)" stroke="rgba(0,0,0,0.25)"/>`;
  bands.forEach((b, i) => {
    s += `<rect x="${xs[i]}" y="14" width="14" height="52" fill="${b.hex}" stroke="rgba(0,0,0,0.2)">
            <title>${b.name}</title></rect>`;
  });
  svg.innerHTML = s;
}

function showStandard(key, value, dv, iTarget) {
  const bands = colourBands(value);
  drawResistor(`svg-${key}`, bands);
  document.getElementById(`out-${key}`).textContent = fmtOhms(value);
  document.getElementById(`bands-${key}`).textContent = bands.map(b => b.name).join(" – ");
  const iActual = dv / value;
  const pct = (iActual / iTarget - 1) * 100;
  document.getElementById(`note-${key}`).textContent =
    `LED current ${fmtAmps(iActual)} (${pct > 0 ? "+" : ""}${trim(pct)}% vs target).`;
}

// ---------- main ----------

function update() {
  const vs = readGroup("vsource");
  const p = readGroup("power");
  const vled = readGroup("vled");

  const err = document.getElementById("error");
  const results = document.getElementById("results");

  let msg = "";
  if (!(vs > 0) || !(p > 0) || !(vled > 0)) {
    msg = "Enter positive values for all inputs.";
  } else if (vs <= vled) {
    msg = `The source voltage (${trim(vs)} V) must be higher than the LED voltage (${trim(vled)} V) to use a series resistor.`;
  }

  if (msg) {
    err.textContent = msg;
    err.hidden = false;
    results.hidden = true;
    return;
  }
  err.hidden = true;
  results.hidden = false;

  const i = p / vled;
  const dv = vs - vled;
  const r = dv / i;
  const pr = dv * i;

  document.getElementById("out-i").textContent = fmtAmps(i);
  document.getElementById("out-dv").textContent = trim(dv) + " V";
  document.getElementById("out-r").textContent = fmtOhms(r);
  document.getElementById("out-pr").textContent = fmtWatts(pr);

  document.getElementById("out-req").textContent = fmtOhms(r);

  const closest = closestStandard(r);
  const up = nextHigherStandard(r);
  showStandard("closest", closest, dv, i);
  showStandard("up", up, dv, i);

  if (closest < r) {
    document.getElementById("note-closest").textContent +=
      " Below R, so slightly more current than target flows.";
  }
  if (up === closest) {
    document.getElementById("note-up").textContent += " Same as the closest standard.";
  }

  const rating = suggestedRating(pr);
  document.getElementById("out-rating").textContent = rating
    ? `Resistor power rating: it will dissipate ${fmtWatts(pr)} — use a ${fmtRating(rating)} (or higher) resistor for 2× headroom.`
    : `Resistor power rating: it will dissipate ${fmtWatts(pr)} — that's a lot of heat; consider a constant-current LED driver instead.`;
}

document.querySelectorAll("input").forEach(el => el.addEventListener("input", update));
update();
