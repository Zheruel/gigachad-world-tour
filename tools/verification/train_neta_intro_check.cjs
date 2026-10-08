const studio=require('./studio_helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await studio.openStudio(page,'train/neta-intro');await studio.seek(page,0);
 const f=page.frames().find(f=>f.url().includes('?auto=walk'));fs.mkdirSync('/tmp/train-neta-intro',{recursive:true});
 for(const t of [0,59,60,100,118,150,178,240,300,369,420,548,578,589,590]){
  await f.evaluate(t=>{__game.trainScene('neta-intro',t);__game.render()},t);
  for(const size of [960,480]){if(size===480)await page.evaluate(()=>__review.setScale(document.querySelector('#scale').value==='1'?2:1));await f.locator('canvas').screenshot({path:`/tmp/train-neta-intro/${t}-${size}.png`});if(size===480)await page.evaluate(()=>__review.setScale(document.querySelector('#scale').value==='1'?2:1));}
 }
 const checks=await f.evaluate(async()=>{const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  g.trainScene('neta-intro',100);const p=G.player.x;g.press('right');g.step(20);g.release('right');ok('introduction gates movement',G.player.x===p);
  g.press('pause');g.step(1);g.release('pause');const t=G.rawTime-G.stateT,x=G.boss.x;g.step(60);ok('pause freezes reveal',G.rawTime-G.stateT===t&&G.boss.x===x);g.press('pause');g.step(1);g.release('pause');g.step(500);
  ok('reveal hands off once to combat',G.state==='play'&&G.boss.key==='neta'&&!G.boss.roof&&G.boss.phase===1);
  const ally=G.props.find(q=>q.kind==='neta');ok('Netaji joins the fight behind Shera',ally&&ally.hidden&&ally.decor&&Math.abs(ally.x-G.boss.x)<125);
  g.trainScene('neta-intro',180);const snap=JSON.stringify({b:G.boss.x,tr:G.train});g.render();g.render();ok('rendering is pure',JSON.stringify({b:G.boss.x,tr:G.train})===snap);
  g.press('attack');g.step(1);g.release('attack');ok('fresh skip reaches the same combat pose',G.state==='play'&&G.boss.x===G.camLock+364&&G.boss.y===218&&G.props.some(q=>q.kind==='neta'));
  ok('two health bars',typeof G.boss.delhi.drawHud==='function');
  const {ASSETS}=await import('./js/assets.js'),art=ASSETS.nr_neta_props;ASSETS.nr_neta_props=null;g.trainScene('neta-intro',220);g.render();g.step(400);g.render();ok('missing prop art cannot trap reveal',G.state==='play');ASSETS.nr_neta_props=art;
  return out;
 });console.log(JSON.stringify({checks,errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
