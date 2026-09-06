const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=travel-landing');await page.waitForFunction(()=>__game?.travelReady());
 const checks=await page.evaluate(async()=>{
  const {drawCarWheels,CAR_WHEELS}=await import('/js/street.js'),{TRAVEL_ART,TRAVEL_DURATIONS}=await import('/js/travel.js'),{JET,ENCOUNTER,stairPose,papersAt:actualPapersAt}=await import('/js/airport.js'),{landingAt}=await import('/js/flight.js');
  const papersAt=t=>actualPapersAt(t+ENCOUNTER.throwDelay);
  const out=[],check=(n,v)=>out.push([n,!!v]),im=TRAVEL_ART.car_driver,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  function rims(d){ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);drawCarWheels(ctx,im,0,0,c.width,c.height,d);return ctx.getImageData(0,0,c.width,c.height).data;}
  const a=rims(0),b=rims(8),again=rims(8);let outside=0,inside=[0,0];
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const k=(y*c.width+x)*4;if(a.slice(k,k+4).some((v,i)=>v!==b[k+i])){const wheel=CAR_WHEELS.findIndex(w=>((x-w.x)/(w.rx+2))**2+((y-w.y)/(w.ry+2))**2<=1);if(wheel<0)outside++;else inside[wheel]++;}}
  check('both authored rims rotate',inside.every(n=>n>80));check('rotation preserves tyres and body outside rim masks',outside===0);check('same distance is deterministic',b.every((v,i)=>v===again[i]));
  const end=landingAt(300);check('landing shares parked jet geometry',Math.abs(end.x-JET.x)<.001&&Math.abs(end.y-JET.y)<.001&&end.angle===0&&end.gear===1);check('wide touchdown then close arrival',landingAt(150).scale<end.scale);
  const top=stairPose({phase:'disembark',t:42}),bottom=stairPose({phase:'disembark',t:128});check('descent reaches apron without scaling',top.y<bottom.y&&bottom.y===228);
  check('redirection retains wrist contact through pivot',papersAt(211).sheet==='chad_pivot'&&papersAt(211).frame===2);check('official recedes behind CHAD into skyline',papersAt(250).airX<ENCOUNTER.heroX&&papersAt(250).airY<100&&papersAt(250).airScale<.04);check('quote has time to finish',TRAVEL_DURATIONS.papers-(270+ENCOUNTER.throwDelay)>2.216*60);
  const g=__game;g.G.freezeTime=false;g.travel('papers');g.step(270+ENCOUNTER.throwDelay);g.press('pause');g.step(1);g.release('pause');const before=JSON.stringify(g.G.travel);g.step(90);check('pause freezes active payoff and particles',g.G.paused&&before===JSON.stringify(g.G.travel));g.press('pause');g.step(1);g.release('pause');g.step(1);g.step(TRAVEL_DURATIONS.papers-g.G.travel.t);check('single return to walking',g.G.travel.phase==='arrival-exit'&&g.G.travel.x===ENCOUNTER.heroX);g.G.freezeTime=true;
  return out;
 });
 fs.mkdirSync('/tmp/gachi-arrival-polish',{recursive:true});
 for(const [phase,times]of [['drive',[90,91,92]],['landing',[1,90,150,180,240,299]],['disembark',[25,36,50,64,80,94,110,127,149]],['papers',[170,180,190,199,204,211,218,219,224,235,249,278,320]]])for(const t of times){
  await page.evaluate(({phase,t})=>{__game.resetInput();__game.G.freezeTime=false;__game.travel(phase);__game.step(t);__game.G.freezeTime=true;__game.G.fade=0;__game.render();},{phase,t});
  fs.writeFileSync(`/tmp/gachi-arrival-polish/${phase}-${t}.png`,Buffer.from(await page.locator('#game').evaluate(c=>c.toDataURL().split(',')[1]),'base64'));
 }
 console.log(JSON.stringify({checks,errors}));assert(checks.every(c=>c[1]));assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
