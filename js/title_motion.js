import { drawTextShadow, textWidth } from './sprites.js';
import { drawCigarReplay } from './cigar_smoke.js';
import { assetURL } from './asset_url.js';
export const TITLE_MOTION_FILES={
 world:'assets/ui/title-motion/poster-world.png',globe:'assets/ui/title-motion/world-globe.png',
 cigar:'assets/ui/title-motion/chad-cigar.png',logo:'assets/ui/logo.png',
 anchors:'assets/ui/title-motion/cigar-anchors.json',
};
export const TITLE_VARIANTS=[
 {id:'cigar',name:'World Tour: After Hours',tag:'Cigar drag, glowing ember, drifting smoke',description:'CHAD takes a slow draw, lowers the cigar and exhales over the brass globe. Tokyo neon, a harbor skyline, Mediterranean villas and Alpine peaks, with a separate brass globe and drifting atmosphere.',background:'world'},
];
const CIGAR=[0,120,130,140,150,190,215,225,235,280,350,375,600];
const mod=(x,n)=>(x%n+n)%n;
export function titleMotionAt(kind,time){
 const t=mod(time,600),bounds=CIGAR;
 const frame=bounds.findIndex((b,i)=>i<12&&t>=b&&t<bounds[i+1]);
 return {t,frame,action:t<120||t>=375?'Resting':t<150?'Raising cigar':t<215?'Taking a draw':t<235?'Lowering cigar':t<350?'Exhaling':'Settling',exhale:t>=235&&t<350,glint:false};
}
export async function loadTitleMotion(){
 const art={};await Promise.all(Object.entries(TITLE_MOTION_FILES).map(async([name,path])=>{try{if(name==='anchors'){const r=await fetch(path);if(!r.ok)throw Error('Missing anchors');art[name]=await r.json();return;}const im=new Image();im.src=assetURL(path);await im.decode();art[name]=im;}catch(_){art[name]=null;}}));return art;
}
function puff(ctx,x,y,r,alpha,tint='185,204,212'){
 const g=ctx.createRadialGradient(x-r*.2,y-r*.2,0,x,y,r);g.addColorStop(0,`rgba(${tint},${alpha})`);g.addColorStop(.4,`rgba(${tint},${alpha*.65})`);g.addColorStop(1,`rgba(${tint},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
// Frame-local mouth and cigar-tip coordinates are registered with the portrait strip.
const MOUTH=[246,120];
const TIPS=[[270,162],[272,147],[273,130],[270,122],[270,122],[270,122],[275,128],[274,145],[270,162],[270,162],[270,162],[270,162]];
function cigarSmoke(ctx,pose,time,anchors){
 const point=(key,fallback,frame=pose.frame)=>anchors?.[frame]?.[key]?.map((v,i)=>v*.5+(i?82:140))||fallback;
 const[ex,ey]=point('tip',TIPS[pose.frame]),mouth=point('mouth',MOUTH),draw=pose.t>=150&&pose.t<215;
 ctx.save();ctx.globalCompositeOperation='screen';puff(ctx,ex,ey,draw?3:1.7,draw?.45:.18,'255,117,39');ctx.fillStyle=draw?'#ffdf88':'#b77d44';ctx.fillRect(ex,ey,1,1);ctx.restore();
 // Embers release a thin rising wisp; the exhale is broader and carries forward.
 for(let i=0;i<12;i++){
  const age=mod(time+i*10,120),p=age/120;
  const bornFrame=titleMotionAt('cigar',time-age).frame,[sx,sy]=point('tip',TIPS[bornFrame],bornFrame);
  puff(ctx,sx+Math.sin(p*7+time*Math.PI*2/600)*2+p*5,sy-p*24,1+p*4,.1*Math.sin(Math.PI*p));
 }
 for(let i=0;i<18;i++){
  const born=235+i*5,age=pose.t-born;if(age<0||age>135)continue;
  const p=age/135;
  const origin=point('mouth',mouth,titleMotionAt('cigar',born).frame);
  const x=origin[0]+3+p*62,y=origin[1]-p*22+Math.sin(p*8+i*.55)*3;
  puff(ctx,x,y,1+p*12,.3*Math.sin(Math.PI*p));
 }
 // The exhale opens with two smoke rings, the rings CHAD blows in play (cigar_smoke.js), at portrait size.
 drawCigarReplay(ctx,0,pose.t,b=>b>=0&&{tip:point('mouth',mouth,titleMotionAt('cigar',b).frame),face:1},{exhales:[235],ember:false,wisps:false,scale:2});
}
export function drawTitleMotion(ctx,art,kind,time,{ui=true,effects=true,background}={}){
 // Old review links resolve to the same presentation used by the game.
 kind='cigar';
 const pose=titleMotionAt(kind,time),bg='world',plate=art.world;
 ctx.save();ctx.fillStyle='#080710';ctx.fillRect(0,0,480,270);ctx.imageSmoothingEnabled=false;
 const drift=Math.sin(time*Math.PI*2/600);
 if(plate)ctx.drawImage(plate,bg==='world'?-8+drift*5:-2+drift*.7,bg==='world'?-3:-1,bg==='world'?496:484,bg==='world'?279:272);
 if(bg==='world'){
  // Harbor haze passes behind the solid brass globe, never through CHAD.
  if(effects)for(let i=0;i<7;i++){const p=mod(time+i*80,600)/600;puff(ctx,70+p*340,201+Math.sin(i)*8,15,.045*Math.sin(p*Math.PI),'161,166,209');}
  if(art.globe)ctx.drawImage(art.globe,-drift,0,480,270);
 }
 const sprite=art[kind];
 if(sprite)ctx.drawImage(sprite,pose.frame*400,0,400,368,140,82,200,184);
 if(effects&&sprite){
  if(kind==='cigar')cigarSmoke(ctx,pose,time,art.anchors);

 }
 if(ui){
  const grad=ctx.createLinearGradient(0,229,0,270);grad.addColorStop(0,'rgba(8,5,11,0)');grad.addColorStop(1,'rgba(8,5,11,.96)');ctx.fillStyle=grad;ctx.fillRect(0,229,480,41);
  if(art.logo)ctx.drawImage(art.logo,136,4,208,art.logo.height/art.logo.width*208);
  const text=(s,y,col,scale=1)=>drawTextShadow(ctx,s,(480-textWidth(s,scale))/2,y,col,scale);
  if(mod(time,100)<75)text('PRESS Z',242,'#fff2d7',2);
  text('ENTER THE LAIR',260,'#eac275');
 }
 ctx.restore();return pose;
}
