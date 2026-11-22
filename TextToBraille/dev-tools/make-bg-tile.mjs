// Generates concrete-bg.svg, the page background: a 420px concrete tile (two noise layers plus
// small air pits). Seeded, so reruns give the same file. Run from TextToBraille/:
//   node dev-tools/make-bg-tile.mjs
// (During the theme trial an earlier version also made the embossed-paper, terrazzo and
// brushed-metal tiles; those themes were dropped before the first commit.)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('../concrete-bg.svg', import.meta.url));

let seed = 20261122;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const S = 420;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">\n<rect width="${S}" height="${S}" fill="#b9bab6"/>\n` +
  // broad mottling
  `<filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="4" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.35  0 0 0 0 0.33  0 0 0 0.55 -0.12"/></filter>\n` +
  // fine grain
  `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0 0.2  0 0 0 0.35 0"/></filter>\n` +
  `<rect width="${S}" height="${S}" filter="url(#c)"/><rect width="${S}" height="${S}" filter="url(#g)"/>\n`;
for (let i = 0; i < 70; i++) {  // air pits: dark hole with a light lower lip
  const x = rnd() * S, y = rnd() * S, r = 0.6 + rnd() * 1.8;
  svg += `<circle cx="${x.toFixed(1)}" cy="${(y + 0.6).toFixed(1)}" r="${r.toFixed(1)}" fill="#ffffff" fill-opacity="0.35"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#55575a" fill-opacity="0.55"/>`;
}
writeFileSync(OUT, svg + '\n</svg>\n');
console.log('wrote concrete-bg.svg');
