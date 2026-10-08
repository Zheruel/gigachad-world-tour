const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await require('./studio_helper.cjs').openStudio(p,'train/yard');await p.evaluate(()=>__review.load('tools/audio'));const host=p.locator('#specialist-host');await host.getByLabel('Collection',{exact:true}).selectOption('duke');assert.equal(await host.locator('.studio-tool-list button').count(),145);assert.equal(await p.locator('#existingVoices').count(),0);
 await host.getByLabel('Search sounds',{exact:true}).fill('duke_combo_6');assert.equal(await host.locator('.studio-tool-list button').count(),1);assert.match(await host.locator('.studio-tool-list').innerText(),/tattooed.*face/i);await host.locator('.studio-tool-list button').click();await host.getByRole('button',{name:'Stop preview',exact:true}).click();
 await host.getByLabel('Search sounds',{exact:true}).fill('');await host.getByLabel('Category',{exact:true}).selectOption('explosions');assert(await host.locator('.studio-tool-list button').count()>10);
 await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');await p.keyboard.press('KeyQ');
 await p.waitForFunction(async()=>{const c=await fetch('audio/voice/duke/catalog.json').then(r=>r.json());return c.clips.filter(c=>c.legacySlots).every(c=>c.legacySlots.every(s=>__game.G.audio.has(s)));});
 const result=await p.evaluate(async()=>{const c=await fetch('audio/voice/duke/catalog.json').then(r=>r.json()),slots=c.clips.flatMap(c=>c.legacySlots||[]);for(const s of slots){if(!__game.G.audio.voice(s,100,true))throw Error('Could not play '+s);__game.G.audio.stopSamples();}return {registeredLegacySlots:slots.length,remainingSamples:__game.G.audio.snapshot().samples};});
 assert.equal(result.registeredLegacySlots,16);assert.equal(result.remainingSamples,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({collection:145,searchAndCategory:true,preview:true,...result,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
