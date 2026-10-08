const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'train/advance-demo');
 const report=await frame.evaluate(async()=>{
  const m=await(await fetch('/audio/sfx/manifest.json',{cache:'reload'})).json(),ctx=new AudioContext(),failures=[];
  const paths=[...m.catalog.map(c=>`${m.rawDir}/${c.file}`),...new Set(Object.keys({...m.map,...m.composites,...m.authored,...m.generated}).map(k=>`audio/sfx/${k}.wav`))];
  for(const path of paths)try{const r=await fetch('/'+path,{cache:'reload'});if(!r.ok)throw Error(r.status);const b=await ctx.decodeAudioData(await r.arrayBuffer());if(!b.duration)throw Error('empty');}catch(e){failures.push([path,String(e)]);}
  await ctx.close();
  const g=__game,G=g.G,Props=await import('/js/props.js'),P=await import('/js/player.js'),I=await import('/js/input.js'),calls=[],real=G.audio;
  G.audio={sfx:n=>calls.push(n),roomSfx:()=>true};
  const breaks={};for(const k of ['crate','ic_boiler','matka']){calls.length=0;const pr=Props.createProp(k,G.camX+230,236);pr.hurt(1,1);if(calls.length)failures.push([k,'extra non-breaking hit sound']);pr.hurt(999,1);breaks[k]=[...calls];}
  Object.assign(G.player,{state:'idle',t:0,hp:100,z:0,guardDenied:0});calls.length=0;I.debugResetInput();I.debugPress('parry');P.updatePlayer(G.player);const guard={state:G.player.state,calls:[...calls]};I.debugResetInput();G.audio=real;
  return {decoded:paths.length,sourceSamples:m.catalog.length,confirmed:m.catalog.filter(c=>c.verifiedByCode||c.verifiedByEar).length,failures,breaks,guard};
 });
 assert.deepEqual(report.failures,[]);assert.deepEqual(report.breaks,{crate:['break_wood'],ic_boiler:['break_metal'],matka:['break']});assert.equal(report.guard.state,'parry');assert.deepEqual(report.guard.calls,[]);
 await studio.load(page,'tools/audio');const host=page.locator('#specialist-host');await host.getByLabel('Collection',{exact:true}).selectOption('source');assert.equal(await host.locator('.studio-tool-list button').count(),report.sourceSamples);
 await host.getByLabel('Identification',{exact:true}).selectOption('confirmed');assert.equal(await host.locator('.studio-tool-list button').count(),report.confirmed);
 fs.mkdirSync('tmp/review/combat-ui',{recursive:true});await page.screenshot({path:'tmp/review/combat-ui/named-sound-bank.png'});
 await host.getByLabel('Search sounds',{exact:true}).fill('GO beep');assert.equal(await host.locator('.studio-tool-list button').count(),1);assert.match(await host.locator('.studio-tool-list').innerText(),/archive 25/);
 await host.locator('.studio-tool-list button').click();await host.getByRole('button',{name:'Stop preview',exact:true}).click();await host.getByLabel('Search sounds',{exact:true}).fill('');await host.getByLabel('Collection',{exact:true}).selectOption('runtime');
 assert.equal(await host.locator('.studio-tool-list button strong').filter({hasText:/^Advance cue$/}).count(),2); // preferred advance + legacy go, each appears once
 assert.deepEqual(errors,[]);fs.mkdirSync('tmp/review/combat-ui',{recursive:true});fs.writeFileSync('tmp/review/combat-ui/audio-bank-check.json',JSON.stringify({...report,errors},null,2));console.log(JSON.stringify({...report,errors}));
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1});
