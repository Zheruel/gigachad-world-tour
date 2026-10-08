const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{openStudio}=require('./studio_helper.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await openStudio(page,'delhi/market');await page.evaluate(()=>__review.load('tools/assets'));
 const host=page.locator('#specialist-host');await host.getByLabel('Actor',{exact:false}).waitFor();fs.mkdirSync('tmp/review/india-cast/playback',{recursive:true});
 const keys=['ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker','ic_vendor'];const out=[];
 for(const key of keys){await host.getByLabel('Actor',{exact:false}).selectOption(key);await host.getByRole('combobox',{name:/^Animation/}).selectOption('walk');await host.getByRole('button',{name:'Play animation',exact:true}).click();await page.waitForTimeout(2400);await host.getByRole('button',{name:'Pause animation',exact:true}).click();const status=await host.locator('.studio-status').textContent();assert(+(/\/(\d+)/.exec(status)?.[1])>=8,status);out.push({key,status});await host.locator('canvas').screenshot({path:`tmp/review/india-cast/playback/${key}.png`});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({normalSpeed:out,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
