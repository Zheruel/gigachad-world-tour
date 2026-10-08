// Vendor boss review captures in the actual renderer: the intro beats, or chosen fight states.
// SHOTS='intro:0,90,160;fight:breath:10;fin:60,140' (default: the intro beats), OUT=dir.
const fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const out=process.env.OUT||'tmp/review/vendor';fs.mkdirSync(out,{recursive:true});
 const shots=(process.env.SHOTS||'intro:0,40,90,120,150,165,190,220,250,270,290,310,360').split(';').map(s=>{const p=s.split(':');return [p.slice(0,-1).join(':'),p.at(-1).split(',').map(Number)];});
 for(const [what,ticks]of shots)for(const t of ticks){
  const err=await page.evaluate(([what,t])=>{try{const g=__game,G=g.G;g.indiaScene('delhi','vendor',0);const b=G.boss;G.player.invuln=1e4;
   if(what==='fin'){G.state='play';G.enemies=[];Object.assign(G.player,{x:b.x-40,y:b.y,face:1});b.guard=0;b.hurt(99999,1,true,true);g.step(t);}
   else if(what==='intro'){G.state='bossintro';G.stateT=G.rawTime;for(let i=0;i<t;i++)g.step(1);}
   else{const state=what.split(':')[1];G.state='play';Object.assign(b,{state,pattern:state,t:0,face:-1,x:G.player.x+90,y:G.player.y,atkCd:999});g.step(t);}
   G.shake=0;g.render();return null;}catch(e){return String(e.stack||e);}},[what,t]);
  if(err){console.error(what,t,err);continue;}
  for(const width of [960,480]){await page.setViewportSize({width,height:width*270/480});await page.locator('#game').screenshot({path:`${out}/${what.replace(/:/g,'-')}-${t}-${width}.png`});}
 }
 console.log(out);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
