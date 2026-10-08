import { REFUND_GAITS } from './refund_gait_data.js';

export const refundGait=(key,pushing=false)=>REFUND_GAITS[key]?.[pushing?'push':'walk'];
export function refundGaitContactDistance(key,distance,pushing=false){
 const gait=refundGait(key,pushing);
 if(!gait||distance<=0)return distance;
 const stride=gait.beat.reduce((a,b)=>a+b,0),candidates=[];
 let at=0;
 for(let i=0;i<gait.beat.length;i++){
  if(gait.contacts.includes(i))for(let cycle=0;cycle<=Math.ceil(distance/stride);cycle++)candidates.push(at+gait.beat[i]/2+cycle*stride);
  at+=gait.beat[i];
 }
 return candidates.reduce((best,d)=>Math.abs(d-distance)<Math.abs(best-distance)?d:best);
}
// Slightly shorten or lengthen the final stride to land at the movement target.
// Signed clocks also fit a retreat; the source frames run in reverse naturally.
export function refundGaitAimScale(key,clock,remaining,direction=1){
 const gait=refundGait(key);
 if(!gait||remaining<=.01||remaining>120)return 1;
 const target=clock+direction*remaining;
 if(gait.contacts.includes(refundGaitFrame(key,target)))return 1;
 const stride=gait.beat.reduce((a,b)=>a+b,0),base=Math.floor(clock/stride),candidates=[];
 let at=0;
 for(let i=0;i<gait.beat.length;i++){
  if(gait.contacts.includes(i))for(let cycle=base-2;cycle<=base+2;cycle++){
   const d=at+gait.beat[i]/2+cycle*stride;
   if((d-clock)*direction>0)candidates.push(d);
  }
  at+=gait.beat[i];
 }
 const fits=candidates.filter(d=>{const k=(d-clock)/(direction*remaining);return k>=.8&&k<=1.25;});
 const choices=fits.length?fits:candidates;
 const end=choices.reduce((best,d)=>Math.abs(d-target)<Math.abs(best-target)?d:best);
 return Math.max(.8,Math.min(1.25,(end-clock)/(direction*remaining)));
}
export function refundGaitContactTravel(key,clock,direction=1){
 const gait=refundGait(key);
 if(!gait||gait.contacts.includes(refundGaitFrame(key,clock)))return 0;
 const stride=gait.beat.reduce((a,b)=>a+b,0),base=Math.floor(clock/stride);let at=0,best=Infinity;
 for(let i=0;i<gait.beat.length;i++){
  if(gait.contacts.includes(i))for(let cycle=base-2;cycle<=base+2;cycle++){
   const edge=direction>0?.25:gait.beat[i]-.25,d=(at+edge+cycle*stride-clock)*direction;
   if(d>0)best=Math.min(best,d);
  }
  at+=gait.beat[i];
 }
 return best;
}
export function refundGaitFrame(key,distance,pushing=false,count=20){
 const beat=refundGait(key,pushing)?.beat;
 if(!beat||beat.length!==count)return Math.floor(distance/5.4+count*100000)%count;
 const total=beat.reduce((a,b)=>a+b,0);let at=((distance%total)+total)%total,i=0;
 while(at>=beat[i])at-=beat[i++];
 return i;
}
