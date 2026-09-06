const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8011/sfxlab.html');await p.waitForFunction(()=>document.querySelector('#dukeClips').children.length===141);
 assert.equal(await p.locator('#existingVoices').count(),0);
 await p.locator('#dukeSearch').fill('duke_combo_6');assert.equal(await p.locator('#dukeClips button').count(),1);assert.match(await p.locator('#dukeClips').innerText(),/tattooed.*face/i);
 await p.locator('#dukeClips button').click();await p.locator('#stopPreview').click();
 await p.locator('#dukeSearch').fill('');await p.locator('#dukeCategory').selectOption('explosions');assert(await p.locator('#dukeClips button').count()>10);
 await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');await p.keyboard.press('KeyQ');
 await p.waitForFunction(async()=>{const c=await fetch('audio/voice/duke/catalog.json').then(r=>r.json());return c.clips.filter(c=>c.legacySlots).every(c=>c.legacySlots.every(s=>__game.G.audio.has(s)));});
 const result=await p.evaluate(async()=>{const c=await fetch('audio/voice/duke/catalog.json').then(r=>r.json()),slots=c.clips.flatMap(c=>c.legacySlots||[]);for(const s of slots){if(!__game.G.audio.voice(s,100,true))throw Error('Could not play '+s);__game.G.audio.stopSamples();}return {registeredLegacySlots:slots.length,remainingSamples:__game.G.audio.snapshot().samples};});
 assert.equal(result.registeredLegacySlots,16);assert.equal(result.remainingSamples,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({collection:141,searchAndCategory:true,preview:true,...result,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
