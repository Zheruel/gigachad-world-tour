// The final sales call must remain readable, replayable and safely skippable.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const studio=require('./studio_helper.cjs'),out='tmp/review/refund-boss-intro';
(async()=>{const {page,errors,close}=await studio.launch();try{
 await studio.openStudio(page,'refund/closer-intro');fs.mkdirSync(out,{recursive:true});
 const result=await studio.game(page,async(g,G)=>{
  const {closerIntroPose,CLOSER_INTRO_TICKS}=await g.importModule('js/refund_boss_intro.js');
  const {bossIntroDialogue,dialogueReveal}=await g.importModule('js/room_dialogue.js');
  const checks=[],ok=(n,v)=>checks.push([n,!!v]);
  g.indiaScene('refund','closer-intro',0);
  ok('the final call starts on his throne, seated facing CHAD',G.state==='bossintro'&&G.boss.face===-1&&closerIntroPose(0).action==='seated');
  g.step(110);let line=bossIntroDialogue(G.boss,110,G.camX);
  ok('the full first line is readable before he laughs',line?.text==='YES MADAM. YOUR REFUND IS READY.'&&dialogueReveal(line.text,line.age).complete);
  const planted=Array.from({length:328},(_,t)=>closerIntroPose(t));
  ok('the seated call and the rise stay planted behind the desk',planted.every(p=>p.x===260&&p.y===216&&!p.moving));
  const walking=Array.from({length:60},(_,i)=>closerIntroPose(328+i));
  ok('the walk owns all approach motion',walking.every(p=>p.moving&&p.action==='walk')&&walking.at(-1).x<walking[0].x);
  ok('he only steps forward once clear of the desk end',Array.from({length:500},(_,t)=>closerIntroPose(t)).every(p=>p.y===216||p.x<=173));
  g.step(385);line=bossIntroDialogue(G.boss,495,G.camX);
  ok('the challenge finishes revealing before the fight',line?.text==='YOUR CALL IS IMPORTANT TO US.'&&dialogueReveal(line.text,line.age).complete);
  const before={state:G.state,t:G.boss.introT,x:G.boss.x,y:G.boss.y};
  g.render();g.render();ok('rendering does not advance the reveal',JSON.stringify(before)===JSON.stringify({state:G.state,t:G.boss.introT,x:G.boss.x,y:G.boss.y}));
  g.step(CLOSER_INTRO_TICKS-495);const natural={state:G.state,x:G.boss.x,y:G.boss.y,face:G.boss.face,hp:G.boss.hp};
  ok('combat starts with full boss health and a settled stance',natural.state==='play'&&natural.hp===600&&natural.face===-1&&G.boss.atkCd===60);
  g.indiaScene('refund','closer-intro',0);g.step(90);g.press('attack');g.step(1);g.release('attack');
  ok('skipping reaches the same position and health',JSON.stringify(natural)===JSON.stringify({state:G.state,x:G.boss.x,y:G.boss.y,face:G.boss.face,hp:G.boss.hp}));
  ok('skipping clears the sales-call bubble',!G.bossSpeech);
  const trace=()=>{g.indiaScene('refund','closer-intro',0);const rows=[];for(let t=0;t<500;t+=3){rows.push([G.boss.x,G.boss.y,G.boss.face,G.boss.introT]);g.step(3);}return JSON.stringify(rows);};
  ok('replaying every three ticks preserves staging',trace()===trace());
  return{checks};
 });
 for(const tick of [0,110,200,264,300,360,420,495]){
  await studio.load(page,'refund/closer-intro');await studio.seek(page,tick);
  for(const scale of [1,2])await studio.capture(page,path.join(out,`${tick}-${scale}x.png`),scale);
 }
 console.log(JSON.stringify({...result,errors,captures:out}));assert(result.checks.every(c=>c[1]),JSON.stringify(result.checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
 }finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
