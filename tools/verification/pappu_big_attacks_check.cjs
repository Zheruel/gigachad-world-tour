// Enlarged rebound chain, jumping with invulnerability, contact clearance and final fire reach.
const assert=require('node:assert/strict'),fs=require('node:fs'),s=require('./studio_helper.cjs');
(async()=>{const{page,errors,close}=await s.launch();try{
 await s.openStudio(page,'delhi/vendor/p3-breath');const checks=await s.game(page,async(g,G)=>{
 const {updateBoss}=await g.importModule('js/bosses.js'),{VENDOR_BREATH,vendorPose,vendorBreathRange}=await g.importModule('js/vendor_boss.js'),out=[],ok=(n,v)=>out.push([n,!!v]);
 const setup=()=>{g.indiaScene('delhi','vendor',0);g.resetInput();const b=G.boss;Object.assign(b,{phase:3,phaseTwo:true,lastOrder:true,inferno:true,mutated:true,state:'flopped',t:0,flopChain:1,x:G.camLock+180,y:226,face:-1});Object.assign(G.player,{x:G.camLock+390,y:226,z:30,vz:0,state:'jump',hp:100,invuln:8,dying:false});return b;};const tick=()=>{G.rawTime++;G.time++;updateBoss();};
 let b=setup();for(let i=0;i<16;i++)tick();ok('invulnerable jump does not cancel second flop',b.state==='flopup'&&b.chainUp&&b.flopChain===0);
 const poses=new Set();for(let i=0;i<16;i++){poses.add(vendorPose(b).join(':'));tick();}ok('rebound progresses prone press-up kneel and coil', ['flopup:2','flopup:0','flopup:1','flop_polish:0'].every(p=>poses.has(p)));ok('second flop has fresh eighteen-tick warning',b.state==='windup'&&b.t===6);
 for(let i=0;i<18;i++)tick();ok('second flight captures fresh player target',b.state==='flop'&&b.leapTo===G.camLock+390&&b.leapFrom===G.camLock+180&&b.face===1);
 for(let i=0;i<38;i++)tick();ok('double flop lands twice without rearming chain',b.state==='flopped'&&b.flopChain===0);
 b=setup();Object.assign(G.player,{state:'down',z:0});for(let i=0;i<30;i++)tick();ok('actual knockdown still cancels chain',b.state==='flopped'&&!b.chainUp&&b.flopChain===0);
 b=setup();Object.assign(b,{state:'flopup',chainUp:true,t:6});const hp=b.hp;b.hurt(10,1,true,false);ok('hit damages rebound without changing to an upright hurt pose',b.hp<hp&&b.state==='flopup'&&b.hitReactT===0);
 const fire=(phase,z=0)=>{b=setup();Object.assign(b,{phase,state:'breath',pattern:'breath',t:0,lane:226,x:G.camLock+320,face:-1});Object.assign(G.player,{x:b.x-210,y:226,z,state:'idle',hp:100,invuln:0});for(let i=0;i<24;i++)tick();return G.player.hp;};
 ok('normal fire does not reach 210 pixels',fire(2)===100);ok('final reach and low jump height remain explicit',vendorBreathRange({phase:3})===220&&VENDOR_BREATH.jump===22);
 return out;});assert(checks.every(x=>x[1]),JSON.stringify(checks.filter(x=>!x[1])));const dir='tmp/review/pappu-big-attacks';fs.mkdirSync(dir,{recursive:true});
 for(const [name,duration]of [['flop',190],['breath',75]]){await s.load(page,'delhi/vendor/'+(name==='breath'?'p3-breath':name));await s.game(page,(g,G)=>{G.player.invuln=99999;G.player.invulnFlashAfter=99999;});const marks=[];
  for(let t=0;t<=duration;t++){if(t)await s.step(page,1);const state=await s.game(page,(g,G,t)=>{const b=G.boss;if(b.state==='flop'&&b.t===1&&t<60){G.player.x=G.camLock+390;g.press('jump');}if(t===16)g.release('jump');G.shake=G.flash=G.fade=0;g.render();return[b.state,b.t,b.z,b.face];},t);marks.push([t,...state]);await s.capture(page,`${dir}/${name}-${String(t).padStart(3,'0')}.png`,2);}
  fs.writeFileSync(`${dir}/${name}-states.json`,JSON.stringify(marks));
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,frames:267,dir,errors}));
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1});
