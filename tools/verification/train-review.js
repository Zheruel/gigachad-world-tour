// Browser-only review controls. The game remains the single renderer/simulator.
const $=id=>document.getElementById(id),frame=$('game');
let game,manifest,sprites,playing=false,mode='scene',tickCount=0;
const areas=[['yard',0,960],['hall',960,1920],['platform',1920,2880],['general',2880,3840],['sleeper',3840,5280],['pantry',5280,5760],['office',5760,6240],['ac',6240,7200],['private',7200,8160],['roof',8160,9120]];
const names=['intro','yard','hall','platform','train-arrival','boarding','general','sleeper','pantry','office','conductor','ac','private','seth-intro','boss','roof-transition','roof-guards','roof','boss-roof','knockout','escape','clear'];
for(const s of names)$('scene').add(new Option(s.replaceAll('-',' '),s));
const finaleCheckpoints=[[0,'Tracking arrival'],[90,'Approach'],[179,'Before braking'],[180,'Reaction'],[330,'Plant charge'],[390,'Set charge'],[450,'Run-up'],[465,'Takeoff'],[489,'Flight'],[510,'Touchdown'],[539,'Last braking frame'],[540,'Stopped / shoulder roll'],[585,'Rise'],[600,'Remote'],[715,'Detonate'],[720,'Light cigar'],[732,'Blast 1'],[780,'Blast 2'],[810,'Cigar walk'],[834,'Blast 3'],[894,'Blast 4'],[960,'Blast 5'],[1026,'Blast 6'],[1098,'Blast 7'],[1170,'Final blast / puff'],[1215,'Smoke hold'],[1259,'Last cinematic frame'],[1260,'CHAD WINS hold']];
const conductorCheckpoints=[0,30,60,90,120,150,180,210,240,299,300];
$('finale-checkpoint').add(new Option('Choose a moment…',''));
for(const [t,label] of finaleCheckpoints)$('finale-checkpoint').add(new Option(`${label} · ${t}`,t));
$('conductor-checkpoint').add(new Option('Choose a moment…',''));
for(const t of conductorCheckpoints)$('conductor-checkpoint').add(new Option(`${t===300?'Combat':'Introduction'} · ${t}`,t));
for(const [t,label]of [[0,'Frozen finale'],[44,'Before victory title'],[45,'CHAD WINS'],[90,'Tally'],[194,'Before confirmation'],[195,'F / LB ready'],[240,'Full tally']])$('clear-checkpoint').add(new Option(`${label} · ${t}`,t));
const q=new URLSearchParams(location.search);$('scene').value=names.includes(q.get('scene'))?q.get('scene'):'yard';$('time').value=q.get('t')||0;
const layerKeys=['art','npc','fx','vista','interior','finaleActor','finaleCar','finaleEnvironment','finaleGear','finaleCoupling','finaleLeftDamage','finaleRightDamage','finaleDynamite','finaleCigar','conductorDesk','conductorActor'];
function layers(){game.G.train.review=Object.fromEntries(layerKeys.map(k=>[k,$(k).checked]));}
function stop(){playing=false;$('play').textContent='Play';}
function actorDraw(){
 const c=$('poses'),ctx=c.getContext('2d'),key=$('character').value,state=$('action').value,frames=manifest[key]?.[state]||[],count=frames.length||1;
 c.height=Math.max(128,Math.ceil(count/8)*126);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#222936';ctx.fillRect(0,0,c.width,c.height);
 const index=Math.floor(tickCount/+$('hold').value)%count;
 const {SPR,getFrame,blit,frameW,frameH}=sprites;
 for(let i=0;i<count;i++){
  const f=getFrame(SPR[key],state,i,+$('facing').value),x=(i%8)*120,y=Math.floor(i/8)*126;
  ctx.fillStyle=i===index?'#455269':'#2a3444';ctx.fillRect(x+1,y+1,118,123);
  ctx.strokeStyle='#728393';ctx.beginPath();ctx.moveTo(x+6,y+109.5);ctx.lineTo(x+114,y+109.5);ctx.stroke();
  blit(ctx,f,x+60-frameW(f)/2,y+112-frameH(f)+4);
  ctx.fillStyle='#ffe2a1';ctx.font='10px monospace';ctx.fillText(String(i),x+5,y+121);
 }
 const live=$('pose-live'),lc=live.getContext('2d'),f=getFrame(SPR[key],state,index,+$('facing').value);lc.imageSmoothingEnabled=false;lc.fillStyle='#283244';lc.fillRect(0,0,240,160);blit(lc,f,120-frameW(f)/2,130-frameH(f)+4);
 $('pose-status').textContent=`${key} / ${state} · ${count} frames · selected ${index} · ${$('hold').value} ticks/frame`;
}
function draw(){
 if(!game)return;layers();game.render();$('number').value=$('time').value;$('back').disabled=['full','combat'].includes(mode);$('back').title=$('back').disabled?'Replay the encounter to inspect it again; combat supports forward stepping.':'';
 const G=game.G;$('finale-controls').hidden=G.train?.cinematic?.kind!=='escape'&&!(mode==='scene'&&$('scene').value==='escape');$('finale-checkpoint').value=String(+$('time').value);$('clear-controls').hidden=!(mode==='scene'&&$('scene').value==='clear');$('clear-checkpoint').value=String(+$('time').value);$('conductor-controls').hidden=!(mode==='scene'&&$('scene').value==='conductor');$('conductor-checkpoint').value=String(+$('time').value);$('status').textContent=`${G.state} · ${G.train?.cinematic?.kind||areas.find(a=>G.player.x<a[2])?.[0]} · camera ${Math.round(G.camX)} · CHAD ${Math.round(G.player.x)}, ${Math.round(G.player.y)} · ${G.player.state} · ${['scene','route'].includes(mode)?'scenery preview (encounters off)':`wave ${G.waveIndex+1}/${G.stage.waves.length}`} · ${G.enemies.filter(e=>!e.dead).length} enemies · HP ${G.player.hp}`;
 if(manifest)actorDraw();
}
function seek(){if(!game)return;stop();mode='scene';game.trainScene($('scene').value,+$('time').value);draw();history.replaceState(null,'',`?scene=${$('scene').value}&t=${$('time').value}`);}
function route(){if(!game)return;stop();mode='route';const x=+$('route').value,a=areas.find(a=>x<a[2])||areas.at(-1);game.trainScene(a[0],+$('time').value);const camera=game.G.train.climbed?Math.max(8160,x):Math.min(x,(game.G.train.aboard?8160:2880)-480);game.G.camX=camera;game.G.player.x=Math.min(x+140,game.G.train.climbed?9100:game.G.train.aboard?8150:2810);game.G.camLock=camera;game.G.train.vistaX=game.G.train.vistaTarget=Math.max(0,Math.min(2400,(game.G.player.x-2880)/5280*2400));game.G.train.motionT=game.G.train.vistaX/.12;draw();$('route-value').value=x;}
function chooseCharacter(){const key=$('character').value;$('action').replaceChildren();for(const s of Object.keys(manifest[key]))$('action').add(new Option(s,s));tickCount=0;actorDraw();}
frame.onload=()=>{const timer=setInterval(async()=>{game=frame.contentWindow.__game;if(!game||game.G.state==='boot')return;clearInterval(timer);manifest=await (await fetch('./assets/frames/manifest.json')).json();sprites=await frame.contentWindow.eval(`import(${JSON.stringify(new URL("./js/sprites.js",frame.contentWindow.location.href).href)})`);for(const k of Object.keys(manifest).filter(k=>k==='player'||k.startsWith('nr_')))$('character').add(new Option(k,k));for(const [i,w] of game.G.stage.waves.entries())$('encounter').add(new Option(w.boss?'Commissioner Seth':w.miniboss==='conductor'?'Inspector office':w.x===5805?'Office enforcers':`Encounter ${i+1}`,i));chooseCharacter();seek();},100);};
$('scene').onchange=()=>{$('time').value=0;seek()};$('time').oninput=()=>mode==='route'?route():seek();$('route').oninput=route;
$('reset').onclick=()=>{$('time').value=0;seek()};$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';frame.focus()};
$('step').onclick=()=>{game.step(1);tickCount++;$('time').value=+$('time').value+1;draw()};$('back').onclick=()=>{$('time').value=Math.max(0,+$('time').value-1);mode==='route'?route():seek()};
$('scale').onclick=()=>{const small=frame.clientWidth>480;frame.style.width=small?'480px':'960px';frame.style.height=small?'270px':'540px';$('poses').style.width=small?'480px':'960px'};
for(const id of layerKeys)$(id).onchange=draw;
$('finale-checkpoint').onchange=()=>{if($('finale-checkpoint').value==='')return;$('scene').value='escape';$('time').value=$('finale-checkpoint').value;seek()};
$('clear-checkpoint').onchange=()=>{$('scene').value='clear';$('time').value=$('clear-checkpoint').value;seek()};
$('conductor-checkpoint').onchange=()=>{if($('conductor-checkpoint').value==='')return;$('scene').value='conductor';$('time').value=$('conductor-checkpoint').value;seek()};
$('finale-step').onclick=()=>{stop();game.step(3);tickCount+=3;$('time').value=+$('time').value+3;draw()};
$('finale-back').onclick=()=>{$('time').value=Math.max(0,+$('time').value-3);seek()};
$('spawn').onclick=()=>{if($('actor').value)game.spawn('nr_'+$('actor').value,170,0);draw()};
$('character').onchange=chooseCharacter;$('action').onchange=()=>{tickCount=0;actorDraw()};$('facing').onchange=actorDraw;$('hold').oninput=actorDraw;$('pose-step').onclick=()=>{tickCount+=+$('hold').value;actorDraw()};
$('full').onclick=()=>{stop();mode='full';game.resetInput();game.stage(0);game.G.freezeTime=true;game.G.fade=0;playing=true;$('play').textContent='Pause';frame.focus()};
$('wave').onclick=()=>{stop();mode='combat';game.resetInput();game.stage(0);const G=game.G,i=+$('encounter').value,w=G.stage.waves[i];G.enemies=[];G.spawnQueue=[];G.waveIndex=i-1;G.waveActive=false;G.locked=false;G.player.x=w.x;G.camX=Math.max(0,w.x-230);G.train.aboard=w.x>=2880;G.train.scene=w.x>=7200?2:w.x>=4320?1:0;G.freezeTime=true;G.fade=0;playing=true;$('play').textContent='Pause';frame.focus()};

$('save').onclick=()=>{const a=document.createElement('a');a.href=frame.contentDocument.querySelector('canvas').toDataURL();a.download=`train-${mode}-${$('scene').value}-${$('time').value}.png`;a.click()};
let last=0,acc=0;function tick(now){if(playing&&game){acc+=Math.min(now-last,100)*+$('speed').value;while(acc>=1000/60){game.step(1);tickCount++;acc-=1000/60;$('time').value=+$('time').value+1;}draw();}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);

$('combat-apply').onclick=()=>{
 const G=game.G,b=G.boss,p=G.player,value=$('combat-review').value;
 stop();G.hitstop=0;G.state='play';mode='combat';
 if(value==='super'){G.meter=100;if(b){p.x=b.x-40;p.y=b.y;p.face=1;}game.press('super');game.step(1);game.release('super');}
 else if(b){
  if(value==='guardbreak')b.breakGuard();
  else if(value==='shield'){b.shieldUsed=true;b.shieldActive=true;b.shieldHp=3;}
  else if(value==='props')for(const q of b.fightProps||[])q.broken=true;
  else{b.protectedStagger=0;b.state='windup';b.pattern=value;b.t=0;b.face=p.x<b.x?-1:1;b.hitLanded=false;}
 }
 draw();frame.focus();
};
