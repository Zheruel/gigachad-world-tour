// Night Train boss dispatcher: each boss owns its patterns in its own module; the shared boss machine
// (bosses.js) handles guard, parry openings, knockdowns and supers.
import {conductor} from './train_conductor.js';
import {neta} from './train_neta.js';
export function initTrainBoss(b){const own=b.key==='neta'?neta:b.key==='conductor'?conductor:null;if(own){b.delhi=own;own.init(b);}}
