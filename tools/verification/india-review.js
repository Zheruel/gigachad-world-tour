import {compareActor} from './actor-scale-review.js';
// Inspection runs the actual game simulation and renderer, including missing-art paths.
const $=id=>document.getElementById(id),frame=$('game');
const areas={delhi:['market','bazaar','food','vendor','culvert','ghat','wharf','pontoon'],refund:['office','annex','calling','calling_east','servers','records','executive','closer']};
let actorPlaying=false;
let game,manifest,sprites,combat,assets,anchors,playing=false,mode='scene',poseTick=0,effectPreset=null;
const stage=document.documentElement.dataset.stage==='refund'?'refund':'delhi';
const query=new URLSearchParams(location.search);$('time').value=query.get('t')||0;
const beats={intro:[[0,'Ride in'],[78,'Brake'],[115,'Dismount'],[180,'Food stalls'],[300,'Disgust'],[350,'Shoulder down'],[360,'Charge'],[396,'First stall / vendor burst'],[466,'Second stall contact'],[510,'Braking'],[536,'Awning collapse'],[562,'Brush off'],[600,'Who wants some?'],[719,'Ready']],
 'vendor-finish':[[0,'Fade out'],[12,'Black / staging'],[18,'Fade in'],[30,'Performance'],[48,'Turn up the heat'],[184,'First hit'],[214,'Second hit'],[246,'Into pressure assembly'],[296,'Lean into mechanism'],[316,'Valve grip'],[344,'Force valve shut'],[384,'Pressure launch'],[437,'Airborne'],[483,'Landing'],[500,'Settle'],[510,'Stall collapse'],[596,'Brush off'],[659,'Return to play']],
 'dredger-finish':[[0,'Fade out'],[12,'Black / staging'],[18,'Fade in'],[30,'Performance'],[88,'First hit'],[120,'Second hit'],[156,'Throw'],[218,'Bucket catch'],[254,'Grip latch'],[290,'Release latch'],[384,'Engine impact'],[498,'Cab failure'],[642,'Boom / polluted splash'],[738,'Safety inspections'],[959,'Wreck hold']],
 'closer-finish':[[0,'Fade out'],[12,'Black / staging'],[18,'Fade in'],[30,'Performance'],[84,'Checks you cannot cash'],[302,'Body hit'],[330,'Cross'],[364,'Final drive'],[412,'Desk and display impact'],[486,'Framework failure'],[578,'Collapse'],[839,'Victory pose']]};
function moments(){const scene=$('scene').value,list=scene==='intro'&&stage==='refund'?[[0,'Callers at work'],[103,'Wall cracks'],[120,'Shoulder breach'],[210,'Debris settles'],[300,'Guard'],[479,'Ready']]:beats[scene]||[];$('moment').replaceChildren(new Option('Performance beat…',''));for(const [at,label]of list){const t=scene==='closer-finish'&&at>30?at-42:at;$('moment').add(new Option(`${t}: ${label}`,t));}}
function stageOptions(){const id=stage;$('scene').replaceChildren();const list=id==='delhi'?['card','intro','market','bazaar','food','vendor','vendor-finish','culvert','ghat','wharf','pontoon','dredger','dredger-finish','clear']:['card','intro',...areas.refund,'closer-finish','clear'];for(const s of list)$('scene').add(new Option(s.replaceAll('_',' ').replaceAll('-',' '),s));$('scene').value=query.get('scene')==='finish'?(id==='delhi'?'dredger-finish':'closer-finish'):query.get('scene')||areas[id][0];if(!$('scene').value)$('scene').value=areas[id][0];moments();}
stageOptions();
function patternOptions(){
 const dredger=stage==='delhi'&&$('scene').value==='dredger';
 const options=stage==='refund'?['boxing','handset','shove','call']:dredger?
 ['sweep','bucketdrop','hose','component:winch','component:pump','component:cab','operator','op:wrench','op:toolthrow','op:cover','op:restart','op:call']:
 ['ladle','utensil','rush','valve','vendor-lunge','overhead'];
 $('pattern').replaceChildren(new Option('Boss performance…',''));
 for(const value of [...options,'guardbreak','damaged'])$('pattern').add(new Option(value.replace('component:','Destroy ').replace('op:','Operator '),value));
}
patternOptions();
function stop(){playing=false;$('play').textContent='Play';}
function layers(){game.G.india.review=Object.fromEntries(['environment','ambient','props','fx','sets','actors','chairs','workers','rats','pigeons','flies'].map(k=>[k,$(k)?.checked!==false]));}
function drawActors(){
 if(!sprites||!manifest)return;
 if($('character').value.startsWith('cine:')){drawCinematicSheet();return;}const key=$('character').value,state=$('action').value,frames=manifest[key]?.[state]||[],n=Math.max(frames.length,1),index=Math.floor(poseTick/8)%n;
 const {SPR,getFrame,blit,frameW,frameH}=sprites,c=$('poses'),ctx=c.getContext('2d');c.height=Math.ceil(n/8)*128;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#273140';ctx.fillRect(0,0,c.width,c.height);
 for(let i=0;i<n;i++){const x=i%8*120,y=Math.floor(i/8)*128,f=getFrame(SPR[key],state,i,+$('facing').value);ctx.strokeStyle='#68788b';ctx.beginPath();ctx.moveTo(x+5,y+111.5);ctx.lineTo(x+115,y+111.5);ctx.stroke();if(f)blit(ctx,f,x+60-frameW(f)/2,y+112-frameH(f)+4);ctx.fillStyle='#eddcb2';ctx.font='10px monospace';ctx.fillText(String(i),x+5,y+124);}
 ctx.strokeStyle='#e6b763';ctx.strokeRect(index%8*120+.5,Math.floor(index/8)*128+.5,119,127);
 syncPose(n,index);compareActor(sprites,key,state,index);
 const live=$('pose-live'),lc=live.getContext('2d'),f=getFrame(SPR[key],state,index,+$('facing').value);lc.imageSmoothingEnabled=false;lc.fillStyle='#273140';lc.fillRect(0,0,240,160);if(f)blit(lc,f,120-frameW(f)/2,130-frameH(f)+4);$('pose-status').textContent=`${key} · ${state} · ${n} poses · selected ${index}`;
}
function draw(){if(!game)return;layers();game.render();const G=game.G;$('number').value=$('time').value;$('route-value').value=Math.round(G.camX);$('status').textContent=`${G.state} · ${G.stage.id} · camera ${Math.round(G.camX)} · CHAD ${Math.round(G.player.x)}, ${Math.round(G.player.y)} · ${mode==='scene'||mode==='route'?'scenery preview':`encounter ${G.waveIndex+1}/${G.stage.waves.length}`} · ${G.enemies.filter(e=>!e.dead).length} opponents · HP ${G.player.hp}`;drawActors();}
function encounters(){$('encounter').replaceChildren();for(const [i,w] of game.G.stage.waves.entries())$('encounter').add(new Option(w.boss?game.G.stage.boss:w.miniboss||`Encounter ${i+1}`,i));}
function effectScene(t=0){
 const id=stage;game.indiaScene(id,id==='refund'?'calling':'bazaar',0);mode='effect';
 const G=game.G;game.resetInput();G.boss=null;G.enemies=[];G.shots=[];G.effects=[];G.meter=100;
 Object.assign(G.player,{x:G.camX+185,y:232,z:0,state:'idle',face:1,invuln:0});
 const count=effectPreset==='crowd-ko'?5:1;
 for(let i=0;i<count;i++){
  const e=game.spawn(id==='refund'?'ic_headset':'ic_brawler',46+i*27,i%2*5);e.state='idle';e.poise=0;
  e.hp=effectPreset==='super'?120:effectPreset==='super-ko'?36:1;
  if(!effectPreset.startsWith('super'))e.hurt(30,1,effectPreset!=='ko',false);
 }
 if(effectPreset.startsWith('super'))combat.startSuper(G.player);
 if(t)game.step(t);
}
function seek(){if(!game)return;stop();if(effectPreset)effectScene(+$('time').value);else{mode='scene';game.indiaScene(stage,$('scene').value,+$('time').value);}encounters();draw();if(!effectPreset)history.replaceState(null,'',`?scene=${$('scene').value}&t=${$('time').value}`);}
function character(){stop();actorPlaying=false;$('pose-play').textContent='Play animation';$('action').replaceChildren();if($('character').value.startsWith('cine:')){$('action').add(new Option('All performance poses','all'));poseTick=0;drawActors();return;}for(const state of Object.keys(manifest[$('character').value]||{}))$('action').add(new Option(({idle:'Idle',walk:'Walk',atk:'Attack',hurt:'Hit reaction',down:'Knockdown',block:'Guard',jump:'Jump',run:'Run',punch:'Punch',kick:'Kick'})[state]||state.replaceAll('_',' '),state));poseTick=0;drawActors();}
{const timer=setInterval(async()=>{game=frame.contentWindow.__game;if(!game||game.G.state==='boot')return;clearInterval(timer);manifest=await(await fetch('./assets/frames/manifest.json')).json();sprites=await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/sprites.js',frame.contentWindow.location.href).href)})`);combat=await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/player.js',frame.contentWindow.location.href).href)})`);assets=(await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/assets.js',frame.contentWindow.location.href).href)})`)).ASSETS;anchors=(await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/india_cinematic_anchors.js',frame.contentWindow.location.href).href)})`)).CINEMATIC_ANCHORS;anchors={...anchors,delhi_finish_chad:{rows:4,hip:Array.from({length:16},()=>[64,88])},pressure_vendor:{rows:3,hip:Array.from({length:12},()=>[64,88])},bucket_operator:{rows:3,hip:Array.from({length:12},()=>[64,88])},chad_rampage:{rows:4,hip:Array.from({length:16},()=>[64,88])},market_work:{rows:4,hip:Array.from({length:16},()=>[64,88])},chai_flee:{rows:2,hip:Array.from({length:8},()=>[64,88])},market_vendor:{rows:2,hip:Array.from({length:8},()=>[64,88])}};for(const key of Object.keys(anchors).filter(k=>stage==='delhi'?k!=='closer_cascade':['chad_finishers','closer_cascade'].includes(k)))$('character').add(new Option(key.replaceAll('_',' '),'cine:'+key));for(const key of Object.keys(manifest).filter(k=>k==='player'||(stage==='delhi'?['thekedar','ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker','ic_vendor']:['ic_headset','ic_operator','ic_thrower','ic_security','ic_cabinet','ic_lead','ic_closer','ic_closer_damaged']).includes(k)))$('character').add(new Option(({player:'CHAD',thekedar:'Dredger operator',ic_brawler:'Street brawler',ic_runner:'Knife runner',ic_enforcer:'Long-reach enforcer',ic_heavy:'Cart-shield heavy',ic_kitchen:'Kitchen fighter',ic_docker:'Waterfront worker',ic_vendor:'Food vendor boss',ic_headset:'Headset brawler',ic_operator:'Quick operator',ic_thrower:'Equipment thrower',ic_security:'Security enforcer',ic_cabinet:'Cabinet heavy',ic_lead:'Team lead',ic_closer:'The Closer',ic_closer_damaged:'The Closer — damaged'})[key]||key,key));$('character').value='player';character();seek();},100);}
$('scene').onchange=()=>{moments();patternOptions();effectPreset=null;$('time').value=0;seek()};$('time').oninput=seek;
$('effect-show').onclick=()=>{effectPreset=$('effect').value;$('time').value=0;seek()};
$('reset').onclick=()=>{$('time').value=0;seek()};$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';frame.focus()};
$('step').onclick=()=>{stop();game.step(3);poseTick+=3;$('time').value=+$('time').value+3;draw()};$('back').onclick=()=>{$('time').value=Math.max(0,+$('time').value-3);seek()};
$('route').oninput=()=>{stop();effectPreset=null;mode='route';const x=+$('route').value;game.indiaScene(stage,areas[stage][Math.floor(x/810)],+$('time').value);game.G.camX=x;game.G.player.x=x+180;draw()};
for(const id of ['environment','ambient','props','fx','sets','actors','chairs','workers'])$(id).onchange=draw;
$('scale').onclick=()=>{const small=frame.clientWidth>480;frame.style.width=small?'480px':'960px';frame.style.height=small?'270px':'540px';$('poses').style.width=small?'480px':'960px'};
$('full').onclick=()=>{stop();effectPreset=null;mode='full';game.playStage(stage);game.G.freezeTime=true;playing=true;$('play').textContent='Pause';frame.focus()};
$('wave').onclick=()=>{const i=+$('encounter').value;stop();effectPreset=null;mode='combat';game.indiaScene(stage,areas[stage][0],0);const G=game.G,w=G.stage.waves[i];G.waveIndex=i-1;G.waveActive=false;G.locked=false;G.player.x=w.x;G.camX=Math.max(0,w.x-230);G.camLock=G.camX;G.freezeTime=true;playing=true;$('play').textContent='Pause';frame.focus()};
$('apply').onclick=()=>{
 stop();const G=game.G,b=G.boss,value=$('pattern').value;if(!b||!value)return;
 mode='combat';
 if(value==='guardbreak')b.breakGuard();
 else if(value==='damaged'){for(const p of G.props)if(p.indiaBossProp)p.hurt(999,1,true,true);}
 else if(value.startsWith('component:'))b[value.slice(10)]?.hurt(999,1,true,true);
 else {
  if((value==='operator'||value.startsWith('op:'))&&b.phase==='machine')b.delhi.operatorPhase(b);
  b.protectedStagger=0;b.t=0;b.face=G.player.x<b.x?-1:1;b.attackFace=b.face;b.hitLanded=false;b.attackLane=b.y;
  if(value==='operator'){b.state='openter';b.z=78;}
  else if(value==='op:cover'){b.coverTarget=b.covers.find(p=>!p.broken);b.state='opretreat';}
  else if(value.startsWith('op:')){b.pattern=value.slice(3);b.state='windup';}
  else if(b.key==='dredger'){
   b.pattern=value;
   if(value==='sweep'){b.state='sweepaim';b.sweepDir=b.face;b.sweepY=G.player.y;b.sweeps=1;}
   else if(value==='bucketdrop')b.state='dropaim';
   else{b.state='windup';b.hoseLane=G.player.y;}
  }else{
   if(['vendor-lunge','overhead'].includes(value)&&b.cart&&!b.cart.broken)b.cart.hurt(999,1,true,true);
   b.protectedStagger=0;b.pattern=value;b.state='windup';b.t=0;
   if(value==='rush')b.cartFacing=b.face;
   if(value==='valve'){b.valveActive=true;b.valve.decor=false;b.pressureLane=G.player.y;}
  }
 }
 draw();
};
$('character').onchange=character;$('action').onchange=()=>{stop();actorPlaying=false;$('pose-play').textContent='Play animation';poseTick=0;drawActors()};$('facing').onchange=drawActors;$('pose-step').onclick=()=>selectPose(Math.floor(poseTick/8)+1);
$('pose-back').onclick=()=>selectPose(Math.floor(poseTick/8)-1);
$('pose-index').oninput=()=>selectPose(+$('pose-index').value);
$('pose-play').onclick=()=>{stop();actorPlaying=!actorPlaying;$('pose-play').textContent=actorPlaying?'Pause animation':'Play animation'};
$('poses').onclick=e=>{const c=$('poses'),r=c.getBoundingClientRect(),row=$('character').value.startsWith('cine:')?144:128;selectPose(Math.floor((e.clientX-r.left)*c.width/r.width/120)+8*Math.floor((e.clientY-r.top)*c.height/r.height/row));};
$('save').onclick=()=>{const a=document.createElement('a');a.href=frame.contentDocument.querySelector('canvas').toDataURL();a.download=`${stage}-${$('scene').value}-${$('time').value}.png`;a.click()};
let last=0,acc=0,actorAcc=0;function tick(now){if(actorPlaying){actorAcc+=Math.min(now-last,100)*+$('speed').value;while(actorAcc>=1000/60){poseTick++;actorAcc-=1000/60;}drawActors();}if(playing&&game){acc+=Math.min(now-last,100)*+$('speed').value;while(acc>=1000/60){game.step(1);acc-=1000/60;$('time').value=+$('time').value+1;}draw();}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);

$('moment').onchange=()=>{if($('moment').value!==''){$('time').value=$('moment').value;seek();}};
function drawCinematicSheet(){
 const key=$('character').value.slice(5),meta=anchors[key],path={delhi_finish_chad:'ic_delhi_finish_chad',pressure_vendor:'ic_pressure_vendor',bucket_operator:'ic_bucket_operator',market_work:'ic_rampage_work',chai_flee:'ic_rampage_chai',market_vendor:'ic_rampage_vendor',chad_rampage:'ic_rampage_chad',chad_finishers:'ic_cine_chad',chad_cart_push:'ic_cine_push',vendor_finish:'ic_cine_vendor',operator_finish:'ic_cine_operator',operator_limp:'ic_cine_operator_limp',closer_cascade:'ic_cine_closer'}[key],im=assets[path];if(!im)return;
 const count=meta.hip.length,c=$('poses');c.height=Math.ceil(count/8)*144;const ctx=c.getContext('2d');ctx.fillStyle='#273140';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
 const face=+$('facing').value;
 function pose(context,i,x,y){context.save();context.translate(x+64,y);context.scale(face,1);context.drawImage(im,i%4*(im.width/4),Math.floor(i/4)*(im.height/meta.rows),im.width/4,im.height/meta.rows,-64,0,128,128);context.restore();}
 for(let i=0;i<count;i++){const x=i%8*120,y=Math.floor(i/8)*144;pose(ctx,i,x-4,y);ctx.strokeStyle='#68788b';ctx.beginPath();ctx.moveTo(x,y+124.5);ctx.lineTo(x+118,y+124.5);ctx.stroke();ctx.fillStyle='#eddcb2';ctx.font='10px monospace';ctx.fillText(i,x+4,y+139);}
 const index=Math.floor(poseTick/8)%count;syncPose(count,index);ctx.strokeStyle='#e6b763';ctx.strokeRect(index%8*120+.5,Math.floor(index/8)*144+.5,119,143);const live=$('pose-live'),lc=live.getContext('2d');lc.fillStyle='#273140';lc.fillRect(0,0,240,160);lc.imageSmoothingEnabled=false;pose(lc,index,56,12);$('pose-status').textContent=`${key} · ${count} authored poses · frame ${index}`;compareActor(sprites,({pressure_vendor:'ic_vendor',bucket_operator:'thekedar',vendor_finish:'ic_vendor',operator_finish:'thekedar',operator_limp:'thekedar',closer_cascade:'ic_closer_damaged'})[key]||'player',key,index,(ctx,x,y)=>pose(ctx,index,x-64,y-128));
}

function poseCount(){const key=$('character').value;return key.startsWith('cine:')?anchors[key.slice(5)]?.hip.length||1:manifest[key]?.[$('action').value]?.length||1;}
function syncPose(count,index){$('pose-index').max=count-1;$('pose-index').value=index;}
function selectPose(index){stop();actorPlaying=false;$('pose-play').textContent='Play animation';const n=poseCount();poseTick=((index%n+n)%n)*8;drawActors();}

for(const id of ['rats','pigeons','flies'])if($(id))$(id).onchange=draw;
if($('flee'))$('flee').onclick=async()=>{const ambient=await frame.contentWindow.eval("import('./js/delhi_ambient.js')");ambient.scareDelhiAmbient(game.G.camX+260,220);ambient.updateDelhiAmbient();draw();};
