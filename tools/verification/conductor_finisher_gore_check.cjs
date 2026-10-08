// Deterministic punch-through chest, shared gore, persistence and every changed contact frame.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await b.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
 const checks=await page.evaluate(async()=>{const g=__game,G=g.G,{inspectorPose,inspectorVictim,updateInspectorFinish}=await import('/js/train_finishers.js'),{conductorChest}=await import('/js/conductor_gore.js'),{getAIFrame}=await import('/js/aiframes.js'),out=[],ok=(n,v)=>out.push([n,!!v]);
 g.trainScene('inspector-finish',31);const c=G.train.cinematic;c.entry=null;
 ok('five wound poses registered',getAIFrame('nr_conductor','finisher_gore')?.f.length===12);
 for(const t of [152,153,155,156]){c.t=t;const p=inspectorPose(c),v=inspectorVictim(c,p),w=conductorChest(v);ok('chest aligned to fist at '+t,Math.abs(w.x-(p.x+44))<.1&&Math.abs(w.y-(p.y-66))<.1);}
 let maxStep=0,last=null;for(let t=152;t<=209;t++){c.t=t;const w=conductorChest(inspectorVictim(c,inspectorPose(c)));if(last)maxStep=Math.max(maxStep,Math.hypot(w.x-last.x,w.y-last.y));last=w;}ok('wound flight path remains continuous',maxStep<5);
 for(const t of [153,157,160,185,186,198,210,250,359]){c.t=t;const old=JSON.stringify(c);g.render();g.render();ok('render pure '+t,JSON.stringify(c)===old);}
 c.t=198;updateInspectorFinish(c);ok('desk destruction still at impact',G.train.officeDeskBroken);
 c.t=360;ok('finisher still completes at 360',updateInspectorFinish(c));ok('wounded corpse retained',G.train.inspectorBody?.wounded===true);const old=JSON.stringify(G.train.inspectorBody);g.render();ok('corpse render preserves wound state',old===JSON.stringify(G.train.inspectorBody));
 g.trainScene('inspector-finish',160);G.paused=true;const before=G.train.cinematic.t;g.step(60);ok('pause freezes blood clock',G.train.cinematic.t===before);G.paused=false;
 return out;});assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));
 const dir='tmp/review/conductor-gore/'+(process.env.ROUND||'round2');fs.mkdirSync(dir,{recursive:true});
 const times=[136,...Array.from({length:105},(_,i)=>148+i),270,300,359];
 for(const t of times){await page.evaluate(t=>{__game.trainScene('inspector-finish',31);const G=__game.G,c=G.train.cinematic;c.entry=null;c.t=t;G.freezeTime=true;G.paused=false;G.shake=G.flash=G.fade=0;G.train.officeDeskBroken=t>=198;__game.render();},t);await page.locator('#game').screenshot({path:`${dir}/${String(t).padStart(3,'0')}-2x.png`});}
 // A missing new wound state still uses native finisher art and cannot trap progression.
 const missing=await b.newPage();await missing.route(/finisher_integrated_|finisher_gore\.png/,r=>r.abort());await missing.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await missing.waitForFunction(()=>__game?.G.state==='play');assert(await missing.evaluate(()=>{__game.trainScene('inspector-finish',0);for(let i=0;i<500;i++)__game.step(1);return !__game.G.train.cinematic&&!!__game.G.train.inspectorBody;}));await missing.close();assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/checks.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length+1,frames:times.length,dir,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
