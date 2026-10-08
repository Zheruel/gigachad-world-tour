const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=travel-landing');await page.waitForFunction(()=>__game?.travelReady());
 const checks=await page.evaluate(async()=>{
  const {drawCarWheels,CAR_WHEELS}=await import('/js/street.js'),{TRAVEL_ART,TRAVEL_DURATIONS}=await import('/js/travel.js'),{JET,ENCOUNTER,REDIRECT,stairPose,papersAt,flightAt,heldAt,gripPoint,spinFrame,flightTurn,trailPoint}=await import('/js/airport.js'),{landingAt}=await import('/js/flight.js');
  const out=[],check=(n,v)=>out.push([n,!!v]),im=TRAVEL_ART.car_driver,c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  function rims(d){ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);drawCarWheels(ctx,im,0,0,c.width,c.height,d,TRAVEL_ART);return ctx.getImageData(0,0,c.width,c.height).data;}
  const a=rims(0),b=rims(8),again=rims(8);let outside=0,inside=[0,0];
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const k=(y*c.width+x)*4;if(a.slice(k,k+4).some((v,i)=>v!==b[k+i])){const wheel=CAR_WHEELS.findIndex(w=>((x-w.x)/(w.rx+2))**2+((y-w.y)/(w.ry+2))**2<=1);if(wheel<0)outside++;else inside[wheel]++;}}
  check('both authored rims rotate',inside.every(n=>n>80));check('rotation preserves tyres and body outside rim masks',outside===0);check('same distance is deterministic',b.every((v,i)=>v===again[i]));
  const end=landingAt(300);check('landing shares parked jet geometry',Math.abs(end.x-JET.x)<.001&&Math.abs(end.y-JET.y)<.001&&end.angle===0&&end.gear===1);check('wide touchdown then close arrival',landingAt(150).scale<end.scale);
  const top=stairPose({phase:'disembark',t:42}),bottom=stairPose({phase:'disembark',t:128});check('descent reaches apron without scaling',top.y<bottom.y&&bottom.y===228);
  const R=REDIRECT;let locked=true,step=0,prev=null,at={};
  for(let t=R.reach;t<R.release;t++){const h=heldAt(t);if(t>=R.catch){const g=gripPoint(spinFrame(t));if(Math.hypot(h.fist.x-g.x,h.fist.y-g.y)>.01)locked=false;}if(prev){at[t]=Math.hypot(h.com.x-prev.x,h.com.y-prev.y);step=Math.max(step,at[t]);}prev=h.com;}
  const f0=flightAt(0),release=Math.hypot(f0.airX-prev.x,f0.airY-prev.y);
  check('caught fist stays locked in CHAD\'s grip',locked);check('no pop into the catch or out of the release',at[R.catch]<4&&release<8);check('body swings continuously while held',step<22);
  check('held body turns head over heels',heldAt(R.release-1).angle-heldAt(R.catch).angle>150);
  let forward=true;for(let t=R.catch+1;t<R.release;t++)if(heldAt(t).angle<heldAt(t-1).angle-1e-9)forward=false;check('held body never turns back',forward);
  // Release: same pose, same turning direction, and a spin rate that ramps from the swing's instead of jumping.
  const last=heldAt(R.release-1),rate0=last.angle-heldAt(R.release-2).angle,d0=flightTurn(0).a-last.angle,deg=180/Math.PI;let ramp=0;
  for(let k=1;k<30;k++)ramp=Math.max(ramp,Math.abs((flightTurn(k).a-flightTurn(k-1).a)-(k>1?flightTurn(k-1).a-flightTurn(k-2).a:d0)));
  check('release keeps the held pose and turn',f0.airHeld&&f0.airFrame===last.frame&&Math.abs(-f0.airAngle*deg-(-last.rotate*deg+d0))<.01&&d0>0&&Math.abs(d0-rate0)<4&&ramp<4);
  let bend=0,kink=0;for(let t=R.catch+9;t<R.release+30;t++){const a=trailPoint(t-1),b=trailPoint(t),c=trailPoint(t+1);if(!a||!b||!c)continue;
   bend=Math.max(bend,Math.hypot(a.x-2*b.x+c.x,a.y-2*b.y+c.y));const u=Math.atan2(b.y-a.y,b.x-a.x),v=Math.atan2(c.y-b.y,c.x-b.x);let d=Math.abs(v-u);if(d>Math.PI)d=2*Math.PI-d;if(Math.hypot(b.x-a.x,b.y-a.y)>1.5)kink=Math.max(kink,d*deg);}
  check('swirl trail is a smooth ribbon, not a zigzag',bend<5&&kink<50);
  check('catch freezes before the spiral',papersAt(R.catch+2).freeze===1&&papersAt(R.pivot).freeze===0);check('view rolls with the spiral and settles',papersAt(R.release-1).tilt<-.04&&Math.abs(papersAt(R.release+40).tilt)<.005&&Math.abs(papersAt(R.release+40).zoom-1)<.01);
  check('official is launched up and away over CHAD',flightAt(0).airY>flightAt(25).airY+30&&flightAt(R.flight-8).airX<flightAt(0).airX-80);
  check('official sails off shrinking into the distance',flightAt(R.flight-8).airScale<.1&&flightAt(R.flight-8).far);check('quote has time to finish',TRAVEL_DURATIONS.papers-R.payoff>1.39*60);
  const g=__game;g.G.freezeTime=false;g.travel('papers');g.step(REDIRECT.release+10);g.press('pause');g.step(1);g.release('pause');const before=JSON.stringify(g.G.travel);g.step(90);check('pause freezes active payoff and particles',g.G.paused&&before===JSON.stringify(g.G.travel));g.press('pause');g.step(1);g.release('pause');g.step(1);g.step(TRAVEL_DURATIONS.papers-g.G.travel.t);check('single return to walking',g.G.travel.phase==='arrival-exit'&&g.G.travel.x===ENCOUNTER.heroX);g.G.freezeTime=true;
  return out;
 });
 fs.mkdirSync('/tmp/gachi-arrival-polish',{recursive:true});
 for(const [phase,times]of [['drive',[90,91,92]],['landing',[1,90,150,180,240,299]],['disembark',[25,36,50,64,80,94,110,127,149]],['papers',[204,216,222,230,236,244,250,256,262,270,276,290,302,330,348,366]]])for(const t of times){
  await page.evaluate(({phase,t})=>{__game.resetInput();__game.G.freezeTime=false;__game.travel(phase);__game.step(t);__game.G.freezeTime=true;__game.G.fade=0;__game.render();},{phase,t});
  fs.writeFileSync(`/tmp/gachi-arrival-polish/${phase}-${t}.png`,Buffer.from(await page.locator('#game').evaluate(c=>c.toDataURL().split(',')[1]),'base64'));
 }
 console.log(JSON.stringify({checks,errors}));assert(checks.every(c=>c[1]));assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
