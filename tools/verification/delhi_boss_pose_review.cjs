// Actual Chrome gameplay renderer. This isolates authored attacks, not a combat policy.
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out='tmp/review/delhi-boss-rebuild';fs.mkdirSync(out,{recursive:true});
 for(const [key,pattern,beats]of [
 ['vendor','string',[0,4,10,18,24,30,40,56,62]],['vendor','naan',[0,6,12,24]],['vendor','dip',[0,20,40]],['vendor','fling',[0,8,14,20,30]],
 ['vendor','lastorder',[0,10,18,40,70,83]],['vendor','p3:string',[0,46,62,66,72,84]],['vendor','rage',[0,24,54,80,100]],['vendor','breath',[0,10,30,50,59]],['vendor','flop',[0,9,18,27,35,37]],['vendor','flopped',[0,10,50,64,71]],
 ['dredger','grab:swingwind',[0,20,40]],['dredger','grab:swing',[0,12,23,34,45]],['dredger','grab:dropaim',[0,20,45]],['dredger','grab:droplock',[0,8,13]],['dredger','grab:dropfall',[0,4,8,12]],
 ['dredger','grab:stuck',[0,60,119]],['dredger','grab:scoop',[0,10,20,30]],['dredger','grab:dump',[0,6,16,26,40]],
 ['dredger','wrench',[0,8,12,34,40,60]],['dredger','sack',[0,4,16,30]],['dredger','call',[0,6,20]],['dredger','crewcall',[0,10,30]],['dredger','leap',[0,11,22,33,44]]]){
 for(const t of [...new Set([...beats,...Array.from({length:Math.floor(Math.max(...beats)/3)+1},(_,i)=>i*3)])].sort((a,b)=>a-b)){await page.evaluate(([key,pattern,t])=>{const g=__game;g.indiaScene('delhi',key,0);const G=g.G,b=G.boss;G.state='play';G.player.invuln=10000;G.player.state='idle';G.player.dying=false;G.player.z=0;
 const grab=pattern.startsWith('grab:'),state=pattern.replace('grab:','').replace('p3:','');
 if(key==='dredger'&&!grab)b.delhi.operatorPhase(b);
 Object.assign(b,{state,pattern:state,t:0,face:-1,attackFace:-1,x:G.camX+280,y:226,z:0,attackLane:226,pressureLane:226,hitLanded:false});
 // The machine's grab: pendulum and scoop start from the arena edge, drops and the dump from the rest height.
 if(grab)Object.assign(b,{pattern:{swingwind:'grabswing',swing:'grabswing',scoop:'grabscoop',dump:'grabdump'}[state]||'grabdrop',lockY:226,dir:1,x:G.camX+(['swing','scoop'].includes(state)?56:280),z:{swingwind:64,swing:70,scoop:6,stuck:0}[state]??92});
 if(key==='dredger'&&!grab)Object.assign(b,{pattern:{wrench:'wrenchcombo',call:'grabcall'}[state]||state,x:state==='leap'?G.camX+352:b.x,z:state==='leap'?76:0});
 if(key==='vendor'){b.phase=pattern.startsWith('p3:')?3:['breath','flop','flopped','lastorder'].includes(pattern)?2:1;b.phaseTwo=b.enraged=b.phase>1;b.lastOrder=b.phase===3;b.lane=226;
  if(['dip','fling'].includes(pattern))Object.assign(b,{x:b.kadai.x-48,y:b.kadai.y-4,face:pattern==='dip'?1:-1});
  if(pattern==='flop')Object.assign(b,{leapFrom:b.x,leapFromY:226,leapTo:G.camX+205,leapY:226});
  if(pattern==='rage')b.hp=Math.floor(b.maxhp*.5);}
 G.player.x=G.camX+205;G.player.y=226;g.step(t);G.shake=0;g.render();},[key,pattern,t]);
 for(const width of [960,480]){await page.setViewportSize({width,height:width*270/480});await page.locator('#game').screenshot({path:`${out}/${key}-${pattern.replace(":","-")}-${t}-${width}.png`});}
 }
 }
 console.log(out);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
