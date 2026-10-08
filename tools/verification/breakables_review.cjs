// Break every placed stage breakable in turn and capture the sequence at 480x270 and 960x540.
// Usage: node tools/verification/breakables_review.cjs [label] (PORT env, default 8011)
// Writes tmp/review/breakables/<label>/<stage>-<n>-<kind>-<frame>-<480|960>.png plus index.json.
const fs=require('node:fs'),path=require('node:path');
const{chromium}=require('playwright');
const label=process.argv[2]||'after',port=process.env.PORT||8011,out=path.join('tmp/review/breakables',label);
(async()=>{
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:${port}/?auto=walk`);await page.waitForFunction(()=>__game?.G.state==='play');
  const plan=await page.evaluate(()=>__game.STAGES.flatMap(s=>(s.props||[]).map((d,i)=>({stage:s.id,i,kind:d.kind,x:d.x,y:d.y}))));
  const index=[];
  for(const item of plan){
   const shots=await page.evaluate(async item=>{
    const g=__game,G=g.G,{PROP_TYPES}=await import('./js/props.js'),{TRAIN_AREAS}=await import('./js/train.js'),{INDIA_AREAS}=await import('./js/india_stage.js');
    if(item.stage==='train')g.trainScene((TRAIN_AREAS.filter(a=>a[1]<=item.x).pop()||TRAIN_AREAS[0])[0]);
    else{const areas=INDIA_AREAS[item.stage];g.indiaScene(item.stage,areas[Math.min(areas.length-1,Math.floor(item.x/810))]);}
    Object.assign(G,{enemies:[],spawnQueue:[],pickups:[],zones:[],shots:[],boss:null,locked:false,waveActive:false});
    G.camX=Math.max(0,Math.min(G.camMax,item.x-240));
    const pr=G.props.find(q=>q.prop===item.kind&&q.x===item.x&&q.y===item.y);
    if(!pr)return{missing:true};
    Object.assign(G.player,{x:pr.x-pr.w*.5-18,y:pr.y,z:0,face:1,state:'idle',invuln:999});
    const shots=[],snap=name=>{G.shake=0;g.render();const c=document.querySelector('canvas'),d=document.createElement('canvas');d.width=480;d.height=270;const dc=d.getContext('2d');dc.imageSmoothingEnabled=false;dc.drawImage(c,0,0,480,270);shots.push({name,s480:d.toDataURL(),s960:c.toDataURL(),camX:G.camX,px:pr.x,py:pr.y,h:pr.h});};
    const step=n=>{for(let i=0;i<n;i++){G.player.invuln=999;G.camX=Math.max(0,Math.min(G.camMax,item.x-240));g.step(1);}};
    snap('0-idle');
    const hp=pr.hp,chip=Math.max(1,Math.floor(hp/3));
    pr.hurt(chip,1);step(2);snap('1-hit');
    pr.hurt(chip,1);step(6);
    pr.hurt(999,1);step(1);snap('2-break+1');step(3);snap('3-break+4');step(6);snap('4-break+10');step(12);snap('5-break+22');step(28);snap('6-break+50');step(60);snap('7-break+110');
    return{shots,drop:pr.drop||null,pickups:G.pickups.map(q=>q.kind),broken:pr.broken,dead:pr.dead,zones:(G.zones||[]).length};
   },item);
   if(shots.missing){index.push({...item,missing:true});continue;}
   const files=[];
   for(const s of shots.shots)for(const [k,size] of [['s480',480],['s960',960]]){const f=`${item.stage}-${String(item.i).padStart(2,'0')}-${item.kind}-${s.name}-${size}.png`;fs.writeFileSync(path.join(out,f),Buffer.from(s[k].split(',')[1],'base64'));files.push(f);}
   index.push({...item,drop:shots.drop,pickups:shots.pickups,broken:shots.broken,dead:shots.dead,zones:shots.zones,frames:shots.shots.map(s=>({name:s.name,camX:s.camX,px:s.px,py:s.py,h:s.h})),files});
  }
  fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(index,null,1));
  console.log(JSON.stringify({captured:index.length,errors},null,1));
  if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
