// The Closer's marble penthouse: sparse breakable furniture and quiet executive glass.
// Furniture owns its authored wreck states. Cosmetic reflections never advance the fight.
// Missing art falls back to simple readable blocks.
import { G, W, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { PROP_TYPES } from './props.js';

// Art: cl_* in js/india_assets.js (assets/stages/refund_tower/scam_king/).
// The room's 1x plate coordinates (room 7 starts at x 5670): the six war-room screens and the ticker.
const ROOM = 5670;
export const CLOSER_SCREENS = Object.freeze([[568, 53, 60, 39], [634, 52, 65, 40], [705, 51, 64, 41], [568, 98, 60, 39], [634, 98, 65, 39], [705, 98, 64, 39]]);
// Inner glass corners measured on the 1620×540 production plate, in logical pixels.
export const CLOSER_TICKER_GLASS=Object.freeze([[568,36],[768,30.5],[768,43.5],[568,46.5]].map(Object.freeze));
// The destructible screen wall the finisher drives him into: centre x, floor y, w, h (1x).
export const CLOSER_WALL = Object.freeze({ x: ROOM + 667.5, y: 172, w: 235, h: 154 });

// ---- furniture -------------------------------------------------------------------------------
function contact(ctx, x, y, rx, ry = 3, a = .4) {
 if (G.reflecting) return; ctx.save(); ctx.fillStyle = `rgba(6,4,10,${a})`; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function art(ctx, key, x, y, flash, face = 1) {
 const im = ASSETS[key]; if (!im) return false;
 const w = im.width / 2, h = im.height / 2;
 ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (face < 0) ctx.scale(-1, 1);
 if (flash) ctx.filter = 'brightness(1.3)';
 ctx.drawImage(im, -w / 2, -h + 2, w, h); ctx.restore(); return true;
}
function block(ctx, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x - w / 2), Math.round(y - h), w, h); }
const wob = pr => pr.shakeT > 0 ? ((pr.t & 1) ? 1 : -1) : 0;
// While he is on his intro call the desk phone's cradle is empty and its coiled cord runs up to his hand.
export const CLOSER_CALL_ENDS = 264;
const onCall = () => G.state === 'bossintro' && G.boss?.key === 'closer' && (G.boss.introT ?? 999) < CLOSER_CALL_ENDS;
function drawDesk(ctx, pr, camX) {
 const x = pr.x - camX + wob(pr), call = !pr.broken && onCall();
 contact(ctx, x, pr.y, 83, 4);
 if (!(call && art(ctx, 'cl_desk_empty', x, pr.y, pr.flash > 0)) && !art(ctx, pr.broken ? 'cl_desk_broken' : 'cl_desk', x, pr.y, pr.flash > 0)) block(ctx, x, pr.y, 168, pr.broken ? 28 : 70, '#1d1a20');
 if (call) drawCord(ctx, x - 57, pr.y - 62, G.boss.x - camX + CORD_HAND[0], G.boss.y + CORD_HAND[1]);
}
// The handset in his seated pose (relative to his feet, facing CHAD).
export const CORD_HAND = [10, -90];
function drawCord(ctx, x0, y0, x1, y1) {
 if (G.reflecting) return;
 ctx.save(); ctx.lineCap = 'round';
 for (const [w, c] of [[2.6, '#260a10'], [1.2, '#8b3544']]) {
  ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
   const k = i / 24, sag = Math.sin(k * Math.PI) * 10, coil = Math.sin(k * 40) * 1.4;
   const px = x0 + (x1 - x0) * k + coil, py = y0 + (y1 - y0) * k + sag;
   i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.stroke();
 }
 ctx.restore();
}
function drawThrone(ctx, pr, camX) {
 const x = pr.x - camX;
 if (!art(ctx, 'cl_throne', x, pr.y, false, pr.face || 1)) block(ctx, x, pr.y, 44, 84, '#3a1f4a');
}
function drawSideboard(ctx, pr, camX) {
 if (!art(ctx, 'cl_sideboard', pr.x-camX, pr.y, false)) block(ctx, pr.x-camX, pr.y, 105, 35, '#34201c');
}
Object.assign(PROP_TYPES, {
 cl_desk: { hp: 40, w: 168, h: 70, shadowR: 0, score: 300, drop: null, debris: ['#422a1b', '#c9a043', '#d8d2c0'], breakSound: 'break_wood', draw: drawDesk },
 cl_sideboard: { hp: 1, w: 105, h: 35, shadowR: 0, score: 0, drop: null, decor: true, debris: [], draw: drawSideboard },
 cl_throne: { hp: 1, w: 52, h: 86, shadowR: 0, score: 0, drop: null, decor: true, debris: [], draw: drawThrone },
});

// ---- money and gift cards --------------------------------------------------------------------
// Cosmetic notes and cards that flutter down; Math.random only shapes their path.
function stepNote(e) {
 e.t++; e.vy = Math.min(e.vy + .05, .7); e.x += e.vx + Math.sin((e.t + e.ph) * .12) * .45; e.y += e.vy; e.vx *= .985;
 if (e.y >= e.ground) { e.y = e.ground; e.vx = 0; e.vy = 0; e.landed = true; }
}
function drawNote(ctx, camX) {
 const e = this, a = Math.min(1, (e.life - e.t) / 20); if (a <= 0) return;
 const im = ASSETS[e.key], x = Math.round(e.x - camX), y = Math.round(e.y), flip = e.landed ? .5 : .45 + .55 * Math.abs(Math.cos((e.t + e.ph) * .14));
 ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(e.landed ? e.rest : Math.sin((e.t + e.ph) * .1) * .6); ctx.scale(1, Math.max(.2, flip));
 if (im) ctx.drawImage(im, -e.w / 2, -e.h / 2, e.w, e.h); else { ctx.fillStyle = e.key === 'cl_giftcard' ? '#c8323a' : '#7fae6e'; ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h); }
 ctx.restore();
}
export function spawnCash(x, y, n, ground, spread = 1) {
 for (let i = 0; i < n; i++) {
  // Readable money: whole notes, the odd strapped bundle and his gift cards.
  const r = Math.random(), card = r < .2, bundle = r > .86, key = card ? 'cl_giftcard' : bundle ? 'cl_bundle' : 'cl_note';
  const w = card ? 11 : bundle ? 14 : 12, h = card ? 9 : bundle ? 10 : 8;
  G.effects.push({ type: 'closerCash', key, x: x + (Math.random() - .5) * 20 * spread, y: y - Math.random() * 12,
   vx: (Math.random() - .5) * 2.6 * spread, vy: -1.6 - Math.random() * 1.8, ph: Math.random() * 60, rest: (Math.random() - .5) * .8,
   ground: (ground ?? y + 30) + Math.random() * 10, w, h, t: 0, life: 150 + Math.random() * 60, step: stepNote, draw: drawNote });
 }
}

// ---- live executive glass -------------------------------------------------------------------
// Staggered financial displays, driven only by simulation time. All movement freezes with the game;
// drawing uses no random numbers, sounds or gameplay effects.
function screenClock(){return (G.india?.t||0)+((G.boss?.key==='closer'?G.boss:G.india?.cinematic?.boss)?.introT||0);}
export function closerTakings() {
 const s = G.india;
 return 1934208551770 + Math.floor(screenClock() / 12) * 137 + (s?.closerSales || 0) * 2500000;
}
const SCREEN_INK={gold:'#ceb476',pale:'#d1c6a8',green:'#7ead9d',dim:'#405f60'};
const screenArtCache=new WeakMap();
function worldMap(){
 const im=ASSETS.cl_screen_art;if(!im)return null;
 if(!screenArtCache.has(im)){
  const c=document.createElement('canvas');c.width=128;c.height=82;const x=c.getContext('2d');
  // Reuse the old illustrated map, softened to sit in the new room's bronze and teal glass.
  x.filter='saturate(.38) brightness(.78)';x.drawImage(im,384,82,128,82,0,0,128,82);screenArtCache.set(im,c);
 }
 return screenArtCache.get(im);
}
function screenDot(ctx,x,y,r,col,alpha=1){ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
function screenTransfer(ctx,w,h,t){
 const phase=t%210,progress=Math.min(1,phase/156),paid=phase>=156;
 ctx.fillStyle=SCREEN_INK.gold;ctx.font='bold 15px monospace';ctx.fillText('¥',5,25);
 ctx.font='5px monospace';ctx.fillStyle=paid?SCREEN_INK.gold:SCREEN_INK.green;
 ctx.fillText('+'+(128000+Math.floor(t/210)*1370).toLocaleString('en-US'),21,20);
 ctx.fillStyle='#243c3b';ctx.fillRect(21,24,w-28,4);ctx.fillStyle=paid?SCREEN_INK.gold:SCREEN_INK.green;ctx.fillRect(21,24,Math.round((w-28)*progress),4);
 ctx.fillStyle=SCREEN_INK.dim;ctx.fillText(paid?'SETTLED':'RECEIVING',21,35);
 if(!paid)screenDot(ctx,21+(w-28)*progress,25.5,1.1,SCREEN_INK.pale,.7);
}
function screenTakings(ctx,w,h,t){
 const bottom=h-5,count=9,step=(w-13)/count;
 ctx.strokeStyle='#223b3c';ctx.lineWidth=.5;
 for(let y=17;y<=bottom;y+=8){ctx.beginPath();ctx.moveTo(6,y);ctx.lineTo(w-6,y);ctx.stroke();}
 const points=[];
 for(let n=0;n<count;n++){
  const v=5+n*.7+4*Math.sin(n*.75+t/43)+2*Math.sin(n*1.7-t/27),x=7+n*step;
  ctx.fillStyle=n===count-1?SCREEN_INK.gold:'#698b7e';ctx.globalAlpha=n===count-1?.8:.48;ctx.fillRect(x,bottom-v,3,v);points.push([x+1.5,bottom-v-3]);
 }
 ctx.globalAlpha=.9;ctx.strokeStyle=SCREEN_INK.gold;ctx.lineWidth=.7;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.globalAlpha=1;
 const at=(t/14)%(count-1),a=points[Math.floor(at)],b=points[Math.floor(at)+1],f=at%1;screenDot(ctx,a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,1,SCREEN_INK.pale);
}
function screenWorld(ctx,w,h,t){
 const map=worldMap();if(map){ctx.globalAlpha=.72;ctx.drawImage(map,3,11,w-6,h-13);ctx.globalAlpha=1;}
 const ports=[[.18,.38],[.47,.32],[.71,.47],[.84,.68]],phase=t/150,route=Math.floor(phase)%3,a=ports[route],b=ports[route+1],f=phase%1;
 const point=k=>[4+(a[0]+(b[0]-a[0])*k)*(w-8),12+(a[1]+(b[1]-a[1])*k)*(h-15)-Math.sin(k*Math.PI)*3];
 ctx.strokeStyle=SCREEN_INK.gold;ctx.globalAlpha=.55;ctx.lineWidth=.65;ctx.beginPath();for(let n=0;n<=20;n++){const p=point(n/20);n?ctx.lineTo(...p):ctx.moveTo(...p);}ctx.stroke();ctx.globalAlpha=1;
 const p=point(f);screenDot(ctx,...p,1.2,SCREEN_INK.pale);for(const q of ports)screenDot(ctx,4+q[0]*(w-8),12+q[1]*(h-15),.7,SCREEN_INK.gold,.65);
}
function screenAccounts(ctx,w,h,t){
 const cycle=Math.floor(t/120),slide=Math.min(1,(t%120)/24)*7;
 ctx.save();ctx.beginPath();ctx.rect(5,13,w-10,h-16);ctx.clip();ctx.font='5px monospace';
 for(let n=0;n<5;n++){
  const y=18+n*7-slide,amount=18500+((cycle+n)*719)%85000;
  ctx.fillStyle=n===1?SCREEN_INK.pale:'#799f91';ctx.fillText('¥'+amount.toLocaleString('en-US'),6,y);
  ctx.fillStyle=n===1?SCREEN_INK.gold:SCREEN_INK.dim;ctx.fillRect(w-18,y-3,8+(n%2)*3,1);
  if(n===1)screenDot(ctx,w-6,y-2,1,SCREEN_INK.gold,.6+.3*Math.sin(t/14));
 }
 ctx.restore();
}
function screenCalls(ctx,w,h,t){
 const phone=ASSETS.cl_handset,ring=Math.sin(t/5)*Math.max(0,Math.sin(t/42));
 ctx.save();ctx.translate(17,23+ring*.4);ctx.rotate(ring*.13);ctx.globalAlpha=.9;
 if(phone)ctx.drawImage(phone,-11,-4,22,8);ctx.restore();
 for(let n=0;n<6;n++){
  const v=3+10*Math.abs(Math.sin(t/12+n*.8)*Math.cos(t/35-n*.3));ctx.fillStyle=n===5?SCREEN_INK.gold:SCREEN_INK.green;ctx.globalAlpha=.7;ctx.fillRect(34+n*3,25-v/2,1.5,v);
 }
 ctx.globalAlpha=1;ctx.fillStyle=SCREEN_INK.dim;ctx.font='5px monospace';ctx.fillText('CONNECTED',7,h-3);
}
function screenPayments(ctx,w,h,t){
 const card=ASSETS.cl_giftcard,phase=(t%240)/240;
 if(card)for(let n=0;n<3;n++){
  const x=7+n*15+(phase<.2?phase/.2*3:3),y=15+Math.sin(t/28+n)*.8;
  ctx.globalAlpha=n===1?.85:.5;ctx.drawImage(card,x,y,14,11);
 }
 ctx.globalAlpha=1;ctx.fillStyle=SCREEN_INK.green;ctx.fillRect(7,h-8,w-14,1);ctx.fillStyle=SCREEN_INK.gold;ctx.fillRect(7,h-8,(w-14)*phase,1);
 ctx.font='5px monospace';ctx.fillStyle=SCREEN_INK.pale;ctx.fillText('+'+(24500+Math.floor(t/240)*850).toLocaleString('en-US'),8,h-2);
}
const SCREEN_DISPLAYS=[screenTransfer,screenTakings,screenWorld,screenAccounts,screenCalls,screenPayments];
function drawScreen(ctx,i,x,y,w,h,t){
 ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(2,2,w-4,h-4);ctx.clip();
 const glass=ctx.createLinearGradient(0,0,0,h);glass.addColorStop(0,'rgba(7,19,23,.82)');glass.addColorStop(1,'rgba(6,12,16,.72)');ctx.fillStyle=glass;ctx.fillRect(2,2,w-4,h-4);
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.font='bold 5px monospace';ctx.fillStyle='#b1a583';ctx.fillText(['TRANSFERS','TAKINGS','WORLD','ACCOUNTS','CALLS','PAYMENTS'][i],6,9);
 screenDot(ctx,w-6,7,1,SCREEN_INK.gold,.35+.25*Math.sin(t/24));
 SCREEN_DISPLAYS[i](ctx,w,h,t+i*47);
 ctx.fillStyle='rgba(2,5,7,.13)';for(let n=12;n<h;n+=3)ctx.fillRect(2,n,w-4,.5);
 const scan=12+(t/5+i*7)%(h-12);ctx.fillStyle='rgba(166,200,186,.045)';ctx.fillRect(2,scan,w-4,2);
 ctx.restore();
}
// A continuous financial tape anchored to the physical brass display, never to the viewport.
function drawTicker(ctx,room,t){
 const corners=CLOSER_TICKER_GLASS,[[left,topLeft],[right,topRight],[,bottomRight],[,bottomLeft]]=corners,w=right-left;
 ctx.save();ctx.beginPath();corners.forEach(([x,y],i)=>i?ctx.lineTo(room+x,y):ctx.moveTo(room+x,y));ctx.closePath();ctx.clip();
 // Preserve the plate's inset glass and texture instead of pasting a flat opaque rectangle over it.
 const glass=ctx.createLinearGradient(0,30,0,47);glass.addColorStop(0,'rgba(5,14,17,.68)');glass.addColorStop(.5,'rgba(12,24,26,.8)');glass.addColorStop(1,'rgba(4,10,13,.68)');
 ctx.fillStyle=glass;ctx.fillRect(room+left,30,w,17);
 ctx.save();const middleLeft=(topLeft+bottomLeft)/2,middleRight=(topRight+bottomRight)/2;
 ctx.transform(1,(middleRight-middleLeft)/w,0,1,room+left,middleLeft);
 ctx.font='bold 8px monospace';ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const value='¥ '+closerTakings().toLocaleString('en-US'),change='▲ +137',metrics=ctx.measureText(value),valueW=metrics.width,changeW=ctx.measureText(change).width;
 const step=valueW+14+changeW+30,offset=(t*.24)%step;
 const baseline=(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2,origin=(w-valueW)/2-offset;
 for(let i=-2;i<=2;i++){
  const at=origin+i*step;ctx.fillStyle='#e2ca8e';ctx.fillText(value,at,baseline);
  ctx.fillStyle='#88b5a0';ctx.fillText(change,at+valueW+14,baseline);
 }
 ctx.restore();
 const x=room+left,edge=ctx.createLinearGradient(x,0,x+w,0);edge.addColorStop(0,'rgba(4,9,11,.85)');edge.addColorStop(.045,'rgba(4,9,11,0)');edge.addColorStop(.955,'rgba(4,9,11,0)');edge.addColorStop(1,'rgba(4,9,11,.85)');ctx.fillStyle=edge;ctx.fillRect(x,30,w,17);
 ctx.restore();
}
export function drawCloserRoom(ctx, camX, damage = 0) {
 const s = G.india, room = ROOM - camX;
 if (room > W || room + 810 < 0 || s?.review?.ambient === false || damage >= 2) return;
 const t = screenClock();
 ctx.save();
 drawTicker(ctx,room,t);
 for (const [i, [sx, sy, sw, sh]] of CLOSER_SCREENS.entries()) {
  if (damage && (i === 1 || i === 4)) continue;
  const x = room + sx;
  if (x > W || x + sw < 0) continue;
  drawScreen(ctx,i,x,sy,sw,sh,t);
 }
 ctx.restore();
}
// The screen wall set: 0 intact (the plate shows through), 1-3 increasingly wrecked by the finisher.
export function drawCloserWall(ctx, camX, state) {
 if (!state) return; const im = ASSETS.cl_wall_set; const x = CLOSER_WALL.x - camX;
 if (!im || x - CLOSER_WALL.w / 2 > W || x + CLOSER_WALL.w / 2 < 0) return;
 const fw = im.width / 4;
 ctx.drawImage(im, clamp(state, 0, 3) * fw, 0, fw, im.height, Math.round(x - CLOSER_WALL.w / 2), CLOSER_WALL.y - CLOSER_WALL.h, CLOSER_WALL.w, CLOSER_WALL.h);
}
