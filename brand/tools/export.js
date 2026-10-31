// Esporta PNG a dimensioni esatte da SVG (Chromium)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const jobs = JSON.parse(process.argv[2]); const b = await chromium.launch();
  for (const [svg, png, w, h, bg] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const src = fs.readFileSync(svg, 'utf8').replace(/ width="[\d.]+" height="[\d.]+"/, ' width="100%" height="100%" preserveAspectRatio="xMidYMid meet"');
    await p.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;background:${bg||'transparent'}">${src}</body></html>`);
    await p.screenshot({ path: png, omitBackground: !bg, clip: { x: 0, y: 0, width: w, height: h } }); await p.close(); console.log('ok', png);
  }
  await b.close();
})();
