// Actual scene replay: actor ownership, planted contacts and one-shot choreography.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
  const checks=await page.evaluate(async()=>{
   const {updateIndiaIntro,updateIndia,drawIndiaPerformance}=await import('./js/india_stage.js');
   const {startSuper}=await import('./js/player.js');
   const {ASSETS}=await import('./js/assets.js');
   const g=__game,G=g.G,out=[],ok=(s,b)=>out.push([s,!!b]);
   g.indiaScene('refund','intro',0);
   updateIndiaIntro(103);ok('wall anticipates breach with registered crack',G.india.wallCracked&&!G.india.wallBroken&&ASSETS.ic_wall_cracked);
   updateIndiaIntro(120);ok('impact opens wall exactly at120',G.india.wallBroken);
   updateIndiaIntro(124);ok('near caller reacts before farther caller',G.india.office[0].alarmed&&!G.india.office[1].alarmed);
   updateIndiaIntro(160);ok('office reaction reaches other visible caller',G.india.office[1].alarmed);
   let planted=true;for(let t=180;t<320;t++){updateIndiaIntro(t);planted&&=G.player.x===225&&G.player.y===236&&G.player.z===0;}
   ok('brace and guard retain exact planted position',planted);
   g.indiaScene('refund','closer',0);G.player.x=G.boss.x-35;G.player.y=G.boss.y;G.player.face=1;G.meter=100;
   ok('real super establishes shared target lock',startSuper(G.player)&&G.boss.superLocked);
   const b=G.boss;G.india.startCinematic('closer-finish',b);
   ok('cinematic releases real super target and ownership',!G.player.specialTarget&&!b.superLocked&&!b.superApplying);
   ok('repeated cinematic call cannot reset timeline',!G.india.startCinematic('closer-finish',b));
   g.indiaScene('refund','closer',0);const e={dead:false,state:'grabbed'};G.player.grabTarget=e;G.player.grabbedBy=G.boss;
   G.india.startCinematic('closer-finish',G.boss);
   ok('cinematic releases outgoing and incoming grabs',!G.player.grabTarget&&!G.player.grabbedBy&&e.state==='stagger');
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;
   const sounds=[];G.audio.sfx=n=>sounds.push(n);G.audio.roomSfx=n=>sounds.push(n);G.audio.voice=n=>sounds.push(n);
   let fixed=true;for(let t=1;t<=330;t++){
    updateIndia();if(t>=72)fixed&&=G.camX===6000;
    const before=[G.player.x,G.player.y,G.india.cinematic?.t,G.effects.length,sounds.length];
    drawIndiaPerformance(canvas.getContext('2d'));drawIndiaPerformance(canvas.getContext('2d'));
    if(JSON.stringify(before)!==JSON.stringify([G.player.x,G.player.y,G.india.cinematic?.t,G.effects.length,sounds.length]))throw Error('render mutated cinematic');
   }
   ok('camera stays fixed after setup',fixed);
   ok('finale completes once with settled victim preserved',G.india.endingDone&&!G.india.cinematic&&G.india.defeated.x===6330&&G.india.defeated.y===241);
   ok('three finishing contacts and single display crash',sounds.filter(x=>x==='punch').length===2&&sounds.filter(x=>x==='heavy').length===1&&sounds.filter(x=>x==='slam').length===1);
   ok('single finishing quote',sounds.filter(x=>x==='duke_terminated').length===1);
   g.indiaScene('refund','finish',0);const saved=ASSETS.ic_closer_finish;ASSETS.ic_closer_finish=null;
   for(let t=0;t<330;t++){updateIndia();drawIndiaPerformance(canvas.getContext('2d'));}
   ok('missing victim art cannot trap completion',G.india.endingDone);ASSETS.ic_closer_finish=saved;
   return out;
  });
  console.log(JSON.stringify({checks,errors}));assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
