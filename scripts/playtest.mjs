// Plays full careers headlessly through the real UI and reports final stats and any page errors.
// Usage: npm i -D playwright && npx playwright install chromium && node scripts/playtest.mjs [careers]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const careers = Number(process.argv[2] || 3);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(resolve('index.html')).href);

for (let run = 0; run < careers; run++) {
  if (run) { await page.waitForTimeout(200); await page.click('#mNew'); }
  for (let step = 0; step < 800; step++) {
    const st = await page.evaluate(() => {
      const G = __sim.G;
      return { ended: G.ended, wis: G.wisdom, active: G.wisActive, energy: G.vital, fr: G.fr, tv: G.tv,
               view: __sim.view, modal: !!document.querySelector('#modalRoot .choice') };
    });
    if (st.ended) break;
    if (st.modal) { await page.click('#modalRoot .choice'); continue; }
    if (st.wis && !st.active) { await page.click('#bWis'); continue; }
    if (await page.$('[data-a=race]')) { await page.click('[data-a=race]'); continue; }
    if (st.view === 'home') { await page.click(st.energy < 45 ? '[data-a=rest]' : '[data-a=train]'); continue; }
    let best = 0, score = -1;
    for (let t = 0; t < 5; t++) {
      const s = st.tv[t].slice(0, 6).reduce((a, x) => a + x, 0) - st.fr[t] * 3;
      if (s > score) { score = s; best = t; }
    }
    await page.click(`.fac[data-t="${best}"]`);
    await page.click(`.fac[data-t="${best}"]`);
  }
  const r = await page.evaluate(() => {
    const G = __sim.G, d = v => v <= 1200 ? v : 1200 + Math.floor((v - 1200) / 2);
    return { turn: G.turn, rating: G.final, stats: G.stats.map(d), sp: G.sp, goddessLevels: G.vl };
  });
  console.log(`career ${run + 1}:`, JSON.stringify(r));
}
console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
