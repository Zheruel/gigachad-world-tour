const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),{openStudio,load,seek,step,settings}=require('./studio_helper.cjs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const frame=await openStudio(page,'trip/papers');
 for(const phase of ['apron-arrival','apron','jet-board','takeoff','flight','india-approach','landing','disembark','papers','arrival-exit']){await load(page,'trip/'+phase);await seek(page,40);await step(page,1);assert.equal(await frame.evaluate(()=>__game.G.travel.t),41);assert.equal(await frame.evaluate(()=>__game.G.travel.phase),phase);}
 for(const layer of ['architecture','actors','effects']){await settings(page,{layers:{[layer]:false}});assert.equal(await frame.evaluate(layer=>__game.G.travel.streetLayers[layer],layer),false);await settings(page,{layers:{[layer]:true}});}
 fs.mkdirSync('/tmp/gachi-airport',{recursive:true});
 for(const [phase,n]of [['apron',210],['flight',180]]){await load(page,'trip/'+phase);await seek(page,n);for(const scale of ['2','1']){await page.evaluate(n=>__review.setScale(+n),scale);assert.equal(await page.locator('#game').evaluate(e=>e.clientWidth),480*Number(scale));await frame.locator('#game').screenshot({path:`/tmp/gachi-airport/${phase}-${scale}x.png`});}}
 assert.deepEqual(errors,[]);console.log('PASS: ten Studio airport scenarios, exact stepping, layers and native/2x');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
