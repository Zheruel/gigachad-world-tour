const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.audioNodes=[];window.audioContexts=[];const Native=window.AudioContext;
  window.AudioContext=class extends Native{constructor(...args){super(...args);audioContexts.push(this);}
   createOscillator(){return track(super.createOscillator());}createBufferSource(){return track(super.createBufferSource());}};
  function track(node){const info={node,active:false};audioNodes.push(info);for(const name of ['start','stop','disconnect']){const fn=node[name].bind(node);node[name]=(...a)=>{info.active=name==='start';return fn(...a);};}node.addEventListener('ended',()=>info.active=false);return node;}
 });
 await page.goto('http://localhost:8011/?auto=travel-apron-arrival');await page.waitForFunction(()=>__game?.travelReady());await page.keyboard.press('ArrowRight');
 await page.evaluate(()=>{__game.G.freezeTime=false;__game.travel('apron-arrival');window.phases=[];window.deltas=[];let last=performance.now();function sample(t){if(t-last<200)deltas.push(t-last);last=t;const p=__game.G.travel?.phase;if(p&&phases.at(-1)!==p)phases.push(p);requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 await page.waitForFunction(()=>__game.G.travel.phase==='apron');
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>__game.G.travel.x>=764);await page.keyboard.up('ArrowRight');await page.keyboard.press('f');
 await page.waitForFunction(()=>__game.G.travel.phase==='jet-board');
 await page.keyboard.press('Escape');await page.waitForTimeout(150);assert(await page.evaluate(()=>__game.G.paused&&audioContexts.every(a=>a.state==='suspended')),'pause suspends airport audio');await page.keyboard.press('Escape');
 await page.keyboard.press('z');assert.equal(await page.evaluate(()=>__game.G.travel.phase),'jet-board');
 await page.waitForFunction(()=>__game.G.travel?.phase==='arrival-exit',null,{timeout:55000});
 await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>__game.G.travel.x>=960);await page.keyboard.up('ArrowRight');await page.keyboard.press('f');
 await page.waitForFunction(()=>__game.G.state==='loading'||__game.G.state==='intro');
 const result=await page.evaluate(()=>({phases,activeAirportNodes:audioNodes.filter(x=>x.active).length,frames:deltas.length,slowFrames:deltas.filter(d=>d>34).length,state:__game.G.state}));
 assert.equal(result.activeAirportNodes,0,'airport audio stopped at loading');assert.deepEqual(result.phases,['apron-arrival','apron','jet-board','takeoff','flight','india-approach','landing','disembark','papers','arrival-exit']);assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
