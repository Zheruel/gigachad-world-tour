// Measure production cue visibility against real contacts/releases, not move-table arithmetic.
const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'delhi/duel-brawler');
 const report=await frame.evaluate(async()=>{const g=__game,G=g.G;
  const E=await import('/js/enemies.js'),B=await import('/js/bosses.js'),V=await import('/js/vendor_boss.js'),D=await import('/js/delhi_dredger.js'),N=await import('/js/train_neta.js'),C=await import('/js/train_conductor.js'),R=await import('/js/refund_boss_presentation.js');
  const rows=[],failures=[];
  function reset(stage='delhi',cam=0){stage==='train'?g.trainScene('private',0):g.indiaScene(stage,stage==='refund'?'calling':'market',0);g.resetInput();Object.assign(G,{state:'play',time:0,rawTime:0,enemies:[],boss:null,props:[],pickups:[],shots:[],zones:[],effects:[],hitstop:0,locked:true,camX:cam,camLock:cam,swingAt:-99,waveActive:false,spawnQueue:[]});Object.assign(G.player,{x:cam+180,y:229,z:0,hp:100,dying:false,state:'idle',invuln:0,face:1,guardWindow:0,grabbedBy:null});}
  function measure(name,e,cue,update,green=()=>true,position=()=>{G.player.x=e.x+e.face*35;G.player.y=e.y;},count=1){
   let first=null,contacts=0,age=0,missing=0,seen=[];
   for(;age<260&&contacts<count;age++){
    position();Object.assign(G.player,{state:'idle',invuln:0,z:0,guardWindow:0,grabbedBy:null});const hp=G.player.hp,shots=G.shots.length;
    G.time++;G.rawTime++;update();const on=green()&&cue(e);if(on&&first===null)first=age;if(first!==null&&!on)missing++;
    const contact=G.player.hp<hp||G.shots.length>shots;if(contact&&green()){
     seen.push({age,warning:age-first,throughContact:on,missing});contacts++;first=null;missing=0;
    }
   }
   const ok=seen.length===count&&seen.every(s=>s.warning>=24&&s.throughContact&&s.missing===0);
   rows.push({name,contacts:seen,ok});if(!ok)failures.push(name);
  }
  const moves=[['ic_brawler','string'],['ic_runner','kick'],['ic_enforcer','drive'],['ic_heavy','shove'],['ic_heavy','barge'],['ic_kitchen','ladle'],['ic_docker','wrench'],['ic_docker','toss'],['nr_bodyguard','jab'],['nr_bodyguard','hook'],['nr_paan','boxjab'],['nr_brawler','fkick'],['nr_chai','bonk'],['nr_chai','lob'],['nr_tte','tslam'],['nr_rack','pounce'],['nr_rack','swing'],['nr_commando','baton'],['nr_commando','lunge'],['nr_captain','bash'],['nr_runner','dash'],['nr_bruiser','punch'],['nr_bruiser','hurl'],['nr_guard','lathi'],['nr_heavy','smash'],['ic_headset','rf_string'],['ic_operator','rf_kick'],['ic_thrower','rf_phone'],['ic_thrower','rf_keyboard'],['ic_security','rf_lathi'],['ic_security','rf_jab'],['ic_cabinet','rf_punch']];
  for(const [kind,move]of moves){reset(kind.startsWith('ic_')&&!['ic_brawler','ic_runner','ic_enforcer','ic_heavy','ic_kitchen','ic_docker'].includes(kind)?'refund':'delhi');const e=g.spawn(kind,40,0);const [cls,wind]=E.FAMILY_MOVES[move];Object.assign(e,{move,cls,wind,state:'windup',t:0,face:-1,x:220,y:229,atkCd:999,plan:move,cartReleased:true,unarmed:true,stanceAt:null});measure(kind+':'+move,e,E.enemyCueOn,E.updateEnemies,()=>['counter','reflect'].includes(e.cls));}
  for(const kind of ['goonda','constable','operator','masala','bandar']){reset();const e=g.spawn(kind,40,0);Object.assign(e,{state:'windup',t:0,face:-1,x:220,y:229,atkCd:999});measure(kind,e,E.enemyCueOn,E.updateEnemies);}
  const boss=(key,cam,o)=>{reset(['neta','conductor'].includes(key)?'train':key==='closer'?'refund':'delhi',cam);G.india={startCinematic:()=>false};const b=B.createBoss(key,cam+300,229);Object.assign(b,{face:-1,atkCd:999,...o});return b;};
  for(const phase of [1,2,3]){let b=boss('vendor',2670,{phase,phaseTwo:phase>1,lastOrder:phase===3,state:'string',pattern:'string',t:0});measure('Pappu overhead phase'+phase,b,V.vendorCueOn,B.updateBoss,()=>V.vendorCueOn(b),undefined,phase===3?2:1);b=boss('vendor',2670,{phase,phaseTwo:phase>1,lastOrder:phase===3,state:'windup',pattern:'bump',t:0});measure('Pappu bump phase'+phase,b,V.vendorCueOn,B.updateBoss);}
  let b=boss('dredger',6000,{phase:'operator',state:'windup',pattern:'wrenchcombo',t:0,x:6250,y:229,z:0,attackFace:-1});measure('Thekedar wrench combo',b,D.dredgerCueOn,B.updateBoss,()=>D.dredgerCueOn(b),undefined,2);
  b=boss('dredger',6000,{phase:'operator',state:'windup',pattern:'sack',t:0,z:0});measure('Thekedar sack',b,D.dredgerCueOn,B.updateBoss);
  for(const phaseTwo of [false,true]){b=boss('closer',5900,{phaseTwo,state:'boxing',pattern:'boxing',t:0});measure('Closer finishing fist phase'+(phaseTwo?2:1),b,R.closerVisibleCue,B.updateBoss,()=>R.closerVisibleCue(b));b=boss('closer',5900,{phaseTwo,state:'windup',pattern:'handset',t:0});measure('Closer handset phase'+(phaseTwo?2:1),b,R.closerVisibleCue,B.updateBoss);}
  for(const late of [false,true])for(const pattern of ['stamp','seize']){b=boss('conductor',5760,{hp:late?200:680,state:'windup',pattern,t:0});measure('Conductor '+pattern+' phase'+(late?2:1),b,C.conductorCueOn,B.updateBoss);}
  b=boss('neta',7680,{state:'pound',pattern:'pound',t:0,pd:0});measure('Shera hammer',b,N.netaCueOn,B.updateBoss,()=>N.netaCueOn(b));
  b=boss('neta',7680,{state:'hurl',pattern:'hurl',t:0,trunk:{x:7960,y:229,broken:false}});measure('Shera trunk',b,N.netaCueOn,B.updateBoss);
  for(const pattern of ['swing','shove']){b=boss('neta',8640,{});b.delhi.toRoof(b);Object.assign(b,{state:'windup',pattern,t:0,face:-1,x:8940,y:229});measure('Netaji '+pattern,b,N.netaCueOn,B.updateBoss);}
  b=boss('neta',8640,{});b.delhi.toRoof(b);Object.assign(b,{state:'bribe',pattern:'bribe',t:0,face:-1,x:8940,y:229});measure('Netaji bribe + whip',b,N.netaCueOn,B.updateBoss,()=>N.netaCueOn(b),undefined,2);
  return {rows,failures};
 });fs.mkdirSync('tmp/review/combat-readability',{recursive:true});fs.writeFileSync('tmp/review/combat-readability/green-warnings.json',JSON.stringify(report,null,2));console.log(JSON.stringify({cases:report.rows.length,failures:report.rows.filter(r=>!r.ok)}));assert.deepEqual(report.failures,[]);assert.deepEqual(errors,[]);
 }finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
