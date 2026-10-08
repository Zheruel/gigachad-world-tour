// Audition the new Foley through the Review Studio audio tool, then exercise
// decoded runtime samples, deterministic looping and pause/exit cleanup.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const play=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){(window.__previews||=[]).push(this);return play.call(this);};
  });
  await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/review.html?scenario=tools%2Faudio');
  await page.waitForFunction(()=>window.__review?.snapshot()?.scenarioId==='tools/audio');
  await page.evaluate(()=>__review.setSettings({search:'refund_',volume:.3}));
  const previews=[];
  for(const name of ['refund_ring','refund_terminal','refund_cooling']){
   await page.locator('.studio-tool-item').filter({hasText:`cue ${name}`}).click();
   await page.waitForFunction(name=>(window.__previews||[]).some(a=>a.currentSrc.endsWith(name+'.wav')&&a.readyState>=2&&a.currentTime>0),name);
   previews.push(await page.evaluate(name=>{
    const a=window.__previews.find(a=>a.currentSrc.endsWith(name+'.wav'));
    return [name,a.duration,a.volume,(window.__previews||[]).filter(a=>!a.paused).length];
   },name));
  }
  await page.getByRole('button',{name:'Stop preview',exact:true}).click();
  const stopped=await page.evaluate(()=>(window.__previews||[]).every(a=>a.paused));
  // Use the campaign runtime for the audio-RNG audit: Studio intentionally
  // replaces audio RNG and intercepts physical input while paused.
  await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');
  await page.waitForFunction(()=>window.__game?.G.state==='play');
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(()=>['refund_ring','refund_terminal','refund_cooling'].every(n=>__game.G.audio.has(n)));
  const checks=await page.evaluate(async()=>{
   __game.indiaScene('refund','servers');
   const G=__game.G,{updateRefundLife}=await import('/js/refund_life.js'),ok=[];
   const check=(n,v)=>ok.push([n,!!v]);G.audio.stopRoomAudio();
   check('registered Foley decodes into all three runtime slots',['refund_ring','refund_terminal','refund_cooling'].every(n=>G.audio.has(n)));
   check('new phone and terminal samples actually create sources',G.audio.roomSfxAt('refund_ring',.08,-.2)&&G.audio.roomSfxAt('refund_terminal',.08,.3)&&G.audio.snapshot().roomSources===2);
   G.audio.stopRoomAudio();let random=0;const old=Math.random;Math.random=()=>{random++;return .5;};
   try{G.india.t++;updateRefundLife();}finally{Math.random=old;}
   check('real cooling loop starts without consuming combat randomness',random===0&&G.audio.snapshot().loops===1);
   G.audio.setPaused(true);await new Promise(r=>setTimeout(r,40));check('pause suspends every cooling sample',G.audio.snapshot().state==='suspended');
   G.audio.setPaused(false);await new Promise(r=>setTimeout(r,40));G.india.t++;updateRefundLife();
   check('resume restores one cooling loop on the next game tick',G.audio.snapshot().state==='running'&&G.audio.snapshot().loops===1);
   G.audio.stopRoomAudio();check('exit removes the loop and every room source',G.audio.snapshot().loops===0&&G.audio.snapshot().roomSources===0);
   return ok;
  });
  console.log(JSON.stringify({previews,stopped,checks,errors}));
  assert(previews.every(a=>a[1]>0&&a[2]===.3&&a[3]<=1));assert(stopped);assert(checks.every(c=>c[1]),JSON.stringify(checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
