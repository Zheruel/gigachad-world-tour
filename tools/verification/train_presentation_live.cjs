// Normal-speed gameplay review with actual update/render and licensed game audio.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const directory='tmp/review/train-presentation/live';fs.mkdirSync(directory,{recursive:true});
 const context=await b.newContext({viewport:{width:960,height:540},recordVideo:{dir:directory,size:{width:960,height:540}}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:8011/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');await p.keyboard.press('q');
 const result=[];
 for(const scene of ['conductor','boss','boss-roof']){
  const start=await p.evaluate(s=>{__game.trainScene(s,s==='conductor'?300:0);const G=__game.G;G.props=[];G.boss.fightProps=[];G.player.x=G.boss.x-65;G.player.y=G.boss.y;G.player.invuln=10000;G.freezeTime=false;G.fade=G.flash=G.shake=0;return G.rawTime},scene);
  for(let i=0;i<6;i++){await p.waitForTimeout(1000);await p.locator('canvas').screenshot({path:`${directory}/${scene}-${i+1}.png`});}
  const end=await p.evaluate(()=>{const G=__game.G;G.freezeTime=true;return {tick:G.rawTime,state:G.boss.state,hp:G.boss.hp,playerHP:G.player.hp}});
  assert(end.tick-start>=300&&end.tick-start<=470,JSON.stringify({scene,start,end}));result.push({scene,elapsedTicks:end.tick-start,...end});
 }
 await context.close();assert.deepEqual(errors,[]);console.log(JSON.stringify({normalSpeed:result,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
