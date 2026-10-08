const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.GAME_URL||`http://localhost:${process.env.PORT||8011}`)+'/?auto=walk');
 await p.waitForFunction(()=>window.__game?.G.player&&window.__game.G.state!=='boot');
 await p.keyboard.press('KeyQ');
 await p.waitForFunction(()=>['badass','apocalyptic','savage','sickskills','sss'].every(k=>__game.G.audio.has('rank_'+k+'_1')&&__game.G.audio.has('rank_'+k+'_2')));
 const checks=await p.evaluate(async()=>{
  const G=__game.G,E=await import('/js/engine.js'),A=G.audio,checks=[],ok=(n,v)=>checks.push([n,!!v]);G.freezeTime=true;A.setPaused(false);A.stopSamples();
  // Exercise actual decoded samples and sources, not just calls to a mock.
  E.resetCombo();for(let i=0;i<10;i++)E.bumpCombo();for(let i=0;i<6;i++)E.updateCombo();
  ok('B speaks a B sample',G.rank===2&&A.snapshot().styleVoice.length===1&&A.snapshot().styleVoice[0].startsWith('rank_badass_'));
  for(let i=0;i<5;i++)E.bumpCombo();ok('new badge cancels the old rank immediately',G.rank===3&&A.snapshot().styleVoice.length===0);
  for(let i=0;i<6;i++)E.updateCombo();ok('A replaces B without unrelated speech',A.snapshot().styleVoice.length===1&&A.snapshot().styleVoice[0].startsWith('rank_apocalyptic_'));
  E.resetCombo();ok('lost combo cancels rank speech',A.snapshot().styleVoice.length===0&&G.rankVoiceT===0);
  for(let i=0;i<40;i++)E.bumpCombo();for(let i=0;i<6;i++)E.updateCombo();ok('multi-target climb announces only final SSS',G.rank===6&&A.snapshot().styleVoice.length===1&&A.snapshot().styleVoice[0].startsWith('rank_sss_'));
  ok('dialogue takes priority over style speech',A.voice('duke_ride',2100,true)&&A.snapshot().styleVoice.length===0&&A.snapshot().voices===1);
  ok('busy dialogue drops rank speech without a substitute',!A.styleVoice(['rank_savage_1','rank_savage_2'])&&A.snapshot().styleVoice.length===0&&A.snapshot().voices===1);
  E.resetCombo();ok('combo reset preserves dialogue',A.snapshot().voices===1);
  A.stopSamples();ok('cooldown produces silence, not a random quote',!A.styleVoice(['rank_sss_1','rank_sss_2'])&&A.snapshot().samples===0);
  A.setPaused(true);ok('paused audio cannot start a rank announcement',!A.styleVoice(['rank_savage_1','rank_savage_2']));A.setPaused(false);
  // Simulation timing: same-tick thresholds coalesce; damage and expiry cannot
  // leave a deferred rank waiting to speak in the next chain.
  const calls=[],real=G.audio;G.audio={stopStyleVoice(){},styleVoice(names){calls.push([G.rank,...names]);return true;}};
  E.resetCombo();for(let i=0;i<30;i++)E.bumpCombo();for(let i=0;i<5;i++)E.updateCombo();ok('six-tick settling avoids chopped rapid milestones',calls.length===0);E.updateCombo();
  ok('settled SS emits only matching SS variants',calls.length===1&&calls[0][0]===5&&calls[0].slice(1).every(n=>n.startsWith('rank_sickskills_')));
  E.resetCombo();for(let i=0;i<15;i++)E.bumpCombo();E.resetCombo();for(let i=0;i<10;i++)E.updateCombo();ok('reset discards pending announcements',calls.length===1);
  E.resetCombo();for(let i=0;i<22;i++)E.bumpCombo();G.comboT=1;E.updateCombo();ok('expiry discards pending announcements',G.rankVoiceT===0&&calls.length===1);
  G.audio=real;A.stopSamples();E.resetCombo();return checks;
 });
 assert(checks.every(x=>x[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);
 fs.mkdirSync('tmp/review/combat-ui',{recursive:true});fs.writeFileSync('tmp/review/combat-ui/style-audio-check.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
