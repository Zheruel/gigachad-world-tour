// Authored room apertures, working ventilation and near-camera architecture.
import { G, W, H } from './engine.js';
import { ASSETS } from './assets.js';
import { REFUND_FANS } from './refund_layout.js';

const DIR='assets/stages/refund_tower/overhaul';
export const REFUND_SCENERY_FILES={
 ...Object.fromEntries(['wall','cooling','ceiling'].map(n=>[`ic_refund_fan_${n}`,`${DIR}/fan-${n}.png`])),
 ...Object.fromEntries(['office','calling','servers','records','executive','closer'].map(n=>[`ic_refund_front_${n}`,`${DIR}/front-${n}.png`])),
};
export function drawRefundPanel(ctx,name,x,camX){
 const base=ASSETS[`ic_refund_${name}`];
 if(base)ctx.drawImage(base,Math.round(x),0,810,H);
}
export function drawRefundFixtures(ctx,camX){
 const s=G.india;if(G.stage?.id!=='refund'||!s||s.review?.ambient===false||s.review?.environment===false)return;
 for(const [room,family,local,y,w,h,phase]of REFUND_FANS){
  const x=room*810+local-camX,im=ASSETS[`ic_refund_fan_${family}`];
  if(!im||x<-w||x>W+w)continue;
  const i=(Math.floor(s.t/(family==='ceiling'?7:5))+phase)%8,fw=im.width/8;
  ctx.drawImage(im,i*fw,0,fw,im.height,Math.round(x-w/2),Math.round(y-h/2),w,h);
 }
}
export function drawRefundForeground(ctx,camX){
 const s=G.india;if(G.stage?.id!=='refund'||!s||s.review?.environment===false||s.review?.foreground===false)return;
 const names=['office','office','calling','calling','servers','records','executive','closer'];
 for(let room=0;room<8;room++){
  const x=Math.round(room*810-camX*1.035),im=ASSETS[`ic_refund_front_${names[room]}`];
  if(!im||x>W||x+810<0)continue;
  const h=im.height/2;
  // Only the upper border: no faces, telegraphs, feet or furniture contacts covered.
  ctx.drawImage(im,x,-Math.max(8,h-19),810,h);
 }
}
