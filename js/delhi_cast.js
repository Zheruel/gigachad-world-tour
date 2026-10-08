// Approved Delhi performances, timed to the existing contact and recovery ticks.
import { hasAIState } from './aiframes.js';
import { G } from './engine.js';
import { GREEN_FOLLOWUP } from './combat_readability.js';

const at = (t, beats) => beats.find(([end]) => t < end)?.[1] ?? beats.at(-1)[1];
const pose = (name, idx, extra = {}) => ({ name, idx, ...extra });

export function delhiCastPose(e, name, idx, wind) {
  if (!hasAIState(e.set._aiKey, 'revamp_idle')) return null;
  const t = e.t, m = e.move;
  if (e.stanceAt != null && G.time - e.stanceAt < 10 && ['idle', 'approach', 'backoff', 'windup'].includes(e.state))
    return pose('stance_settle', Math.min(4, (G.time - e.stanceAt) >> 1));
  if (e.state === 'hurt') return pose('hurt', (e.hurtN || 0) & 1);
  if (e.state === 'reseal') return pose('reseal', at(t, [[14, 0], [36, 1], [50, 2]]));
  if (e.state === 'snatch') return t < 14 ? pose('snatch', +(t >= 7)) : pose('taunt', 0);
  if (e.state === 'stuck' && e.trainType === 'ic_enforcer') return pose('stuck', +(t >= 36));
  if (e.state === 'stuck' && e.trainType === 'ic_heavy') return pose('stuck', +(t >= 12));
  if (e.state === 'grabhold') return pose('grab', 1);
  if (e.state === 'windup') {
    if (m === 'string') return pose('string_full', 0);
    if (m === 'kick') return pose('kick', +(t >= wind - 7));
    if (m === 'drive') return pose('drive', +(t >= wind - 4));
    if (m === 'slam') return t < wind - 12 ? pose('charge', (t >> 3) & 1) : pose('slam', 0);
    if (m === 'jet') return pose('whistle', Math.min(2, Math.floor(t / 16)));
    if (m === 'toss') return pose('throw', +(t >= wind - 5));
    if (m === 'wrench') return pose('wrench', +(t >= wind / 2));
    if (m === 'ladle') return pose('ladle', 0);
    if (m === 'shove' || m === 'barge' || m === 'cram') return pose(m === 'cram' ? 'ram' : m, 0);
  }
  if (e.state === 'attack') {
    // His green follow-up is the two-palm shove, with its own coil and return.
    if (m === 'string') return t < 10 ? pose('string_full', at(t, [[3, 0], [7, 1], [10, 2]]))
      : pose('shove', at(t, [[GREEN_FOLLOWUP - 1, 0], [GREEN_FOLLOWUP + 3, 1], [GREEN_FOLLOWUP + 7, 2], [GREEN_FOLLOWUP + 11, 3]]));
    if (m === 'kick') return pose('kick', at(t, [[3, 2], [16, 3], [21, 4], [27, 5], [31, 6]]),
      { lift: t < 21 ? Math.round(14 * Math.sin(Math.PI * t / 21)) : 0 });
    if (m === 'drive') return pose('drive', at(t, [[2, 0], [6, 1], [11, 2], [16, 3], [22, 4], [27, 5]]));
    if (m === 'slam') return pose('slam', at(t, [[4, 0], [8, 1], [11, 2], [14, 3]]));
    if (m === 'jet') return pose('jet', Math.min(2, Math.floor(t / 2)));
    if (m === 'ladle') return pose('ladle', at(t, [[5, 1], [9, 2], [14, 3], [19, 4]]));
    if (m === 'toss') return pose('throw', at(t, [[3, 0], [7, 1], [11, 2], [15, 3], [18, 4], [21, 5]]));
    if (m === 'wrench') return pose('wrench', at(t, [[5, 2], [10, 3], [14, 4], [18, 5], [21, 6]]));
    if (m === 'shove') return pose('shove', at(t, [[5, 0], [10, 1], [16, 2], [21, 3]]));
    if (m === 'barge') return pose('barge', at(t, [[3, 0], [12, 1], [20, 2], [27, 3]]));
    if (m === 'cram') return pose('ram', Math.abs(e.vx) > .6 ? 1 + ((e.stridePhase / 6 | 0) & 1) : 3);
  }
  if (e.trainType === 'ic_heavy' && e.rig && !e.rig.broken && !e.cartBroken && !e.cartReleased &&
      (name === 'walk' || name === 'idle')) return pose(name === 'walk' ? 'push' : 'push_idle', name === 'walk' ? idx : idx & 1);
  return null;
}
