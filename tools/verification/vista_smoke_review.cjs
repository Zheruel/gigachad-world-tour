// Night Train vista life review: before/after stills (480 + 960) across plate offsets for every scene that shows
// the river or industry vista, GIF loops at 480 and 960, plus purity/anchoring checks. GAME_URL defaults to :8011.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011',out=process.env.OUT||'tmp/review/roof_smoke';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1000,height:620}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/?auto=walk');await p.waitForFunction(()=>window.__game?.G.state==='play');
 await p.evaluate(async()=>{const {ASSETS}=await import('./js/assets.js');window.__plates={};
  for(const k of ['river','industry']){const im=new Image();im.src=`assets/sources/production/stages/night_train/rebuild/vista_${k}_plumes.png`;await im.decode();__plates[k]={after:ASSETS['nr_vista_'+k],before:im};}});
 const size=w=>p.locator('canvas').evaluate((c,w)=>Object.assign(c.style,{width:w+'px',height:w*270/480+'px',maxWidth:'none'}),w);
 const shot=async(name,widths=[480,960])=>{for(const w of widths){await size(w);await p.locator('canvas').screenshot({path:path.join(out,name+'-'+w+'.png')});}};
 const set=(o)=>p.evaluate(async o=>{const {ASSETS}=await import('./js/assets.js'),g=__game,G=g.G;
  if(o.scene)g.trainScene(o.scene,o.t||0);
  for(const k in __plates)ASSETS['nr_vista_'+k]=__plates[k][o.before?'before':'after'];
  G.train.review={...(G.train.review||{}),vistaLife:!o.before,interior:o.interior??G.train.review?.interior};
  if(o.distance!==undefined)G.train.distance=o.distance;if(o.time!==undefined)G.time=o.time;G.fade=G.flash=G.shake=0;g.render();},o);
 // Plate offsets 0/200/400/600 screen px. River: roof scenes and the private car; industry: pantry/office/AC windows.
 const scenes=[['roof',0],['boss-roof',0],['roof-transition',300],['knockout',60],['boss',0],['pantry',0],['office',0],['ac',0]];
 for(const [scene,t]of scenes)for(const off of [0,200,400,600])for(const before of [true,false]){
  await set({scene,t,before,interior:undefined,distance:off/.16,time:4000});await shot(`${scene}-o${off}-${before?'before':'after'}`);
 }
 // Whole industry plate (interior hidden) so every cleared stack can be judged.
 for(const off of [0,200,400,600])for(const before of [true,false]){await set({scene:'ac',before,interior:false,distance:off/.16,time:4000});await shot(`industry-plate-o${off}-${before?'before':'after'}`);}
 // 3 s loops at 30 fps (every other tick) with the train moving, at 480 and 2x.
 const loop=async(name,scene,interior,off,crop)=>{for(const w of [480,960]){const dir=path.join(out,`${name}-${w}`);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);
  await set({scene,interior,before:false,distance:off/.16,time:5000});await size(w);
  for(let i=0;i<90;i++){await set({distance:(off+i*2*2.6*.16)/.16,time:5000+i*2});await p.locator('canvas').screenshot({path:path.join(dir,String(i).padStart(3,'0')+'.png')});}
  const c=crop.map(v=>Math.round(v*w/960));
  execFileSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',dir+'/%03d.png','-vf',`crop=${c[0]}:${c[1]}:0:0,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=none`,path.join(out,`${name}-${w}.gif`)]);}};
 await loop('roof-loop','roof',undefined,360,[960,330]);
 await loop('roof-near-loop','roof',undefined,100,[960,330]);
 await loop('industry-loop','ac',false,200,[960,400]);
 const checks=await p.evaluate(async()=>{const {drawTrainVista}=await import('./js/train_vistas.js'),G=__game.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  const c=document.createElement('canvas');c.width=480;c.height=270;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  const tr={distance:900,vistaStage:2,vistaBlend:1},snap=JSON.stringify(tr),t0=G.time;G.time=6000;drawTrainVista(ctx,tr);const a=c.toDataURL();drawTrainVista(ctx,tr);
  ok('drawing is pure',snap===JSON.stringify(tr)&&a===c.toDataURL()&&G.time===6000);
  G.time=6030;drawTrainVista(ctx,tr);ok('smoke animates while the train stands',a!==c.toDataURL());
  // Smoke sits just above each stack mouth at every plate offset.
  const dark=(d,stage,mx,my)=>{const grab=()=>{drawTrainVista(ctx,tr);return ctx.getImageData(Math.round(mx/2-(d*.16)%810)-2,Math.round(-24+my/2)-6,5,5).data;};
   Object.assign(tr,{distance:d,vistaStage:stage,review:{vistaLife:false}});G.time=6000;const off=grab();tr.review={};const on=grab();let n=0;for(let i=0;i<on.length;i+=4)n+=on[i]!==off[i];return n;};
  ok('smoke sits on the river stack at every offset',[0,300,900,1500].every(d=>dark(d,2,561,154)>=6));
  ok('smoke sits on the industry stack at every offset',[0,300,900,1500].every(d=>dark(d,1,706,117)>=6));
  Object.assign(tr,{distance:900,vistaStage:2});tr.review={vistaLife:false};G.time=6000;drawTrainVista(ctx,tr);ok('review switch hides vista life',c.toDataURL()!==a);
  G.time=t0;return out;});
 assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,out}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
