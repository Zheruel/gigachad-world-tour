// The public Studio must isolate every Refund family, preserve its rig and replay reliably.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011';
const out=process.env.REFUND_CAPTURE_DIR||'tmp/review/refund-studio';
const families=['headset','operator','thrower','security','cabinet','lead'];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/review.html');
 await page.waitForFunction(()=>window.__review?.listScenarios&&window.__review?.snapshot,null,{timeout:90000});
 fs.mkdirSync(out,{recursive:true});const registry=await page.evaluate(()=>__review.listScenarios()),checks=[];
 const check=(label,value)=>{checks.push([label,!!value]);assert(value,label);};
 for(const family of families){
  const id='refund/duel-'+family,scenario=registry.find(s=>s.id===id);
  check(family+' has a playable one-on-one scenario',scenario?.group==='duels'&&scenario.kind==='fight');
  await page.evaluate(id=>__review.load(id),id);
  const start=await page.evaluate(()=>{const G=__review.game.G;return{boss:!!G.boss,enemies:G.enemies.map(e=>e.trainType),queue:G.spawnQueue.length,props:G.props.map(p=>p.prop),rig:!!G.enemies[0]?.rig,stage:G.stage.id,locked:G.locked};});
  check(family+' opens with one matching enemy and no queued wave',start.stage==='refund'&&start.locked&&!start.boss&&start.queue===0&&start.enemies.length===1&&start.enemies[0]==='ic_'+family);
  check(family+' keeps only its own equipment',family==='cabinet'?start.rig&&start.props.length===1&&start.props[0]==='ic_cabinet':start.props.length===0);
  await page.evaluate(()=>__review.seek(120));const first=await page.evaluate(()=>__review.snapshot());
  check(family+' advances without introducing other fighters',first.tick===120&&!first.engine.boss&&first.engine.enemies.length===1);
  await page.evaluate(()=>__review.seek(0));await page.evaluate(()=>__review.seek(120));
  assert.deepEqual((await page.evaluate(()=>__review.snapshot())).engine,first.engine,family+' deterministic replay');
  for(const scale of [1,2]){
   await page.evaluate(scale=>__review.setScale(scale),scale);
   await page.frameLocator('iframe#game').locator('canvas#game').screenshot({path:path.join(out,family+'-'+scale+'x.png')});
  }
 }
 await page.evaluate(()=>__review.load('tools/assets'));
 const cast=page.getByLabel('Cast',{exact:true});
 check('asset suite includes the complete enemy and boss casts',await cast.locator('option[value="refund"]').count()===1&&await cast.locator('option[value="refund-bosses"]').count()===1);
 for(const [cast,expected]of [['refund',families.map(f=>'ic_'+f)],['refund-bosses',['ic_closer','ic_closer_damaged']]]){
  await page.evaluate(cast=>__review.setSettings({collection:'lineup',cast,animation:'walk'}),cast);
  // Count renderer contacts: this verifies every family has an actual loaded runtime frame.
  const loaded=await page.evaluate(async expected=>{const g=__review.game,{getAIFrame}=await g.importModule('js/aiframes.js');return expected.every(k=>getAIFrame(k,'walk')?.f?.length>=8);},expected);
  check(cast+' line-up has registered walk cycles for every actor',loaded);
  const snapshot=await page.evaluate(()=>__review.snapshot());check(cast+' settings select the intended cast',snapshot.settings.collection==='lineup'&&snapshot.settings.cast===cast);
  const capture=await page.evaluate(()=>__review.capture(false));fs.writeFileSync(path.join(out,cast+'-lineup.png'),Buffer.from(capture.image.split(',')[1],'base64'));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,duels:families.length,captures:out,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
