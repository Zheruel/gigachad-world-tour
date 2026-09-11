// Actual Chrome gameplay renderer. This isolates authored attacks, not a combat policy.
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out='tmp/review/delhi-boss-rebuild';fs.mkdirSync(out,{recursive:true});
 for(const [key,pattern,beats]of [
 ['vendor','ladle',[0,9,12,20,31,34,42,53,56,70]],['vendor','utensil',[0,12,14,22,34]],
 ['vendor','rush',[0,9,15,27,39,51,63,74]],['vendor','valve',[0,12,24,45]],
 ['vendor','vendor-lunge',[0,6,12,21,28,38]],['vendor','overhead',[0,9,17,18,24,38]],
 ['dredger','wrench',[0,9,10,18,29,30,40]],['dredger','openter',[0,21,45,66,84]],
 ['dredger','restart',[0,12,24,37,40]],['dredger','cower',[0,12,24]]]){
 for(const t of [...new Set([...beats,...Array.from({length:Math.floor(Math.max(...beats)/3)+1},(_,i)=>i*3)])].sort((a,b)=>a-b)){await page.evaluate(([key,pattern,t])=>{const g=__game;g.indiaScene('delhi',key,0);const G=g.G,b=G.boss;G.state='play';G.player.invuln=10000;G.player.state='idle';G.player.dying=false;G.player.z=0;
 if(key==='dredger')b.delhi.operatorPhase(b);
 Object.assign(b,{state:pattern,pattern,t:0,face:-1,attackFace:-1,x:G.camX+280,y:226,z:pattern==='openter'?78:0,attackLane:226,pressureLane:226,hitLanded:false});
 if(pattern==='cower')b.coverTarget=b.covers[0];
 if(pattern==='restart')b.residualLane=226;
 if(key==='vendor'){b.cartFacing=-1;if(['overhead','vendor-lunge'].includes(pattern)){b.cart.broken=true;b.cartGone=true;}if(pattern==='valve')b.valveActive=true;}
 G.player.x=G.camX+205;G.player.y=226;g.step(t);G.shake=0;g.render();},[key,pattern,t]);
 for(const width of [960,480]){await page.setViewportSize({width,height:width*270/480});await page.locator('#game').screenshot({path:`${out}/${key}-${pattern}-${t}-${width}.png`});}
 }
 }
 console.log(out);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
