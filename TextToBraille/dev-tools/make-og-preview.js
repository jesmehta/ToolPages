// Makes og-preview.jpg: the 1200x630 image shown when the page's link is shared (WhatsApp, Slack, LinkedIn, X...).
// It is a screenshot of the real page: the title sign, enlarged, on the concrete wall, with the title's
// braille frozen fully raised, above the preview plate.
// Usage, from TextToBraille/:  node dev-tools/make-og-preview.js og-preview.jpg
// Needs Playwright, installed at %LOCALAPPDATA%/claude-tools/playwright. Keep the result under ~300 KB (WhatsApp).
const path = require("path");
const { chromium } = require(process.env.LOCALAPPDATA + "/claude-tools/playwright/node_modules/playwright");
const out = process.argv[2] || "og-preview.jpg";
const page = "file:///" + path.resolve(__dirname, "..", "index.html").split(path.sep).join("/");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto(page);
  await p.fill("#text-in", "Feel the words");
  await p.selectOption("#zoom", "2");
  await p.addStyleTag({ content: `
    .back-link, .area-text, .area-unicode, .area-controls, footer, .readout, .legend, .zoom { display: none !important; }
    html, body { height: 630px; overflow: hidden; }
    main { max-width: 1000px; height: 630px; padding: 0 16px; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
    header { margin: 0 auto !important; max-width: 860px !important; padding: 34px 56px 36px !important; }
    header h1 { font-size: 4.4rem !important; }
    header .subtitle { font-size: 1.4rem !important; }
    .hero-braille { width: 560px !important; margin-bottom: 20px !important; }
    .workspace { display: block; max-width: 860px; margin: 0 auto; width: 100%; }
    .workspace > .area-preview { position: static; padding: 18px 22px; }
    .area-preview .card-head { display: none; }
  ` });
  await p.waitForTimeout(1200);
  // all title dots raised: freeze the 8 s cycle in its hold phase
  await p.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 4000; }));
  await p.screenshot({ path: out, type: "jpeg", quality: 85 });
  await b.close();
  console.log("wrote", out);
})();
