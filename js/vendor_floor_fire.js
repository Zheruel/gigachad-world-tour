// The last order's sustained inferno: one randomly placed chopping block is real raised cover.
import {G,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {spawnDust,spawnDebris} from './effects.js';
import {fx} from './fx.js';
import {blit,frameW,frameH} from './sprites.js';
import {getAIFrame} from './aiframes.js';
import {SPEW_MOUTH} from './vendor_floor_registration.js';
// Breath clock: a lazy smoulder (smoke, drips and a small fire at his feet: the street only catches on the slam), the rage roar and slam, the fire breeding into pillars, the nova and the
// screen-filling wall, then the collapse. Damage keeps one rule throughout: grounded CHAD burns, raised cover is safe.
export const FLOOR_FIRE=Object.freeze({wind:162,drop:16,land:44,ignite:124,sweep:40,rage:90,roar:96,slam:120,breed:130,ramp:130,nova:262,engulf:266,full:292,collapse:362,burn:400,end:440,height:26,width:64,damage:16,repeatDamage:8,burnGrace:45,recovery:54});
const active=b=>b&&!b.dead&&b.mutated&&b.pattern==='breath'&&['windup','breath'].includes(b.state);
export function prepareFloorFire(b){
 const cam=G.camLock??G.camX,p=G.player,slots=[60,80,110,140,170,200,230,260,290,320,350,380,410,440,450];
 let available=slots.filter(x=>Math.abs(cam+x-b.x)>=78&&Math.abs(cam+x-p.x)<=180);
 if(!available.length)available=slots.filter(x=>Math.abs(cam+x-b.x)>=78).sort((x,y)=>Math.abs(cam+x-p.x)-Math.abs(cam+y-p.x)).slice(0,1);
 const fresh=available.filter(x=>x!==b.lastRefugeX);if(fresh.length)available=fresh;
 const x=available[Math.floor(Math.random()*available.length)];b.lastRefugeX=x;
 b.floorFire={born:G.time,cam,origin:b.x+b.face*66,hit:false,nextHitAt:0,retire:null,blocks:[{x:cam+x,y:234,i:0,landed:false,height:FLOOR_FIRE.height,width:FLOOR_FIRE.width}]};
}
const F=FLOOR_FIRE,ease=q=>{q=clamp(q,0,1);return q*q*(3-2*q);},hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function infernoIntensity(t){return (t<F.breed?.28*clamp((t-6)/(F.breed-6),0,1):mix(.28,1,(t-F.breed)/(F.nova-F.breed)))*clamp((F.burn-t)/18,0,1);}
const mix=(a,b,q)=>a+(b-a)*clamp(q,0,1);
// How much of the screen the wall fills (0..1), and the roar's flare (1 on the roar, decaying).
export function infernoEngulf(t){return t<F.engulf?0:t<F.full?ease((t-F.engulf)/(F.full-F.engulf)):t<F.collapse?1:1-Math.pow(clamp((t-F.collapse)/(F.burn-F.collapse-2),0,1),1.4);}
const roarFlare=t=>t<F.roar?0:Math.max(0,1-(t-F.roar)/22)+(t>=F.slam+2?Math.max(0,1-(t-F.slam-2)/14):0);
// The breeding fire: the slam cracks the street and pillars burst out of the cracks in waves that double
// and march outward toward the edges; after the nova they erupt anywhere.
const PILLAR_LIFE=24,WAVE=16;
function pillars(a,b,cam){
 const out=[],block=a.blocks[0]?.x??-999,o=a.origin;let k=0;
 const add=(at,x,s,w)=>{if(Math.abs(x-block)<44)x+=x<block?-44:44;out.push({at,x,s,w});k++;};
 for(let n=0;n<8;n++){const at=F.slam+2+n*WAVE,count=Math.min(10,2**Math.floor(n*.75));
  for(let j=0;j<count;j++){const side=j%2?1:-1,d=46+n*30+hash(a.born+k*1.7)*60;add(at+Math.floor(hash(k+a.born*.3)*5),o+side*d,.55+hash(k*2.3)*.8,.8+hash(k*5.1)*.7);}}
 for(let at=F.nova-4;at<F.collapse;at+=5)add(at,cam+20+hash(a.born*.13+k)*440,.8+hash(k*3.1+a.born)*.6,.9+hash(k)*.6);
 return out;
}
function drawPillar(ctx,q,t,camX,alpha=1){
 const im=ASSETS.dv_inferno_pillar,age=t-q.at;if(!im||age<0||age>=PILLAR_LIFE)return;const cell=age<4?0:age<10?1:age<18?2:3,w=48*q.s*q.w,h=160*q.s;
 ctx.save();ctx.globalAlpha=alpha*(age>20?(PILLAR_LIFE-age)/4:1);ctx.drawImage(im,cell*96,0,96,320,Math.round(q.x-camX-w/2),Math.round(240-h),Math.round(w),Math.round(h));ctx.restore();
}
// Glowing cracks racing out from the slam along the street.
function drawCracks(ctx,a,t,camX){
 const age=t-F.slam-2;if(age<0||t>=F.burn)return;const reach=Math.min(520,age*14),o=a.origin-camX,fade=clamp((F.burn-t)/20,0,1);
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let c=0;c<6;c++){const side=c%2?1:-1;let x=o,y=230+c*1.5;ctx.beginPath();ctx.moveTo(x,y);
  const slope=[-.05,.04,.1,.16,-.1,.22][c];y=232;ctx.moveTo(x,y);
  for(let i=1;i<40;i++){const nx=o+side*i*13;if(Math.abs(nx-o)>reach)break;y=232+i*13*slope+(hash(c*40+i+a.born)-.5)*6;ctx.lineTo(nx,y);}
  ctx.strokeStyle=`rgba(255,90,20,${.5*fade})`;ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle=`rgba(255,170,60,${.9*fade})`;ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=`rgba(255,250,215,${fade})`;ctx.lineWidth=1.5;ctx.stroke();}
 ctx.restore();
}
// The wall: two painted full-screen variants swapped and swayed so its seams never show.
function drawWall(ctx,t,k,clipTop=0,alpha=1){
 const im=ASSETS.dv_inferno_wall;if(!im||k<=0)return;const h=300*k*(1+.035*Math.sin(t*.45)),v=(t>>2)&1,sway=Math.sin(t*.07)*24;
 ctx.save();if(clipTop){ctx.beginPath();ctx.rect(0,clipTop,480,270-clipTop);ctx.clip();}ctx.globalAlpha=alpha;
 ctx.drawImage(im,0,v*540,960,540,Math.round(-40+sway),Math.round(272-h),560,Math.round(h));ctx.restore();
}
export function updateFloorFire(b,hit){
 const a=b.floorFire;if(!a)return;
 const age=G.time-a.born;
 for(const q of a.blocks)if(!q.landed&&age>=FLOOR_FIRE.land){q.landed=true;spawnDust(q.x,q.y,6);spawnDebris(q.x,q.y,3,['#745235','#ad8151','#39291e']);G.shake=Math.max(G.shake,4);G.audio.roomSfx?.('break_wood',.28);}
 if(!active(b)&&a.retire===null)a.retire=G.time+42;
 if(a.retire!==null&&!a.crumbling&&G.time>=a.retire-12){a.crumbling=true;for(const q of a.blocks){spawnDust(q.x,q.y,5);spawnDebris(q.x,q.y-12,8,['#67452d','#976b3d','#33261d']);}G.audio.roomSfx?.('break_wood',.35);}
 if(a.retire!==null&&G.time>=a.retire){b.floorFire=null;return;}
 if(b.state==='breath'){
  const power=infernoIntensity(b.t);G.audio.roomLoop?.('vendor_flame_bed',.08+power*.3);
  if(b.t>=FLOOR_FIRE.ignite&&b.t<FLOOR_FIRE.burn&&b.t%10===0)G.shake=Math.max(G.shake,1+power*2);
  const t=b.t,sfx=(n,v)=>G.audio.roomSfx?.(n,v);
  if(t===F.ignite){G.shake=Math.max(G.shake,3);sfx('train_blast',.2);}
  if(t===F.roar){G.shake=Math.max(G.shake,10);G.flash=1;sfx('vendor_roar_last',.9);sfx('train_blast',.35);}
  if(t===F.slam+2){G.shake=Math.max(G.shake,9);sfx('heavy',.7);sfx('finale_blast_a',.55);}
  if(t>F.breed&&t<F.nova&&t%14===0)sfx('vendor_bump_whoosh',.18+.2*(t-F.breed)/(F.nova-F.breed));
  if(t===F.nova){G.shake=Math.max(G.shake,14);G.flash=2;sfx('finale_blast_big',.8);sfx('vendor_roar_spicy',.7);}
  if(t===F.engulf+4)sfx('train_blast',.6);
  if(t===F.collapse)sfx('finale_blast_b',.3);
 }
 if(b.state!=='breath'||b.t<FLOOR_FIRE.ignite||b.t>=FLOOR_FIRE.burn||G.time<a.nextHitAt)return;
 const p=G.player,r=(b.t-FLOOR_FIRE.ignite+1)*480/FLOOR_FIRE.sweep;if(p.invuln>0)return;
 // Airborne CHAD and raised cover are always safe; no flame tongue adds another hitbox.
 if(Math.abs(p.x-a.origin)>r||p.z>0||p.state==='jump'||p.state==='jumpkick'||playerRefugeLift(p)>0||G.time<(p.refugeGraceUntil||0))return;
 if(hit(a.hit?FLOOR_FIRE.repeatDamage:FLOOR_FIRE.damage)){a.hit=true;a.nextHitAt=G.time+FLOOR_FIRE.burnGrace;}
}
export function playerRefugeLift(p){const q=p.vendorPlatform,b=G.boss;return q&&b?.floorFire?.blocks.includes(q)&&!b.dead&&!G.india?.cinematic?q.height:0;}
export function updatePlayerRefuge(p,previousZ){
 const b=G.boss,a=b?.floorFire,valid=!!a&&!b.dead&&!G.india?.cinematic;
 const q=p.vendorPlatform;
 if(q&&(!valid||!a.blocks.includes(q)||Math.abs(p.x-q.x)>q.width/2-5||p.y<213||p.y>234||p.dying||p.state==='down'||p.state==='special'||p.state==='parry_counter')){
  p.vendorPlatform=null;
  if(b&&!b.dead&&!G.india?.cinematic&&!p.dying&&!['down','special','parry_counter'].includes(p.state)){p.z+=q.height;if(!['jump','jumpkick'].includes(p.state)){p.state='jump';p.t=0;p.vz=0;}p.refugeGraceUntil=G.time+6;}
 }
 if(p.vendorPlatform||!valid||!['jump','jumpkick'].includes(p.state)||p.vz>=0)return;
 for(const block of a.blocks){if(!block.landed||Math.abs(p.x-block.x)>block.width/2-5||p.y<213||p.y>234)continue;
  if(previousZ>=block.height&&p.z<=block.height){p.vendorPlatform=block;p.z=p.vz=p.vx=0;p.state='idle';p.t=0;G.audio.sfx('land');spawnDust(p.x,p.y-block.height,2);break;}
 }
}
function drawBlock(ctx,q,age,camX,alpha){
 if(age<FLOOR_FIRE.drop)return;const im=ASSETS.dv_refuge_block,t=clamp((age-FLOOR_FIRE.drop)/(FLOOR_FIRE.land-FLOOR_FIRE.drop),0,1),fall=(1-t*t)*190;
 ctx.save();ctx.globalAlpha=alpha;if(age>FLOOR_FIRE.wind)ctx.filter=`brightness(${Math.max(.55,1-(age-FLOOR_FIRE.wind)/220)})`;
 if(im)ctx.drawImage(im,Math.round(q.x-camX-q.width/2),Math.round(q.y-47-fall),q.width,47);
 else {ctx.fillStyle='#715037';ctx.fillRect(q.x-camX-q.width/2,q.y-q.height-fall,q.width,q.height);}
 ctx.restore();
}
export function drawFloorFire(ctx,b,camX){
 const a=b.floorFire;if(!a||G.reflecting)return;const age=G.time-a.born,alpha=a.retire!==null?clamp((a.retire-G.time)/12,0,1):1;
 if(b.state==='windup'&&b.pattern==='breath'){
  ctx.save();ctx.globalAlpha=.12+.06*Math.sin(G.time*.3);ctx.fillStyle='#ff5a20';ctx.fillRect(0,210,480,28);ctx.restore();
  
 }
 if(b.state==='windup')for(const q of a.blocks)if(!q.landed){ctx.save();ctx.globalAlpha=.5+.25*Math.sin(G.time*.25);ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x-camX,q.y,q.width/2,5,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 // Smoulder: before the slam only a small fire burns where his breath meets the street.
 if(b.state==='breath'&&b.t>=8&&b.t<F.ignite+4&&ASSETS.dv_floor_wave){const t=b.t,im=ASSETS.dv_floor_wave,h=im.height/4,w=Math.min(76,20+t*.9),fh=(9+5*Math.sin(t*.3))*(t<F.rage?1:t<F.slam?.6:1.4);
  ctx.save();ctx.globalAlpha=t>=F.ignite?1-(t-F.ignite)/4:.9;ctx.drawImage(im,(t>>2)%2*240,((t>>3)%4)*h,480,h,Math.round(a.origin-camX-w/2),Math.round(238-fh),Math.round(w),Math.round(fh));ctx.restore();}
 const burning=b.state==='breath'&&b.t>=F.ignite;
 if(b.state==='breath'&&b.t>=F.collapse){// the burnt-out street smokes while the last embers settle
  const q=clamp((b.t-F.collapse)/20,0,1)*clamp((F.end-b.t)/30,0,1);ctx.save();
  for(let i=0;i<14;i++){const age=(b.t*.8+i*9)%40,x=(hash(i+a.born)*480+Math.sin(age*.1+i)*6),y=236-age*2.2,r=4+age*.45;ctx.globalAlpha=q*.22*(1-age/40);ctx.fillStyle=i%3?'#3a302c':'#5a4a40';ctx.beginPath();ctx.arc(Math.round(x),Math.round(y),r,0,Math.PI*2);ctx.fill();}
  ctx.restore();}
 if(burning){
  const t=b.t,r=Math.min(500,(t-F.ignite+1)*480/F.sweep),fade=clamp((F.end-t)/34,0,1),power=infernoIntensity(t),flare=roarFlare(t),eng=infernoEngulf(t),origin=a.origin-camX,im=ASSETS.dv_floor_wave;
  // The street sinks into a dark red night as the fire takes over.
  const night=t<F.breed?.12*flare:clamp((t-F.breed)/110,0,1)*.45*clamp((F.burn+10-t)/30,0,1);
  if(night>0){ctx.fillStyle=`rgba(40,4,2,${night})`;ctx.fillRect(0,0,480,270);}
  if(eng>0){const g=ctx.createLinearGradient(0,0,0,270);g.addColorStop(0,`rgba(20,0,0,${.85*eng})`);g.addColorStop(1,`rgba(120,20,0,${.85*eng})`);ctx.fillStyle=g;ctx.fillRect(0,0,480,270);}
  drawWall(ctx,t,eng);
  // the nova's fireball blooms behind the actors, so CHAD on his cover stands out against it
  drawNova(ctx,t,b.x-camX,b.y-60);
  // a dark smoke halo behind him so his body reads against the wall
  if(eng>0){const hx=b.x-camX,hy=b.y-70,g=ctx.createRadialGradient(hx,hy,10,hx,hy,90);g.addColorStop(0,`rgba(30,4,0,${.55*eng})`);g.addColorStop(1,'rgba(30,4,0,0)');ctx.fillStyle=g;ctx.fillRect(hx-90,hy-90,180,180);}
  // Smoulder: low and lazy. Each stage after the roar burns taller and faster.
  const height=(t<F.breed?mix(40,34,(t-F.ignite)/4):34+66*power)*(1+.5*flare)*(.96+.04*Math.sin(t*.37))*fade*fade,rate=power>.7?2:3;
  ctx.save();ctx.globalAlpha=fade;ctx.beginPath();ctx.rect(origin-r,100,r*2,145);ctx.clip();
  if(im){const h=im.height/4,i=Math.floor(t/rate)%4;ctx.drawImage(im,0,i*h,im.width,h,0,239-height,480,height);}
  else for(let x=0;x<480;x+=24){const f=fx('flame',(G.time>>2)+(x>>4));if(f)blit(ctx,f,x-frameW(f)/2,235-frameH(f));}
  ctx.restore();
  drawCracks(ctx,a,t,camX);
  for(const q of pillars(a,b,a.cam))drawPillar(ctx,q,t,camX,1-eng*.5);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(.05+power*.14+flare*.12)*fade;ctx.fillStyle='#ff8025';ctx.fillRect(0,100,480,140);ctx.restore();
 }
 for(const q of a.blocks)drawBlock(ctx,q,age,camX,alpha);
 
}
export function floorSpewCell(t){return t<34?1:t<60?2:t<F.breed?3:t<F.burn-26?4+Math.floor(t/(t<F.nova?4:3))%2:t<F.burn?6:7;}
// The rage: he rises out of the exhale, roars with fire pouring off him, and slams back down into it.
// He holds the roar, arms wide, through the nova and the whole wall, then slumps back into the exhale.
// (rising, the hunched flame pose leads into the upright one; out of the roar he folds through 3 into the slump)
export const infernoRoarCell=t=>t>=F.rage&&t<F.breed?(t<F.rage+3?2:t<F.roar?0:t<F.slam?1:t<F.slam+3?3:2):t>=F.nova-6&&t<F.collapse+10?(t<F.nova-3?2:t<F.nova?0:t<F.collapse?1:t<F.collapse+4?3:2):-1;
export function groundFireGeometry(b){
 const cell=floorSpewCell(b.t),mouth=getAIFrame('ic_vendor','demon_floor_spew')?SPEW_MOUTH[cell]:[37,-60],recoil=(b.t>>2)&1;
 const x=b.x+b.face*(mouth[0]+recoil),y=Math.round(b.y-(b.z||0))+mouth[1],dx=66-mouth[0]-recoil,dy=b.y+7-y;
 return {cell,x,y,angle:Math.atan2(dy,dx),length:Math.hypot(dx,dy),impact:[b.x+b.face*66,b.y+7]};
}
// Painted inlet coordinates, measured from the opaque leading pixel of each 176px row.
export const FIRE_INLET=[[7,54.5],[7,54.5],[7,54.5],[7,53.5]];
export function groundJetRect(length,height,frame){
 const [x,y]=FIRE_INLET[frame],sx=length/(438-x),sy=height/176;
 return {x:-x*sx,y:-y*sy,width:480*sx,height};
}
export function drawGroundExhale(ctx,b,camX){
 if(b.superLocked||b.state!=='breath'||b.t<6||b.t>=FLOOR_FIRE.burn||infernoRoarCell(b.t)>=0)return;const im=ASSETS.dv_inferno_breath;if(!im)return;
 const t=b.t,h=im.height/4,f=(t>>1)%4,power=infernoIntensity(t),fade=clamp((FLOOR_FIRE.burn-t)/18,0,1),height=b.t<F.rage?7+4*clamp((b.t-6)/20,0,1):(12+34*power)*(b.t<F.breed+6?mix(1.6,1,(b.t-F.breed)/6):1);
 // The painted jet hits the ground at his feet; the separate rolling floor layer spreads outward.
 const q=groundFireGeometry(b),r=groundJetRect(q.length,height,f);ctx.save();ctx.translate(q.x-camX+Math.round(b.x-camX)-(b.x-camX),q.y);ctx.scale(b.face,1);ctx.rotate(q.angle);ctx.globalAlpha=fade;ctx.drawImage(im,0,f*h,im.width,h,r.x,r.y,r.width,r.height);ctx.restore();
}
// Presentation only, over the actors: the roar's heat, the nova, the front of the wall licking round the
// cover's foot (CHAD on it stays readable) and the raging frame. No collision areas.
export function infernoBorderPower(t){return clamp((t-F.breed-8)/40,0,1)*clamp((F.burn-t)/18,0,1);}
function drawNova(ctx,t,x,y,lo=0,hi=5){
 const im=ASSETS.dv_inferno_nova,age=t-F.nova,at=[0,2,5,9,14,20,28];if(!im||age<0||age>=at[6])return;let i=0;while(age>=at[i+1])i++;if(i<lo||i>hi)return;
 const w=[120,200,270,330,380,420][i];ctx.save();ctx.globalAlpha=i===5?1-(age-at[5])/8:1;const c=im.height;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(im,i*c,0,c,c,Math.round(x-w/2),Math.round(y-w/2),w,w);ctx.restore();
}
export function drawInfernoFrame(ctx){
 const b=G.boss;if(!b||b.key!=='vendor'||b.dead||!b.mutated||b.state!=='breath'||G.india?.cinematic||G.india?.review?.fx===false)return;
 const t=b.t,camX=G.camX,bx=b.x-camX,by=b.y-60,flare=roarFlare(t),eng=infernoEngulf(t);
 ctx.save();ctx.setTransform(ctx.canvas.width/480,0,0,ctx.canvas.height/270,0,0);
 if(flare>0){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(bx,by,4,bx,by,260);g.addColorStop(0,`rgba(255,210,120,${.32*flare})`);g.addColorStop(.4,`rgba(255,90,20,${.16*flare})`);g.addColorStop(1,'rgba(255,40,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,480,270);ctx.restore();}
 // Embers thicken with the fire and pour upward through the whole frame.
 const n=Math.round(infernoIntensity(t)*46+flare*20);ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<n;i++){const sp=.8+hash(i)*1.6,yy=270-((t*sp*2+hash(i+7)*300)%300),xx=hash(i+3)*480+Math.sin(t*.05+i)*10;ctx.fillStyle=i%4?'#ffb040':'#fff0b0';ctx.globalAlpha=.85;ctx.fillRect(Math.round(xx),Math.round(yy),i%3?1:2,2);}
 ctx.restore();
 // (feathered in strips so the front flames have no hard top edge)
 for(const y of [222,230,238])drawWall(ctx,t+2,eng,y,.4);
 if(eng>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.16*eng;ctx.fillStyle='#ff6a1c';ctx.fillRect(0,0,480,270);ctx.restore();}
 // the fire lights everything from below
 const under=Math.max(eng,infernoIntensity(t)*.5);if(under>0){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createLinearGradient(0,140,0,270);g.addColorStop(0,'rgba(255,90,20,0)');g.addColorStop(1,`rgba(255,120,30,${.3*under})`);ctx.fillStyle=g;ctx.fillRect(0,140,480,130);ctx.restore();}
 if(t>=F.nova&&t<F.nova+3){ctx.fillStyle=`rgba(255,246,222,${[.95,.5,.2][t-F.nova]})`;ctx.fillRect(0,0,480,270);}
 const power=infernoBorderPower(t),im=ASSETS.dv_floor_wave;if(im&&power>0){
  const h=im.height/4,i=Math.floor(t/2)%4,thickness=(6+22*power)*(1+.4*eng);
  const band=(length)=>ctx.drawImage(im,0,i*h,im.width,h,0,-thickness,length,thickness);
  ctx.globalAlpha=.9*power;
  ctx.save();ctx.translate(480,0);ctx.rotate(Math.PI);band(480);ctx.restore();
  ctx.save();ctx.translate(0,270);ctx.rotate(-Math.PI/2);ctx.scale(1,-1);band(270);ctx.restore();
  ctx.save();ctx.translate(480,0);ctx.rotate(Math.PI/2);ctx.scale(1,-1);band(270);ctx.restore();
  ctx.drawImage(im,0,i*h,im.width,h,0,270-thickness,480,thickness);
 }
 ctx.restore();
}
