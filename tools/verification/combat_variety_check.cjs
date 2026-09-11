const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1000,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out=await page.evaluate(async()=>{
 const g=__game,G=g.G,{startSuper,updatePlayer}=await import('./js/player.js'),{updateEnemies}=await import('./js/enemies.js'),{createBoss,updateBoss}=await import('./js/bosses.js'),{superCues,chooseCombo}=await import('./js/boxing_combos.js');
 const checks=[],ok=(n,v)=>checks.push([n,!!v]);
 function setup(){g.trainScene('general');g.resetInput();G.enemies=[];G.boss=null;G.meter=100;G.hitstop=0;Object.assign(G.player,{x:3200,y:220,z:0,face:1,state:'idle'});return G.player;}
 for(let variant=0;variant<2;variant++)for(const kind of ['nr_tough','nr_heavy','conductor'])for(const guard of [false,true]){
 const p=setup(),e=kind==='conductor'?createBoss(kind,3250,220):g.spawn(kind,50,0);Object.assign(e,{x:3250,y:220,state:'idle',hp:200,guard:guard&&kind==='conductor'?3:0});const other=g.spawn('nr_tough',60,0),ohp=other.hp;
 startSuper(p);p.superMove=variant;const cues=superCues(p);for(let t=0;t<cues.dur;t++)updatePlayer(p);
 ok(`${variant}/${kind}/${guard} damage`,e.hp===200-(p.superGuarded?18:36));ok('bystander untouched',other.hp===ohp);ok('released',!e.superLocked&&!p.specialTarget);
 ok('earned finish',kind==='conductor'?e.protectedStagger>=(p.superGuarded?90:45):e.state==='down');
 }
 for(let variant=0;variant<2;variant++){
 const p=setup(),e=g.spawn('nr_tough',50,0);e.state='idle';e.hp=1;startSuper(p);p.superMove=variant;const end=superCues(p).dur;
 for(let t=0;t<end-1;t++){updatePlayer(p);updateEnemies();}
 ok('lethal bursts on finishing contact and holds performance',e.dead&&e.superLocked);updatePlayer(p);updateEnemies();ok('lethal releases and dies once',e.dead&&!e.superLocked);const score=G.score;updateEnemies();ok('no repeated rewards',G.score===score);
 }
 const p=setup();let previous=-1;const seen=new Set();for(let i=0;i<100;i++){const v=chooseCombo(p);ok('no immediate repeat',v!==previous);previous=v;seen.add(v);}ok('all variants reachable',seen.size===2);
 for(const offset of [-70,70])for(const broken of [false,true]){
  g.trainScene('conductor',300);G.enemies=[];G.train.officeDeskBroken=broken;const b=G.boss;b.guard=0;b.shieldActive=false;b.hp=1;b.state='idle';G.player.x=b.x+offset;G.player.y=b.y;
  b.hurt(999,offset<0?1:-1,true,false);ok('inspector death starts finisher',G.train.cinematic?.kind==='inspector-finish');
  const before=G.train.cinematic.t;G.paused=true;g.step(30);ok('finisher pauses',G.train.cinematic.t===before);G.paused=false;g.step(390);
  ok('finisher releases from either side',!G.train.cinematic&&G.state==='play'&&!!G.train.inspectorBody);
  const score=G.score;g.step(20);ok('finisher rewards once',G.score===score);
 }
 g.trainScene('inspector-finish');g.step(370);ok('inspector returns control',!G.train.cinematic&&G.state==='play'&&G.train.officeDeskBroken);
 return checks;
 });console.log(JSON.stringify({checks:out.length,failures:out.filter(x=>!x[1]),errors}));
 const dir='tmp/review/combat-variety';fs.mkdirSync(dir,{recursive:true});
 for(const scene of ['inspector-finish','roof-transition','knockout'])for(const t of [0,30,54,82,98,111,150,177,198,215,330]){
 await page.evaluate(({scene,t})=>{__game.trainScene(scene,t);__game.render();},{scene,t});await page.locator('canvas').first().screenshot({path:`${dir}/${scene}-${t}.png`});
 }
 const missing=await browser.newPage();await missing.route(/super_barrage|super_electric|chad_(inspector_pair|seth_pair)_|office_desk_broken|arcade_fragments/,r=>r.abort());
 await missing.goto('http://localhost:8011/?auto=walk');await missing.waitForFunction(()=>window.__game?.G.state==='play');
 const fallback=await missing.evaluate(async()=>{const g=__game,G=g.G,{startSuper,updatePlayer}=await import('./js/player.js');g.trainScene('general');G.enemies=[];G.boss=null;G.meter=100;const e=g.spawn('nr_tough',40,0);e.hp=100;e.state='idle';G.player.face=1;startSuper(G.player);for(let i=0;i<101;i++)updatePlayer(G.player);g.render();const superOK=G.player.state==='idle'&&e.hp===64;g.trainScene('inspector-finish');g.step(380);g.render();return superOK&&!G.train.cinematic;});
 assert(fallback,'missing new artwork must permit completion');await missing.close();
 assert(out.every(x=>x[1]));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
