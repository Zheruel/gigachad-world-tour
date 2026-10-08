const KEYS={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'attack',KeyJ:'attack',KeyX:'jump',KeyK:'jump',KeyC:'parry',KeyL:'parry',KeyV:'super',KeyB:'super',Space:'super',KeyF:'use',KeyE:'use',KeyP:'pause',Enter:'pause',Escape:'pause',Backspace:'back'};
const PAD={0:'attack',1:'jump',2:'parry',3:'super',4:'use',5:'super',6:'use',7:'super',8:'back',9:'pause',12:'up',13:'down',14:'left',15:'right'};
export async function createController(frame,onChange){
 await new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(frame.contentWindow?.__game?.G.state!=='boot'&&frame.contentWindow?.__game?.G.player){clearInterval(timer);resolve();}else if(++n>1200){clearInterval(timer);reject(Error('The game did not finish loading. Reload to retry.'));}},100);});
 const w=frame.contentWindow,game=w.__game;game.window=w;game.importModule=path=>w.eval(`import(${JSON.stringify(new URL(path.replace(/^\//,''),new URL('../../',import.meta.url)).href)})`);
 game.G.freezeTime=true;game.resetInput();
 let scenario=null,tick=0,playing=false,silent=true,muted=false,rng=541,audioRng=991,seed=541,speed=1,settings={layers:{}},trace=new Map(),head=0,busy=false,disposed=false,desiredMusic=null;
 const held=new Set(),physical=new Set(),padHeld=new Set();let queue=[];
 const next=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const withRng=fn=>{const prev=w.Math.random;w.Math.random=next;try{return fn();}finally{w.Math.random=prev;}};
 const audio=game.G.audio,original={...audio};

 for(const [name,fn]of Object.entries(original))if(typeof fn==='function')audio[name]=function(...args){
  if(name==='music')desiredMusic=args[0];
  if((silent||muted)&&!['stopSamples','stopStyleVoice','snapshot','stopRoomAudio','stopTravel','stopEntranceBike','setPaused','tracks','has'].includes(name))return false;
  if(name==='setPaused'&&(silent||muted))args=[true];
  const prev=w.Math.random;w.Math.random=()=>{audioRng=(Math.imul(audioRng,1664525)+1013904223)>>>0;return audioRng/4294967296;};
  try{return fn.apply(audio,args);}finally{w.Math.random=prev;}
 };
 const stopAudio=()=>{original.stopSamples?.();original.stopRoomAudio?.();original.stopTravel?.();original.stopEntranceBike?.();original.setPaused?.(true);};
 function resetInputs(record=false){game.resetInput();held.clear();physical.clear();padHeld.clear();queue=[];if(record){const events=trace.get(tick)||[];events.push({type:'reset'});trace.set(tick,events);}}
 function pause(){playing=false;game.G.freezeTime=true;resetInputs(true);original.setPaused?.(true);onChange?.(true);}
 function applyEvent(e){if(e.type==='action'){scenario.actions?.[e.key]?.();}else if(e.type==='reset'){game.resetInput();held.clear();}else if(e.type==='press'){if(!held.has(e.action)){game.press(e.action);held.add(e.action);}}else if(e.type==='release'){game.release(e.action);held.delete(e.action);}else if(e.type==='pointer'){const c=w.document.querySelector('canvas'),r=c.getBoundingClientRect(),ev=new w.PointerEvent('pointerdown',{bubbles:true,button:0,clientX:r.left+e.x,clientY:r.top+e.y});Object.defineProperty(ev,'reviewReplay',{value:true});c.dispatchEvent(ev);}}
 async function initialize(){silent=true;desiredMusic=null;stopAudio();resetInputs();rng=seed;audioRng=991;Object.assign(game.G,{rawTime:0,time:0,stateT:0,paused:false,freezeTime:true});
  // Loaders can await modules; keep seeded initialization scoped until completed.
  const prev=w.Math.random;w.Math.random=next;try{await scenario.load(settings);}finally{w.Math.random=prev;game.G.freezeTime=true;}
  tick=0;scenario.applySettings?.(settings);game.render();
 }
 async function load(nextScenario,nextSettings={}){if(busy)throw Error('A scenario is already loading');busy=true;playing=false;try{scenario=nextScenario;settings={layers:{},...nextSettings};seed=Number(settings.seed??541)>>>0;trace=new Map();head=0;await initialize();}finally{busy=false;silent=false;onChange?.(true);}}
 function advance(replay=false){const events=replay?(trace.get(tick)||[]):queue.splice(0);if(tick>=head&&scenario.scriptedInput){const scripted=new Set(scenario.scriptedInput(tick,settings)||[]);for(const a of ['left','right','parry']){if(scripted.has(a)&&!held.has(a))events.push({type:'press',action:a});else if(!scripted.has(a)&&held.has(a)&&!physical.has(a)&&!padHeld.has(a))events.push({type:'release',action:a});}}if((!replay||tick>=head)&&events.length){if(tick<head){for(const key of trace.keys())if(key>=tick)trace.delete(key);head=tick;}trace.set(tick,[...(trace.get(tick)||[]),...events]);}
  // Reuse recorded inputs until a new input branches the session.
  const list=!replay&&!events.length&&tick<head?(trace.get(tick)||[]):events;for(const e of list)applyEvent(e);
  withRng(()=>{scenario.beforeStep?.(tick,settings);game.step(1);});tick++;head=Math.max(head,tick);
 }
 async function seek(value){if(!scenario||busy)return;const target=Math.max(0,Math.floor(Number(value)||0));busy=true;playing=false;try{await initialize();for(let i=0;i<target;i++){advance(true);if(i&&i%1200===0)await new Promise(r=>setTimeout(r,0));}game.render();physical.clear();padHeld.clear();queue=[];}finally{silent=false;busy=false;onChange?.(true);}}
 async function step(n){if(!scenario||busy||!n)return;if(n<0)return seek(tick+n);playing=false;original.setPaused?.(true);silent=true;try{for(let i=0;i<n;i++)advance(queue.length===0);game.render();}finally{silent=false;onChange?.(true);}}
 async function restart(){trace=new Map();head=0;await seek(0);}
 function play(){if(!scenario||busy)return;playing=true;silent=false;game.G.freezeTime=true;original.unlock?.();if(!muted){original.music?.(desiredMusic);original.setPaused?.(false);}frame.focus();onChange?.(true);}
 async function setSettings(value){const next={...settings,...value,layers:{...settings.layers,...value.layers}};if(['routeX','motion','seed'].some(k=>k in value&&value[k]!==settings[k]))return load(scenario,next);settings=next;scenario?.applySettings?.(settings);game.render();onChange?.(true);}
 function snapshot(){const G=game.G,simple=a=>a?{x:a.x,y:a.y,z:a.z,hp:a.hp,state:a.state,t:a.t,guard:a.guard,phase:a.phase,pattern:a.pattern}:null;return{scenarioId:scenario?.id,tick,playing,busy,seed,music:desiredMusic,settings:structuredClone(settings),replayFrames:head,engine:{stage:G.stage?.id,state:G.state,rawTime:G.rawTime,time:G.time,camX:G.camX,score:G.score,meter:G.meter,player:simple(G.player),boss:simple(G.boss),enemies:G.enemies.map(simple),props:G.props.map(p=>({x:p.x,hp:p.hp,broken:p.broken})),effects:G.effects.length}};}
 function handleInput(e){if(!playing||busy)return;const d=e.detail;if(d.type==='pointerdown'){queue.push({type:'pointer',x:d.x,y:d.y});return;}const action=KEYS[d.code];if(!action)return;if(d.type==='keydown'){if(!physical.has(action)){physical.add(action);queue.push({type:'press',action});}}else{physical.delete(action);if(!padHeld.has(action))queue.push({type:'release',action});}}
 window.addEventListener('review-input',handleInput);
 const onBlur=()=>{if(playing){resetInputs(true);onChange?.(true);}};window.addEventListener('blur',onBlur);
 function pollPad(){const seen=new Set();if(document.activeElement===frame)for(const p of navigator.getGamepads?.()||[]){if(!p?.connected)continue;for(const [i,a]of Object.entries(PAD))if(p.buttons[i]?.pressed||p.buttons[i]?.value>.5)seen.add(a);const[x=0,y=0]=p.axes;if(x<-.4)seen.add('left');if(x>.4)seen.add('right');if(y<-.4)seen.add('up');if(y>.4)seen.add('down');}for(const a of seen)if(!padHeld.has(a)&&!physical.has(a))queue.push({type:'press',action:a});for(const a of padHeld)if(!seen.has(a)&&!physical.has(a))queue.push({type:'release',action:a});padHeld.clear();for(const a of seen)padHeld.add(a);}
 let last=performance.now(),acc=0;function animate(now){if(disposed)return;const dt=Math.min(100,now-last);last=now;if(playing&&!busy){pollPad();acc+=dt*speed;while(acc>=1000/60){advance();acc-=1000/60;}game.render();onChange?.(false);}else acc=0;requestAnimationFrame(animate);}requestAnimationFrame(animate);
 return{game,load,play,pause,deactivate:()=>{pause();stopAudio();},restart,seek,step,snapshot,setSettings,invokeAction:async key=>{queue.push({type:'action',key});await step(1);},setSpeed:v=>speed=Number(v)||1,setMuted:v=>{muted=!!v;if(!muted)original.music?.(desiredMusic);original.setPaused?.(muted||!playing);},get scenario(){return scenario;},capture:()=>w.document.querySelector('canvas').toDataURL('image/png'),dispose(){disposed=true;stopAudio();resetInputs();window.removeEventListener('review-input',handleInput);window.removeEventListener('blur',onBlur);Object.assign(audio,original);},input:(action,down)=>queue.push({type:down?'press':'release',action})};
}
