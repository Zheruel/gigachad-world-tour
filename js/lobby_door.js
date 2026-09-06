import { drawDirectionArrow } from './direction_arrow.js';
export const LOBBY_DOOR = {x:770, y:69, width:114, height:116, center:827, duration:110};
export const nearLobbyDoor = tr => !tr.arriving && !tr.exiting && Math.abs(tr.x - LOBBY_DOOR.center) < 54 && tr.actor.z === 0;
const ease = n => {n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};
export function drawLobbyDoor(ctx,tr,art) {
  if (!tr.exiting) return;
  const {x,y,width,height}=LOBBY_DOOR, cam=tr.cam;
  const p=ease(tr.exiting.t/42);
  if (art.entrance_open) ctx.drawImage(art.entrance_open,x-cam,y,width,height);
  else {ctx.fillStyle='#221c37';ctx.fillRect(x-cam,y,width,height);}
  const leaves=art.entrance_leaves;
  if (!leaves) return;
  // Project the generated brass/glass leaves around their fixed outer hinges.
  for (let side=0;side<2;side++) {
    const hinge=x+side*width-cam, sign=side ? -1 : 1;
    for (let strip=0;strip<57;strip++) {
      const distance=side ? 56-strip : strip;
      const dx=distance*(1-.83*p), inset=distance/57*9*p;
      ctx.drawImage(leaves,side*114+strip*2,0,2,232,
        hinge+sign*dx-(side?1:0),y+inset,Math.max(1,1-.83*p),height-inset*2);
    }
  }
}
export function drawLobbyDoorArrow(ctx,tr) {
  if (nearLobbyDoor(tr)) drawDirectionArrow(ctx,{x:LOBBY_DOOR.center-tr.cam,y:104,direction:'down',size:18,time:tr.t,bob:1});
}
