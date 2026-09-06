import { AIRPORT_FILES, AIRPORT_PHASES, AIRPORT, enterAirportPhase, updateAirport, nearJet, nearArrivalExit, drawAirport } from './airport.js';
import { FLIGHT_FILES, FLIGHT_PHASES, updateFlight, drawFlight } from './flight.js';
import { STREET_FILES, STREET, enterStreetPhase, updateStreet, nearStreetCar, drawStreet } from './street.js';
import { drawDialogue } from './room_dialogue.js';
import { drawLevelCard } from './level_card.js';
import { updateLobbyRoom } from './lobby_audio.js';
import { LOBBY_DOOR, nearLobbyDoor, drawLobbyDoor, drawLobbyDoorArrow } from './lobby_door.js';
import { lobbyStaffAt, porterAt, RECEPTION_DESK } from './lobby_staff.js';
import { drawContactShadow } from './contact_shadow.js';
import { drawDirectionArrow } from './direction_arrow.js';
import { ASSETS } from './assets.js';
// The departure is a small scene machine; it never advances combat or stage waves.
import { G, W, H, clamp } from './engine.js';
import { createPlayer, updatePlayer, drawPlayer } from './player.js';
import { updateEffects, drawEffects } from './effects.js';
import { input } from './input.js';
import { drawTextShadow, textWidth } from './sprites.js';
import { audio } from './audio.js';
import { drawElevatorCabin, CABIN_BOUNDS } from './elevator.js';
export { ELEVATOR_X, ELEVATOR_BOUNDS, drawElevatorDoor } from './elevator.js';

export const TRAVEL_FILES = {
  ...STREET_FILES, ...AIRPORT_FILES, ...FLIGHT_FILES,
  lobby: 'assets/travel/lobby/lobby.png',
  street: 'assets/travel/city/street.png',
  apron: 'assets/travel/airport/apron.png',
  india: 'assets/travel/india/india.png',
  car: 'assets/travel/city/car.png',
  car_driver: 'assets/travel/city/car_driver.png',
  jet: 'assets/travel/airport/jet.png',
  jet_closed: 'assets/travel/airport/jet_closed.png',
  loading: 'assets/travel/india/loading.png',
  loading_train:'assets/travel/india/level-cards/station-grit.png',
  elevator_cabin: 'assets/travel/elevator/elevator_cabin.png',
  tower_1: 'assets/travel/elevator/tower_1.png',
  tower_2: 'assets/travel/elevator/tower_2.png',
  tower_3: 'assets/travel/elevator/tower_3.png',
  arrival_wall: 'assets/travel/elevator/arrival_wall.png',
  bartender: 'assets/travel/lobby/bartender_service.png',
  bartender_shake: 'assets/travel/lobby/bartender_shake.png',
  bartender_walk: 'assets/travel/lobby/bartender_walk.png',
  porter_service: 'assets/travel/lobby/porter_service.png',
  porter_idle: 'assets/travel/lobby/porter_idle.png',
  entrance_open: 'assets/travel/lobby/entrance_open.png',
  entrance_leaves: 'assets/travel/lobby/entrance_leaves.png',
  palm: 'assets/travel/lobby/palm.png',
  concierge_seated: 'assets/travel/lobby/concierge_seated.png',
  reception_desk: 'assets/travel/lobby/reception_desk.png',
  bar_front: 'assets/travel/lobby/bar_front.png',
};
export const TRAVEL_ART = {};
let loading = null;
export let travelReady = false;
export function loadTravel() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(TRAVEL_FILES).map(([key, path]) => new Promise((resolve) => {
    const img = new Image();
    const finish = () => { clearTimeout(timeout); resolve(); };
    const timeout = setTimeout(finish, 8000);
    img.onload = () => { img._as = 2; TRAVEL_ART[key] = img; finish(); };
    img.onerror = finish;
    img.src = path;
  }))).then(() => { travelReady = true; });
  return loading;
}

export const TRAVEL_PHASES = ['elevator', 'lobby', 'curb', 'car-board', 'drive', 'apron-arrival', 'apron', 'jet-board', 'takeoff', 'flight', 'india-approach', 'landing', 'disembark', 'papers', 'arrival-exit'];
// Cinematic durations are in fixed 60 Hz frames; walking has no time limit.
export const TRAVEL_DURATIONS = { elevator: 780, 'car-board': STREET.boardDuration, drive: STREET.driveDuration, 'apron-arrival':60, 'jet-board': 180, takeoff: 270, flight: 360, 'india-approach':300, landing: 300, disembark:150, papers:460 };
const WALK = new Set(['lobby', 'curb', 'apron', 'arrival-exit']);
const WIDTHS = { lobby: 960, curb: 640, apron: AIRPORT.width, 'arrival-exit':AIRPORT.arrivalWidth };
const ACTIONS = ['attack', 'use', 'jump', 'parry', 'super'];
const ease = (n) => { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); };

export function clearTravel() {
  audio.stopTravel(); audio.stopRoomAudio();
  G.travel = null;
  G.pendingDestination = null;
}

function phase(name) {
  const tr = G.travel;
  const previous={x:tr.x,y:tr.y,cam:tr.cam};
  const continuous={apron:'apron-arrival',disembark:'landing',papers:'disembark','arrival-exit':'papers'}[name]===tr.phase;
  const arriving = name === 'lobby' && tr.phase === 'elevator';
  audio.stopTravel(); audio.stopRoomAudio();
  tr.arriving = arriving; tr.exiting = null; tr.room = null;
  tr.phase = name; tr.t = 0; tr.animT = 0; tr.started = false; tr.gate = true; tr.walking = false;
  G.fade = continuous?0:1;
  tr.cam = 0; tr.x = name === 'lobby' ? 100 : name === 'apron' ? 285 : 80;
  tr.y = name === 'elevator' ? 230 : 225;
  tr.facing = 1; tr.look = 0;
  if (name === 'elevator') tr.x = 240;
  if (arriving) { tr.x = 83; tr.y = 184; }
  tr.actor = createPlayer();
  tr.actor.x = tr.x; tr.actor.y = tr.y;
  G.player = tr.actor;
  G.effects = []; G.props = []; G.enemies = []; G.boss = null;
  if (name === 'drive') audio.travelLoop('car');
  if (FLIGHT_PHASES.includes(name)) audio.travelLoop('jet');
  if (name === 'lobby') audio.music('lobby');
  else if (name === 'elevator') audio.music(null);
  if (['curb','car-board','drive'].includes(name)) enterStreetPhase(tr,name,previous);
  if (AIRPORT_PHASES.includes(name)) enterAirportPhase(tr,name,previous);
  if (FLIGHT_PHASES.includes(name)) tr.airport ||= {clock:0,events:[],encounterDone:false};
}

export function beginTravel(targetStage, startPhase = 'elevator') {
  loadTravel();
  G.travel = { targetStage, destination: 'india', phase: '', t: 0, gate: true, greeted: false };
  G.pendingDestination = null;
  G.effects = []; G.shots = []; G.zones = [];
  G.combo = 0; G.hitstop = 0; G.shake = 0;
  G.paused = false;
  phase(TRAVEL_PHASES.includes(startPhase) ? startPhase : 'elevator');
  if (!['lobby','curb'].includes(startPhase)) audio.music(null);
}

export function startElevatorRide() {
  const tr = G.travel;
  if (!tr || tr.phase !== 'elevator' || tr.started) return;
  tr.started = true;
  audio.sfx('blip');
  audio.travelLoop('elevator');
}

export function updateTravel() {
  const tr = G.travel;
  if (!tr) return false;
  if (tr.gate && !ACTIONS.some((a) => input.held(a))) tr.gate = false;
  tr.animT++;
  if (tr.phase !== 'elevator' || tr.started) tr.t++;
  if (['curb','car-board','drive'].includes(tr.phase) && updateStreet(tr)) return false;
  if (tr.phase === 'lobby' && tr.exiting) {
    const exit = tr.exiting; exit.t++;
    const approach = ease(exit.t / 32), through = ease((exit.t - 32) / 64);
    const oldX=tr.x, oldY=tr.y;
    tr.x = exit.x + (LOBBY_DOOR.center - exit.x) * approach;
    tr.y = exit.y + (184 - exit.y) * through;
    tr.actor.x=tr.x; tr.actor.y=tr.y; tr.actor.z=0;
    tr.actor.moved=Math.hypot(tr.x-oldX,tr.y-oldY); tr.actor.stridePhase+=tr.actor.moved;
    tr.actor.state=tr.actor.moved>.02?'walk':'idle'; tr.actor.t++;
    tr.actor.face=tr.x>=oldX?1:-1;
    if (exit.t >= LOBBY_DOOR.duration) phase('curb');
    return false;
  }
  if (tr.phase === 'lobby' && tr.arriving) {
    const progress = clamp((tr.t - 78) / 62, 0, 1);
    const oldX = tr.x, oldY = tr.y;
    tr.x = 83 + progress * 50; tr.y = 184 + progress * 41;
    tr.actor.x = tr.x; tr.actor.y = tr.y;
    tr.actor.moved = Math.hypot(tr.x - oldX, tr.y - oldY);
    tr.actor.stridePhase += tr.actor.moved;
    tr.actor.state = tr.actor.moved > 0 ? 'walk' : 'idle';
    tr.actor.t++; tr.walking = tr.actor.moved > 0;
    if (tr.t >= 190) { tr.arriving = false; tr.gate = true; }
    return false;
  }
  const use = !tr.gate && input.pressed('use');
  if (AIRPORT_PHASES.includes(tr.phase)) updateAirport(tr);
  if (FLIGHT_PHASES.includes(tr.phase)) updateFlight(tr);
  if (tr.phase === 'elevator' || WALK.has(tr.phase)) {
    const bounds = tr.phase === 'elevator' ? CABIN_BOUNDS
      : { left: 24, right: WIDTHS[tr.phase] - 24, back: 196, front: 244 };
    tr.actor.x = tr.x; tr.actor.y = tr.y;
    if (!tr.gate) updatePlayer(tr.actor, bounds);
    tr.x = tr.actor.x; tr.y = tr.actor.y;
    tr.walking = tr.actor.moved > .12;
    tr.facing = tr.actor.face;
    const targetCam=tr.phase === 'elevator' ? 0 : clamp(tr.x - (tr.phase==='apron'?300:180), 0, WIDTHS[tr.phase] - W);
    tr.cam=tr.phase==='arrival-exit'?tr.cam+(targetCam-tr.cam)*.12:targetCam;
    G.camX = tr.cam;
    updateEffects();
  }
  if (tr.phase === 'elevator') {
    tr.look += ((tr.x - 240) * .025 - tr.look) * .06;
    const click = input.pointerPressed();
    const onPanel = click && click.x * W >= 450 && click.x * W <= 477 && click.y * H >= 148 && click.y * H <= 189;
    if (!tr.started && !tr.gate && tr.actor.z === 0 && tr.x >= 418 && (use || onPanel)) startElevatorRide();
  }
  if (WALK.has(tr.phase)) {
    if (tr.phase === 'lobby') {
      updateLobbyRoom(tr,use);
      if (nearLobbyDoor(tr) && use) { tr.exiting={t:0,x:tr.x,y:tr.y}; tr.gate=true; audio.sfx('blip'); }
    } else if (tr.phase === 'curb' && nearStreetCar(tr) && use) phase('car-board');
    else if (tr.phase === 'apron' && nearJet(tr) && use) phase('jet-board');
    else if (tr.phase === 'arrival-exit' && nearArrivalExit(tr) && use) { audio.stopTravel(); audio.stopRoomAudio(); return true; }
    return false;
  }
  if (tr.phase === 'elevator' && tr.t === 710) audio.travelChime();
  if (tr.t >= TRAVEL_DURATIONS[tr.phase]) {
    const next = TRAVEL_PHASES[TRAVEL_PHASES.indexOf(tr.phase) + 1];
    phase(next);
  }
  return false;
}

function plate(ctx, key, x = 0, y = 0, w = W, h = H) {
  const img = TRAVEL_ART[key];
  if (img) ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, key === 'india' ? '#655753' : '#08182d'); g.addColorStop(1, '#b18a50');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#152235';
    for (let i = 0; i < 18; i++) ctx.fillRect(x + i * w / 18, y + 60 + (i * 31 % 75), w / 20, h);
  }
}

function label(ctx, title, sub = '') {
  ctx.fillStyle = 'rgba(5,9,17,.8)'; ctx.fillRect(0, 0, W, 33);
  drawTextShadow(ctx, title, 14, 10, '#efd09a', 1);
  if (sub) drawTextShadow(ctx, sub, W - textWidth(sub, 1) - 14, 10, '#92bed5', 1);
}
function prompt(ctx, text) {
  const w = textWidth(text, 1);
  ctx.fillStyle = 'rgba(5,8,14,.88)'; ctx.fillRect((W - w) / 2 - 10, 246, w + 20, 17);
  drawTextShadow(ctx, text, (W - w) / 2, 251, '#f2d099', 1);
}

function travelHero(ctx, tr, x, y, scale = 1, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (alpha === 1) drawContactShadow(ctx, x, y, 15, tr.actor.z, scale);
  ctx.translate(x, y); ctx.scale(scale, scale); ctx.translate(-tr.actor.x, -tr.actor.y);
  drawPlayer(ctx, tr.actor, 0); ctx.restore();
}

function elevator(ctx, tr) {
  const floor = drawElevatorCabin(ctx, tr, (ctx, x, y, walking, t, facing, scale, alpha) => travelHero(ctx, tr, x, y, scale, alpha), TRAVEL_ART);
  drawEffects(ctx, 0);
  label(ctx, tr.started ? 'THE DESCENT' : 'PRIVATE ELEVATOR', floor ? 'FLOOR ' + String(floor).padStart(2, '0') : 'LOBBY');
  if (!tr.started) drawDirectionArrow(ctx, {
    x: 463, y: 143, direction: 'down', size: 18, time: tr.animT, bob: 1,
  });
}

function staff(ctx, key, frame, x, y, cellW, cellH, scale = .5) {
  const image = TRAVEL_ART[key];
  if (image) ctx.drawImage(image, frame * cellW, 0, cellW, cellH, Math.round(x), y, cellW * scale, cellH * scale);
}

function lobbyArrival(ctx, tr) {
  const x = 56 - tr.cam, y = 86, w = 54, h = 102;
  const open = ease((tr.t - 25) / 50) * (1 - ease((tr.t - 145) / 40));
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#191114'; ctx.fillRect(x, y, w, h);
  const wall = TRAVEL_ART.arrival_wall;
  if (wall) ctx.drawImage(wall, x, y + 8, w, h - 8);
  const cabin = TRAVEL_ART.elevator_cabin;
  if (cabin) ctx.drawImage(cabin, 65, 0, 310, 330, x, y, w, h);
  if (tr.t < 78) travelHero(ctx, tr, tr.x - tr.cam, tr.y);
  const bg = TRAVEL_ART.lobby;
  for (let i = 0; i < 2; i++) {
    const dx = x + i * w / 2 + (i ? 1 : -1) * open * w / 2;
    if (bg) ctx.drawImage(bg, 112 + i * 54, 172, 54, 204, dx, y, w / 2, h);
    else { ctx.fillStyle = '#714521'; ctx.fillRect(dx, y, w / 2, h); }
  }
  ctx.restore();
}

function drawStaffMember(ctx, person, role, cam) {
  if(role==='concierge') {
    staff(ctx,'concierge_seated',person.frame,person.x-28.8-cam,104,160,160,.36);return;
  }
  if(person.task==='move'&&TRAVEL_ART.bartender_walk) {
    ctx.save();ctx.translate(Math.round(person.x-cam),0);ctx.scale(person.face,1);
    staff(ctx,'bartender_walk',person.frame,-28.8,112,160,220,.36);ctx.restore();
  } else {
    const key=TRAVEL_ART[person.art]?person.art:'bartender';
    staff(ctx,key,person.task==='move'?0:person.frame,person.x-28.8-cam,112,160,152,.36);
  }
}

function lobby(ctx, tr) {
  const cam = tr.cam, t = tr.t;
  plate(ctx, 'lobby', -cam, 0, 960, 270);
  if (tr.arriving) lobbyArrival(ctx, tr);
  drawLobbyDoor(ctx, tr, TRAVEL_ART);
  const age = tr.room?.concierge?.text ? t - tr.room.concierge.last : -1;
  const {concierge, bartender} = lobbyStaffAt(t, age, tr.barT == null ? -1 : t - tr.barT);
  drawStaffMember(ctx, concierge, 'concierge', cam);
  drawStaffMember(ctx, bartender, 'bartender', cam);
  const desk = TRAVEL_ART.reception_desk, bar = TRAVEL_ART.bar_front;
  // Counter height follows the staff waist, with a clear player walking plane below.
  for (const [image, {x,y,w,h}] of [[desk, RECEPTION_DESK], [bar, {x:478,y:162,w:220,h:42}]]) {
    if (!image) continue;
    ctx.save(); ctx.globalAlpha = .13; ctx.translate(x - cam, y + h); ctx.scale(1, -.32);
    ctx.drawImage(image, 0, -h, w, h); ctx.restore();
    ctx.drawImage(image, x - cam, y, w, h);
  }
  const roomPlate=TRAVEL_ART.lobby;
  if(roomPlate) {
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const [i,x] of [235,551].entries()) {
      ctx.globalAlpha=.025+.014*Math.sin(t*.035+i*2);
      ctx.drawImage(roomPlate,x*2,54,100,72,x-cam,27,50,36);
    }
    ctx.restore();
  }
  // Warm light shafts, floating dust and floor glints move on separate clocks.
  ctx.save();
  for (const x of [287, 715]) {
    const glow = ctx.createRadialGradient(x - cam, 62, 0, x - cam, 100, 145);
    glow.addColorStop(0, 'rgba(255,189,83,.065)'); glow.addColorStop(1, 'rgba(255,189,83,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - cam - 140, 40, 280, 210);
  }
  for (let i = 0; i < 28; i++) {
    const x = ((i * 113 + t * .035) % 960) - cam * .97;
    const y = 62 + ((i * 43 + t * .055) % 143);
    ctx.fillStyle = `rgba(255,209,135,${.12 + Math.sin(t * .025 + i) * .08})`; ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
  const porter = porterAt(tr);
  const drawPorter = () => {
    drawContactShadow(ctx, porter.x-cam, 211, 11, 0, .85);
    const key=TRAVEL_ART[porter.art]?porter.art:'porter_service';
    staff(ctx,key,key===porter.art?porter.frame:6,porter.x-30-cam,121,120,180,.5);
  };
  if (tr.y >= 211) drawPorter();
  if (!tr.arriving || tr.t >= 78) travelHero(ctx, tr, tr.x - cam, tr.y);
  if (tr.y < 211) drawPorter();
  for(const [role,x] of [['concierge',concierge.x],['bartender',bartender.x]]) {
    const speech=tr.room?.[role];
    if(speech?.text)drawDialogue(ctx,{speaker:role==='concierge'?'Concierge':'Bartender',text:speech.text,x:x-cam,bottom:110,age:t-speech.last,remaining:300-(t-speech.last),width:190});
  }
  drawEffects(ctx, cam);
  const palm = TRAVEL_ART.palm;
  if (palm) for (const x of [-38, 990]) {
    const width = palm.width / 2;
    ctx.drawImage(palm, Math.round(x - cam * 1.13), 151, width, 120);
  }
  label(ctx, 'THE GRAND LOBBY', 'PRIVATE DEPARTURES');
  drawLobbyDoorArrow(ctx,tr);
  if (nearLobbyDoor(tr)) prompt(ctx,'F / LB: OPEN DOOR');
  else if (!tr.arriving && !tr.exiting && Math.abs(tr.x-582)<65) prompt(ctx,'F / LB: GREET THE BARMAN');
  if (tr.exiting) { ctx.fillStyle=`rgba(0,0,0,${ease((tr.exiting.t-86)/24)})`; ctx.fillRect(0,0,W,H); }
}

function carScene(ctx, tr) { drawStreet(ctx,tr,TRAVEL_ART,{hero:travelHero,prompt,label}); }

export function drawTravel(ctx) {
  const tr = G.travel;
  if (!tr) return;
  if (tr.phase === 'elevator') elevator(ctx, tr);
  else if (tr.phase === 'lobby') lobby(ctx, tr);
  else if (['curb', 'car-board', 'drive'].includes(tr.phase)) carScene(ctx, tr);
  else if (AIRPORT_PHASES.includes(tr.phase)) drawAirport(ctx,tr,TRAVEL_ART,{hero:travelHero,prompt,label});
  else drawFlight(ctx,tr,TRAVEL_ART,{label});
}

export function drawTravelLoading(ctx, ready) {
  drawLevelCard(ctx,TRAVEL_ART[G.stage?.loadingArt || 'loading']||TRAVEL_ART.loading,{ready});
}
