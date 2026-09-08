// Inspection runs the actual game simulation and renderer, including missing-art paths.
const $=id=>document.getElementById(id),frame=$('game');
const areas={delhi:['market','bazaar','food','vendor','culvert','ghat','wharf','pontoon'],refund:['office','annex','calling','calling_east','servers','records','executive','closer']};
let game,manifest,sprites,combat,assets,anchors,playing=false,mode='scene',poseTick=0,effectPreset=null;
const query=new URLSearchParams(location.search);$('stage').value=query.get('stage')==='refund'?'refund':'delhi';$('time').value=query.get('t')||0;
const beats={intro:[[0,'Establish'],[75,'Entry fee'],[132,'Reach'],[174,'Push'],[252,'Barricade impact'],[285,'Step through'],[408,'Who wants some?'],[539,'Ready']],
 'vendor-finish':[[0,'Settle'],[78,'Turn up the heat'],[194,'Load'],[210,'Body hit'],[236,'Cross'],[262,'Throw'],[304,'Range impact'],[366,'Pressure burst'],[430,'Collapse'],[539,'Aftermath']],
 'dredger-finish':[[0,'Settle'],[130,'Body hit'],[166,'Cross'],[204,'Throw'],[272,'Cab impact'],[402,'Boom collapse'],[570,'Engine rupture / splash'],[720,'Safety inspections'],[959,'Wreck hold']],
 'closer-finish':[[0,'Settle'],[84,'Checks you cannot cash'],[302,'Body hit'],[330,'Cross'],[364,'Final drive'],[412,'Desk and display impact'],[486,'Framework failure'],[578,'Collapse'],[839,'Victory pose']]};
function moments(){const scene=$('scene').value,list=scene==='intro'&&$('stage').value==='refund'?[[0,'Callers at work'],[103,'Wall cracks'],[120,'Shoulder breach'],[210,'Debris settles'],[300,'Guard'],[479,'Ready']]:beats[scene]||[];$('moment').replaceChildren(new Option('Performance beat…',''));for(const [t,label]of list)$('moment').add(new Option(`${t}: ${label}`,t));}
function stageOptions(){const id=$('stage').value;$('scene').replaceChildren();const list=id==='delhi'?['card','intro','market','bazaar','food','vendor','vendor-finish','culvert','ghat','wharf','pontoon','dredger','dredger-finish','clear']:['card','intro',...areas.refund,'closer-finish','clear'];for(const s of list)$('scene').add(new Option(s.replaceAll('_',' ').replaceAll('-',' '),s));$('scene').value=query.get('scene')==='finish'?(id==='delhi'?'dredger-finish':'closer-finish'):query.get('scene')||areas[id][0];if(!$('scene').value)$('scene').value=areas[id][0];moments();}
stageOptions();
function stop(){playing=false;$('play').textContent='Play';}
function layers(){game.G.india.review=Object.fromEntries(['environment','ambient','props','fx','sets','actors','chairs','workers'].map(k=>[k,$(k).checked]));}
function drawActors(){
 if(!sprites||!manifest)return;
 if($('character').value.startsWith('cine:')){drawCinematicSheet();return;}const key=$('character').value,state=$('action').value,frames=manifest[key]?.[state]||[],n=Math.max(frames.length,1),index=Math.floor(poseTick/8)%n;
 const {SPR,getFrame,blit,frameW,frameH}=sprites,c=$('poses'),ctx=c.getContext('2d');c.height=Math.ceil(n/8)*128;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#273140';ctx.fillRect(0,0,c.width,c.height);
 for(let i=0;i<n;i++){const x=i%8*120,y=Math.floor(i/8)*128,f=getFrame(SPR[key],state,i,+$('facing').value);ctx.strokeStyle='#68788b';ctx.beginPath();ctx.moveTo(x+5,y+111.5);ctx.lineTo(x+115,y+111.5);ctx.stroke();if(f)blit(ctx,f,x+60-frameW(f)/2,y+112-frameH(f)+4);ctx.fillStyle='#eddcb2';ctx.font='10px monospace';ctx.fillText(String(i),x+5,y+124);}
 const live=$('pose-live'),lc=live.getContext('2d'),f=getFrame(SPR[key],state,index,+$('facing').value);lc.imageSmoothingEnabled=false;lc.fillStyle='#273140';lc.fillRect(0,0,240,160);if(f)blit(lc,f,120-frameW(f)/2,130-frameH(f)+4);$('pose-status').textContent=`${key} · ${state} · ${n} poses · selected ${index}`;
}
function draw(){if(!game)return;layers();game.render();const G=game.G;$('number').value=$('time').value;$('route-value').value=Math.round(G.camX);$('status').textContent=`${G.state} · ${G.stage.id} · camera ${Math.round(G.camX)} · CHAD ${Math.round(G.player.x)}, ${Math.round(G.player.y)} · ${mode==='scene'||mode==='route'?'scenery preview':`encounter ${G.waveIndex+1}/${G.stage.waves.length}`} · ${G.enemies.filter(e=>!e.dead).length} opponents · HP ${G.player.hp}`;drawActors();}
function encounters(){$('encounter').replaceChildren();for(const [i,w] of game.G.stage.waves.entries())$('encounter').add(new Option(w.boss?game.G.stage.boss:w.miniboss||`Encounter ${i+1}`,i));}
function effectScene(t=0){
 const id=$('stage').value;game.indiaScene(id,id==='refund'?'calling':'bazaar',0);mode='effect';
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
function seek(){if(!game)return;stop();if(effectPreset)effectScene(+$('time').value);else{mode='scene';game.indiaScene($('stage').value,$('scene').value,+$('time').value);}encounters();draw();if(!effectPreset)history.replaceState(null,'',`?stage=${$('stage').value}&scene=${$('scene').value}&t=${$('time').value}`);}
function character(){$('action').replaceChildren();if($('character').value.startsWith('cine:')){$('action').add(new Option('All performance poses','all'));poseTick=0;drawActors();return;}for(const state of Object.keys(manifest[$('character').value]||{}))$('action').add(new Option(state,state));poseTick=0;drawActors();}
{const timer=setInterval(async()=>{game=frame.contentWindow.__game;if(!game||game.G.state==='boot')return;clearInterval(timer);manifest=await(await fetch('./assets/frames/manifest.json')).json();sprites=await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/sprites.js',frame.contentWindow.location.href).href)})`);combat=await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/player.js',frame.contentWindow.location.href).href)})`);assets=(await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/assets.js',frame.contentWindow.location.href).href)})`)).ASSETS;anchors=(await frame.contentWindow.eval(`import(${JSON.stringify(new URL('./js/india_cinematic_anchors.js',frame.contentWindow.location.href).href)})`)).CINEMATIC_ANCHORS;for(const key of Object.keys(anchors))$('character').add(new Option(key.replaceAll('_',' '),'cine:'+key));for(const key of Object.keys(manifest).filter(k=>k==='player'||k.startsWith('ic_')))$('character').add(new Option(key,key));character();seek();},100);}
$('stage').onchange=()=>{effectPreset=null;stageOptions();$('time').value=0;seek()};$('scene').onchange=()=>{moments();effectPreset=null;$('time').value=0;seek()};$('time').oninput=seek;
$('effect-show').onclick=()=>{effectPreset=$('effect').value;$('time').value=0;seek()};
$('reset').onclick=()=>{$('time').value=0;seek()};$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';frame.focus()};
$('step').onclick=()=>{stop();game.step(3);poseTick+=3;$('time').value=+$('time').value+3;draw()};$('back').onclick=()=>{$('time').value=Math.max(0,+$('time').value-3);seek()};
$('route').oninput=()=>{stop();effectPreset=null;mode='route';const x=+$('route').value;game.indiaScene($('stage').value,areas[$('stage').value][Math.floor(x/810)],+$('time').value);game.G.camX=x;game.G.player.x=x+180;draw()};
for(const id of ['environment','ambient','props','fx','sets','actors','chairs','workers'])$(id).onchange=draw;
$('scale').onclick=()=>{const small=frame.clientWidth>480;frame.style.width=small?'480px':'960px';frame.style.height=small?'270px':'540px';$('poses').style.width=small?'480px':'960px'};
$('full').onclick=()=>{stop();effectPreset=null;mode='full';game.playStage($('stage').value);game.G.freezeTime=true;playing=true;$('play').textContent='Pause';frame.focus()};
$('wave').onclick=()=>{const i=+$('encounter').value;stop();effectPreset=null;mode='combat';game.indiaScene($('stage').value,areas[$('stage').value][0],0);const G=game.G,w=G.stage.waves[i];G.waveIndex=i-1;G.waveActive=false;G.locked=false;G.player.x=w.x;G.camX=Math.max(0,w.x-230);G.camLock=G.camX;G.freezeTime=true;playing=true;$('play').textContent='Pause';frame.focus()};
$('apply').onclick=()=>{stop();const b=game.G.boss,value=$('pattern').value;if(b){mode='combat';if(value==='guardbreak')b.breakGuard();else if(value==='damaged'){for(const p of game.G.props)if(p.indiaBossProp)p.hurt(999,1,true,true);}else{b.protectedStagger=0;b.pattern=value;b.state='windup';b.t=0;b.face=game.G.player.x<b.x?-1:1;b.hitLanded=false;}}draw()};
$('character').onchange=character;$('action').onchange=()=>{poseTick=0;drawActors()};$('facing').onchange=drawActors;$('pose-step').onclick=()=>{poseTick+=8;drawActors()};
$('save').onclick=()=>{const a=document.createElement('a');a.href=frame.contentDocument.querySelector('canvas').toDataURL();a.download=`${$('stage').value}-${$('scene').value}-${$('time').value}.png`;a.click()};
let last=0,acc=0;function tick(now){if(playing&&game){acc+=Math.min(now-last,100)*+$('speed').value;while(acc>=1000/60){game.step(1);poseTick++;acc-=1000/60;$('time').value=+$('time').value+1;}draw();}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);

$('moment').onchange=()=>{if($('moment').value!==''){$('time').value=$('moment').value;seek();}};
function drawCinematicSheet(){
 const key=$('character').value.slice(5),meta=anchors[key],path={chad_finishers:'ic_cine_chad',chad_cart_push:'ic_cine_push',vendor_finish:'ic_cine_vendor',operator_finish:'ic_cine_operator',operator_limp:'ic_cine_operator_limp',closer_cascade:'ic_cine_closer'}[key],im=assets[path];if(!im)return;
 const count=meta.hip.length,c=$('poses');c.height=Math.ceil(count/8)*144;const ctx=c.getContext('2d');ctx.fillStyle='#273140';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
 const face=+$('facing').value;
 function pose(context,i,x,y){context.save();context.translate(x+64,y);context.scale(face,1);context.drawImage(im,i%4*256,Math.floor(i/4)*256,256,256,-64,0,128,128);context.restore();}
 for(let i=0;i<count;i++){const x=i%8*120,y=Math.floor(i/8)*144;pose(ctx,i,x-4,y);ctx.strokeStyle='#68788b';ctx.beginPath();ctx.moveTo(x,y+124.5);ctx.lineTo(x+118,y+124.5);ctx.stroke();ctx.fillStyle='#eddcb2';ctx.font='10px monospace';ctx.fillText(i,x+4,y+139);}
 const index=Math.floor(poseTick/8)%count,live=$('pose-live'),lc=live.getContext('2d');lc.fillStyle='#273140';lc.fillRect(0,0,240,160);lc.imageSmoothingEnabled=false;pose(lc,index,56,12);$('pose-status').textContent=`${key} · ${count} authored poses · frame ${index}`;
}
