// Temporary Dredger test bench (dredger-lab.html): the studio's controller and fight scenarios, grouped by phase,
// with a few live tweaks the studio has no buttons for (junk kind, hatch yank, a one-hit real kill).
import {createController} from './controller.js?v=review-controls-3';
import {createScenarioRegistry} from './scenarios.js?v=guard-surrender-1';

const $=id=>document.getElementById(id),frame=$('game');
const JUNK=['taxi','rickshaw','rebar','fridge'];
const junk=kind=>({G})=>{const b=G.boss;b.scrapKind=JUNK[(JUNK.indexOf(kind)+JUNK.length-1)%JUNK.length];};   // the move picks the next kind
const noCrew=({G})=>{const b=G.boss;G.enemies=G.enemies.filter(e=>!b.crewActors.includes(e));b.crewActors=[];b.crewCd=999;};
const BEATS=[
 ['Whole fight',[
  ['delhi/dredger','Full fight from the start','Every phase in order, as in the game'],
  ['delhi/dredger-intro','Introduction cinematic','The Thekedar in his cab']]],
 ['Phase 1 · the grab',[
  ['delhi/dredger/grabswing','Pendulum swing','Red · walk out of the arc'],
  ['delhi/dredger/grabdrop','Grab drop','Red ring · hunts your shadow, then sticks'],
  ['delhi/dredger/grabscoop','Deck scoop','Red · sweeps the deck'],
  ['delhi/dredger/grabdump','Sludge dump','Leaves sludge that slows you'],
  ['delhi/dredger/return','Return to sender','Parry a crew wrench into the cab glass']]],
 ['Transition · cut loose',[
  ['delhi/dredger/cutloose','Cut loose → MAGNET MODE','Grab dropped in the river, magnet lowered, +8% refill']]],
 ['Phase 2 · the magnet',[
  ['delhi/dredger/mag-yank','Scrap yank · crewman','Green · parry him back into the magnet: SHORT'],
  ['delhi/dredger/mag-yank','Scrap yank · hatch lid','No crew in reach: rips a hatch out of the deck',noCrew],
  ['delhi/dredger/mag-scrap','Scrap drop · taxi','Red ring · biggest footprint',junk('taxi')],
  ['delhi/dredger/mag-scrap','Scrap drop · auto-rickshaw','Red ring',junk('rickshaw')],
  ['delhi/dredger/mag-scrap','Scrap drop · rebar spears','Three staggered red rings across your lane',junk('rebar')],
  ['delhi/dredger/mag-scrap','Scrap drop · fridge','Lands upright: smash it open for food',junk('fridge')],
  ['delhi/dredger/mag-pull','Pull and slam','Red · run out before the power cuts; it lies open after'],
  ['delhi/dredger/mag-shorted','Short circuit · open','Crashed on the deck: beat it']]],
 ['Transition · blowout',[
  ['delhi/dredger/blowout','Cab blowout','Third short blows the rig'],
  ['delhi/dredger/operator','Thekedar leaps down','Operator bar fills under the banner']]],
 ['Phase 3 · the Thekedar',[
  ['delhi/dredger/op-wrenchcombo','Wrench string','Parry the overhead: STUCK'],
  ['delhi/dredger/op-sack','Sand sack','Reflect it: blinded'],
  ['delhi/dredger/op-grabcall','BUCKET!','Lure the falling grab onto him'],
  ['delhi/dredger/op-ladder','Ladder scramble','Knock him off the ladder'],
  ['delhi/dredger/op-crewcall','Crew call','BOYS! DOUBLE SHIFT!']]],
 ['Transition · the hook',[
  ['delhi/dredger/op-hook','Hook transition','Wrench tossed, swings down on the boom hook, +12% refill; the magnet stays up']]],
 ['Phase 4 · hook and chain',[
  ['delhi/dredger/hook-fling','Hook fling','Green · parry: TANGLED'],
  ['delhi/dredger/hook-slam','Hook slam','Red · stuck in the deck after'],
  ['delhi/dredger/hook-magnet','MAGNET!','He radios the dead magnet down on you: red ring'],
  ['delhi/dredger/hook-sweep','Hook sweep','Jump it']]],
 ['Finish',[
  ['delhi/dredger/hook-sweep','Real kill (one hit left)','Land any hit: the live finisher',({G})=>{const b=G.boss;b.hp=1;b.atkCd=240;}],
  ['delhi/dredger-finish','Finisher cinematic','Stuck to his own magnet']]],
];
let controller,registry,beat=null,god=false,lastReadout=0;

function list(){
 const host=$('list');host.replaceChildren();
 for(const [title,items]of BEATS){const h=document.createElement('h2');h.textContent=title;host.append(h);
  for(const item of items){const [id,label,note]=item,b=document.createElement('button');b.innerHTML=`${label}<small>${note}</small>`;b.disabled=!registry.some(s=>s.id===id);b.onclick=()=>open(item,b);host.append(b);}}
}
async function open(item,button=document.querySelector('aside button[aria-current=true]')){
 const [id,label,,tweak]=item,s=registry.find(s=>s.id===id);if(!s)return;
 beat=item;for(const b of document.querySelectorAll('aside button'))b.setAttribute('aria-current',String(b===button));
 $('loading').hidden=false;$('now').textContent=label;
 try{await controller.load(s,{seed:541});tweak?.(controller.game);controller.game.render();controller.play();frame.focus();}
 finally{$('loading').hidden=true;}
}
const pct=(a,b)=>b?Math.round(100*a/b)+'%':'-';
function readout(force){
 const G=controller?.game.G;if(!G)return;const p=G.player,b=G.boss;
 if(god&&p){p.hp=p.maxhp;p.lives=Math.max(p.lives||0,3);}
 const now=performance.now();if(!force&&now-lastReadout<80)return;lastReadout=now;const s=controller.snapshot();
 $('play').textContent=s.playing?'Pause':'Play';
 const row=(k,v,c='')=>`<div><b>${k}</b> <span class="${c}">${v}</span></div>`;
 $('readout').innerHTML=!b?row('boss','none (cinematic or not spawned)')+row('frame',s.tick):[
  row('frame',s.tick),row('phase',`${b.phase||'-'} · ${b.rig||''}${b.hook?' · hook':''}`),row('state',`${b.state} t${b.t}${b.pattern?' · '+b.pattern:''}`),
  row('boss hp',`${Math.round(b.hp)}/${b.maxhp} (${pct(b.hp,b.maxhp)})${b.hpFx?' refilling':''}`,b.hpFx?'ok':''),
  row('shorts',`${b.overload||0}/3`),row('cab glass',b.glass??'-'),
  row('CHAD',`${Math.round(p.hp)}/${p.maxhp} · ${p.state}`,p.hp<p.maxhp*.3?'warn':''),
  row('crew',`${(b.crewActors||[]).filter(e=>!e.dead).length} on deck${b.yankee?' · '+(b.yankee.kind==='crew'?'crewman':'hatch lid')+' on the magnet':''}${b.flung?' · flung':''}`),
  row('scrap',`${(b.scraps||[]).filter(q=>!q.gone).length} pieces · ${G.props.filter(q=>q.dredgerFridge&&!q.broken).length} fridge`),
 ].join('');
}
async function boot(){
 controller=await createController(frame,readout);registry=await createScenarioRegistry(controller.game);list();
 $('play').onclick=()=>{const s=controller.snapshot();s.playing?controller.pause():(controller.play(),frame.focus());};
 $('restart').onclick=()=>beat&&open(beat);
 $('step').onclick=()=>controller.step(1);
 $('speed').onchange=e=>controller.setSpeed(e.target.value);
 $('god').onchange=e=>{god=e.target.checked;};
 $('sound').onchange=e=>controller.setMuted(!e.target.checked);
 $('loading').hidden=true;$('now').textContent='Pick a beat on the left';
 const first=document.querySelector('aside button:not([disabled])');if(first)open(BEATS[0][1][0],first);
}
boot().catch(e=>{$('now').textContent=e.message||String(e);console.error(e);});
