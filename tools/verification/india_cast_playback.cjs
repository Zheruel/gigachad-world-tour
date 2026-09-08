const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1100,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-india.html?stage=delhi&scene=market');
 await page.waitForFunction(()=>document.querySelector('#character')?.options.length>=15);
 fs.mkdirSync('tmp/review/india-cast/playback',{recursive:true});
 const keys=await page.locator('#character option').evaluateAll(xs=>xs.map(x=>x.value).filter(x=>x.startsWith('ic_')));
 const out=[];
 for(const key of keys){await page.locator('#character').selectOption(key);await page.locator('#action').selectOption('walk');await page.locator('#play').click();await page.waitForTimeout(2400);await page.locator('#play').click();
  const status=await page.locator('#pose-status').textContent();assert(status.includes('8 poses'));out.push({key,status});
  await page.locator('#pose-live').screenshot({path:`tmp/review/india-cast/playback/${key}.png`});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({normalSpeed:out,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
