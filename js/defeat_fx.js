// Cosmetic arcade knockouts. This local hash never consumes the combat RNG.
import { G, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { SPR, blit, frameW, frameH } from './sprites.js';
const ANIMALS=new Set(['bull','bandar','langur','macaque','dog','rat']);
const sample=(seed,n)=>{let h=Math.imul(seed^(n*374761393),668265263);h=(h^(h>>>13))>>>0;return h/4294967296;};
const isOffice=e=>/^ic_(headset|operator|thrower|lead)$/.test(e.trainType||'');

export function spawnDefeatFX(e,dir,heavy,launch){
 if(e.koFxStarted||e.kind==='prop'||e.kind==='boss')return;e.koFxStarted=true;
 const seed=e.cosmeticSeed??((Math.round(e.x*31)^Math.round(e.y*17)^Math.imul(G.rawTime|0,131))>>>0);
 const animal=ANIMALS.has(e.kind)||e.pitCd>0,strong=!!(heavy||launch||e.superApplying);
 const superHit=!!e.superApplying;
 const x=e.x,y=e.y-Math.max(0,e.z)-((superHit&&e.superImpact?.height)||(e.h||80)*.55);
 if(animal){
  for(let i=0;i<4;i++)G.effects.push({type:'koDust',x:e.x+(sample(seed,i)-.5)*14,y:e.y-3,t:0,life:22,vx:(sample(seed,i+6)-.5)*1.5,vy:-.6-sample(seed,i+12)*.5});
  return;
 }
 // Preserve the upright contact before the existing ballistic death arc. Bodies
 // already on the floor, thrown or airborne keep their authored fall pose.
 e.koUpright=e.z<5&&!['down','getup','dying','corpse','thrown'].includes(e.state);
 G.effects.push({type:'koBurst',x,y,t:0,life:strong?18:12,strong,face:dir||1});
 const probability=superHit ? 1 : strong ? .35 : .10;
 e.dismembered=!!ASSETS.arcade_fragments&&sample(seed,80)<probability;
 e.koStyle=e.dismembered?'pieces':sample(seed,81)<.45?'spin':'fall';
 const count=e.dismembered?5:strong?6:3;
 for(let i=0;i<count;i++){
  const accessory=i===0&&isOffice(e),frame=accessory?8:i===1&&e.trainType==='ic_headset'?9:10;
  G.effects.push({type:'koChunk',x,y,ground:e.y-1,t:0,life:strong?54:42,frame,
   vx:(sample(seed,i+1)-.45)*(strong?5.2:3.3)+(dir||1)*.35,vy:-2.4-sample(seed,i+11)*(strong?3.2:2),
   fragment:e.dismembered?i%4:accessory?5:null,palette:/guard|security|enforcer/.test(e.trainType||'')?'navy':/runner|operator/.test(e.trainType||'')?'rust':'cloth',
   angle:sample(seed,i+21)*Math.PI*2,spin:(sample(seed,i+31)-.5)*.35,bounced:false});
 }
 // At most eight subtle marks survive; these are drawn on the floor before bodies.
 const residues=G.effects.filter(f=>f.type==='koResidue');
 if(residues.length>=8){const old=G.effects.indexOf(residues[0]);if(old>=0)G.effects.splice(old,1);}
 G.effects.push({type:'koResidue',x:e.x+(sample(seed,70)-.5)*10,y:e.y,t:-20,life:260,strong,face:sample(seed,71)>.5?1:-1});
 // A room full of simultaneous KOs cannot leave an unbounded particle list.
 const moving=G.effects.filter(f=>f.type==='koChunk');
 for(let i=0;i<moving.length-48;i++){const at=G.effects.indexOf(moving[i]);if(at>=0)G.effects.splice(at,1);}
}

export function defeatVictimPose(e){
 if(e.dead&&e.koStyle==='spin'&&e.t>=8&&e.t<45)return {name:'down',idx:0,dx:0,dy:0,angle:e.face*Math.min(Math.PI*.85,(e.t-8)*.1),flash:false};
 if(!e.dead||!e.koUpright||e.t>=8)return null;
 return {name:e.t<2?'idle':'hurt',idx:0,dx:0,dy:0,angle:0,flash:e.t<2};
}

export function updateDefeatFX(e){
 if(e.type==='koChunk'){
  e.x+=e.vx;e.y+=e.vy;e.vy+=.22;e.angle+=e.spin;
  if(e.y>=e.ground){e.y=e.ground;e.vx*=.72;e.spin*=.5;e.vy=e.bounced?0:-Math.abs(e.vy)*.2;e.bounced=true;}
 }else if(e.type==='koDust'){e.x+=e.vx;e.y+=e.vy;e.vy+=.035;}
}
function stamp(ctx,frame,x,y,face=1,angle=0,alpha=1){
 const im=ASSETS.arcade_defeats;if(!im)return false;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.scale(face,1);ctx.globalAlpha=alpha;
 ctx.drawImage(im,frame%4*128,Math.floor(frame/4)*128,128,128,-32,-32,64,64);ctx.restore();return true;
}
export function drawDefeatFX(ctx,e,camX){
 const x=e.x-camX;
 if(e.type==='koResidue')return true;
 if(e.type==='koBurst'){
  const frame=(e.strong?4:0)+Math.min(3,Math.floor(e.t/(e.strong?4.5:3)));
  if(!stamp(ctx,frame,x,e.y,e.face,0,clamp((e.life-e.t)/3,0,1))){const f=SPR.spark[Math.min(1,e.t>>2)];blit(ctx,f,x-frameW(f)/2,e.y-frameH(f)/2);}
  return true;
 }
 if(e.type==='koChunk'&&e.fragment!=null&&ASSETS.arcade_fragments){
  ctx.save();ctx.translate(x,e.y);ctx.rotate(e.angle);ctx.globalAlpha=clamp((e.life-e.t)/12,0,1);
  if(e.fragment===0||e.fragment===1)ctx.filter=e.palette==='navy'?'brightness(.6) saturate(.7)':e.palette==='rust'?'sepia(.7) saturate(.9)':'none';
  ctx.drawImage(ASSETS.arcade_fragments,e.fragment%4*128,Math.floor(e.fragment/4)*128,128,128,-16,-16,32,32);ctx.restore();return true;
 }
 if(e.type==='koChunk'){stamp(ctx,e.frame,x,e.y,1,e.angle,clamp((e.life-e.t)/12,0,1));return true;}
 if(e.type==='koDust'){const f=SPR.dust[e.t>8?1:0];ctx.save();ctx.globalAlpha=clamp((e.life-e.t)/16,0,1);blit(ctx,f,x-frameW(f)/2,e.y-frameH(f)+2);ctx.restore();return true;}
 return false;
}
export function drawDefeatGround(ctx,camX){
 for(const e of G.effects)if(e.type==='koResidue'&&e.t>=0)stamp(ctx,11,e.x-camX,e.y,e.face,0,.48*clamp((e.life-e.t)/70,0,1));
}
