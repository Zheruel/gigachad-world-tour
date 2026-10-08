import { G, W } from './engine.js';
import { enemyCueOn, attackClass } from './enemies.js';
import { PARRY_CLASS } from './bosslib.js';
import { vendorCueOn } from './vendor_boss.js';
import { dredgerCueOn, dredgerGrabWarning } from './delhi_dredger.js';
import { conductorCueOn } from './train_conductor.js';
import { netaCueOn } from './train_neta.js';
import { closerVisibleCue } from './refund_boss_presentation.js';
import { closerCueClass } from './refund_boss_timing.js';

const lastSound = {green:-999,red:-999};
function update(actor,on,cls) {
  on=!!on&&!actor.dead&&!actor.superLocked&&['counter','reflect','unblockable'].includes(cls);
  const old=actor.attackCue,colour=cls==='unblockable'?'red':'green';
  const begin=on&&(!old?.on||old.cls!==cls);
  actor.attackCue={on,cls,at:begin?G.time:old?.at??-999};
  if(begin&&actor.x>=G.camX-24&&actor.x<=G.camX+W+24&&
    (G.time-lastSound[colour]>=12||G.time<lastSound[colour])) {
    lastSound[colour]=G.time;
    G.audio?.sfx(colour==='red'?'warn_evade':'warn_parry',.45);
  }
}

// Simulation owns onsets and audio; drawing/pausing/seeking never replays a cue.
export function updateCombatWarnings() {
  for(const e of G.enemies)update(e,enemyCueOn(e),attackClass(e));
  const b=G.boss;if(!b)return;
  let on=false,cls=PARRY_CLASS[b.pattern]||'counter';
  if(b.key==='vendor')on=vendorCueOn(b);
  else if(b.key==='neta')on=netaCueOn(b);
  else if(b.key==='conductor')on=conductorCueOn(b);
  else if(b.key==='closer'){on=closerVisibleCue(b);cls=closerCueClass(b);}
  else if(b.key==='dredger'){
    if(b.phase==='machine')({on,cls}=dredgerGrabWarning(b,b));
    else on=dredgerCueOn(b);
    if(b.grab){const g=dredgerGrabWarning(b,b.grab);update(b.grab,g.on,g.cls);}
  } else on=b.state==='windup'&&b.t>6;
  update(b,on,cls);
}
