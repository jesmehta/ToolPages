// Makes og-preview.jpg: the 1200x630 image shown when the page's link is shared (WhatsApp, Slack, LinkedIn, X...).
// It is a screenshot of the real page: title + tabs, enlarged, with the title circuit frozen with the LEDs lit.
// Usage, from ResCalc/:  node dev-tools/make-og-preview.js og-preview.jpg
// Needs Playwright, installed at %LOCALAPPDATA%/claude-tools/playwright. Keep the result under ~300 KB (WhatsApp).
const path = require("path");
const { chromium } = require(process.env.LOCALAPPDATA + "/claude-tools/playwright/node_modules/playwright");
const out = process.argv[2] || "og-preview.jpg";
const page = "file:///" + path.resolve(__dirname, "..", "index.html").split(path.sep).join("/");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.goto(page);
  await p.addStyleTag({ content: `
    .back-link, [role=tabpanel], footer { display: none !important; }
    html, body { height: 630px; overflow: hidden; }
    main { max-width: 980px; height: 630px; padding: 0 16px; display: flex; flex-direction: column; justify-content: center; }
    header h1 { font-size: 4.1rem !important; line-height: 1.02; }
    header .subtitle { font-size: 1.45rem !important; max-width: 640px; }
    header#hero { padding: 54px 60px 60px 64px !important; }
    .tabs { justify-content: center; margin-top: 34px; }
    .tabs button, .tab { font-size: 1.15rem !important; padding: 12px 20px !important; }
  ` });
  await p.waitForTimeout(900);
  await p.evaluate(() => window.dispatchEvent(new Event("resize")));   // redraw the title circuit at the new size
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 3000; }));   // switch closed, LEDs on
  await p.screenshot({ path: out, type: "jpeg", quality: 85 });
  await b.close();
  console.log("wrote", out);
})();
