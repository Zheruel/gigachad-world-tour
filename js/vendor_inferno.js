// Enraged material lighting on approved poses, and the mutated cook’s live heat.
import {G,clamp} from './engine.js';
import {panFire} from './vendor_kitchen_life.js';
const HOT=new WeakMap(),SPICY=new WeakMap();
export function vendorSpicyFrame(f){
 if(!f||typeof document==='undefined')return f;if(SPICY.has(f))return SPICY.get(f);
 const c=document.createElement('canvas');c.width=f.width;c.height=f.height;const x=c.getContext('2d');x.drawImage(f,0,0);const d=x.getImageData(0,0,c.width,c.height),a=d.data;
 for(let i=0;i<a.length;i+=4){const r=a[i],g=a[i+1],b=a[i+2];if(!a[i+3]||r-g<24||g-b<10||g<38)continue;a[i]=clamp(r*1.03+7,0,255);a[i+1]=g*.73+r*.055;a[i+2]=b*.78+3;}
 x.putImageData(d,0,0);c._as=f._as;SPICY.set(f,c);return c;
}
export function vendorHotFrame(f){
 if(!f||typeof document==='undefined')return f;if(HOT.has(f))return HOT.get(f);
 const c=document.createElement('canvas');c.width=f.width;c.height=f.height;const x=c.getContext('2d');x.drawImage(f,0,0);
 const d=x.getImageData(0,0,c.width,c.height),a=d.data;
 // Warm skin only: keep blue cloth, grey hair, iron and the red checked towel intact.
 for(let i=0;i<a.length;i+=4){const r=a[i],g=a[i+1],b=a[i+2];if(!a[i+3]||r-g<28||g-b<12||g<38)continue;
  a[i]=clamp(r*1.07+8,0,255);a[i+1]=g*.48+r*.12;a[i+2]=b*.50+5;
 }
 x.putImageData(d,0,0);c._as=f._as;HOT.set(f,c);return c;
}
export function drawVendorHeat(ctx,b,x,y){
 if(!b.inferno||b.dead||G.reflecting)return;
 // Low flames trail the shoulders; the face, feet and shared warnings stay clear.
 const up=b.state==='flopped'?18:b.state==='flop'&&b.t>=8?26:b.state==='flopup'?18+40*clamp(b.t/26,0,1):58;
 const pulse=.7+.3*Math.sin(G.time*.45);panFire(ctx,x-b.face*16,y-up,.20*pulse);panFire(ctx,x-b.face*22,y-up+24,.14);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='#ffae4d';
 for(let i=0;i<5;i++){const age=(G.time+i*11)%31;ctx.globalAlpha=(1-age/31)*.65;ctx.fillRect(Math.round(x+(i-2)*7+Math.sin(age*.2)*3),Math.round(y-up+13-age*1.2),1,2);}
 ctx.restore();
}
