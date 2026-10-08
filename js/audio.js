// audio.js - WebAudio chiptune (2 square + triangle bass + noise drums) + SFX.
// If audio/manifest.json lists a real file for a slot, that file plays instead.

import {PAPPU_SFX} from './vendor_sound_bank.js';
import { LOAD_ALL, track } from './loading.js';
let ac = null, master = null, musicGain = null, sfxGain = null;
let unlocked = false;

// Rank announcements and Duke cues keep stable IDs; explicit paths preserve the original performances:
// rank_* are the announcer, two takes per rank (see engine.js RANKS).
// Duke lines belong to character reactions, entrances and victories.
export const VOICE_SLOTS = {
  rank: ['dismal', 'crazy', 'badass', 'apocalyptic', 'savage', 'sickskills', 'sss'].flatMap((r) => [`rank_${r}_1`, `rank_${r}_2`]),
  combo: ['duke_combo_1', 'duke_combo_2', 'duke_combo_3', 'duke_combo_4', 'duke_combo_5', 'duke_combo_6'],
};
// Real Streets of Rage 2 samples, decoded once and played through sfxGain.
// Any slot without a file silently falls back to the synthesized version below,
// so the game still has full audio if audio/sfx/ is missing.
const SFX_FILES = [
  'duke_who_wants_some','duke_turn_up_heat','duke_safety_inspections','duke_checks_cash',
  'duke_time_to_crash_this_party','duke_failure_to_communicate','duke_crispy_critter','duke_terminated','duke_suck_it_down','duke_eat_that','duke_games_named',
  'duke_bring_it_on','duke_bring_pain','duke_quit_wastin','duke_seams','duke_train_nowhere','duke_blow_joint','duke_getting_off','duke_rest_pieces','train_blast','train_approach','train_brake','train_arrive','charge_arm','remote_click',
  'room_shaker','room_page','room_pen','room_stamp','room_glass','room_chair',
  'refund_ring','refund_terminal','refund_cooling',
  // Shera finisher: the rib/jaw crack layer (audio/sfx/manifest.json composite)
  'bone_crack',
  // finisher punchlines picked from the Duke archive (audio/voice/duke/catalog.json)
  'duke_swallow_this','duke_price_wrong','duke_payback','duke_ahead','duke_aisle_four',
  // the lair lion's growl (tools/production/build_lion_audio.py)
  'lion_growl',
  // rooftop Netaji: squeaky SOR2 voice, body thuds and revolver/cash Foley (tools/production/build_neta_roof_audio.py)
  'neta_roof_yelp1','neta_roof_yelp2','neta_roof_yelp3','neta_roof_whimper','neta_roof_beg','neta_roof_laugh','neta_roof_scream','neta_roof_ko',
  'neta_roof_thud','neta_roof_whip','neta_roof_click','neta_roof_spin','neta_roof_drop','neta_roof_snap','neta_roof_cash','neta_roof_step','neta_roof_gulp',
  // the Head Conductor: Final Fight voices and office Foley (tools/production/build_conductor_audio.py)
  'cond_grunt_1','cond_grunt_2','cond_grunt_3','cond_hurt_1','cond_hurt_2','cond_yell','cond_laugh','cond_fall','cond_ohno','cond_whistle',
  'cond_crash','cond_box_hit','cond_thud','cond_stamp','cond_ink','cond_punch','cond_note_1','cond_note_2','cond_coins_1','cond_coins_2',
  'cond_chain_1','cond_chain_2','cond_latch','cond_lid','cond_scrape','cond_chair','cond_step_1','cond_step_2','cond_desk','cond_clatter','cond_papers',
  'cond_coin_tick','cond_box_drop','cond_swing',
  // Shera and Netaji in the private carriage (audio/sfx/manifest.json composites, SOR2 bank)
  'shera_step','shera_grunt','shera_heave','shera_hammer','shera_quake','shera_roar','shera_hurt','shera_hurt2','shera_squeeze',
  'shera_chain','shera_snag','shera_ko','neta_laugh','neta_gloat','neta_heckle','neta_cash','neta_paid','neta_denied',
  // Delhi finale explosions (tools/production/build_finale_audio.py, Final Fight bank)
  'finale_blast_big','finale_blast_a','finale_blast_b','finale_blast_glass','finale_pop','finale_crackle','finale_gore',
  'punch', 'heavy', 'kick', 'whiff', 'land', 'slam', 'ko', 'throw', 'grab', 'break', 'break_wood', 'break_metal',
  'dialogue_typing', 'entrance_slam', 'entrance_heavy',
  'dash', 'jump', 'pickup', 'pickup_health', 'blip', 'armor', 'enrage', 'super', 'phurt',
  'pistol', 'super_electric', 'conductor_whistle', 'weapon', 'go', 'advance', 'warn_parry', 'warn_evade', 'duke_quote', 'duke_come_get_some', 'duke_gotta_hurt',
  'duke_back_to_work', 'duke_book_em', 'duke_too_easy', 'duke_hail', 'duke_look_good', 'parry',
  'entrance_engine', 'entrance_skid', 'entrance_boot', 'entrance_stand',
  'entrance_birds', 'entrance_crack',
  // PCM contact impacts (ehurt aliases retained for authored sequences) and KO voices.
  'ehurt1', 'ehurt2', 'ehurt3', 'ehurt4', 'edie1', 'edie2', 'bdie',
  // Drop-in slots. Every name here is optional: a missing file is skipped by loadSFX
  // and the caller falls through to whatever it has.
  ...VOICE_SLOTS.rank, ...VOICE_SLOTS.combo, 'duke_lets_rock', 'duke_ride', 'duke_game_over',
  // Ghee Pappu's fight, intro and finisher (tools/production/build_pappu_audio.py; cues in js/vendor_sound.js)
  ...PAPPU_SFX,
  // The dredger's diesel bed (tools/production/build_dredger_audio.py).
  'dredger_engine','zippo_open','zippo_close','magnet_hum','magnet_zap','magnet_clang','magnet_chain','rig_klaxon','rig_surge',
];
const SFX_PATHS = {
  duke_who_wants_some:'audio/voice/duke/combat/who_wants_some.mp3',
  duke_turn_up_heat:'audio/voice/duke/explosions/time_to_turn_up_the_heat.mp3',
  duke_safety_inspections:'audio/voice/duke/reactions/something_tells_me_this_won_t_pass_any_safety_inspections.mp3',
  duke_checks_cash:'audio/voice/duke/threats/you_been_writin_checks_your_ass_can_t_cash.mp3',
  duke_time_to_crash_this_party:'audio/voice/duke/entrances/time_to_crash_this_party.mp3',
  duke_failure_to_communicate:'audio/voice/duke/reactions/what_we_ve_got_here_is_a_failure_to_communicate.mp3',
  duke_crispy_critter:'audio/voice/duke/explosions/that_s_one_crispy_critter.mp3',
  duke_terminated:'audio/voice/duke/victory/terminated.mp3',
  duke_suck_it_down:'audio/voice/duke/combat/suck_it_down.mp3',
  duke_eat_that:'audio/voice/duke/combat/eat_that.mp3',
  duke_bring_it_on: 'audio/voice/duke/combat/bring_it_on.mp3',
  duke_quit_wastin: 'audio/voice/duke/threats/quit_wastin_my_time.mp3',
  duke_seams: 'audio/voice/duke/explosions/looks_like_you_re_comin_apart_at_the_seams.mp3',
  duke_swallow_this: 'audio/voice/duke/combat/swallow_this.mp3',
  duke_price_wrong: 'audio/voice/duke/combat/the_price_is_wrong_bitch.mp3',
  duke_payback: 'audio/voice/duke/threats/hmhmhm_payback_time.mp3',
  duke_ahead: 'audio/voice/duke/victory/looks_like_you_ve_gotten_ahead_of_yourself_there.mp3',
  duke_aisle_four: 'audio/voice/duke/explosions/looks_like_clean_up_on_aisle_four.mp3',
  bone_crack: 'audio/sfx/bone_crack.wav',
  duke_bring_pain: 'audio/voice/duke/combat/bring_the_pain.mp3',
  duke_ride: 'audio/voice/duke/entrances/looks_like_i_m_going_for_a_ride_game_take.wav',
  duke_lets_rock: 'audio/voice/duke/entrances/let_s_rock_game_take.wav',
  duke_game_over: 'audio/voice/duke/victory/game_over_game_take.wav',
  duke_combo_6: 'audio/voice/duke/combat/looks_like_i_tattooed_your_face_with_my_fist_game_take.wav',
  duke_combo_5: 'audio/voice/duke/combat/eat_that_game_take.wav',
  duke_combo_4: 'audio/voice/duke/reactions/holy_cow_game_take.wav',
  duke_combo_3: 'audio/voice/duke/victory/bitchin_game_take.wav',
  duke_combo_2: 'audio/voice/duke/victory/damn_i_m_good_game_take.wav',
  duke_combo_1: 'audio/voice/duke/reactions/groovy_game_take.wav',
  duke_getting_off: 'audio/voice/duke/reactions/looks_like_i_m_gettin_off_here.mp3',
  duke_rest_pieces: 'audio/voice/duke/explosions/rest_in_pieces.mp3',
  duke_train_nowhere: 'audio/voice/duke/reactions/this_train_is_goin_nowhere_fast.mp3',
  duke_blow_joint: 'audio/voice/duke/explosions/time_to_blow_this_joint.mp3',
  duke_quote: 'audio/voice/duke/entrances/it_s_time_to_kick_ass_and_chew_bubble_gum_and_i_m_all_out_of_gum_game_take.wav',
  duke_come_get_some: 'audio/voice/duke/combat/come_get_some_game_take.wav',
  duke_gotta_hurt: 'audio/voice/duke/reactions/ooh_that_s_gotta_hurt_game_take.wav',
  duke_back_to_work: 'audio/voice/duke/reactions/get_back_to_work_you_slacker_game_take.wav',
  duke_book_em: 'audio/voice/duke/victory/mmm_book_em_dan_o_game_take.wav',
  duke_too_easy: 'audio/voice/duke/victory/too_easy.mp3',
  duke_hail: 'audio/voice/duke/victory/hail_to_the_king_baby_game_take.wav',
  duke_games_named: 'audio/voice/duke/victory/this_is_why_i_have_games_named_after_me.mp3',
  // the mirror. Missing files are skipped silently by loadSFX, so the flex just plays no
  // line until this one is dropped in - nothing else has to change.
  duke_look_good: 'audio/voice/duke/victory/damn_i_m_looking_good_game_take.wav',
  parry: 'audio/sfx/parry.wav',
  entrance_engine: 'audio/sfx/entrance_engine.wav',
  entrance_skid: 'audio/sfx/entrance_skid.wav',
  entrance_boot: 'audio/sfx/entrance_boot.wav',
  entrance_stand: 'audio/sfx/entrance_stand.wav',
  entrance_birds: 'audio/sfx/entrance_birds.wav',
  entrance_crack: 'audio/sfx/entrance_crack.wav',
};
function isVoice(name) { return name.startsWith('duke_') || name.startsWith('rank_'); }
// The preferred PCM impacts are mixed separately from the legacy movement/UI cues.
const SFX_VOLUME = Object.freeze({punch:.65,heavy:1.25,kick:.85,armor:.33});
const samples = {};      // name -> AudioBuffer
let sampleBytes = null;  // name -> ArrayBuffer, fetched before the context exists
let entranceBike = null;
let travelSound = null;

const roomSources = new Set();
const roomLoops = new Map();  // name -> {node,gain,volume,beat}: sample beds held by a caller's heartbeat
let loopTimer = 0;
function stopRoomAudio() {
  for (const node of roomSources) {try {node.stop();} catch (_) {} node.disconnect();}
  roomSources.clear();roomLoops.clear();
}
// A looping bed (a kadai's frying) that lives only while somebody keeps calling roomLoop: every call is a heartbeat, and a bed
// that misses ~.6 s of the audio clock (the context stops it when the game is paused) fades out by itself.
function roomLoop(name, volume = .2, fade = .8, offset = null) {
  if (!ac || !unlocked || !samples[name]) return false;
  const now = ac.currentTime;let l = roomLoops.get(name);
  if (!l) {
    const node = ac.createBufferSource(), gain = ac.createGain();
    node.buffer = samples[name];node.loop = true;gain.gain.setValueAtTime(0, now);gain.gain.linearRampToValueAtTime(volume, now + fade);
    node.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start(0, offset ?? Math.random() * node.buffer.duration * .5);
    l = {node, gain, volume, beat: now};roomLoops.set(name, l);
    if (!loopTimer) loopTimer = setInterval(reapLoops, 250);
  } else if (l.volume !== volume) {
    l.gain.gain.cancelScheduledValues(now);l.gain.gain.setTargetAtTime(volume, now, .25);l.volume = volume;
  }
  l.beat = now;return true;
}
function endLoop(name, fade = .5) {
  const l = roomLoops.get(name);if (!l || !ac) return;
  roomLoops.delete(name);const now = ac.currentTime;
  l.gain.gain.cancelScheduledValues(now);l.gain.gain.setValueAtTime(l.gain.gain.value, now);l.gain.gain.linearRampToValueAtTime(0, now + fade);
  try {l.node.stop(now + fade + .03);} catch (_) {}
  l.node.onended = () => {roomSources.delete(l.node);l.node.disconnect();l.gain.disconnect();};
}
function reapLoops() {
  if (ac && ac.state === 'running') for (const [name, l] of roomLoops) if (ac.currentTime - l.beat > .6) endLoop(name, .4);
  if (!roomLoops.size) {clearInterval(loopTimer);loopTimer = 0;}
}
function roomSample(name,volume=1,maxDuration=Infinity,pan=0,rate=1) {
  if(!ac||!unlocked||!samples[name])return false;
  const node=ac.createBufferSource(),gain=ac.createGain();node.buffer=samples[name];gain.gain.value=volume;node.playbackRate.value=rate;
  const stereo=pan&&ac.createStereoPanner?ac.createStereoPanner():null;
  node.connect(gain);if(stereo){stereo.pan.value=Math.max(-1,Math.min(1,pan));gain.connect(stereo);stereo.connect(sfxGain);}else gain.connect(sfxGain);roomSources.add(node);
  node.start();
  if(maxDuration<node.buffer.duration) {
    const end=ac.currentTime+maxDuration;
    gain.gain.setValueAtTime(volume,Math.max(ac.currentTime,end-.015));
    gain.gain.linearRampToValueAtTime(0,end);node.stop(end);
  }
  node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();stereo?.disconnect();};
  return true;
}

function stopTravel() {
  if (!travelSound) return;
  for (const node of travelSound.sources) { try { node.stop(); } catch (_) { /* already stopped */ } node.disconnect(); }
  travelSound.gain.disconnect();
  travelSound = null;
}

function travelLoop(kind) {
  stopTravel();
  if (!ac || !unlocked) return;
  const gain = ac.createGain(); gain.gain.value = kind === 'elevator' ? .045 : .07;
  gain.connect(sfxGain);
  const sources = [];
  if(kind==='street'||kind==='airport') {
    gain.gain.value=kind==='airport'?.017:.024;
    const buffer=ac.createBuffer(1,ac.sampleRate*4,ac.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.03)/1.03;data[i]=last*3;}
    const node=ac.createBufferSource();node.buffer=buffer;node.loop=true;node.connect(gain);node.start();sources.push(node);
    travelSound={sources,gain};return;
  }
  for (const multiple of [1, 1.012, 2]) {
    const oscillator = ac.createOscillator();
    oscillator.type = kind === 'jet' ? 'sawtooth' : 'triangle';
    oscillator.frequency.value = (kind === 'elevator' ? 47 : kind === 'car' ? 83 : 38) * multiple;
    oscillator.connect(gain); oscillator.start(); sources.push(oscillator);
  }
  travelSound = { sources, gain };
}

export async function loadSFX() {
  await Promise.all(SFX_FILES.map((name) => track('core', (async () => {
    try {
      const r = await fetch(SFX_PATHS[name] || `audio/${isVoice(name) ? 'voice' : 'sfx'}/${name}.wav`);   // ordinary HTTP caching: repeat visits skip ~300 revalidations
      if (!r.ok) return;
      (sampleBytes || (sampleBytes = {}))[name] = await r.arrayBuffer();
    } catch (e) { /* no sample: the synth fallback covers it */ }
  })())));
  // A keypress during the asset load creates the AudioContext before the bytes
  // arrive, and decodeSamples() then has nothing to decode - which silently
  // drops every sample for the whole session. Decode again once they land.
  decodeSamples();
}

// decode once the AudioContext exists (it cannot be created before a gesture)
function decodeSamples() {
  if (!ac || !sampleBytes) return;
  for (const [name, bytes] of Object.entries(sampleBytes)) {
    ac.decodeAudioData(bytes.slice(0), (buf) => { samples[name] = buf; }, () => {});
  }
}

const activeSamples=new Set();
const activeVoices=new Set();
const activeStyleVoices=new Set();
function stopStyleVoice(){
  for(const node of activeStyleVoices){try{node.stop();}catch(_){}node.disconnect();activeSamples.delete(node);activeVoices.delete(node);}
  activeStyleVoices.clear();
}
function stopSamples(){for(const node of activeSamples){try{node.stop();}catch(_){}node.disconnect();}activeSamples.clear();activeVoices.clear();activeStyleVoices.clear();voiceBusyUntil=0;}
function playSample(name, vol, stablePitch = false, style = false) {
  const buf = samples[name];
  if (!buf) return false;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  // tiny random detune so repeated hits in a combo do not sound machine-gunned
  src.playbackRate.value = stablePitch ? 1 : 0.97 + Math.random() * 0.06;
  g.gain.value = vol === undefined ? 1 : vol;
  src.connect(g); g.connect(sfxGain);
  activeSamples.add(src);if(isVoice(name))activeVoices.add(src);
  if(style){src.cueName=name;activeStyleVoices.add(src);}
  src.onended=()=>{activeSamples.delete(src);activeVoices.delete(src);activeStyleVoices.delete(src);src.disconnect();g.disconnect();};
  src.start();
  return true;
}

function startEntranceBike() {
  if (!ac || !samples.entrance_engine) return false;
  stopEntranceBike(0);
  const now = ac.currentTime;
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const gain = ac.createGain();
  src.buffer = samples.entrance_engine;
  src.loop = true;
  src.loopStart = Math.min(.08, src.buffer.duration * .1);
  src.loopEnd = Math.max(src.loopStart + .1, src.buffer.duration - .04);
  src.playbackRate.setValueAtTime(.78, now);
  src.playbackRate.linearRampToValueAtTime(.96, now + .65);
  src.playbackRate.linearRampToValueAtTime(1.08, now + 1.55);
  src.playbackRate.linearRampToValueAtTime(.84, now + 1.82);
  src.playbackRate.linearRampToValueAtTime(.72, now + 2.30);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2100, now);
  filter.frequency.linearRampToValueAtTime(5200, now + 1.35);
  filter.frequency.linearRampToValueAtTime(2900, now + 1.85);
  gain.gain.setValueAtTime(.16, now);
  gain.gain.linearRampToValueAtTime(.48, now + .55);
  gain.gain.linearRampToValueAtTime(.72, now + 1.45);
  gain.gain.linearRampToValueAtTime(.36, now + 1.88);
  gain.gain.linearRampToValueAtTime(.25, now + 2.30);
  src.connect(filter); filter.connect(gain); gain.connect(sfxGain);
  src.start(now);
  entranceBike = { src, gain };
  src.onended = () => { if (entranceBike && entranceBike.src === src) entranceBike = null; };
  return true;
}

function stopEntranceBike(fade = .04) {
  if (!entranceBike || !ac) return;
  const active = entranceBike;
  entranceBike = null;
  const now = ac.currentTime;
  const duration = Math.max(0, fade);
  active.gain.gain.cancelScheduledValues(now);
  active.gain.gain.setValueAtTime(Math.max(.0001, active.gain.gain.value), now);
  if (duration) active.gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  try { active.src.stop(now + duration + .015); } catch (e) { /* already ended */ }
}
let currentSlot = null;
let musicWatcher = null;
let seqTimer = null, nextStepTime = 0, stepIdx = 0, song = null;
// 'lair' is its own slot rather than sharing the title's: the hub has a real track and
// the title screen still wants the chiptune under it.
// One slot per thing the game can actually play, named by stage rather than act number
// (stage order changes). Each stage has an opening theme `_a` handed over to `_b` partway
// through, plus its own boss theme (minibosses keep the stage theme). A slot with neither an mp3 nor a
// SONGS entry simply plays nothing and never appears in the jukebox, so adding names
// breaks nothing and needs no code change when the files land.
const SLOTS = ['lair', 'lobby', 'title', 'train_a', 'train_b', 'train_boss', 'delhi_a', 'delhi_vendor', 'delhi_b', 'delhi_boss', 'refund_a', 'hold', 'refund_boss', 'ending'];
const htmlTracks = Object.fromEntries(SLOTS.map((s) => [s, null]));

function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); } // midi -> freq

// ---- songs: 16th-note steps. 0 = rest. drums: 1 kick, 2 snare, 3 hat ----
const SONGS = {
  delhi_a: {
    bpm: 132, loop: 64,
    bass: [
      33, 0, 33, 33, 0, 33, 0, 33, 36, 0, 36, 36, 0, 36, 0, 36,
      31, 0, 31, 31, 0, 31, 0, 31, 38, 0, 38, 38, 0, 38, 40, 41,
      33, 0, 33, 33, 0, 33, 0, 33, 36, 0, 36, 36, 0, 36, 0, 36,
      31, 0, 31, 31, 0, 31, 0, 31, 38, 0, 40, 0, 41, 0, 43, 0,
    ],
    lead: [
      69, 0, 0, 72, 0, 69, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0,
      67, 0, 0, 71, 0, 67, 0, 0, 74, 0, 72, 0, 71, 0, 0, 0,
      69, 0, 0, 72, 0, 69, 0, 0, 76, 0, 79, 0, 76, 0, 74, 0,
      72, 0, 74, 0, 71, 0, 67, 0, 69, 0, 0, 0, 0, 0, 0, 0,
    ],
    lead2: [
      64, 0, 0, 67, 0, 64, 0, 0, 69, 0, 67, 0, 64, 0, 0, 0,
      62, 0, 0, 65, 0, 62, 0, 0, 67, 0, 65, 0, 64, 0, 0, 0,
      64, 0, 0, 67, 0, 64, 0, 0, 69, 0, 72, 0, 69, 0, 67, 0,
      64, 0, 65, 0, 62, 0, 59, 0, 64, 0, 0, 0, 0, 0, 0, 0,
    ],
    drum: [
      1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 3, 3, 2, 3, 3, 3,
      1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 3, 3, 2, 3, 2, 3,
      1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 3, 3, 2, 3, 3, 3,
      1, 3, 3, 3, 2, 3, 1, 3, 1, 3, 3, 3, 2, 2, 2, 2,
    ],
  },
  title: {
    bpm: 100, loop: 32,
    bass: [
      33, 0, 0, 0, 36, 0, 0, 0, 31, 0, 0, 0, 38, 0, 40, 0,
      33, 0, 0, 0, 36, 0, 0, 0, 38, 0, 36, 0, 33, 0, 0, 0,
    ],
    lead: [
      69, 0, 72, 0, 76, 0, 72, 0, 74, 0, 71, 0, 67, 0, 0, 0,
      69, 0, 72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0,
    ],
    lead2: [
      57, 0, 60, 0, 64, 0, 60, 0, 62, 0, 59, 0, 55, 0, 0, 0,
      57, 0, 60, 0, 64, 0, 67, 0, 64, 0, 62, 0, 60, 0, 0, 0,
    ],
    drum: [
      1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 3,
      1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 2, 2,
    ],
  },
};

// ---- extra stage / boss songs, built from short motifs ----
const cat = (...rows) => [].concat(...rows);
// 16-step bar helpers
const four = (n) => [n, 0, n, 0, n, 0, n, 0, n, 0, n, 0, n, 0, n + 7, 0];
const pump = (n) => [n, n, 0, n, n, 0, n, 0, n, n, 0, n, n + 3, 0, n + 2, 0];
const funk = (n) => [n, 0, 0, n, 0, n, 0, 0, n + 12, 0, n, 0, 0, n + 5, 0, n + 7];
const arp = (a, b, c, d) => [a, 0, b, 0, c, 0, b, 0, d, 0, c, 0, b, 0, a, 0];
const beat4 = [1, 3, 3, 3, 2, 3, 3, 3, 1, 3, 3, 3, 2, 3, 3, 3];
const beat4f = [1, 3, 2, 3, 1, 3, 2, 3, 1, 3, 2, 3, 2, 3, 2, 2];
const beatSlow = [1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 3];

SONGS.ending = { // victory theme
  bpm: 96, loop: 64,
  bass: cat(four(36), four(31), four(33), four(28)),
  lead: cat(
    [72, 0, 0, 76, 0, 79, 0, 0, 84, 0, 0, 79, 0, 76, 0, 0],
    [71, 0, 0, 74, 0, 79, 0, 0, 83, 0, 0, 79, 0, 74, 0, 0],
    [72, 0, 0, 76, 0, 81, 0, 0, 84, 0, 0, 88, 0, 84, 0, 0],
    [79, 0, 76, 0, 74, 0, 72, 0, 71, 0, 0, 0, 0, 0, 0, 0]),
  lead2: cat(
    [60, 0, 0, 64, 0, 67, 0, 0, 72, 0, 0, 67, 0, 64, 0, 0],
    [59, 0, 0, 62, 0, 67, 0, 0, 71, 0, 0, 67, 0, 62, 0, 0],
    [60, 0, 0, 64, 0, 69, 0, 0, 72, 0, 0, 76, 0, 72, 0, 0],
    [67, 0, 64, 0, 62, 0, 60, 0, 59, 0, 0, 0, 0, 0, 0, 0]),
  drum: cat(beatSlow, beatSlow, beatSlow, [1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 3, 3, 2, 2, 2, 2]),
};

function makeCtx() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
  musicGain = ac.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);
  sfxGain = ac.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
  decodeSamples();
}

function tone(freq0, freq1, dur, type, vol, when, dest) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  const t = when !== undefined ? when : ac.currentTime;
  o.frequency.setValueAtTime(Math.max(20, freq0), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, vol, filterFreq, when, dest) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 4000;
  const g = ac.createGain();
  const t = when !== undefined ? when : ac.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(dest || sfxGain);
  src.start(t); src.stop(t + dur + 0.02);
}

function scheduleStep(i, t) {
  const s = song;
  const idx = i % s.loop;
  if (s.bass[idx]) tone(mf(s.bass[idx] + 12), mf(s.bass[idx] + 12), 0.11, 'triangle', 0.5, t, musicGain);
  if (s.lead[idx]) tone(mf(s.lead[idx]), mf(s.lead[idx]), 0.13, 'square', 0.16, t, musicGain);
  if (s.lead2[idx]) tone(mf(s.lead2[idx]), mf(s.lead2[idx]), 0.13, 'square', 0.11, t, musicGain);
  const d = s.drum[idx];
  if (d === 1) { tone(120, 45, 0.1, 'sine', 0.6, t, musicGain); noise(0.04, 0.2, 3000, t, musicGain); }
  else if (d === 2) { noise(0.12, 0.3, 2500, t, musicGain); tone(220, 160, 0.06, 'square', 0.1, t, musicGain); }
  else if (d === 3) noise(0.03, 0.12, 7000, t, musicGain);
}

function startChiptune(slot) {
  stopChiptune();
  song = SONGS[slot];
  if (!song) return;
  stepIdx = 0;
  nextStepTime = ac.currentTime + 0.05;
  seqTimer = setInterval(() => {
    if (!song) return;
    const stepDur = 60 / song.bpm / 4;
    while (nextStepTime < ac.currentTime + 0.12) {
      scheduleStep(stepIdx, nextStepTime);
      nextStepTime += stepDur;
      stepIdx++;
    }
  }, 30);
}

function stopChiptune() {
  if (seqTimer) { clearInterval(seqTimer); seqTimer = null; }
  song = null;
}

// Every music switch bumps playToken. A play() promise that resolves after its
// token went stale immediately pauses itself again - without that guard a
// pending play() can resume a track we already stopped and two songs overlap.
let currentTrack = null, playToken = 0;
let voiceBusyUntil = 0;
const voiceCd = {};
const voiceLast = {};

// Pull the music under a voice line and let it back up after. The chiptune sits on
// musicGain; a real track is an <audio> element, so its volume is stepped by a timer.
let duckTimer = null;
function duckMusic(seconds) {
  const now = ac.currentTime;
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(0.12, now, 0.05);
    musicGain.gain.setTargetAtTime(0.5, now + seconds, 0.18);
  }
  const a = currentTrack;
  if (!a) return;
  if (duckTimer) { clearInterval(duckTimer); duckTimer = null; }
  a.volume = 0.3;
  const until=now+seconds;
  duckTimer=setInterval(()=>{
    if(currentTrack!==a){clearInterval(duckTimer);duckTimer=null;return;}
    // AudioContext time stops on pause; wall-clock timers must not unduck speech.
    const elapsed=Math.max(0,ac.currentTime-until);
    a.volume=Math.min(.8,.3+elapsed*1.25);
    if(elapsed>=.4){clearInterval(duckTimer);duckTimer=null;}
  },40);
}

// A transition's fade: the music down over `seconds` and then gone, so the next
// state starts from silence rather than from a cut mid-bar.
let fadeTimer = null;
function fadeMusic(seconds) {
  if (!ac) return;
  const now = ac.currentTime;
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(0.0001, now, seconds / 3);
  }
  const a = currentTrack;
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  if (a) {
    const v0 = a.volume, steps = Math.max(1, Math.round(seconds * 25));
    let n = 0;
    fadeTimer = setInterval(() => {
      n++;
      if (currentTrack === a) a.volume = Math.max(0, v0 * (1 - n / steps));
      if (n >= steps || currentTrack !== a) { clearInterval(fadeTimer); fadeTimer = null; }
    }, 40);
  }
}

// The short authored stings the game grammar needs and the rip does not have: the act
// cleared, the run over, a life gained. Notes are scheduled on the context clock.
const JINGLES = {
  clear: [[72, 0, .12], [76, .12, .12], [79, .24, .12], [84, .36, .3], [83, .7, .1], [84, .82, .5]],
  gameover: [[64, 0, .35], [63, .35, .35], [62, .7, .35], [55, 1.05, .9]],
  oneup: [[76, 0, .07], [79, .07, .07], [84, .14, .07], [88, .21, .22]],
};
function jingle(name) {
  const notes = JINGLES[name];
  if (!notes || !ac) return;
  const at = ac.currentTime + 0.02;
  for (const [midi, off, dur] of notes) {
    tone(mf(midi), mf(midi), dur, 'square', 0.22, at + off);
    tone(mf(midi - 12), mf(midi - 12), dur, 'triangle', 0.18, at + off);
  }
}

function stopHtmlTracks() {
  playToken++;
  currentTrack = null;
  for (const k in htmlTracks) {
    const a = htmlTracks[k];
    if (!a) continue;
    try { a.pause(); a.currentTime = 0; } catch (e) { /* not loaded yet */ }
  }
}

// manifest: { "title": "audio/music/cigar_skyline.mp3", "train_a": ..., "train_boss": null } (slot -> file or null)
// Values are resolved relative to audio/ unless they already contain a path.
let currentAudible = false;   // the jukebox's chiptune pick plays through a silent manifest, and resumes that way
let musicSilent = false;

const EARLY_MUSIC = new Set(['title', 'lair']);
export async function loadManifest() {
  try {
    const res = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const m = await res.json();
    // "silent": true means play nothing at all rather than falling back to the
    // chiptune - for when real tracks are coming but are not in yet.
    musicSilent = !!m.silent;
    const byFile = {};
    for (const slot of SLOTS) {
      const file = m[slot];
      if (!file) continue;
      // two slots naming one file share one element, so title -> lair keeps playing
      if (byFile[file]) { htmlTracks[slot] = byFile[file]; continue; }
      const a = new Audio(file.includes('/') ? file : 'audio/' + file);
      byFile[file] = a;
      a.loop = true;
      // Only the menu tracks download up front; a chapter's tracks are fetched when its pack loads
      // (prefetchMusic), and any other track streams when it first plays.
      a.preload = LOAD_ALL || EARLY_MUSIC.has(slot) ? 'auto' : 'none';
      a.volume = 0.8;
      a.addEventListener('error', () => { htmlTracks[slot] = null; });
      htmlTracks[slot] = a;
    }
  } catch (e) { /* no manifest: chiptune everywhere */ }
}

export const audio = {
  // Start downloading these slots' tracks now (a stage about to be played).
  prefetchMusic(slots) {
    for (const slot of slots) { const a = htmlTracks[slot]; if (a && a.preload !== 'auto') { a.preload = 'auto'; if (a.paused && !a.readyState) a.load(); } }
  },
  trainSfx(kind,volume=1) {
    if(!ac||!unlocked)return;
    const whistle=kind==='whistle',dur=whistle?1.1:.22,buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),data=buffer.getChannelData(0);
    let low=0;
    for(let i=0;i<data.length;i++){const t=i/ac.sampleRate,p=t/dur;low=.82*low+.18*(Math.random()*2-1);const env=whistle?Math.min(1,p*14)*Math.min(1,(1-p)*7):Math.exp(-p*8);data[i]=env*(whistle?(Math.sin(t*2*Math.PI*392)+.5*Math.sin(t*2*Math.PI*523))*.13+low*.12:low*.28+Math.sin(t*2*Math.PI*64)*.15);}
    const node=ac.createBufferSource(),gain=ac.createGain();node.buffer=buffer;gain.gain.value=(whistle?.3:.22)*volume;node.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start();node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();};
  },
  // Frying oil: a bright hiss with sparse crackles; louder and denser for a dunk or a fling.
  sizzle(dur=.5,volume=.2,crackle=1) {
    if(!ac||!unlocked)return;
    const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),data=buffer.getChannelData(0);
    let prev=0,pop=0;
    for(let i=0;i<data.length;i++){
     const p=i/data.length,w=Math.random()*2-1,hiss=w-prev;prev=w;
     if(Math.random()<.0009*crackle)pop=.9+Math.random()*.6;pop*=.93;
     data[i]=Math.min(1,p*30)*Math.min(1,(1-p)*5)*(hiss*.22+pop*(Math.random()*2-1));
    }
    const node=ac.createBufferSource(),gain=ac.createGain();node.buffer=buffer;gain.gain.value=volume;node.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start();node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();};
  },
  // Wet mouth sounds for the paan uncle: a soft chew squelch, the "ptoo" of the spit, the splat on a face.
  wet(kind='chew') {
    if(!ac||!unlocked)return;
    const dur={chew:.11,spit:.26,splat:.24}[kind]||.15,buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),data=buffer.getChannelData(0);
    let lo=0,drop=0;
    for(let i=0;i<data.length;i++){
      const t=i/ac.sampleRate,p=t/dur,w=Math.random()*2-1,k=kind==='chew'?.12:kind==='spit'?.35+.4*p:.55;lo+=k*(w-lo);
      if(kind!=='chew'&&Math.random()<(kind==='splat'?.004:.0015))drop=.8;drop*=.9;
      const body=kind==='chew'?Math.sin(t*2*Math.PI*(150-60*p))*.5:kind==='spit'?Math.sin(t*2*Math.PI*(210-150*p))*.45*Math.exp(-p*9):0;
      data[i]=Math.min(1,p*(kind==='spit'?60:25))*Math.exp(-p*(kind==='chew'?5:3.2))*(lo*(kind==='chew'?1.6:1.1)+body+drop*w);
    }
    const node=ac.createBufferSource(),gain=ac.createGain();node.buffer=buffer;gain.gain.value=kind==='chew'?.16:kind==='spit'?.5:.42;
    node.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start();node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();};
  },
  stopSamples,
  stopStyleVoice,
  snapshot:()=>({music:currentSlot,samples:activeSamples.size,voices:activeVoices.size,styleVoice:[...activeStyleVoices].map(n=>n.cueName),roomSources:roomSources.size,loops:roomLoops.size,state:ac?ac.state:'none',travel:!!travelSound}),
  stopRoomAudio,
  roomSfx(name,volume=.6,maxDuration=Infinity) { return roomSample(name,volume,maxDuration); },
  // rate: playback speed (and pitch), so a repeated animal call can vary a few percent
  roomSfxAt(name,volume=.6,pan=0,rate=1) { return roomSample(name,volume,Infinity,pan,rate); },
  roomLoop,
  stopRoomLoop(name, fade = .5) { endLoop(name, fade); },
  // A sample that recedes: pitch slides from rate0 to rate1 (a Doppler drop), it pans from pan0 to pan1 and fades out.
  roomSweep(name,volume=.5,rate0=1,rate1=.8,pan0=0,pan1=0) {
    if(!ac||!unlocked||!samples[name])return false;
    const node=ac.createBufferSource(),gain=ac.createGain(),now=ac.currentTime,dur=samples[name].duration/((rate0+rate1)/2);
    node.buffer=samples[name];node.playbackRate.setValueAtTime(rate0,now);node.playbackRate.linearRampToValueAtTime(rate1,now+dur);
    gain.gain.setValueAtTime(volume,now);gain.gain.linearRampToValueAtTime(volume*.15,now+dur);
    const stereo=ac.createStereoPanner?ac.createStereoPanner():null;node.connect(gain);
    if(stereo){stereo.pan.setValueAtTime(pan0,now);stereo.pan.linearRampToValueAtTime(pan1,now+dur);gain.connect(stereo);stereo.connect(sfxGain);}else gain.connect(sfxGain);
    roomSources.add(node);node.start();node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();stereo?.disconnect();};
    return true;
  },
  // Air rushing past: band-passed noise whose centre sweeps from f0 to f1, swelling then fading.
  whoosh(dur=.4,volume=.3,f0=500,f1=1800) {
    if(!ac||!unlocked)return;
    const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const node=ac.createBufferSource(),band=ac.createBiquadFilter(),gain=ac.createGain(),now=ac.currentTime;
    node.buffer=buffer;band.type='bandpass';band.Q.value=1.4;band.frequency.setValueAtTime(f0,now);band.frequency.exponentialRampToValueAtTime(f1,now+dur);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+dur*.35);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);
    node.connect(band);band.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start();
    node.onended=()=>{roomSources.delete(node);node.disconnect();band.disconnect();gain.disconnect();};
  },
  travelLoop,
  stopTravel,
  streetMusic(amount) {
    if(currentTrack)currentTrack.volume=Math.max(0,Math.min(.8,amount));
    if(ac&&musicGain)musicGain.gain.setValueAtTime(amount*.5,ac.currentTime);
  },
  jetEngine(speed) {
    if(!ac||!travelSound)return;
    travelSound.sources.forEach((node,i)=>{if(node.frequency)node.frequency.setTargetAtTime((32+speed*30)*[1,1.012,2][i],ac.currentTime,.1);});
    travelSound.gain.gain.setTargetAtTime(.018+speed*.035,ac.currentTime,.1);
  },
  streetEngine(speed) {
    if(!ac||!travelSound)return;
    travelSound.sources.forEach((node,i)=>{if(node.frequency)node.frequency.setTargetAtTime((62+speed*64)*[1,1.012,2][i],ac.currentTime,.08);});
    travelSound.gain.gain.setTargetAtTime(.035+speed*.045,ac.currentTime,.08);
  },
  streetSfx(kind) {
    if(!ac||!unlocked)return;
    const durations={handle:.09,hinge:.35,car_close:.22,ignition:.65,hotel_open:.5,hotel_close:.3,traffic:1.4};
    const dur=durations[kind]||.15,buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),data=buffer.getChannelData(0);
    let smooth=0;
    for(let i=0;i<data.length;i++){
      const t=i/ac.sampleRate,p=t/dur; smooth=.93*smooth+.07*(Math.random()*2-1);
      const envelope=kind==='traffic'?Math.sin(p*Math.PI):Math.exp(-p*6);
      const motor=kind==='ignition'?Math.sin(t*440)*(.4+.6*Math.sin(t*63)**2):kind.includes('close')?Math.sin(t*2*Math.PI*(90-40*p))*.6:0;
      data[i]=(smooth+motor)*envelope;
    }
    const node=ac.createBufferSource(),gain=ac.createGain();node.buffer=buffer;gain.gain.value=kind==='traffic'?.15:kind==='car_close'?.5:.3;
    node.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start();node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();};
  },
  destinationSelected() {
    if (!ac || !unlocked) return;
    // A distinct glassy confirmation, independent of optional sampled SFX.
    for (const [i, hz] of [659.25, 830.61, 987.77].entries()) {
      const at = ac.currentTime + i * .105;
      tone(hz, hz, .42, 'sine', .17, at, sfxGain);
      tone(hz * 2, hz * 2, .14, 'sine', .035, at, sfxGain);
    }
  },
  // A cartoon falling whistle for something dropping in from above.
  fallWhistle() {
    if (!ac || !unlocked) return;
    const t = ac.currentTime;
    tone(1700, 480, .4, 'sine', .07, t, sfxGain);
    tone(1730, 490, .4, 'sine', .03, t, sfxGain);
    noise(.4, .05, 700, t, sfxGain);
  },
  // A wet slap for thrown food.
  splat() {
    if (!ac || !unlocked) return;
    const t = ac.currentTime;
    noise(.16, .5, 900, t, sfxGain);
    tone(160, 60, .12, 'sine', .3, t, sfxGain);
    noise(.08, .25, 2500, t + .05, sfxGain);
  },
  // A long wet belch: a rough glottal buzz that wobbles down in pitch.
  burp(volume=.4) {
    if(!ac||!unlocked)return;
    const dur=.6,buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),data=buffer.getChannelData(0);
    let phase=0,low=0,band=0;
    for(let i=0;i<data.length;i++){
     const t=i/ac.sampleRate,p=t/dur,hz=(96-34*p)*(1+.09*Math.sin(t*2*Math.PI*11))*(1+(Math.random()-.5)*.25);
     phase+=hz/ac.sampleRate;if(phase>=1)phase-=1;
     const pulse=(phase<.18?1:0)-.18+(Math.random()*2-1)*.35;
     low+=.16*(pulse-low);band+=.05*(low-band);
     data[i]=Math.min(1,p*25)*Math.min(1,(1-p)*4)*(low-band)*2.2;
    }
    const node=ac.createBufferSource(),gain=ac.createGain();node.buffer=buffer;gain.gain.value=volume;node.connect(gain);gain.connect(sfxGain);roomSources.add(node);node.start();node.onended=()=>{roomSources.delete(node);node.disconnect();gain.disconnect();};
  },
  // A rubbery creak, for leaning on something springy.
  squeak() {
    if (!ac || !unlocked) return;
    const t = ac.currentTime;
    tone(520, 780, .09, 'triangle', .09, t, sfxGain);
    tone(760, 600, .12, 'triangle', .06, t + .08, sfxGain);
  },
  // A bright cartoon "ting" for a glint off shades or teeth.
  glint() {
    if (!ac || !unlocked) return;
    const t = ac.currentTime;
    tone(2637, 2637, .34, 'sine', .08, t, sfxGain);
    tone(3951, 3951, .26, 'sine', .05, t + .035, sfxGain);
    tone(5274, 5274, .18, 'sine', .025, t + .07, sfxGain);
  },
  travelChime() {
    if (!ac || !unlocked) return;
    tone(880, 880, .4, 'sine', .16, ac.currentTime, sfxGain);
    tone(660, 660, .6, 'sine', .12, ac.currentTime + .19, sfxGain);
  },
  unlock() {
    if (unlocked) return;
    unlocked = true;
    makeCtx();
    if (ac.state === 'suspended') ac.resume();
    // re-apply pending slot
    if (currentSlot) this.music(currentSlot, true);
  },
  startEntranceBike,
  fadeMusic(seconds) { if (unlocked) fadeMusic(seconds); },
  jingle(name) { if (unlocked) jingle(name); },
  stopEntranceBike,
  // A real pause. Suspending the context stops the chiptune's scheduled notes and every
  // synthesised effect dead in the same instant; the HTML track is paused separately
  // because it is an <audio> element and the context does not own it.
  setPaused(on) {
    if (!unlocked || !ac) return;
    if (on) {
      if (currentTrack) { try { currentTrack.pause(); } catch (e) { /* not loaded */ } }
      stopChiptune();
      if (ac.state === 'running') ac.suspend();
      return;
    }
    ac.resume();   // suspend() may still be settling, so the state can read 'running' here
    // the chiptune's scheduler was torn down, so it has to be started again; a real
    // track kept its position and only needs playing
    if (currentTrack) currentTrack.play().catch(() => {});
    else if (currentSlot) this.music(currentSlot, true, currentAudible);
  },
  // Asking for the slot that is already playing is a no-op, so re-entering a
  // stage or clearing a wave never restarts the track from the top.
  // `audible` overrides the manifest's "silent" flag. That flag exists so the game is quiet
  // until real tracks land, not so a track the player CHOSE refuses to play.
  music(slot, force, audible) {
    if (slot && musicWatcher) musicWatcher(slot);
    if (slot === currentSlot && !force) {
      if (currentTrack && currentTrack.paused) currentTrack.play().catch(() => {});
      return;
    }
    stopRoomAudio();
    currentSlot = slot; currentAudible = audible;
    if (!unlocked || !ac) return;
    if (slot && htmlTracks[slot] && htmlTracks[slot] === currentTrack && !currentTrack.paused) return;
    stopChiptune();
    stopHtmlTracks();
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
    if (musicGain) { musicGain.gain.cancelScheduledValues(ac.currentTime); musicGain.gain.setValueAtTime(0.5, ac.currentTime); }
    if (!slot) return;
    const a = htmlTracks[slot];
    if (!a) { if (audible || !musicSilent) startChiptune(slot); return; }
    const token = playToken;
    currentTrack = a;
    a.volume = 0.8;
    a.play().then(() => {
      if (token !== playToken) { try { a.pause(); a.currentTime = 0; } catch (e) {} }
    }).catch((error) => {
      // Switching or pausing cancels pending play requests without invalidating the file.
      if (token !== playToken || error?.name === 'AbortError' || error?.name === 'NotAllowedError') return;
      htmlTracks[slot] = null;
      startChiptune(slot);
    });
  },
  // The lair jukebox. Only slots that will actually make a sound are listed: most
  // have no mp3 yet and only three have a chiptune behind them.
  tracks() { return SLOTS.filter((s) => htmlTracks[s] || SONGS[s]); },
  // Told every slot the game asks for, heard or not yet audible (js/music_library.js
  // unlocks jukebox tracks off it). One watcher; a later call replaces it.
  watchMusic(fn) { musicWatcher = fn; },
  // What the jukebox does now. It used to AUDITION - play the track with currentSlot left
  // null so closing the panel put the room's own slot back - which meant the thing you
  // picked stopped the moment you walked away from the hi-fi.
  play(slot) { this.music(slot, true, true); },
  sfx(name, vol) {
    if (!unlocked || !ac) return;
    if (playSample(name, vol ?? SFX_VOLUME[name], name.startsWith('entrance_') || ['warn_parry','warn_evade','advance','go'].includes(name))) return true;
    switch (name) {
      case 'punch': noise(0.06, 0.4, 3500); tone(200, 80, 0.07, 'square', 0.3); break;
      case 'heavy': noise(0.14, 0.5, 2500); tone(150, 45, 0.16, 'square', 0.4); break;
      case 'whiff': noise(0.05, 0.12, 5000); break;
      case 'throw': tone(400, 90, 0.22, 'sawtooth', 0.25); noise(0.18, 0.25, 2000); break;
      case 'ko': tone(300, 40, 0.35, 'square', 0.35); noise(0.25, 0.4, 1800); break;
      case 'pickup': case 'pickup_health': tone(mf(76), mf(76), 0.07, 'square', 0.25); setTimeout(() => ac && tone(mf(81), mf(81), 0.12, 'square', 0.25), 80); break;
      case 'jump': tone(200, 520, 0.12, 'square', 0.15); break;
      case 'land': tone(95, 45, 0.09, 'sine', 0.5); noise(0.05, 0.2, 1200); break;
      case 'blip': tone(880, 880, 0.05, 'square', 0.2); break;
      // A voice down a phone line: a thin, band-limited squawk.
      case 'phone_squawk': tone(1180 + Math.random() * 260, 900, 0.045, 'square', 0.035); noise(0.035, 0.05, 4200); break;
      // The street's own sounds, fired by what is actually on screen rather than by a
      // looping ambience bed. A synthesised crowd murmur is just hiss; a horn that
      // sounds because an auto rickshaw is driving past is the street being alive.
      case 'horn': {
        tone(392, 392, 0.16, 'square', 0.055);
        tone(494, 494, 0.16, 'square', 0.04);
        setTimeout(() => ac && tone(392, 370, 0.22, 'square', 0.05), 190);
        break;
      }
      case 'moo': tone(150, 110, 0.55, 'sawtooth', 0.045); break;
      case 'dash': noise(0.08, 0.18, 4000); tone(150, 300, 0.08, 'square', 0.08); break;
      case 'phurt': tone(140, 60, 0.12, 'square', 0.35); noise(0.08, 0.3, 2200); break;
      case 'armor': tone(1200, 900, 0.05, 'square', 0.15); noise(0.06, 0.25, 6000); break;
      case 'parry':
        tone(1850, 520, 0.11, 'sawtooth', 0.24);
        tone(310, 95, 0.16, 'square', 0.32);
        noise(0.09, 0.42, 7200);
        break;
      case 'break': case 'break_wood': case 'break_metal':
      case 'slam': tone(90, 30, 0.3, 'sine', 0.7); noise(0.25, 0.5, 1000); break;
      case 'enrage': tone(150, 600, 0.4, 'sawtooth', 0.3); noise(0.35, 0.3, 3000); break;
      case 'super': {
        tone(220, 1400, 0.5, 'sawtooth', 0.3);
        tone(110, 700, 0.5, 'square', 0.2);
        noise(0.4, 0.3, 5000);
        break;
      }
      case 'select': tone(mf(72), mf(79), 0.06, 'square', 0.2); break;
      // the station PA: three soft bell notes before an announcement
      case 'chime': {
        tone(mf(79), mf(79), 0.28, 'sine', 0.22);
        setTimeout(() => ac && tone(mf(83), mf(83), 0.28, 'sine', 0.2), 260);
        setTimeout(() => ac && tone(mf(86), mf(86), 0.5, 'sine', 0.2), 520);
        break;
      }
      case 'whip': case 'weapon': noise(0.04, 0.35, 9000); tone(1800, 300, 0.09, 'sawtooth', 0.12); break;
      case 'kick': noise(0.08, 0.45, 3000); tone(180, 70, 0.10, 'square', 0.32); break;
      case 'grab': noise(0.05, 0.2, 2600); tone(260, 160, 0.08, 'square', 0.18); break;
      case 'knuckle': {
        noise(0.025, 0.3, 4200); tone(260, 105, 0.045, 'square', 0.16);
        setTimeout(() => { if (ac) { noise(0.02, 0.24, 3600); tone(220, 90, 0.04, 'square', 0.13); } }, 85);
        break;
      }
      case 'go': case 'advance': tone(mf(79), mf(84), 0.10, 'square', 0.28); break;
      case 'warn_parry': tone(1400,1800,.08,'triangle',.12); break;
      case 'warn_evade': tone(420,220,.13,'sawtooth',.10); break;
    }
    return true;
  },
  // One line at a time. A line that arrives while another is playing is dropped unless
  // it is marked urgent (a boss going down beats a combo callout); the busy window is the
  // sample's own length, so a missing file never blocks anything.
  has(name) { return !!samples[name]; },
  // Rank speech owns only its own source. A newer badge or a broken chain
  // cancels it; dialogue wins, and nothing is queued to play over a later rank.
  styleVoice(names) {
    stopStyleVoice();
    if (!unlocked || !ac || ac.state !== 'running' || ac.currentTime < voiceBusyUntil) return false;
    const have = names.filter(n=>n.startsWith('rank_')&&samples[n]);
    if (!have.length) return false;
    const key=names[0],now=ac.currentTime;
    if(now<(voiceCd[key]||0))return false;
    const choices=have.length>1?have.filter(n=>n!==voiceLast[key]):have;
    const selected=choices[Math.floor(Math.random()*choices.length)];
    if(!playSample(selected,1.05,true,true))return false;
    voiceCd[key]=now+4;voiceLast[key]=selected;
    return true;
  },
  voice(name, durationMs = 4800, urgent = false) {
    if (!unlocked || !ac || !samples[name]) return false;
    const now = ac.currentTime;
    if (now < voiceBusyUntil && !urgent) return false;
    stopStyleVoice();
    if(urgent)for(const node of activeVoices){try{node.stop();}catch(_){}node.disconnect();activeSamples.delete(node);}
    if(urgent)activeVoices.clear();
    if (!playSample(name, 1.3, true)) return false;
    voiceBusyUntil = now + samples[name].duration;
    duckMusic(durationMs / 1000);
    return true;
  },
  // The first of `names` that has a file, so a stage can ask for its own line and fall
  // back to one the project ships.
  voiceAny(names, durationMs, urgent) {
    for (const n of names) if (samples[n]) return this.voice(n, durationMs, urgent);
    return false;
  },
  // A random line out of `names`, from whichever exist, with a per-list cooldown so the
  // combo commentary stays an event rather than a soundtrack.
  voiceRandom(names, durationMs, cooldownS = 18, avoidRepeat = false) {
    if (!ac) return false;
    const have = names.filter((n) => samples[n]);
    if (!have.length) return false;
    const key = names[0];
    const now = ac.currentTime;
    if (now < (voiceCd[key] || 0)) return false;
    const choices=avoidRepeat&&have.length>1?have.filter(n=>n!==voiceLast[key]):have;
    const selected=choices[Math.floor(Math.random()*choices.length)];
    const ok = this.voice(selected, durationMs);
    if (ok) {voiceCd[key] = now + cooldownS;voiceLast[key]=selected;}
    return ok;
  },
};
