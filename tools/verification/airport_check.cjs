const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await b.newPage({viewport:{width:960,height:540}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8011/?auto=travel-apron');await page.waitForFunction(()=>__game?.travelReady());
 const checks=await page.evaluate(async()=>{
  const g=__game,G=g.G,{TRAVEL_PHASES,TRAVEL_DURATIONS,TRAVEL_ART}=await import('/js/travel.js'),{AIRPORT,DEPARTURE_JET,departureStaffAt,nearJet,nearArrivalExit,papersAt}=await import('/js/airport.js'),{landingAt}=await import('/js/flight.js');
  const out=[],check=(n,v)=>out.push([n,!!v]),fresh=p=>{g.resetInput();G.freezeTime=false;g.travel(p);g.step(1);},tap=a=>{g.press(a);g.step(1);g.release(a);g.step(1);};
  fresh('apron');
  check('arrival frames the whole car',G.travel.cam===0);
  check('aircraft tail stays within scene height',DEPARTURE_JET.y>=0&&DEPARTURE_JET.y+DEPARTURE_JET.h<=232);
  check('attendant clear of landing gear',DEPARTURE_JET.attendantX+26<DEPARTURE_JET.x+DEPARTURE_JET.w*.41);
  check('baggage work stays beside terminal',DEPARTURE_JET.porterX+35<DEPARTURE_JET.x);
  const actorFrames=new Set();for(let clock=0;clock<780;clock++)actorFrames.add(departureStaffAt({airport:{clock,greetingAt:1}}).attendant);
  check('attendant uses intermediate gestures',actorFrames.size>=7);
  for(const phase of TRAVEL_PHASES.filter(p=>TRAVEL_DURATIONS[p]&&p!=='elevator')){
   fresh(phase);tap('attack');check(phase+' attack cannot skip',G.travel.phase===phase);
   tap('pause');const before=JSON.stringify(G.travel);g.step(40);check(phase+' pause freezes all actors',G.paused&&JSON.stringify(G.travel)===before);tap('pause');g.step(1);check(phase+' resumes',!G.paused);
   const t=G.travel.t;g.step(TRAVEL_DURATIONS[phase]-t);check(phase+' exact natural duration',G.travel.phase===TRAVEL_PHASES[TRAVEL_PHASES.indexOf(phase)+1]);
  }
  fresh('apron');tap('use');check('cannot board remotely',G.travel.phase==='apron');G.travel.x=AIRPORT.boardX;G.travel.actor.x=AIRPORT.boardX;G.travel.actor.z=15;check('airborne boarding rejected',!nearJet(G.travel));G.travel.actor.z=0;G.travel.actor.vz=0;check('grounded boarding allowed',nearJet(G.travel));tap('use');check('use boards jet',G.travel.phase==='jet-board');
  g.press('use');g.step(TRAVEL_DURATIONS['jet-board']-G.travel.t);check('held use cannot cascade',G.travel.phase==='takeoff');g.release('use');
  fresh('papers');g.step(TRAVEL_DURATIONS.papers-1);check('papers finishes once',G.travel.phase==='arrival-exit'&&G.travel.airport.encounterDone);g.step(600);check('walking idle cannot replay encounter',G.travel.phase==='arrival-exit');
  G.travel.x=AIRPORT.exitX;G.travel.y=AIRPORT.exitY;G.travel.actor.z=10;check('exit grounded only',!nearArrivalExit(G.travel));G.travel.actor.z=0;G.travel.actor.vz=0;tap('use');g.step(35);check('exit reaches train loading',G.state==='loading'&&G.stage.id==='train'&&!G.travel);g.step(150);check('loading waits for F',G.state==='loading');tap('use');g.step(30);check('normal train intro',G.state==='intro'&&G.stage.id==='train');
  fresh('papers');check('repeat clears encounter',!G.travel.airport.encounterDone);g.step(335);check('sound order',G.travel.airport.events.map(e=>e.name).join(',')==='charge,grab,pivot,throw,grunt,distant-crash,duke-payoff');const before=JSON.stringify(G.travel);g.render();g.render();check('render side effect free',JSON.stringify(G.travel)===before);
  const end=landingAt(300);check('landing parked transform exact',end.scale===1&&end.tx===-480&&end.ty===0);check('official fully offscreen after launch',!papersAt(328).airborne);
  const saved={...TRAVEL_ART};for(const key of Object.keys(TRAVEL_ART))delete TRAVEL_ART[key];
  for(const phase of TRAVEL_PHASES.slice(TRAVEL_PHASES.indexOf('apron-arrival'))){fresh(phase);g.step(15);g.render();}
  G.travel.x=AIRPORT.exitX;G.travel.y=AIRPORT.exitY;tap('use');g.step(35);check('missing art still reaches loading',G.state==='loading');Object.assign(TRAVEL_ART,saved);
  fresh('apron');const pad={connected:true,axes:[1,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});g.step(10);check('gamepad walk',G.travel.x>285);pad.axes[0]=0;pad.buttons[1]={pressed:true,value:1};g.step(1);check('gamepad jump',G.travel.actor.z>0||G.travel.actor.vz>0);pad.buttons[1]={pressed:false,value:0};g.step(70);G.travel.x=AIRPORT.boardX;G.travel.actor.x=AIRPORT.boardX;pad.buttons[4]={pressed:true,value:1};g.step(1);check('gamepad LB boards',G.travel.phase==='jet-board');Object.defineProperty(navigator,'getGamepads',{value:()=>[]});g.resetInput();
  fresh('flight');tap('pause');tap('back');g.step(40);check('quit clears travel',G.state==='title'&&!G.travel);G.freezeTime=true;return out;
 });
 console.log(JSON.stringify({checks,errors}));
 fs.mkdirSync('/tmp/gachi-airport',{recursive:true});
 for(const [phase,times] of [['apron-arrival',[1,28,45,59]],['apron',[1,120]],['jet-board',[1,25,40,60,80,100,120,140,160,179]],['takeoff',[1,90,150,220,269]],['flight',[1,120,240,359]],['india-approach',[1,150,299]],['landing',[1,90,150,210,260,299]],['disembark',[1,30,50,80,110,149]],['papers',[1,50,120,180,198,216,238,249,260,280,320]],['arrival-exit',[1,100]]]){
  for(const t of times){await page.evaluate(({phase,t})=>{const g=__game;g.resetInput();g.G.freezeTime=false;g.travel(phase);g.step(t);g.G.freezeTime=true;g.G.fade=0;g.render();},{phase,t});fs.writeFileSync(`/tmp/gachi-airport/${phase}-${t}.png`,Buffer.from(await page.locator('#game').evaluate(c=>c.toDataURL().split(',')[1]),'base64'));}
 }
 assert.deepEqual(errors,[]);assert(checks.every(x=>x[1]),'airport checks failed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
