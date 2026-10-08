const assert=require('node:assert/strict'),fs=require('node:fs'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'train/style-demo');
 const report=await frame.evaluate(async()=>{
  const g=__game,G=g.G,E=await import('/js/engine.js'),P=await import('/js/player.js'),U=await import('/js/style_hud.js'),A=await import('/js/assets.js'),W=await import('/js/combat_warning_update.js'),C=await import('/js/combat_cues.js'),N=await import('/js/enemies.js'),Go=await import('/js/advance_cue.js');
  const checks=[],ok=(n,v)=>checks.push([n,!!v]);const audio=G.audio,calls=[];G.audio={sfx:(...v)=>calls.push(v),voiceRandom:(...v)=>{calls.push(v);return true;}};
  G.enemies=[];G.boss=null;E.resetCombo();const score=G.score,best=G.bestCombo;let ladder=[];
  for(let n=1;n<=42;n++){E.bumpCombo();if(E.RANKS.some(r=>r.at===n))ladder.push([n,G.rank,G.rankT]);}
  ok('all seven thresholds ascend once',ladder.length===7&&ladder.every((r,i)=>r[1]===i&&r[2]===90));
  ok('presentation never adds score',G.score===score);ok('best combo and grading retained',G.bestCombo>=42&&G.grading.combo>=42);
  ok('seven generated badges loaded',E.RANKS.every(r=>A.ASSETS['style_'+r.letter.toLowerCase()]));
  const c=document.createElement('canvas');c.width=480;c.height=270;let x=c.getContext('2d');U.drawStyleRank(x);const d=x.getImageData(0,0,480,270).data;let outside=0;
  for(let y=0;y<270;y++)for(let px=0;px<480;px++)if(d[(y*480+px)*4+3]&&(px<U.STYLE_BOUNDS.x||px>=U.STYLE_BOUNDS.x+U.STYLE_BOUNDS.w||y<U.STYLE_BOUNDS.y||y>=U.STYLE_BOUNDS.y+U.STYLE_BOUNDS.h))outside++;
  ok('rank remains within compact HUD bounds',outside===0);
  Object.assign(G.player,{state:'idle',hp:100,invuln:0,z:0});G.state='play';P.hurtPlayer(G.player,1,-1,false);
  ok('damage clears count rank and expiry together',G.combo===0&&G.rank===-1&&G.comboT===0&&G.rankT===0);
  E.bumpCombo();E.bumpCombo();ok('new chain cannot inherit SSS',G.combo===2&&G.rank===-1);
  for(let i=0;i<E.COMBO_TICKS-1;i++)E.updateCombo();ok('2.5 second chain grace',G.combo===2&&G.comboT===1);E.updateCombo();ok('expiry clears rank and count',G.combo===0&&G.rank===-1);
  E.bumpCombo();G.paused=true;g.step(20);ok('pause holds combo timer',G.comboT===E.COMBO_TICKS);G.paused=false;G.hitstop=5;g.step(4);ok('hitstop holds combo timer',G.comboT===E.COMBO_TICKS);G.hitstop=0;
  G.time+=100;G.enemies=[];const e=g.spawn('nr_commando',40,0);Object.assign(e,{state:'windup',t:30,move:'lunge',cls:'counter',wind:34,x:G.camX+250,face:-1});calls.length=0;
  W.updateCombatWarnings();W.updateCombatWarnings();ok('one green sound on onset',calls.filter(a=>a[0]==='warn_parry').length===1&&e.attackCue.on);
  const n=calls.length;g.render();g.render();ok('rendering is silent',calls.length===n);
  G.time+=20;Object.assign(e,{move:'sweep',cls:'unblockable',t:1});W.updateCombatWarnings();ok('red appears at start of anticipation',N.enemyCueOn(e)&&calls.some(a=>a[0]==='warn_evade'));
  Object.assign(e,{state:'attack',t:8});ok('red persists through contact',N.enemyCueOn(e));
  Object.assign(G.player,{x:e.x-40,y:e.y,state:'idle',face:1,invuln:0});Object.assign(e,{state:'idle',hp:500,maxhp:500,z:0,dead:false});G.meter=100;E.resetCombo();E.bumpCombo();E.bumpCombo();P.startSuper(G.player);const cues=(await import('/js/boxing_combos.js')).superCues(G.player);for(let t=0;t<cues.dur;t++)P.updatePlayer(G.player);ok('Boxing Rush continues the existing chain',G.combo===2+cues.hits.length);
  const im=A.ASSETS.style_d;const clean=document.createElement('canvas');clean.width=100;clean.height=100;let cx=clean.getContext('2d');cx.drawImage(im,10,10);const before=cx.getImageData(0,0,100,100).data;
  e.attackCue={on:true,cls:'unblockable',at:G.time-8};C.drawAttackAccent(cx,im,10,10,e,'unblockable');const after=cx.getImageData(0,0,100,100).data;ok('accent ends after eight ticks; no persistent tint',before.every((v,i)=>v===after[i]));
  calls.length=0;Go.startAdvanceCue();const at=[];for(let t=0;t<230;t++){const n=calls.length;Go.updateAdvanceCue();if(calls.length>n)at.push(t);}ok('GO beeps on each SoR2 blink',String(at)==='0,32,64,96,128,160,192');ok('GO expires',G.goTimer===0&&!Go.advanceVisible());
  G.audio=audio;return {checks,ladder,goPulseTicks:at};
 });
 assert(report.checks.every(c=>c[1]),JSON.stringify(report));
 const dir='tmp/review/combat-ui';fs.mkdirSync(dir,{recursive:true});
 for(const t of [1,49,113,193,305,433,593,650,770,800]){await studio.load(page,'train/style-demo');await studio.seek(page,t);await studio.capture(page,`${dir}/style-${t}.png`,2);}
 for(const key of ['green','red']){await studio.load(page,'train/cue-'+key);for(const t of [121,125,130,142,160]){await studio.seek(page,t);await studio.capture(page,`${dir}/${key}-${t}.png`,2);}}
 await frame.evaluate(()=>{__game.indiaScene('delhi','market');Object.assign(__game.G,{goTimer:0,combo:0,rank:-1,comboT:0});__game.render();});await studio.capture(page,'tmp/review/combat-ui/go-base.png',2);
 fs.writeFileSync(`${dir}/checks.json`,JSON.stringify(report,null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,errors}));
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1});
