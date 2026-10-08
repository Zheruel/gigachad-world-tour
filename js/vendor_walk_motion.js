// Whole painted poses: no torso replacement, horizontal slice, or independent leg shifting.
import {getFrame} from './sprites.js';
export const VENDOR_WALK_CELLS=15,VENDOR_WALK_STRIDE=88,VENDOR_WALK_SETTLE=12;
export function vendorWalkMotion(set,index,face,settle=0,progress=.5){
 const i=((index%VENDOR_WALK_CELLS)+VENDOR_WALK_CELLS)%VENDOR_WALK_CELLS;
 if(settle>=1)return getFrame(set,'demon_idle3',0,face);
 if(settle>1/3){
  const family=i<8?'demon_walk_stop':'demon_walk_stop_far';
  const stop=getFrame(set,family,settle<2/3?0:1,face);if(stop)return stop;
 }
 const base=getFrame(set,'demon_walk3',i,face);if(!base)return null;
 return base;
}
