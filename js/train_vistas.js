// Geography changes at cleared route milestones; motion never follows CHAD/camera.
import {W,H,clamp} from './engine.js';
import {ASSETS} from './assets.js';
const kinds=['rural','industry','river'];
const stageAt=x=>x>=7200?2:x>=5280?1:0;
export function resetTrainVista(tr,x=2880){
 if(!tr)return;
 tr.vistaStage=tr.vistaFrom=stageAt(x);tr.vistaBlend=1;
 tr.vistaX=tr.vistaTarget=tr.vistaStage*900;
}
export function updateTrainVista(tr,waves=[],checkpoint=0){
 if(!tr)return;
 if(tr.vistaStage===undefined)resetTrainVista(tr,checkpoint);
 const passed=Math.max(checkpoint,...waves.filter(w=>w.done).map(w=>w.x>=6910?7200:w.x>=4890?5280:2880));
 const next=stageAt(passed);
 if(next>tr.vistaStage){tr.vistaFrom=tr.vistaStage;tr.vistaStage=next;tr.vistaBlend=0;}
 tr.vistaBlend=Math.min(1,tr.vistaBlend+1/240);
 tr.vistaX=tr.vistaTarget=tr.vistaStage*900;
}
export function drawTrainVista(ctx,tr){
 ctx.fillStyle='#101626';ctx.fillRect(0,0,W,H);
 if(!tr||tr.review?.vista===false)return;
 const stage=tr.vistaStage??Math.min(2,Math.floor((tr.vistaX||0)/900));
 const blend=tr.vistaBlend??1,from=tr.vistaFrom??stage;
 const paint=(idx,alpha)=>{
  const im=ASSETS['nr_vista_'+kinds[idx]]||ASSETS['nr_'+kinds[idx]];if(!im)return;
  const width=im.width/2,height=im.height/2,offset=((tr.distance||0)*.16)%width;
  ctx.save();ctx.globalAlpha=alpha;
  for(let x=-offset;x<W;x+=width)ctx.drawImage(im,Math.round(x),-24,width,height);
  ctx.restore();
 };
 paint(blend<1?from:stage,1);
 if(blend<1){const a=clamp(blend,0,1);paint(stage,a*a*(3-2*a));}
 // Authored transparent roadside silhouettes pass faster, below most of the view.
 if(tr.review?.near!==false){
  const near=(idx,alpha)=>{const im=ASSETS['nr_'+kinds[idx]+'_near'];if(!im)return;
   const width=im.width*.4,height=im.height*.4,offset=((tr.distance||0)*.46)%width;
   ctx.save();ctx.globalAlpha=alpha;for(let x=-offset;x<W;x+=width)ctx.drawImage(im,Math.round(x),34,width,height);ctx.restore();};
  near(blend<1?from:stage,1);if(blend<1){const a=clamp(blend,0,1);near(stage,a*a*(3-2*a));}
 }
}
