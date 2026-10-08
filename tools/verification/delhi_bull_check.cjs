// Bull facing, committed lane, alternating charges, camera movement, exit, recoil and frame review.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await b.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
 const result=await page.evaluate(async()=>{const g=__game,G=g.G,{updateEnemies}=await import('/js/enemies.js'),out=[],ok=(n,v)=>out.push([n,!!v]);
 const setup=x=>{g.indiaScene('delhi','bazaar',0);g.resetInput();Object.assign(G,{enemies:[],boss:null,props:[],effects:[],shots:[],zones:[],locked:true,camX:810,camLock:810,waveActive:false,spawnQueue:[],hitstop:0});G.india.bullDone=true;G.india.environment=null;Object.assign(G.player,{x:1060,y:229,z:0,state:'idle',hp:100,invuln:99999,dying:false});const e=g.spawn('bull',x-G.player.x,0);Object.assign(e,{x,y:229,state:'idle',t:0,charges:0});return e;};
 const tick=()=>{G.time++;G.player.invuln=99999;updateEnemies();};
 let e=setup(850);tick();const side=e.ramSide;const faces=[];for(let i=0;i<18&&e.state==='idle';i++){G.player.x=G.camX+(i%2?50:430);tick();if(e.state==='idle')faces.push(e.face);}ok('crossing CHAD cannot reverse selected run-up edge',e.ramSide===side&&faces.every(f=>f===faces[0]));
 e=setup(840);const path=[],chargeFaces=[],turns=[];let prior=e.state;
 for(let t=0;t<1500&&!e.removeMe;t++){G.player.x=G.camX+(t%70<35?110:350);const before={x:e.x,y:e.y,face:e.face,state:e.state};tick();path.push({t,x:e.x-G.camX,y:e.y,face:e.face,state:e.state,charges:e.charges,leave:!!e.bullLeaving});if(before.state==='attack'&&e.state==='attack')ok('charge locks facing and depth '+t,e.face===before.face&&e.y===before.y);if(e.state==='attack'&&prior!=='attack')chargeFaces.push(e.face);if(prior!==e.state)turns.push({t,state:e.state});prior=e.state;}
 ok('three complete charges alternate across room',chargeFaces.length===3&&chargeFaces.every((f,i)=>!i||f===-chargeFaces[i-1]));ok('bull exits cleanly after third charge',e.removeMe&&e.charges===3);ok('bull is never a wave gate',e.noCount&&e.offSlot);ok('no idle position snap',path.slice(1).every((p,i)=>p.state!=='hurt'&&p.state!=='down'?Math.abs(p.x-path[i].x)<4.5:true));
 e=setup(1260);for(let i=0;i<40&&e.state==='idle';i++)tick();ok('right-edge bull paws toward the room',e.state==='windup'&&e.face===-1);const lane=e.y;for(let i=0;i<45;i++){G.player.y=i%2?181:250;tick();}ok('windup and charge keep the committed depth lane',e.y===lane);
 e=setup(1000);G.waveActive=true;for(let i=0;i<400&&!e.removeMe;i++)tick();ok('next encounter makes cow leave instead of sticking to wall',e.removeMe&&e.charges===0);
 e=setup(850);e.face=1;e.poise=0;e.hurt(1,1,false,false);G.player.x=G.camX+20;for(let i=0;i<10;i++){tick();ok('hurt reaction retains facing '+i,e.face===1);}
 e=setup(900);G.camX+=240;tick();ok('camera cannot drag a left-behind cow back into frame',e.removeMe);
 return {checks:out,path,chargeFaces,turns};});assert(result.checks.every(x=>x[1]),JSON.stringify(result.checks.filter(x=>!x[1])));
 const dir='tmp/review/delhi-bull';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/behavior.json`,JSON.stringify(result,null,2));
 // Capture every windup frame and several complete gait cycles in both directions, plus recoil and departure.
 for(const face of [1,-1])for(const state of ['walk','windup','attack','hurt','exit']){
  const count=state==='windup'?40:state==='hurt'?13:state==='attack'?32:24;
  await page.evaluate(({face,state})=>{const g=__game,G=g.G;g.indiaScene('delhi','bazaar',0);g.resetInput();Object.assign(G,{enemies:[],boss:null,props:[],effects:[],shots:[],zones:[],locked:true,camX:810,camLock:810,waveActive:false,spawnQueue:[],hitstop:0});G.india.bullDone=true;G.india.environment=null;Object.assign(G.player,{x:1050,y:229,z:0,state:'idle',invuln:99999,hp:100,dying:false});const e=g.spawn('bull',0,0);Object.assign(e,{x:state==='exit'?(face===1?1210:880):(face===1?880:1210),y:229,face,state:state==='walk'||state==='exit'?'idle':state,t:0,stridePhase:0,charges:state==='exit'?3:0,vx:state==='attack'?face*e.speed:0,ramSide:face===1?1:-1});window.bullReview=e;G.freezeTime=true;}, {face,state});
  for(let t=0;t<count;t++){await page.evaluate(async()=>{const G=__game.G;G.time++;G.player.invuln=99999;(await import('/js/enemies.js')).updateEnemies();G.shake=G.fade=G.flash=0;__game.render();});await page.locator('#game').screenshot({path:`${dir}/${face===1?'right':'left'}-${state}-${String(t).padStart(2,'0')}-2x.png`});}
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:result.checks.length,charges:result.chargeFaces,frames:266,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
