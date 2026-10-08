// Deterministic Studio capture of the escape finale (train/escape) for review.
//   NODE_PATH=... node tools/verification/finale_escape_capture.cjs [OUT] [ticks...]
// Default ticks: 700-820 every 2, plus the reaction, plant, run, roll, remote, strut and hold beats.
// Writes OUT/t-XXXX.png at 2x (960x540) and OUT/sheet_*.png contact sheets (ffmpeg tile).
const studio=require('./studio_helper.cjs'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]||'tmp/review/shera_rework/run2/escape/capture');
const ticks=process.argv.length>3?process.argv.slice(3).map(Number):[...new Set([0,120,190,200,300,330,360,380,440,450,456,462,466,472,480,490,500,508,512,516,522,528,536,546,560,600,690,716,
 ...Array.from({length:61},(_,i)=>700+i*2),830,840,850,860,880,900,934,960,1000,1040,1100,1190,1215,1259])].sort((a,b)=>a-b);
(async()=>{const {page,errors,close}=await studio.launch();try{
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 await studio.openStudio(page,'train/escape');
 const game=page.frames().find(f=>f.url().includes('/tools/review/runtime.html'));
 await game.evaluate(async()=>{const {ASSETS}=await import('./js/assets.js');for(const k of Object.keys(ASSETS).filter(k=>/finale/.test(k))){const im=ASSETS[k];if(im?.src){const r=await fetch(im.src,{cache:'reload'});const b=await r.blob();const n=new Image();n.src=URL.createObjectURL(b);await n.decode();ASSETS[k]=n;}}});
 const log=[];
 for(const t of ticks){await studio.seek(page,t);
  const s=await game.evaluate(async()=>{const {finaleState}=await import('./js/train_finale.js');const G=__game.G;G.shake=0;__game.render();const s=finaleState(G.train.cinematic.t);return {t:s.t,pose:s.pose,phase:s.phase,x:s.heroX,y:s.heroY,neta:s.neta};});
  log.push(s);await studio.capture(page,path.join(out,`t-${String(t).padStart(4,'0')}.png`),2);
 }
 fs.writeFileSync(path.join(out,'ticks.json'),JSON.stringify(log,null,0));
 const files=fs.readdirSync(out).filter(f=>f.startsWith('t-')).sort();
 for(let i=0;i<files.length;i+=20){const list=files.slice(i,i+20);const tmp=path.join(out,'list.txt');
  fs.writeFileSync(tmp,list.map(f=>`file '${path.join(out,f)}'`).join('\n'));
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',tmp,'-vf','scale=480:270,tile=4x5','-frames:v','1',path.join(out,`sheet_${String(i/20).padStart(2,'0')}.png`)]);fs.rmSync(tmp);}
 console.log(JSON.stringify({out,frames:files.length,errors}));if(errors.length)process.exitCode=1;
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1});
