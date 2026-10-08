import { G } from './engine.js';
// A persistent shape plus a brief local sheen; never a full-character outline.
const INK = Object.freeze({ counter:'#8de39a', reflect:'#8de39a', unblockable:'#ff6569' });
const TOPS=new WeakMap(),ANCHORS=new WeakMap();

// Registered canvases include empty room for low poses. Follow their opaque art,
// rather than the standing hitbox, while keeping each warning's anchor stable.
export function poseAttackMarkerY(img,dy,actor,fallback) {
  if(!img?.getContext)return fallback;
  if(!TOPS.has(img)){
    const a=img.getContext('2d').getImageData(0,0,img.width,img.height).data;
    let top=0;
    for(;top<img.height;top++){
      let pixels=0;
      for(let x=0;x<img.width;x++)if(a[(top*img.width+x)*4+3]>=128)pixels++;
      if(pixels>=3)break;
    }
    TOPS.set(img,top/(img._as||1));
  }
  const foot=actor.y-(actor.z||0),height=foot-(dy+TOPS.get(img)-12),cue=actor.attackCue;
  if(!cue?.on)return Math.round(foot-height);
  let anchor=ANCHORS.get(actor);
  if(!anchor||anchor.at!==cue.at||anchor.cls!==cue.cls)anchor={at:cue.at,cls:cue.cls,height};
  // A rising pose may lift the cue to avoid overlap; it never jitters down again.
  anchor.height=Math.max(anchor.height,height);ANCHORS.set(actor,anchor);
  return Math.round(foot-anchor.height);
}

export function drawAttackAccent(ctx, img, x, y, actor, cls, w=img.width/(img._as||1), h=img.height/(img._as||1)) {
  if (G.reflecting || !INK[cls] || !actor?.attackCue?.on) return;
  const age = G.time - actor.attackCue.at;
  if (age < 0 || age >= 8) return;
  // Brighten only opaque pixels near the forward upper arm. This cannot leave
  // a floating spark, recolour the silhouette, or be mistaken for a damage rim.
  ctx.save();
  const cx=x+w*(actor.face<0?.34:.66),cy=y+h*.37;
  ctx.beginPath();ctx.ellipse(cx,cy,Math.min(13,w*.23),Math.min(12,h*.17),0,0,Math.PI*2);ctx.clip();
  ctx.globalAlpha *= .48*(1-age/8);ctx.filter='brightness(2.1)';
  ctx.drawImage(img,x,y,w,h);ctx.restore();
}

export function drawAttackMarker(ctx, cls, x, y, actor=null) {
  const colour=INK[cls];
  if (!colour) return;
  x=Math.round(x);y=Math.round(y);
  const age=actor?.attackCue?.on?G.time-actor.attackCue.at:99;
  const r=age>=0&&age<5?7:5;
  ctx.save();ctx.lineJoin='miter';ctx.lineCap='square';ctx.beginPath();
  if (cls==='unblockable') {
    ctx.moveTo(x-r,y-r);ctx.lineTo(x+r,y+r);ctx.moveTo(x+r,y-r);ctx.lineTo(x-r,y+r);
  } else {
    ctx.moveTo(x,y-r-1);ctx.lineTo(x+r+1,y);ctx.lineTo(x,y+r+1);ctx.lineTo(x-r-1,y);ctx.closePath();
    ctx.fillStyle='#15221c';ctx.fill();
  }
  ctx.strokeStyle='#101512';ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle=colour;ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
