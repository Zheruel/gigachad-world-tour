// Ghee Pappu's sound cues (samples built by tools/production/build_pappu_audio.py, sources in audio/sources/pappu).
// One table names every cue: its sample variants (rotated, never the same one twice running), play volume, a minimum gap in
// ticks so a cue can never machine-gun, and `lead` - how many ticks BEFORE the on-screen beat the caller fires it, so the
// sample's main peak (manifest peakMs) lands on the frame. `swell` marks whooshes and roars that build on purpose.
// tools/verification/pappu_sound_check.cjs holds the table, the manifest and the fight to each other.
import {G,clamp} from './engine.js';

const S=(n,k)=>Array.from({length:k},(_,i)=>`vendor_${n}_${i+1}`);
export const PAPPU_CUES=Object.freeze({
 // intro: frying, plating the name
 fry_pop:{s:S('fry_pop',3),v:.3,gap:3},
 stir:{s:S('stir',2),v:.3,gap:20,swell:true},
 ladle_in:{s:['vendor_ladle_in'],v:.34,gap:20},
 chew:{s:S('chew',3),v:.3,gap:6},
 spit:{s:['vendor_spit'],v:.4},
 step:{s:S('step',2),v:.26,gap:6},
 cloth_hitch:{s:['vendor_cloth_1'],v:.4},
 cloth_wipe:{s:['vendor_cloth_2','vendor_cloth_3'],v:.35,gap:6},
 skimmer_slap:{s:S('skimmer_slap',2),v:.5,gap:6},
 burp:{s:['vendor_burp'],v:.5,fb:()=>G.audio.burp?.(.45)},
 plant:{s:['vendor_plant'],v:.6},
 roar_intro:{s:['vendor_roar_intro'],v:.5,swell:true},
 // his attacks
 swing:{s:S('swing',3),v:.5,gap:6,lead:3,jit:.07},
 swing_big:{s:['vendor_swing_big'],v:.55,gap:10,lead:7,swell:true},
 raise:{s:['vendor_raise'],v:.4,gap:10,swell:true},
 slam:{s:S('slam',2),v:.75,gap:12},
 rip:{s:['vendor_rip'],v:.5,swell:true},
 strain:{s:S('strain',2),v:.4,gap:12,swell:true},
 naan_throw:{s:S('naan_throw',3),v:.45,gap:8},
 naan_slap:{s:['vendor_naan_slap'],v:.55},
 fling:{s:S('fling',3),v:.5,gap:8,lead:3},
 oil_land:{s:S('oil_land',2),v:.32,gap:2,jit:.12,swell:true},
 scald:{s:['vendor_scald'],v:.55,swell:true},
 inhale:{s:['vendor_inhale'],v:.4,gap:20,swell:true},
 breath:{s:['vendor_breath'],v:.6,gap:30,swell:true},
 cough:{s:S('cough',4),v:.5,gap:14},
 wheeze:{s:['vendor_wheeze'],v:.35,swell:true},
 grunt:{s:S('grunt',3),v:.45,gap:8,swell:true},
 flop_air:{s:['vendor_flop_air'],v:.4,gap:20,swell:true},
 flop_land:{s:S('flop_land',2),v:.9,gap:20},
 groan:{s:S('groan',2),v:.4,gap:20,swell:true},
 bump_whoosh:{s:['vendor_bump_whoosh'],v:.4,gap:8,lead:3},
 belly:{s:S('belly',2),v:.75,gap:6},
 crush:{s:['vendor_crush'],v:.8},
 // reactions
 guard:{s:S('guard',3),v:.5,gap:3},
 hurt:{s:S('hurt',4),v:.45,gap:20},
 chuckle:{s:['vendor_chuckle'],v:.4,swell:true},
 // phase changes: the chilli, the fire, the roars
 bottle:{s:['vendor_bottle'],v:.4},
 glug:{s:S('glug',3),v:.45,gap:8,swell:true},
 spicy:{s:['vendor_spicy'],v:.5,swell:true},
 flare:{s:['vendor_flare'],v:.55,gap:20,swell:true},
 roar_spicy:{s:['vendor_roar_spicy'],v:.75,swell:true},
 roar_last:{s:['vendor_roar_last'],v:.8,swell:true},
 // the finisher
 gut_jab:{s:S('gut_jab',2),v:.6},
 gut_hook:{s:S('gut_hook',2),v:.75},
 rib_crack:{s:['vendor_rib_crack'],v:.8},
 vest_grab:{s:['vendor_vest_grab'],v:.5,swell:true},
 fling_cook:{s:['vendor_fling_cook'],v:.6,swell:true},
 dunk:{s:['vendor_dunk'],v:.85,swell:true},
 scream_dunk:{s:['vendor_scream_dunk'],v:.55,swell:true},
 thrash:{s:['vendor_thrash'],v:.45,jit:.1},
 scream_pop:{s:['vendor_scream_pop'],v:.5},
 land_butt:{s:['vendor_land_butt'],v:.8},
 jaw_break:{s:['vendor_jaw_break'],v:1},
 scream_air:{s:['vendor_scream_air'],v:.55,swell:true},
 counter_crack:{s:['vendor_counter_crack'],v:1},
 sizzle_back:{s:['vendor_sizzle_back'],v:.4,swell:true},
 roll:{s:['vendor_roll'],v:.4,swell:true},
 scorch:{s:['vendor_scorch'],v:.7,swell:true},
 drop_street:{s:['vendor_drop_street'],v:.8},
 kadai_tip:{s:['vendor_kadai_tip'],v:.6,swell:true},
 ghee_spill:{s:['vendor_ghee_spill'],v:.9,swell:true},
 pot_clang:{s:['vendor_pot_clang'],v:.9},
 pot_jam:{s:['vendor_pot_jam'],v:.6},
 crowd_ooh:{s:['vendor_crowd_ooh'],v:.28,swell:true},
 exhale:{s:['vendor_exhale'],v:.4,swell:true},
});

const last=Object.create(null),lastVar=Object.create(null);
// Plays a cue. x (world) pans it a little toward where it happens. vol scales the table's volume;
// opt.gap overrides the cue's minimum gap and opt.i picks a variant. Returns the sample name, or '' if it held off.
export function pappu(name,x,vol=1,opt){
 const c=PAPPU_CUES[name];if(!c)return '';
 const now=G.rawTime??0,gap=opt?.gap??c.gap??0;
 if(gap&&now-(last[name]??-1e9)<gap&&now>=(last[name]??-1e9))return '';
 last[name]=now;
 let i=opt?.i!=null?opt.i%c.s.length:Math.floor(Math.random()*c.s.length);
 if(opt?.i==null&&c.s.length>1&&i===lastVar[name])i=(i+1+Math.floor(Math.random()*(c.s.length-1)))%c.s.length;
 lastVar[name]=i;
 const s=c.s[i],v=c.v*vol,pan=x==null?0:clamp((x-(G.camX||0)-240)/700,-.3,.3),rate=1+(Math.random()-.5)*(c.jit??.05);
 if(!(G.audio.roomSfxAt?.(s,v,pan,rate)||G.audio.roomSfx?.(s,v))&&c.fb)c.fb();
 if(G.pappuLog)G.pappuLog.push({name,sample:s,t:now,vol:v});
 return s;
}
// The kadai's ambience under the fight: called every tick he is alive, it holds the loop; a few ticks without a call (paused,
// cinematic, left the stage) and audio.js fades it out on its own. audio.stopRoomAudio (pause menu quit, checkpoint, finisher) kills it.
export function pappuBed(vol,name='vendor_bed'){return !!G.audio.roomLoop?.(name,vol);}
export function pappuBedStop(fade=.5,name='vendor_bed'){G.audio.stopRoomLoop?.(name,fade);}
// Forget cue history (a new encounter).
export function pappuReset(){for(const k in last)delete last[k];for(const k in lastVar)delete lastVar[k];}
