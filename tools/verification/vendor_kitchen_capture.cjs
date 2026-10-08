// Vendor kitchen motion capture in the actual renderer: consecutive frames of the arena (or the
// intro) at 960x540 and 480x270, plus GIFs, for reviewing animation rather than stills.
// MODE=plate|fight|dip|intro|wreck1|wreck2|wreck3|finish (plate/wreck move Pappu out of shot)  FRAMES=48 EVERY=3 FROM=0 OUT=tmp/review/kitchen
const fs=require('node:fs'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}});
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>window.__game?.G.state==='play');
 const mode=process.env.MODE||'fight',n=+(process.env.FRAMES||48),every=+(process.env.EVERY||3),from=+(process.env.FROM||0);
 const out=process.env.OUT||`tmp/review/kitchen-${mode}`;fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 const err=await page.evaluate(([mode,from])=>{try{const g=__game,G=g.G;g.indiaScene('delhi','vendor',0);const b=G.boss;G.player.invuln=1e6;
  if(mode==='intro'){G.state='bossintro';G.stateT=G.rawTime;}
  else if(mode==='finish'){G.state='play';G.enemies=[];Object.assign(G.player,{x:b.x-40,y:b.y,face:1});b.guard=0;b.hurt(99999,1,true,true);}
  else if(mode==='dip'){G.state='play';Object.assign(G.player,{x:G.camLock+150,y:228,face:1});Object.assign(b,{state:'setup-scoop',t:0,atkCd:1e9});}
  else{G.state='play';Object.assign(b,{atkCd:1e9});Object.assign(G.player,{x:G.camLock+60,y:228,face:1});
   const w=mode.match(/^(?:wreck(\d)|plate)$/);if(w){G.india.damage.kitchen=+(w[1]||0);
    // The set alone: Pappu parked out of shot; a wrecked stall has lost its kadai too.
    window.__hold=()=>{const b=G.boss;if(b)Object.assign(b,{x:G.camLock+2000,atkCd:1e9,state:'idle',t:0,spawnT:-1e6});G.player.x=G.camLock-300;G.effects=G.effects.filter(e=>e.type!=='pop');};
    if(w[1]){b.kadai.broken=true;b.kadai.hp=0;}}}
  window.__hold??=()=>{};for(let i=0;i<from;i++){g.step(1);__hold();}G.shake=0;return null;}catch(e){return String(e.stack||e);}},[mode,from]);
 if(err)throw new Error(err);
 for(let i=0;i<n;i++){
  await page.evaluate(k=>{const g=__game;for(let j=0;j<k;j++)g.step(1),__hold();__hold();g.G.shake=0;g.render();},i?every:0);
  for(const width of [960,480]){await page.setViewportSize({width,height:width*270/480});await page.locator('#game').screenshot({path:`${out}/${width}-${String(i).padStart(3,'0')}.png`});}
 }
 const py=`${__dirname}/../../.venv/bin/python`;
 execFileSync(py,['-c',`import glob,sys\nfrom PIL import Image\nfor w in (960,480):\n fs=sorted(glob.glob(sys.argv[1]+f'/{w}-*.png'));ims=[Image.open(f).convert('RGB') for f in fs]\n ims[0].save(sys.argv[1]+f'/anim-{w}.gif',save_all=True,append_images=ims[1:],duration=${Math.round(every*1000/60)},loop=0)`,out]);
 console.log(out);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
