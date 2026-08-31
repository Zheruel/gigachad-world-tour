const ROOT = 'assets/experiments/animation_pipeline/processed';
let paused = false;
let manualFrame = 0;
let speed = 1;

const imageCache = new Map();
function loadImage(src) {
  if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  }));
  return imageCache.get(src);
}

async function loadSet(directory, count) {
  return Promise.all(Array.from({ length: count }, (_, i) => loadImage(`${ROOT}/${directory}/${i}.png`)));
}

const sets = {
  tiger: [
    { title:'Current production', dir:'tiger-current', count:6, note:'Consistent identity, but a rigid torso and friendly head carriage.', metric:'current_alpha_churn' },
    { title:'Direct sheet', dir:'tiger-sheet-direct', count:8, note:'Better paw staging; design remains too close to the old house-cat attitude.', metric:'direct_alpha_churn' },
    { title:'Anchor-first hybrid', dir:'tiger-sheet-hybrid', count:8, note:'New dangerous anchor survives the cycle; lower head and stronger shoulder mass.', metric:'hybrid_alpha_churn', recommended:true },
  ],
  tigerRest: [
    { title:'Current rest family', dir:'tiger-rest-current', count:5, note:'Readable progression, but the upright head and softer face lose the predator silhouette.', metric:'current_alpha_churn' },
    { title:'Anchor-first rest family', dir:'tiger-rest-hybrid', count:5, note:'The same low dangerous identity now carries through sleep, notice, rise, stretch, and snarl.', metric:'hybrid_alpha_churn', recommended:true },
  ],
  couch: [
    { title:'Current per-pose edits', dir:'couch-current', count:4, note:'Furniture is exceptionally stable; the large pose jumps make CHAD pop.', metric:'current_lower_band_drift' },
    { title:'Direct sheet · rejected', dir:'couch-sheet-direct', count:6, note:'A clearer hand arc, but CHAD and the furniture are redrawn and shift between cells.', metric:'direct_lower_band_drift' },
    { title:'Anchor-first sheet · rejected', dir:'couch-sheet-hybrid', count:6, note:'A stronger static anchor does not stop a wide sheet from changing pelvis, knees, and fixture.', metric:'hybrid_lower_band_drift' },
    { title:'Reference midpoint edits', dir:'couch-midpoints', count:7, note:'Three one-at-a-time in-betweens inserted between the four stable canonical poses.', metric:'midpoint_lower_band_drift' },
    { title:'Canonical fixture composite', dir:'couch-canonical', count:7, note:'Each pose contributes CHAD only; every visible sofa and table pixel comes from one immutable plate.', metric:'canonical_lower_band_drift', exactFixture:true, recommended:true },
  ],
};

function cardHTML(item, fish=false) {
  return `<article class="card${item.recommended ? ' recommended' : ''}">
    <div class="preview"><canvas class="${fish ? 'school' : 'sprite'}" width="420" height="250"></canvas></div>
    <div class="meta"><h3>${item.title}${item.recommended ? '<span class="badge">RECOMMENDED</span>' : ''}</h3><p class="dim">${item.note}</p><div class="readout"></div></div>
  </article>`;
}

function avg(values) { return values.reduce((sum, n) => sum + n, 0) / Math.max(1, values.length); }
function metricText(values, label) { return `${label}: ${avg(values).toFixed(1)}% mean · ${values.map(n => n.toFixed(1)).join(' / ')}`; }

async function mountSpriteGroup(kind, root, metrics) {
  const definitions = sets[kind];
  root.innerHTML = definitions.map(item => cardHTML(item)).join('');
  const cards = [...root.querySelectorAll('.card')];
  await Promise.all(definitions.map(async (item, index) => {
    item.images = await loadSet(item.dir, item.count);
    item.canvas = cards[index].querySelector('canvas');
    item.ctx = item.canvas.getContext('2d');
    item.ctx.imageSmoothingEnabled = false;
    const values = metrics[kind][item.metric];
    cards[index].querySelector('.readout').textContent = item.exactFixture
      ? 'fixture source: one immutable plate · measured change below is moving legs only'
      : metricText(values, kind === 'couch' ? 'lower-band change' : 'silhouette change');
  }));
}

function spriteIndex(item, t) {
  if (paused) return manualFrame % item.count;
  if (item.dir.startsWith('couch')) {
    const holds = item.count === 4
      ? [900,140,260,560]
      : item.count === 7
        ? [900,90,130,110,260,110,560]
        : [900,120,170,230,170,480];
    let at = (t * speed) % holds.reduce((a,b)=>a+b,0);
    for (let i=0;i<holds.length;i++) { if (at < holds[i]) return i; at -= holds[i]; }
  }
  return Math.floor(t * speed / 125) % item.count;
}

function drawSprite(item, t) {
  const ctx = item.ctx, canvas = item.canvas, image = item.images[spriteIndex(item, t)];
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const scale = Math.min((canvas.width-34)/image.width, (canvas.height-34)/image.height);
  const w = Math.round(image.width*scale), h = Math.round(image.height*scale);
  ctx.drawImage(image, Math.round((canvas.width-w)/2), Math.round((canvas.height-h)/2), w, h);
}

const fishDefs = [
  { title:'Current · 26 fish', dir:'fish-current', count:4, n:26, note:'Small redraws across 26 independently phased bodies become whole-school shimmer.', metric:'current_body_churn' },
  { title:'Single static anchor · 14 fish', dir:'fish-static', count:4, n:14, note:'Zero body churn; pathing and school deformation do all of the animation.', metric:'static_body_churn' },
  { title:'Tail-only · 14 fish', dir:'fish-tail', count:4, n:14, note:'The first optimization fixed body flicker, but its chunky eye and clone-stamped silhouette still look synthetic.', metric:'tail_only_body_churn' },
  { title:'Mixed sardines + sprats · 11 fish', dirs:['fish-sardine-v2','fish-sprat-v2'], count:4, n:11, note:'Two natural proportions and sizes, restrained eyes, coordinated facing, slower tail cadence, and more breathing room.', metric:'mixed_body_churn', recommended:true },
];

function seeded(i) { const x = Math.sin(i * 91.733) * 43758.5453; return x - Math.floor(x); }
async function mountFish(root, metrics) {
  root.innerHTML = fishDefs.map(item => cardHTML(item, true)).join('');
  const cards = [...root.querySelectorAll('.card')];
  await Promise.all(fishDefs.map(async (item,index) => {
    item.variantImages = item.dirs ? await Promise.all(item.dirs.map(dir => loadSet(dir,item.count))) : null;
    item.images = item.variantImages ? item.variantImages[0] : await loadSet(item.dir,item.count);
    item.canvas = cards[index].querySelector('canvas');
    item.canvas.height = 190;
    item.ctx = item.canvas.getContext('2d');
    item.ctx.imageSmoothingEnabled = false;
    cards[index].querySelector('.readout').textContent = metricText(metrics.fish[item.metric], 'body change');
  }));
}

function drawSchool(item,t) {
  const {ctx,canvas} = item;
  const grad = ctx.createLinearGradient(0,0,0,canvas.height);
  grad.addColorStop(0,'#174d86'); grad.addColorStop(1,'#07182a');
  ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(95,168,215,.08)';
  for(let i=0;i<4;i++) ctx.fillRect(0,16+i*37+Math.sin(t*.0007+i)*4,canvas.width,2);
  const cx=canvas.width*.54+Math.sin(t*.00024)*38, cy=canvas.height*.48+Math.sin(t*.00031)*10;
  for(let i=0;i<item.n;i++) {
    const phase=seeded(i+3)*Math.PI*2;
    const ring=.25+.75*seeded(i+17);
    const x=cx+(seeded(i+31)-.5)*150*ring+Math.cos(t*.00065+phase)*3;
    const y=cy+(seeded(i+47)-.5)*76*ring+Math.sin(t*.00083+phase)*2;
    const frame=paused ? manualFrame%item.count : Math.floor(t*.006+phase*2)%item.count;
    const images=item.variantImages ? item.variantImages[i%item.variantImages.length] : item.images;
    const image=images[(frame+item.count)%item.count];
    ctx.drawImage(image,Math.round(x),Math.round(y));
  }
}

const metrics = await fetch('assets/experiments/animation_pipeline/metrics.json').then(r=>r.json());
await Promise.all([
  mountSpriteGroup('tiger',document.querySelector('#tigerGrid'),metrics),
  mountSpriteGroup('tigerRest',document.querySelector('#tigerRestGrid'),metrics),
  mountSpriteGroup('couch',document.querySelector('#couchGrid'),metrics),
  mountFish(document.querySelector('#fishGrid'),metrics),
]);

document.querySelector('#pause').onclick = event => { paused=!paused; event.currentTarget.textContent=paused?'PLAY':'PAUSE'; };
document.querySelector('#step').onclick = () => { paused=true; manualFrame++; document.querySelector('#pause').textContent='PLAY'; };
document.querySelector('#speed').oninput = event => { speed=Number(event.target.value)/100; };

function loop(t) {
  for (const group of Object.values(sets)) for (const item of group) drawSprite(item,t);
  for (const item of fishDefs) drawSchool(item,t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
