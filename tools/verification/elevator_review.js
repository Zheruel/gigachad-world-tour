const airportDurations={'apron-arrival':60,apron:1801,'jet-board':180,takeoff:270,flight:360,'india-approach':300,landing:300,disembark:150,papers:460,'arrival-exit':1801};
const $ = id => document.getElementById(id);
const frame = $('preview'), timeline = $('timeline');
let game, playing = false, scene = 'elevator', freePlay = false, direction = null, lobbyFocus = 100;
const actions = ['left', 'right', 'up', 'down', 'attack', 'use', 'pause', 'jump', 'parry', 'super'];
function stop() {
  playing = false; direction = null; $('play').textContent = 'Play';
  if (game) { game.G.freezeTime = true; for (const a of actions) game.release(a); }
}
function motionAt(t) {
  const mode = $('motion').value;
  const next = mode === 'walk' ? (Math.floor(t / 150) % 2 ? 'left' : 'right') : ['left','right'].includes(mode) ? mode : null;
  if (next === direction) return;
  if (direction) game.release(direction);
  direction = next;
  if (direction) game.press(direction);
}
function readout() {
  if (!game) return;
  const tr = game.G.travel;
  if (tr?.phase === 'elevator') {
    timeline.value = Math.max(1, tr.t);
    $('readout').textContent = `Frame ${tr.t} / 780 · ${(tr.t / 60).toFixed(2)}s`;
    $('status').textContent = `Cabin position: ${tr.x.toFixed(1)}, ${tr.y.toFixed(1)} · ${tr.walking ? 'walking' : 'standing'}`;
  } else {
    timeline.value = tr?.exiting?.t ?? tr?.t ?? game.G.time;
    $('readout').textContent = `Frame ${tr?.exiting?.t ?? tr?.t ?? game.G.time} · ${game.G.state === 'hub' ? 'Penthouse' : tr?.phase}`;
    $('status').textContent = game.G.state === 'hub' ? 'Destination guide and doorway in the actual penthouse.' : `Arrived: ${tr?.phase || game.G.state}`;
  }
}
function seek(value) {
  if (!game) return;
  stop(); game.resetInput(); freePlay = false; game.G.freezeTime = false;
  if (scene === 'penthouse' || scene === 'bed') { game.hub(); if (scene === 'bed') game.setPlayerPos(1810,220); }
  else if (scene === 'arrival') { game.travel('elevator', true); game.step(780); }
  else if (scene === 'exit') { game.travel('lobby'); game.G.travel.x=827; game.step(1); game.press('use'); game.step(1); game.release('use'); }
  else if(scene==='porter'){game.travel('lobby');game.G.travel.x=690;game.G.travel.greeted=true;game.G.travel.greetT=-800;}
  else game.travel(scene, scene === 'elevator');
  if (scene === 'lobby') game.G.travel.x = lobbyFocus;
  if(game.G.travel)game.G.travel.streetLayers=Object.fromEntries(['architecture','actors','effects'].map(k=>[k,$('street-'+k).checked]));
  const target = Math.max(1, Math.min(Number(timeline.max), Number(value)));
  for (let t = 0; t < target; t++) { motionAt(t); game.step(1); }
  game.G.freezeTime = true; game.G.fade = 0; game.render(); readout();
}
timeline.addEventListener('input', () => seek(timeline.value));
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => seek(Number(timeline.value) + Number(button.dataset.step))));
$('motion').addEventListener('change', () => seek(timeline.value));
function selectScene(name) {
  scene = name; timeline.max = name === 'elevator' ? 779 : name === 'arrival' ? 190 : name === 'exit' ? 109 : name==='car-board'?77:name==='drive'?299:(airportDurations[name]||1801)-1; seek(1);
}
for(const [id,phase] of [['curb','curb'],['boarding','car-board'],['drive','drive']])$(id).onclick=()=>selectScene(phase);
for(const k of ['architecture','actors','effects'])$('street-'+k).onchange=()=>seek(timeline.value);
$('airport-scene').onchange=()=>{if($('airport-scene').value)selectScene($('airport-scene').value);};
$('ride').onclick = () => selectScene('elevator');
$('lobby').onclick = () => { lobbyFocus = 100; selectScene('lobby'); };
$('reception').onclick = () => { lobbyFocus = 280; selectScene('lobby'); };
$('bar').onclick = () => { lobbyFocus = 580; selectScene('lobby'); };
$('porter').onclick = () => selectScene('porter');
$('activity').onchange = () => {
  if (!$('activity').value) return;
  const [place, time] = $('activity').value.split(':');
  lobbyFocus = place === 'bar' ? 580 : 280; selectScene('lobby'); seek(Number(time));
};
$('arrival').onclick = () => selectScene('arrival');
$('exit').onclick = () => selectScene('exit');
$('penthouse').onclick = () => selectScene('penthouse');
$('bed').onclick = () => selectScene('bed');
$('waiting').onclick = () => {
  selectScene('elevator'); game.travel('elevator'); game.G.travel.x = 430;
  game.G.freezeTime = false; game.step(1); game.G.freezeTime = true; game.G.fade = 0; game.render(); readout();
};
$('explore').onclick = () => {
  if (!game) return;
  stop(); freePlay = true; playing = true; game.G.audio.unlock(); game.G.freezeTime = false;
  $('play').textContent = 'Pause'; frame.focus();
};
$('play').onclick = () => {
  if (!game) return;
  if (playing) stop();
  else { freePlay = false; playing = true; game.G.audio.unlock(); game.G.freezeTime = false; $('play').textContent = 'Pause'; frame.focus(); }
};
$('map').onclick = () => {
  if (!game) return;
  stop(); game.G.audio.unlock(); game.G.freezeTime = false; game.hub(); game.G.unlockedStage = 0;
  game.setPlayerPos(800, 220); game.step(80);
  for (const a of ['use', 'attack']) { game.press(a); game.step(2); game.release(a); game.step(2); }
  game.G.freezeTime = true; game.G.fade = 0; game.render(); readout();
};
$('door').onclick = () => {
  if (!game) return;
  stop(); game.G.freezeTime = false; game.hub(); game.G.pendingDestination = 0;
  game.setPlayerPos(1470, 220); game.step(90); game.G.freezeTime = true; game.G.fade = 0; game.render(); readout();
};
$('scale').onclick = () => { const small = frame.classList.toggle('small'); $('scale').textContent = small ? 'View at 2×' : 'View at 1×'; };
$('save').onclick = () => {
  if (!game) return;
  const link = document.createElement('a'); link.href = frame.contentDocument.getElementById('game').toDataURL();
  link.download = `elevator-${game.G.travel?.t || game.G.state}.png`; link.click();
};
frame.addEventListener('load', async () => {
  while (!frame.contentWindow.__game || frame.contentWindow.__game.G.state === 'boot') await new Promise(resolve => setTimeout(resolve, 100));
  game = frame.contentWindow.__game;
  while (!game.travelReady()) await new Promise(resolve => setTimeout(resolve, 100));
  const params = new URLSearchParams(location.search);
  const place = params.get('scene');
  if (['bar', 'reception', 'lobby'].includes(place)) {
    lobbyFocus = place === 'bar' ? 665 : place === 'reception' ? 345 : 100;
    scene = 'lobby'; timeline.max = 1800;
  } else if (place === 'exit') { scene='exit'; timeline.max=109; }
  else if (place === 'bed' || place === 'penthouse') { scene=place; timeline.max=1800; }
  else if (['curb','car-board','drive'].includes(place)) {scene=place;timeline.max=place==='car-board'?77:place==='drive'?299:1800;}
  else if (airportDurations[place]) {scene=place;timeline.max=airportDurations[place]-1;}
  else if (place === 'porter') { scene='porter'; timeline.max=1800; }
  seek(Number(params.get('t')) || 1);
});
function tick() {
  if (playing && game) {
    if (freePlay) { readout(); requestAnimationFrame(tick); return; }
    if ((scene === 'elevator' && game.G.travel?.phase !== 'elevator') || (scene === 'exit' && game.G.travel?.phase !== 'lobby')) {
      game.release('left'); game.release('right');
      // Let the actual arrival fade finish before freezing the lobby preview.
      if (game.G.fade <= 0) stop();
    }
    else motionAt(game.G.travel?.t || game.G.time);
    readout();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
