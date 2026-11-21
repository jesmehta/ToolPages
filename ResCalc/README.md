# Resistance Calculator for running LEDs

A simple tool to calculate the resistor required to control voltage and current for LEDs.

Open [index.html](index.html) in a browser. It is plain HTML/CSS/JS with no libraries or build step.

## Why it exists

Running an LED from a fixed supply (USB 5 V, a 12 V wall adaptor) needs a series resistor to drop the
extra voltage and limit the current. The maths is simple but tedious to repeat, and the result then has
to be matched to a resistor you can actually buy and read off its colour bands. This page does all of that
in one place.

## What it does

**Inputs** (each has presets plus a custom entry):

| Input | Symbol | Presets |
|---|---|---|
| Power source | V_source | USB 5 V, Wall adaptor 12 V |
| LED power | P_LED | 1 W, 3 W |
| LED forward voltage | V_LED | 3.2 V |

**Calculated:**

- LED current: I_LED = P_LED / V_LED
- Voltage to drop: ΔV = V_source − V_LED
- Required resistance: R = ΔV / I_LED
- Resistor power: P_R = ΔV × I_LED

**Resistor choice** (E24 series, ±5%):

- **Required (calculated):** the exact R.
- **Closest standard:** nearest E24 value, with its 4-band colour code, a drawing, and the resulting LED current.
- **Closest standard up (safer):** smallest E24 value ≥ R, so the current never exceeds the target. Also shown with colour code and drawing.
- **Power rating:** the smallest standard rating (1/8 W … 100 W) that gives at least 2× headroom over P_R.

Example with defaults (5 V, 1 W, 3.2 V): I = 312.5 mA, ΔV = 1.8 V, R = 5.76 Ω, P_R = 562.5 mW.
Closest 5.6 Ω (Green–Blue–Gold–Gold), up 6.2 Ω (Blue–Red–Gold–Gold), use a 2 W resistor.

## Design decisions

- **E24 series**: the common ±5% range that hobby resistor kits are sold in. 4-band codes match it (two
  digits, multiplier, gold tolerance band).
- **"Closest" uses a log-scale (ratio) distance**, because E-series values are spaced logarithmically.
- **Both closest and closest-up are shown**: the closest value may be below R, which lets more current through
  than intended. The value above R is the safe default; the closest is shown for when the user knows the margin is fine.
- **2× power headroom**: resistors at their full rating run very hot; doubling is a common rule of thumb.
- **Validation**: if V_source ≤ V_LED or any input isn't positive, the results are hidden and an error explains why.
- **No libraries**: unlike the other ToolPages tools, this needs no canvas drawing, so p5.js isn't used. The resistor
  is a small inline SVG.

## Files

- `index.html` — page structure and inputs
- `style.css` — layout, light/dark colours
- `script.js` — calculation, E24 lookup, colour bands, SVG drawing

## Changelog

- 2026-11-21 — First version: inputs, calculations, closest E24 resistor with colour bands, power rating.
- 2026-11-21 — Renamed P to P_LED. Results show required, closest standard and closest standard up, each with colour bands.
- 2026-11-21 — Description reworded ("simple tool"). Added this README.

## To do / watch out for

- Single LED only. Several LEDs in series would need V_LED × n; in parallel, each LED should have its own resistor.
- The forward voltage varies by LED colour and part (red ~2 V, white/blue ~3.2 V). The 3.2 V preset suits white/blue.
- For 1 W+ LEDs a resistor wastes a lot of power as heat; the page notes that a constant-current driver is usually better.
- Possible additions: E12/E96 series choice, 5-band codes, number of LEDs in series.
