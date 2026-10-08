// India character pose controls in Review Studio's actor panel (the per-stage review pages now redirect there).
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011';
const INDIA=k=>k==='player'||/^(ic_|dl_|cine:)/.test(k);
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{const p=await b.newPage({viewport:{width:1600,height:1050}}),errors=[];p.on('pageerror',e=>errors.push(e.message));let checked=0;
for(const stage of ['delhi/market','refund/office']){
 await p.goto(`${base}/review.html?scenario=${stage}&mode=inspect`);
 await p.waitForFunction(()=>window.__review&&document.querySelector('#pose-status')?.textContent.includes('poses'),null,{timeout:120000});
 await p.evaluate(()=>{document.querySelector('#actor-controls').closest('details').open=true;});
 const chars=(await p.locator('#character option').evaluateAll(es=>es.map(e=>e.value))).filter(INDIA);
 assert(chars.some(k=>k.startsWith('ic_')),'India cast is listed');
 for(const key of chars){await p.selectOption('#character',key);const actions=await p.locator('#action option').evaluateAll(es=>es.map(e=>e.value));
  for(const action of actions){await p.selectOption('#action',action);assert.equal(await p.locator('#pose-index').inputValue(),'0');await p.click('#pose-step');await p.click('#pose-back');assert.equal(await p.locator('#pose-index').inputValue(),'0',`${key}/${action}`);checked++;}}
 await p.selectOption('#character','player');await p.selectOption('#action','walk');
 // Playing a pose pauses the scene behind it.
 await p.evaluate(()=>__review.play());await p.waitForTimeout(120);await p.click('#pose-play');
 const time=await p.evaluate(()=>__review.game.G.rawTime);await p.waitForTimeout(180);
 assert.equal(await p.evaluate(()=>__review.game.G.rawTime),time);
 assert.equal(await p.locator('#pose-play').textContent(),'Pause animation');
 await p.selectOption('#action','idle');assert.equal(await p.locator('#pose-play').textContent(),'Play animation');
 await p.locator('#pose-index').fill('0');const box=await p.locator('#poses').boundingBox();
 await p.locator('#poses').click({position:{x:box.width*180/480,y:box.height*50/await p.locator('#poses').evaluate(c=>c.height)}});
 assert.equal(await p.locator('#pose-index').inputValue(),'1');
 await p.locator('#character').scrollIntoViewIfNeeded();await p.screenshot({path:`tmp/review/${stage.split('/')[0]}-animation-controls.png`});}
assert.deepEqual(errors,[]);console.log({checked,errors});}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
