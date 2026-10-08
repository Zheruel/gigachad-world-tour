const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'train/style-demo');
 const report=await frame.evaluate(async()=>{
  const g=__game,G=g.G,P=await import('/js/player.js'),B=await import('/js/boxing_combos.js'),Boss=await import('/js/bosses.js'),E=await import('/js/engine.js');
  const real=G.audio,checks=[],traces=[],ok=(n,v)=>checks.push([n,!!v]);let calls=[],tick=0,target=null;
  const mock={sfx:n=>calls.push({name:n,tick,t:G.player.t,superT:G.player.superT,hp:target?.hp,normalPose:G.player.state==='attack'?P.COMBO_FLOW[G.player.combo].frames[P.keyFrame(G.player.t,P.COMBO_FLOW[G.player.combo].keys)]:null,pose:B.superPose(G.player).idx}),roomSfx:n=>{mock.sfx(n);return true;},voiceRandom(){},stopStyleVoice(){}};
  function setup(type='nr_tough'){
   g.trainScene('general');g.resetInput();G.enemies=[];G.props=[];G.boss=null;G.spawnQueue=[];G.state='play';G.hitstop=0;G.paused=false;G.slowmo=0;G.meter=100;E.resetCombo();
   const p=G.player;Object.assign(p,{x:G.camX+180,y:236,z:0,vz:0,face:1,state:'idle',t:0,hp:100,invuln:0,hitDone:false,hitConfirm:false,counterT:0,queuedHits:0,chainQueued:false,chainSkip:0,blind:0,poison:0,guardWindow:0,specialTarget:null});
   target=type==='conductor'?Boss.createBoss(type,p.x+35,p.y):g.spawn(type,35,0);
   Object.assign(target,{x:p.x+35,y:p.y,z:0,vz:0,state:'idle',t:0,face:-1,hp:1000,maxhp:1000,guard:0,protectedStagger:0,atkCd:999,poise:0,dead:false,superLocked:false,pendingSuperDefeat:false});
   G.audio=mock;calls=[];tick=0;return p;
  }
  const contactPoses=[2,4,6,2,4]; // Reviewed full-extension art cells, not wind-up poses.
  const impacts=()=>calls.filter(c=>['punch','heavy','kick'].includes(c.name));
  for(let combo=0;combo<P.COMBO_FLOW.length;combo++)for(const miss of [false,true]){
   const p=setup();if(miss)target.x+=400;Object.assign(p,{state:'attack',combo});const c=P.COMBO_FLOW[combo];
   for(tick=1;tick<=c.dur;tick++)P.updatePlayer(p);
   const body=impacts();ok(`strike ${combo}: ${miss?'miss silent':'one contact at hit frame'}`,miss?body.length===0&&target.hp===1000:body.length===1&&body[0].tick===c.hitAt&&body[0].hp<1000&&body[0].normalPose===contactPoses[combo]&&c.frames[P.keyFrame(c.hitAt-1,c.keys)]!==contactPoses[combo]);
   traces.push({kind:'normal',combo,miss,body});
  }
  {const p=setup('nr_captain');Object.assign(p,{state:'attack',combo:0});for(tick=1;tick<=12;tick++)P.updatePlayer(p);ok('blocked jab has clash, no flesh impact',target.hp===1000&&impacts().length===0&&calls.some(c=>c.name==='armor'));}
  {const p=setup('nr_captain');target.face=1;Object.assign(p,{state:'attack',combo:3});for(tick=1;tick<=15;tick++)P.updatePlayer(p);ok('guard break has one punch impact',impacts().length===1&&target.gbT>0);traces.push({kind:'guard-break',hp:target.hp,calls:[...calls]});}
  for(const variant of [0,1])for(const type of ['nr_tough','nr_heavy','ic_brawler','ic_headset','conductor'])for(const guarded of [false,true]){
   const p=setup(type);target.guard=guarded?3:0;P.startSuper(p);p.superMove=variant;const cues=B.superCues(p);calls=[];
   for(tick=1;tick<=cues.dur;tick++)P.updatePlayer(p);
   const body=impacts();ok(`${type}/${variant}/${guarded}: every super impact shares damage/contact pose`,body.length===cues.hits.length&&body.every((s,i)=>s.superT===cues.hits[i].at&&s.pose===cues.hits[i].pose&&s.name===(cues.hits[i].finish?'heavy':'punch')&&s.hp<(i?body[i-1].hp:1000)));
   ok(`${type}/${variant}/${guarded}: damage unchanged`,target.hp===1000-(p.superGuarded?18:36));traces.push({kind:'super',variant,type,guarded:p.superGuarded,requestedGuard:guarded,hp:target.hp,body});
  }
  for(const variant of [0,1]){
   const p=setup();target.hp=1;P.startSuper(p);p.superMove=variant;const cues=B.superCues(p);calls=[];
   for(tick=1;tick<=cues.dur;tick++)P.updatePlayer(p);
   ok(`lethal ${variant}: full sequence with one final KO`,impacts().length===cues.hits.length&&calls.filter(c=>['edie1','edie2'].includes(c.name)).length===1&&target.dead&&!target.superLocked);
  }
  {const p=setup();target.hurt=()=>{};P.startSuper(p);const cues=B.superCues(p);calls=[];for(tick=1;tick<=cues.dur;tick++)P.updatePlayer(p);ok('rejected super hits give no impact or combo credit',impacts().length===0&&G.combo===0&&target.hp===1000);}
  {const p=setup();target.kind='prop';target.anchored=true;target.hurt=()=>{};P.startSuper(p);const cues=B.superCues(p);calls=[];for(tick=1;tick<=cues.dur;tick++)P.updatePlayer(p);ok('training bag still sounds on every contact',impacts().length===cues.hits.length);}
  {const p=setup();P.startSuper(p);const cues=B.superCues(p);p.superT=cues.hits[0].at-1;calls=[];G.hitstop=3;g.step(3);ok('hitstop does not fire the pending impact early',impacts().length===0&&p.superT===cues.hits[0].at-1);G.paused=true;g.step(12);ok('pause holds impact and contact frame together',impacts().length===0&&p.superT===cues.hits[0].at-1);G.paused=false;g.step(1);ok('resume emits exactly one impact on contact',impacts().length===1&&p.superT===cues.hits[0].at);g.step(2);ok('contact hitstop does not repeat the sound',impacts().length===1);}
  G.audio=real;return {checks,traces};
 });
 fs.mkdirSync('tmp/review/combat-ui',{recursive:true});fs.writeFileSync('tmp/review/combat-ui/hit-audio-sync.json',JSON.stringify({...report,errors},null,2));assert(report.checks.every(c=>c[1]),JSON.stringify(report.checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:report.checks.length,failures:[],errors}));
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1});
