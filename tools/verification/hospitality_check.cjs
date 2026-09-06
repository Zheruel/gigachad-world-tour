const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const out='/tmp/gachi-hospitality';fs.mkdirSync(out,{recursive:true});try{const p=await b.newPage({viewport:{width:960,height:540}});const requests=[],errors=[];p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.roomNodes=[];const proto=AudioContext.prototype,create=proto.createBufferSource;proto.createBufferSource=function(){const n=create.call(this),stop=n.stop.bind(n);n.stop=(...a)=>{n.reviewStopped=true;return stop(...a);};window.roomNodes.push(n);return n;};});
await p.goto('http://localhost:8011/?auto=travel-lobby');await p.waitForFunction(()=>window.__game?.travelReady());await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>window.__game.G.audio.has('room_shaker'));
const result=await p.evaluate(async()=>{const g=window.__game,G=g.G,{audio}=await import('/js/audio.js'),{lobbyStaffAt,porterAt}=await import('/js/lobby_staff.js'),checks=[];const check=(name,pass)=>checks.push({name,pass:!!pass});
for(const n of ['room_shaker','room_page','room_stamp','room_glass','room_pen'])check(`${n} decoded`,audio.has(n));
g.resetInput();G.freezeTime=false;g.travel('lobby');G.travel.x=280;g.step(2);check('concierge dialogue on approach',G.travel.room.concierge.count===1&&G.travel.room.concierge.text==='Your car is ready, sir.');const said=G.travel.room.concierge.last;g.step(120);check('remaining nearby does not repeat dialogue',G.travel.room.concierge.count===1&&G.travel.room.concierge.last===said);
const fixed=new Set(),tasks=new Set();for(let t=0;t<2400;t++){const c=lobbyStaffAt(t).concierge;fixed.add(c.x);tasks.add(c.task);}check('concierge remains seated while working',fixed.size===1&&['write','page','stamp','rest'].every(t=>tasks.has(t)));
const tripTime=G.travel.greetT;G.travel.x=500;g.step(1);G.travel.t=1500;G.travel.x=280;g.step(1);check('repeat greeting preserves porter trip',G.travel.greetT===tripTime&&G.travel.room.concierge.count===2);
audio.stopRoomAudio();G.travel.x=582;g.step(1);check('bartender dialogue appears nearby',G.travel.room.bartender.count>=1&&G.travel.room.bartender.near);
G.travel.t=719;const before=window.roomNodes.length;g.step(16);check('shaker sound follows shake frames',window.roomNodes.length>=before+2);const rendered=window.roomNodes.length;g.render();g.render();check('rendering never starts sounds',window.roomNodes.length===rendered);
g.press('pause');g.step(1);g.release('pause');const paused=JSON.stringify(G.travel);g.step(90);check('pause freezes dialogue and foley',paused===JSON.stringify(G.travel));g.press('pause');g.step(1);g.release('pause');
const tracked=window.roomNodes.filter(n=>!n.reviewStopped);g.hub();check('leaving room stops active room sources',tracked.some(n=>n.reviewStopped));g.setPlayerPos(1860,220);g.step(2);const {hubBed}=await import('/js/hub.js');check('penthouse woman greets on approach',!!hubBed().line&&hubBed().near);
const calls=[],original=audio.roomSfx;audio.roomSfx=(name,volume,duration)=>{calls.push({name,t:G.travel.t,duration});return true;};
try {
 g.travel('lobby');G.travel.x=582;g.step(1500);
 const beats=calls.filter(c=>c.name==='room_shaker');
 check('shaker only follows actual shaking poses',beats.length===35&&beats.every(c=>lobbyStaffAt(c.t).bartender.shakeBeat));
 check('last rattle ends with the shake animation',beats.at(-1).duration===(960-beats.at(-1).t)/60);
 calls.length=0;g.travel('lobby');G.travel.x=100;g.step(1500);
 check('distant bartender stays quiet',!calls.some(c=>c.name==='room_shaker'));
} finally {audio.roomSfx=original;}
check('text to speech API removed',!audio.npcVoice);
return checks;});assert(result.every(c=>c.pass),JSON.stringify(result));assert(!requests.some(u=>/audio\/voice\/npc_/.test(u)),'No generated speech should be requested');assert.deepEqual(errors,[]);
for(const [name,x,t] of [['concierge-speaking',345,70],['bartender-speaking',650,65],['porter',470,400],['paperwork',345,275],['stamp',345,450]]){await p.evaluate(([x,t])=>{const g=window.__game;g.resetInput();g.G.freezeTime=false;g.travel('lobby');g.G.travel.x=x;g.step(t);g.G.freezeTime=true;g.G.fade=0;g.render();},[x,t]);await p.screenshot({path:`${out}/${name}.png`});}
await p.evaluate(async()=>{const g=window.__game;g.G.freezeTime=false;g.hub();g.setPlayerPos(1860,220);g.step(65);g.G.freezeTime=true;g.G.fade=0;g.render();});await p.screenshot({path:`${out}/penthouse.png`});
console.log(JSON.stringify({checks:result,screenshots:out}));}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
