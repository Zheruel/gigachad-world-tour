// Dirty Delhi market life: stall workers on looping routines, front-row street sellers,
// swaying hanging goods, lamp light, steam, smoke, awning drips, kites and a near-camera overhead layer.
// Cosmetic only: no combat RNG (local hash), no combat actors, nothing in the fighting lane.
// Art: tools/production/build_delhi_life_market.py (2x strips, anchor at each cell's bottom centre).
import {G,W,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {drawContactShadow} from './contact_shadow.js';
import {drawClearOfHud} from './delhi_life_walk.js';

const DIR='assets/stages/dirty_delhi/market_life/';
const STRIPS=['elec','elec_props','kebab','stirrer','chai','cloth','fruit','fruit_front','kachori','kachori_prop','hang','halwai','butcher','keeper_front'];
const FG=['tarp','garland','bracket'];
const SELLER_NAMES=['panipuri','sugarcane','veggie','pakora'];
export const MARKET_LIFE_FILES=Object.fromEntries([...STRIPS.map(n=>['dm_'+n,DIR+n+'.png']),...FG.map(n=>['dm_fg_'+n,DIR+'fg_'+n+'.png']),
 ...SELLER_NAMES.flatMap(n=>[['dm_seller_'+n,DIR+'seller_'+n+'.png'],['dm_seller_'+n+'_prop',DIR+'seller_'+n+'_prop.png']]),['dm_seller_sugarcane_wheel',DIR+'seller_sugarcane_wheel.png'],
 ...['seller_pakora','seller_pakora_prop','seller_sugarcane','seller_sugarcane_prop','seller_sugarcane_wheel'].map(n=>['dm_play_'+n,DIR+'play_'+n+'.png'])]);
export const MARKET_LIFE_END=2430;
const STALLS_END=2580;             // ...and the kachori halwai just past the food alley, in front of his shop (vendor plate)
const LIFE_END=3400;
const CELL={elec:[102,122],kebab:[104,160],stirrer:[140,168],chai:[94,186],cloth:[166,160],fruit:[114,164],hang:[48,104],kachori:[118,128],kachori_prop:[64,52],halwai:[134,130],butcher:[126,162]};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
CELL.fruit=[136,154];
CELL.elec=CELL.elec_props=[104,126];

// Stall workers: [sheet, worldX, feetY, clipY (counter or baskets in front, null = full body), face,
// routine [frame, ticks] (alarm poses 6-7, fruit 14-15), prop in front {key, dx, dy}].
const FAN=[[0,6],[1,6],[2,6],[3,6]];
const PERFORMERS=[
 ['fruit',652,197,null,1,[[0,90],[1,12],[2,12],[3,12],[4,18],[5,24],[6,36],[7,28],[8,12],[9,24],[10,28],[11,12],[12,24],[13,36],[0,60]]],
 ['elec',1262,200,null,1,[[0,40],[1,30],[0,30],[2,6],[1,4],[2,6],[1,4],[2,24],[3,40],[4,70],[0,30],[1,30],[5,60]]],
 ['cloth',1012,199,null,1,[[0,70],[1,8],[2,70],[3,40],[4,24],[5,60],[0,40]]],
 ['chai',1596,205,null,-1,[[0,30],[1,10],[2,40],[3,12],[0,20],[1,10],[2,40],[3,12],[4,34],[5,56],[0,30]]],
 ['kebab',1784,197,174,1,[...FAN,...FAN,...FAN,...FAN,...FAN,[4,26],[5,44],...FAN,...FAN,...FAN,...FAN]],
 ['stirrer',2080,199,163,1,[[0,10],[1,10],[2,10],[3,10],[0,10],[1,10],[2,10],[3,10],[0,10],[1,10],[2,10],[3,10],[4,52],[0,10],[1,10],[2,10],[3,10],[0,10],[1,10],[2,10],[3,10],[5,56]]],
 // The kachori halwai on his stool at the shop front: stir, stir, drop a ball of dough in, stir, lift a
 // batch on the jhara, tip it onto the tray side, now and then wipe his brow. His kadhai stands in front.
 ['kachori',2512,196,null,1,[[0,12],[1,12],[0,12],[1,12],[4,30],[0,12],[1,12],[0,12],[1,12],[0,12],[1,12],[2,34],[3,30],[0,12],[1,12],[0,12],[1,12],[5,50]],{key:'kachori_prop',dx:20,dy:2}],
];
// The repairman's soldering tip in pose 2, from his feet anchor (logical px).
const SPARK=[3.5,-34.75];
const TOTAL=r=>r.reduce((n,[,d])=>n+d,0);
function routine(r,t){let c=((t%TOTAL(r))+TOTAL(r))%TOTAL(r);for(const [f,d]of r){if(c<d)return f;c-=d;}return 0;}
// Roaming pedestrians and traffic are retired; kept as an empty review hook.
export const MARKET_WALKERS=[];
// Hanging goods sway from their hooks: [worldX, hookY, piece (0 red dupatta, 1 teal dupatta,
// 2 lantern, 3 marigold string, 4 bananas, 5 ladles)].
const HANGS=[[592,118,3],[716,117,4],[932,119,0],[1060,118,3],[1196,119,1],[1456,104,3],[1700,98,2],[1862,98,5],[2026,99,5],[2236,98,3],[2310,98,4]];
// Painted lamps the light breathes over: [x, y, radius].
const LAMPS=[[765,42,16],[777,133,13],[592,120,10],[873,53,14],[893,110,12],[1330,122,12],[1578,93,14],[1698,108,10],[1738,112,9],[1837,125,10],[1920,88,8],[1968,100,9],[2032,103,9],[2098,113,10],[2208,108,10],[2427,113,16],[2495,119,10],[2556,128,10]];
// Upper-floor windows lit from inside (a lamp; a television's flicker): [x, y, w, h, kind].
const WINDOWS=[[1123,32,15,25,'lamp'],[1158,32,16,25,'tv']];
// Steam, smoke and a chimney: [x, y, kind].
const PLUMES=[[1822,158,'smoke'],[1546,152,'steam'],[2046,160,'steam'],[2090,156,'steam'],[2192,120,'steam'],[2318,10,'chimney'],[1745,160,'steam'],[2532,176,'steam']];
// Awning edges that still drip onto the pavement: [x0, x1, edgeY, groundY].
const AWNINGS=[[585,720,120,198],[918,1058,119,199],[1078,1204,119,199],[1452,1572,104,199],[1706,1866,99,199],[2028,2214,99,200],[2240,2310,99,199]];
// Near-camera overhead pieces at 1.3x parallax: [world x at parallax, piece, y].
const FG_PARALLAX=1.3;
const FRONT=[[520,'garland',-2],[900,'tarp',-2],[1230,'bracket',0],[1900,'garland',-4],[2250,'tarp',-4],[2960,'bracket',0]];

function sheet(key){
 const play=G.state!=='intro'&&ASSETS['dm_play_'+key];
 const im=play||ASSETS['dm_'+key];return im&&im.width?im:null;
}
function cell(ctx,key,frame,x,feet,face=1){
 const im=sheet(key);if(!im)return false;const [cw,ch]=CELL[key];
 ctx.save();ctx.translate(Math.round(x),Math.round(feet)+1);if(face<0)ctx.scale(-1,1);
 ctx.drawImage(im,frame*cw,0,cw,ch,-cw/4,-ch/2,cw/2,ch/2);ctx.restore();return true;
}
const ATTACKS=['attack','super','kick','hook','punch','jab','grab','throw'];
function threats(){
 const out=[],p=G.player;
 if(p&&ATTACKS.some(s=>String(p.state||'').startsWith(s)))out.push(p.x);
 for(const e of G.enemies||[])if(!e.dead&&['windup','attack','charge','hurt','stagger','down','thrown'].includes(e.state))out.push(e.x);
 if(G.boss&&!G.boss.dead)out.push(G.boss.x);
 for(const e of G.effects||[])if(['spark','boxingImpact','koBurst'].includes(e.type)&&e.t<8)out.push(e.x);
 return out;
}
function state(){
 const s=G.india;if(!s||G.stage?.id!=='delhi')return null;
 return s.marketLife||=({t:0,performers:PERFORMERS.map(()=>({alert:-1,calm:0})),sellers:SELLERS.map(()=>({alert:-1,calm:0})),keepers:KEEPERS.map(()=>({alert:-1,calm:0})),
  walkers:[],kick:0});
}
function alertStep(a,hot){
 if(hot){if(a.alert<0)a.alert=0;a.calm=0;}
 if(a.alert>=0){a.alert++;if(!hot&&++a.calm>50&&a.alert>40)a.alert=-1;}
}
export function updateDelhiMarketLife(){
 const m=state();if(!m||G.paused)return;m.t++;
 if(G.camX>LIFE_END)return;
 const near=threats(),big=(G.shake||0)>=5,onScreen=x=>Math.abs(x-G.camX-W/2)<W/2+40;
 // Goondas flattened at their feet keep them looking (not back at work) until the bodies are gone.
 const bodies=(G.enemies||[]).filter(e=>!e.removeMe&&(e.dead||e.state==='down')).map(e=>e.x);
 const wary=x=>bodies.some(b=>Math.abs(b-x)<100);
 m.kick=Math.max(m.kick*.94,big?1:0);
 if(G.camX<STALLS_END){
  for(const [i,[, x]]of PERFORMERS.entries()){alertStep(m.performers[i],big&&onScreen(x)||near.some(n=>Math.abs(n-x)<130));m.performers[i].wary=wary(x);}
  // The street sellers also duck while CHAD walks right up to them after the market went up.
  for(const [i,q]of KEEPERS.entries()){const x=keeperAt(q).x;alertStep(m.keepers[i],big&&onScreen(x)||near.some(n=>Math.abs(n-x)<130));m.keepers[i].wary=wary(x);}
  for(const [i,[, x]]of SELLERS.entries()){alertStep(m.sellers[i],big&&onScreen(x)||near.some(n=>Math.abs(n-x)<130)||G.india.marketBroken&&Math.abs(G.player.x-x)<110);m.sellers[i].wary=wary(x);}
 }

}
function glow(ctx,x,y,r,alpha){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,176,86,${alpha})`);g.addColorStop(1,'rgba(255,160,70,0)');
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
const vis=(x,pad=60)=>x>G.camX-pad&&x<G.camX+W+pad;
function drawSky(ctx,camX,t){
 // Black kites circle over the old city's domes; the odd flap breaks the glide.
 ctx.fillStyle='#2b221d';
 for(const [i,[cx,cy,r]]of [[260,18,44],[640,12,30],[1010,20,52],[1340,14,38],[1560,24,26]].entries()){
  const a=t*.006*(i%2?-1:1)+i*2.1,x=cx+Math.cos(a)*r-camX,y=cy+Math.sin(a)*r*.25+Math.sin(t*.011+i)*3;if(x<-8||x>W+8)continue;
  const flap=(t+i*53)%260<22?Math.round(Math.sin((t+i*53)*.9)):0,X=Math.round(x),Y=Math.round(y);
  ctx.fillRect(X-1,Y,3,1);ctx.fillRect(X-3,Y-1+flap,2,1);ctx.fillRect(X+2,Y-1+flap,2,1);ctx.fillRect(X-4,Y-(flap>0?0:1)+flap,1,1);ctx.fillRect(X+4,Y-(flap>0?0:1)+flap,1,1);
 }
}
function drawHangs(ctx,camX,t,kick){
 const im=sheet('hang');if(!im)return;const [cw,ch]=CELL.hang;
 for(const [i,[x,y,piece]]of HANGS.entries()){
  if(!vis(x,30))continue;
  const k=piece===2?.7:piece===4||piece===5?.8:1;
  const gust=Math.max(0,Math.sin(t*.0041+i*.7))**6;
  const a=k*(.045*Math.sin(t*.037+i*1.9)+.02*Math.sin(t*.11+i)+.07*gust*Math.sin(t*.09+i))+kick*.08*Math.sin(t*.5+i);
  ctx.save();ctx.translate(Math.round(x-camX),y);ctx.rotate(a);ctx.drawImage(im,piece*cw,0,cw,ch,-cw/4,-1,cw/2,ch/2);ctx.restore();
  if(piece===2)glow(ctx,x-camX-Math.sin(a)*34,y+36,18,.13+.03*Math.sin(t*.23+i));
 }
}
// Soft puffs (radial falloff), so steam and smoke read as vapour rather than discs.
function puff(ctx,x,y,r,a,rgb){if(a<=.004)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.55,`rgba(${rgb},${a*.55})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function drawPlumes(ctx,camX,t){
 for(const [i,[x,y,kind]]of PLUMES.entries()){
  if(!vis(x,40))continue;const sx=x-camX;
  if(kind==='chimney'){for(let j=0;j<7;j++){const p=((t*.6+j*40)%280)/280;puff(ctx,sx+p*38+Math.sin(t*.01+j)*3,y-p*20,3+p*11,.26*(1-p),'70,62,58');}continue;}
  const smoke=kind==='smoke',n=smoke?8:5,life=smoke?96:70;
  for(let j=0;j<n;j++){
   const p=((t+j*life/n+i*13)%life)/life,dx=(hash(j*7.3+i)-.5)*6+Math.sin(t*.04+j)*3*p+(smoke?p*p*16:0),h=smoke?58:32;
   const py=y-p*h;if(smoke&&py<100)continue;  // the kebab smoke pools under its awning
   puff(ctx,sx+dx,py,(smoke?4:3)+p*(smoke?10:7),(smoke?.22:.24)*Math.sin(p*Math.PI),smoke?'96,84,76':'226,218,206');
  }
  if(smoke)for(let j=0;j<5;j++){  // embers off the kebab coals
   const p=((t*1.3+j*37)%90)/90,ex=sx+(hash(j+3.1)-.5)*14+Math.sin(t*.07+j*2)*4*p,ey=y+2-p*44;
   ctx.fillStyle=p<.5?'#ffcf6a':'#e0782e';ctx.globalAlpha=1-p;ctx.fillRect(Math.round(ex),Math.round(ey),1,1);ctx.globalAlpha=1;
  }
 }
}
function drawDrips(ctx,camX,t){
 ctx.fillStyle='rgba(206,196,176,.6)';
 for(const [i,[x0,x1,y,ground]]of AWNINGS.entries()){
  if(x1<camX-10||x0>camX+W+10)continue;
  for(let k=0;k<Math.floor((x1-x0)/22);k++){
   const seed=i*41+k,x=Math.round(x0+8+k*22+hash(seed)*14-camX),period=90+Math.floor(hash(seed+.5)*120);
   const c=(t+Math.floor(hash(seed+.9)*period))%period,fall=ground-y,tf=Math.sqrt(2*fall/.18);
   if(c<tf){const dy=.09*c*c;ctx.fillRect(x,Math.round(y+dy),1,dy>6?2:1);}
   else if(c<tf+10){const q=(c-tf)/10;ctx.globalAlpha=1-q;ctx.fillRect(x-1-Math.round(q*3),ground,1,1);ctx.fillRect(x+1+Math.round(q*3),ground,1,1);ctx.globalAlpha=1;}
  }
 }
}
function drawPerformers(ctx,camX,m){
 const t=m.t;
 for(const [i,[key,x,feet,clip,face,r,prop]]of PERFORMERS.entries()){
  if(!vis(x))continue;const a=m.performers[i];
  const alert=key==='fruit'?14:6,cower=key==='fruit'?15:7;
  const f=a.alert>=0?(a.alert<10?alert:cower):a.wary?alert:routine(r,t+i*97);
  const sx=x-camX+(a.alert>=0&&a.alert<10?Math.round(Math.sin(a.alert*2.4)):0);
  if(clip===null&&key!=='fruit')drawContactShadow(ctx,key==='elec'?x-camX:sx,feet,12,0,.8);
  if(key==='elec')cell(ctx,'elec_props',0,x-camX,feet,face);
  ctx.save();if(clip!==null){ctx.beginPath();ctx.rect(sx-60,0,120,clip);ctx.clip();}
  cell(ctx,key,f,sx,feet,face);ctx.restore();
  if(key==='fruit'&&sheet('fruit_front'))ctx.drawImage(sheet('fruit_front'),590-camX,120,120,81);
  if(prop)cell(ctx,prop.key,0,sx+prop.dx,feet+prop.dy,1);
  if(key==='kachori')fryer(ctx,sx+prop.dx,feet+prop.dy,t,f);
  if(key==='elec'&&f===2&&(t>>1)%3){ctx.save();ctx.globalCompositeOperation='lighter';glow(ctx,sx+SPARK[0],feet+SPARK[1],7,.5);ctx.fillStyle='#fff3c8';ctx.fillRect(Math.round(sx+SPARK[0]),Math.round(feet+SPARK[1]),1,1);ctx.restore();}
 }
}
// The kachori kadhai: coals breathing under it, oil glinting as it bubbles, a flare when a batch goes in.
function fryer(ctx,x,feet,t,f){
 ctx.save();ctx.globalCompositeOperation='lighter';
 glow(ctx,x,feet-9,9,.16+.05*Math.sin(t*.13)+.04*Math.sin(t*.41));
 const rim=feet-20;
 for(let k=0;k<7;k++){const p=(t+k*23)%46;if(p>7)continue;
  ctx.fillStyle=p<3?'#fff2b0':'#ffb84a';ctx.globalAlpha=1-p/8;ctx.fillRect(Math.round(x-10+hash(k*3.7)*20),Math.round(rim+hash(k*5.1)*2),p<3?1:.5,.5);}
 if(f===4||f===2){ctx.globalAlpha=.5;glow(ctx,x,rim,8,.2);}
 ctx.restore();
}
// Front-row street sellers (the rampage intro's pani puri cart, pakora wok, sugarcane press and
// vegetable spread): the seller works through an 8-pose routine behind the static prop
// (tools/production/build_delhi_street_sellers.py; 288x246 2x canvases, the old cell's bottom centre
// on the anchor). Poses 6-7: startled, cowering. The press's flywheel turns with the crank poses.
const R_PANI=[[0,40],[1,24],[2,20],[3,34],[0,20],[1,20],[2,18],[3,30],[4,9],[0,6],[4,9],[0,6],[4,9],[0,30],[5,40],[0,30]];
const CRANK=[[0,7],[1,7],[2,7],[3,7]];
const R_SUG=[...CRANK,...CRANK,...CRANK,...CRANK,...CRANK,...CRANK,[4,44],...CRANK,...CRANK,...CRANK,...CRANK,[5,56],[0,20]];
const R_VEG=[[0,50],[1,30],[0,40],[2,44],[0,30],[3,56],[0,40],[4,20],[0,2],[4,20],[0,2],[4,20],[5,50]];
const STIR=[[0,8],[1,8]];
const R_PAK=[...STIR,...STIR,...STIR,...STIR,...STIR,...STIR,[2,30],[3,26],...STIR,...STIR,...STIR,...STIR,[4,34],...STIR,...STIR,...STIR,...STIR,...STIR,[5,44]];
const SELLERS=[['panipuri',42,232,0,R_PANI],['pakora',964,232,14,R_PAK],['sugarcane',1100,232,5,R_SUG],['veggie',1170,236,9,R_VEG]];
const SELLER_END=1260;
const WHEEL=[84.5,70.5,7,13.5];   // flywheel centre in the canvas (logical) and its ellipse radii
function routinePos(r,t){let c=((t%TOTAL(r))+TOTAL(r))%TOTAL(r);for(const [f,d]of r){if(c<d)return [f,c/d];c-=d;}return [0,0];}
function sellersReady(){return SELLER_NAMES.every(n=>sheet('seller_'+n)&&sheet('seller_'+n+'_prop'));}
// Run the rampage aftermath without its old two-pose sellers when the new ones can stand in for them.
export function withoutOldSellers(draw){
 if(!sellersReady()||G.india?.review?.sets===false)return draw();
 const old=ASSETS.ic_rampage_street;ASSETS.ic_rampage_street=null;
 try{return draw();}finally{ASSETS.ic_rampage_street=old;}
}
function drawSeller(ctx,camX,i,f,u,shake){
 const [key,x,y]=SELLERS[i],X=Math.round(x-camX-72+shake),Y=y-123,s=sheet('seller_'+key),p=sheet('seller_'+key+'_prop');
 ctx.drawImage(s,f*288,0,288,246,X,Y,144,123);
 const wheel=key==='sugarcane'&&sheet('seller_sugarcane_wheel');
 if(wheel){const ang=f<4?(f+u)*Math.PI/2:0,[cx,cy,rx,ry]=WHEEL,d=wheel.width/2;
  ctx.save();ctx.translate(X-shake+cx,Y+cy);ctx.scale(rx/ry,1);ctx.rotate(Math.round(ang/(Math.PI/16))*Math.PI/16);ctx.drawImage(wheel,-d/2,-d/2,d,d);ctx.restore();}
 ctx.drawImage(p,X-shake,Y,144,123);
}
export function drawDelhiStreetSellers(ctx,camX){
 const m=state();if(!m||camX>=SELLER_END||G.state==='intro'||G.india.review?.sets===false)return;
 if(!G.india.marketBroken)drawKeepers(ctx,camX,m,false);   // inside the intact stalls (behind the wrecks: drawDelhiMarketLife)
 if(!sellersReady())return;
 for(const [i,[key,x,y,ph,r]]of SELLERS.entries()){
  const sx=x-camX;if(sx<-80||sx>W+80)continue;const a=m.sellers[i];
  let [f,u]=routinePos(r,m.t+ph*41);if(a.alert>=0)f=a.alert<10?6:7;else if(a.wary)f=6;
  const shake=a.alert>=0&&a.alert<10?Math.round(Math.sin(a.alert*2.4)):a.alert>=10&&(m.t>>2)%5===0?1:0;
  drawSeller(ctx,camX,i,f,u,shake);
 }
}
// Stall keepers of the market row's side stalls (rampage/side_stalls.png, drawn by js/delhi_intro.js
// marketRow: cells 0-1 at x 126 / 476, 112x136 logical, base 226; side_wreck.png once smashed). The
// halwai fans flies off his sweets, offers a tray, calls, weighs; the butcher chops on his block (the
// cleaver lands on its top), hones, hangs a leg, wipes his hands. Poses 6-7 startled / cowering, 8-9
// aftermath: behind the wreck the halwai wails and picks up a tray, the butcher waves his cleaver and
// picks meat off the ground. Inside an intact stall the keeper goes into a small buffer and the stall's
// front plane (keeper_front.png: awning, counter and the goods on it) is laid over him there; behind a
// wreck he is drawn before the stalls (drawDelhiMarketLife), or in the intro composited under the wreck.
const SIDE=[126,476],SIDE_TOP=90;
const KEEPERS=[
 {key:'halwai',stall:0,x:134,feet:197,face:1,
  work:[[0,40],[1,7],[2,7],[1,7],[2,7],[1,7],[2,7],[0,30],[3,64],[0,24],[4,54],[0,30],[5,70],[0,26],[1,7],[2,7],[1,7],[2,7],[0,40]],
  wreck:{x:118,feet:204,face:1,r:[[8,80],[0,30],[9,90],[0,24],[8,60],[4,44],[0,36]]}},
 {key:'butcher',stall:1,x:484,feet:196,face:-1,
  work:[[0,30],[1,12],[2,9],[1,10],[2,9],[1,10],[2,9],[1,10],[2,14],[0,30],[3,56],[0,20],[5,52],[0,24],[4,44],[0,20]],
  wreck:{x:522,feet:203,face:-1,r:[[8,56],[0,40],[9,80],[0,30],[8,40],[4,44],[0,40]]}},   // clear of CHAD's post-intro spot (476)
];
const keeperAt=(q,wreck=G.india?.marketBroken)=>wreck?q.wreck:q;
let kbuf=null;
function keeper(ctx,camX,q,f,wreck,shake,front){
 const at=keeperAt(q,wreck),sx=Math.round(at.x-camX+shake);
 if(!front||!front.width||typeof document==='undefined')return cell(ctx,q.key,f,sx,at.feet,at.face);
 const k=Math.max(1,Math.round(Math.abs(ctx.getTransform?.().a||1))),BW=100,BH=110,X0=sx-50,Y0=at.feet-100;
 if(!kbuf||kbuf.width!==BW*k){kbuf=document.createElement('canvas');kbuf.width=BW*k;kbuf.height=BH*k;kbuf.getContext('2d',{willReadFrequently:true});}  // a CPU buffer: redrawn every frame, a GPU one would stall on each composite
 const b=kbuf.getContext('2d');b.setTransform(1,0,0,1,0,0);b.globalCompositeOperation='source-over';b.clearRect(0,0,kbuf.width,kbuf.height);
 b.setTransform(k,0,0,k,-X0*k,-Y0*k);b.imageSmoothingEnabled=ctx.imageSmoothingEnabled;
 cell(b,q.key,f,sx,at.feet,at.face);
 b.globalCompositeOperation='source-atop';
 const cols=front===ASSETS.ic_rampage_side_wreck?3:2,cw=front.width/cols;
 b.drawImage(front,q.stall*cw,0,cw,front.height,Math.round(SIDE[q.stall]-camX)-56,SIDE_TOP,112,136);
 ctx.drawImage(kbuf,X0,Y0,BW,BH);
}
function keeperFrame(q,i,a,t,wreck){
 if(a.alert>=0)return a.alert<10?6:7;if(a.wary)return 6;
 return routine(wreck?q.wreck.r:q.work,t+i*97);
}
function drawKeepers(ctx,camX,m,wreck){
 if(!sheet('halwai'))return;
 for(const [i,q]of KEEPERS.entries()){const at=keeperAt(q,wreck);if(at.x-camX<-60||at.x-camX>W+60)continue;
  const a=m.keepers[i],shake=a.alert>=0&&a.alert<10?Math.round(Math.sin(a.alert*2.4)):0;
  keeper(ctx,camX,q,keeperFrame(q,i,a,m.t,wreck),wreck,shake,wreck?null:sheet('keeper_front'));}
}
// The rampage intro (js/delhi_intro.js streetVendors hook): the same sellers and keepers on the intro
// clock T. cower(x): are they scared now (startled for 10 ticks, then cowering); hits: {stall: tick it
// is smashed}. A keeper ducks behind his counter, is gone in the smash's dust and comes back up behind
// the wreck, cowering, then wailing (the aftermath play picks up). Drawn in world coordinates.
const introScare={};let introT=-1;
export function drawIntroStreet(ctx,T,cower,hits={}){
 if(!sellersReady()||G.india?.review?.sets===false)return false;
 if(T<introT)for(const k in introScare)delete introScare[k];introT=T;
 const scare=(id,x)=>{if(!cower(x)){delete introScare[id];return -1;}introScare[id]??=T;return T-introScare[id]<10?6:7;};
 const vis=x=>x-G.camX>-80&&x-G.camX<W+80;
 if(sheet('halwai'))for(const [i,q]of KEEPERS.entries()){
  const hit=hits[q.stall]??Infinity,d=T-hit;if(d>=0&&d<45)continue;
  const wreck=d>=45,at=keeperAt(q,wreck);if(!vis(at.x))continue;
  let f=scare('k'+i,at.x);const shake=f===6?Math.round(Math.sin((T-introScare['k'+i])*2.4)):0;
  // Behind his wreck he cowers a while, then is up and raging whatever CHAD does (as play picks him up).
  if(wreck)f=d<75?7:8;else if(f<0)f=routine(q.work,T+i*97);
  keeper(ctx,0,q,f,wreck,shake,wreck?ASSETS.ic_rampage_side_wreck:sheet('keeper_front'));
 }
 for(const [i,[,x,,ph,r]]of SELLERS.entries()){if(!vis(x))continue;
  let f=scare('s'+i,x),u=0;const shake=f===6?Math.round(Math.sin((T-introScare['s'+i])*2.4)):0;
  if(f<0)[f,u]=routinePos(r,T+ph*41);
  drawSeller(ctx,0,i,f,u,shake);
 }
 return true;
}
// Behind the fighters: drawn over the plates, before props and actors.
export function drawDelhiMarketLife(ctx,camX){
 const m=state();if(!m||camX>LIFE_END||G.india.review?.ambient===false)return;
 const t=m.t;
 if(camX>STALLS_END)return;
 drawSky(ctx,camX,t);
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const [i,[x,y,r]]of LAMPS.entries())if(vis(x,r))glow(ctx,x-camX,y,r,.05+.018*Math.sin(t*.043+i*2.3)+.012*Math.sin(t*.17+i)*(hash(i)>.7?2:0));
 for(const [i,[x,y,w,h,kind]]of WINDOWS.entries()){if(!vis(x,w))continue;
  const k=Math.floor(t/9+i*3),a=kind==='tv'?.07+.09*hash(k):.1+.02*Math.sin(t*.05+i);
  ctx.fillStyle=kind==='tv'?`rgba(${hash(k+.3)>.5?'120,150,230':'170,190,210'},${a})`:`rgba(255,170,80,${a})`;ctx.fillRect(x-camX,y,w,h);}
 ctx.restore();
 drawHangs(ctx,camX,t,m.kick);
 if(G.state!=='intro'){drawPerformers(ctx,camX,m);if(G.india.marketBroken&&G.india.review?.sets!==false)drawKeepers(ctx,camX,m,true);}
 drawPlumes(ctx,camX,t);
 drawDrips(ctx,camX,t);
 // Moths round the brightest lamps.
 for(const [i,[x,y,r]]of LAMPS.entries()){if(r<13||!vis(x,10))continue;
  const a=t*.033+i*1.7;ctx.fillStyle='rgba(232,208,160,.7)';ctx.fillRect(Math.round(x-camX+Math.sin(a)*8),Math.round(y+Math.sin(a*1.6)*5),1,1);}
}
// In front of the fighters: overhead pieces hanging into the top of the frame only (never below y~74).
export function drawDelhiMarketFront(ctx,camX){
 const m=state();if(!m||camX>MARKET_LIFE_END+40||G.india.review?.ambient===false)return;
 let x0=W,x1=0;for(const [wx,piece]of FRONT){const im=sheet('fg_'+piece),x=wx-camX*FG_PARALLAX;if(im&&x<W&&x+im.width/2>0){x0=Math.min(x0,x-3);x1=Math.max(x1,x+im.width/2+3);}}
 if(x1<=x0)return;
 drawClearOfHud(ctx,c=>{for(const [i,[wx,piece,y]]of FRONT.entries()){
  const im=sheet('fg_'+piece);if(!im)continue;const w=im.width/2,h=im.height/2,x=wx-camX*FG_PARALLAX;
  if(x>W||x+w<0)continue;
  const sway=(piece==='garland'||piece==='bracket')?.012*Math.sin(m.t*.03+i)+m.kick*.03*Math.sin(m.t*.4+i):0;
  c.save();c.translate(Math.round(x+w/2),y);c.rotate(sway);c.drawImage(im,-w/2,0,w,h);c.restore();
 }},[x0,x1]);
}
