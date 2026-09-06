// Run with NODE_PATH pointing at an installed Playwright package.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage({viewport:{width:960,height:540}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto='+(process.argv[2]||'verify'));
  await page.waitForFunction(()=>window.__game && window.__game.G.state !== 'boot', {timeout:60000});
  await page.waitForTimeout(1000);
  const title = await page.title();
  const results=title.split('|');console.log(JSON.stringify({checks:results.filter(r=>r.startsWith('PASS:')).length,failures:results.filter(r=>r.startsWith('FAIL:')||r.startsWith('ERROR:')),title:results.some(r=>r.startsWith('PASS:'))?undefined:title,errors}));
  if (process.argv[3]) await page.screenshot({path:process.argv[3]});
  await browser.close();
  if(errors.length || /FAIL:|ERROR:|NO-RESULTS|STUCK/.test(title)) process.exitCode=1;
})();
