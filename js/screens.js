import { drawRefundForeground } from './refund_scenery.js';
import { drawResults } from './results.js';
import { loadTitleMotion, drawTitleMotion } from './title_motion.js';
import { loadDisplayType, drawDisplayTitle } from './display_type.js';
let titleArt = null;
export const titleReady = Promise.all([loadTitleMotion(),loadDisplayType()]).then(([art]) => { titleArt = art; });
// screens.js - title, stage intro, boss intro, stage clear, ending, game over
import { G, W, H } from './engine.js';
import { SPR, drawText, drawTextShadow, textWidth, getFrame, blit, frameW, frameH } from './sprites.js';
import { drawStage, STAGES } from './stages.js';
import { ASSETS } from './assets.js';
import { drawProp } from './props.js';
import { drawTrainOverlay } from './train.js';
import { drawDialogue, bossIntroDialogue } from './room_dialogue.js';

function center(str, scale) { return (W - textWidth(str, scale)) / 2; }

const STAGE_NAMES = STAGES.map((s) => s.name);
const STAGE_COUNT = STAGES.length;

// Logical. The art is 260x82, so this height is 82 * LOGO_W / 260 - sized so the wordmark
// finishes above y 86, where the bottom scrim starts, and the key art keeps its top third.
const LOGO_W = 208;

function drawLogo(ctx, y0) {
  const t = G.rawTime;
  const bob = Math.round(Math.sin(t * 0.05) * 2);
  // drawn lettering is the fallback, like every other asset in this game
  const art = ASSETS.logo;
  if (art) {
    const lh = Math.round(art.height / art.width * LOGO_W);
    ctx.drawImage(art, Math.round((W - LOGO_W) / 2), y0 + bob, LOGO_W, lh);
    return;
  }
  drawText(ctx, 'GIGACHAD', center('GIGACHAD', 4) + 2, y0 + bob + 2, '#100a0c', 4);
  drawText(ctx, 'GIGACHAD', center('GIGACHAD', 4), y0 + bob, '#ffd94a', 4);
  drawText(ctx, 'WORLD TOUR', center('WORLD TOUR', 2) + 2, y0 + 30 + bob + 2, '#100a0c', 2);
  drawText(ctx, 'WORLD TOUR', center('WORLD TOUR', 2), y0 + 30 + bob, '#d82838', 2);
  ctx.fillStyle = '#ffd94a';
  const lw = textWidth('WORLD TOUR', 2);
  ctx.fillRect(center('WORLD TOUR', 2) - 14, y0 + 34 + bob, 10, 1);
  ctx.fillRect(center('WORLD TOUR', 2) + lw + 4, y0 + 34 + bob, 10, 1);
}

export function drawWelcome(ctx) {
  ctx.fillStyle='#08060d';ctx.fillRect(0,0,W,H);
  const s='PRESS ANY KEY OR BUTTON';drawTextShadow(ctx,s,(W-textWidth(s,1))/2,H/2-4,'#fff0ce',1);
}

export function drawTitle(ctx) {
  if (titleArt?.cigar && titleArt?.world) { drawTitleMotion(ctx, titleArt, 'cigar', G.rawTime); return; }
  const t = G.rawTime;
  if (ASSETS.title_art) {
    const pan = Math.round(Math.sin(t * 0.012) * 4);
    // authored 12 logical px wider than the screen so the idle pan never exposes an edge
    ctx.drawImage(ASSETS.title_art, -6 + pan, 0, W + 12, 186);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 1; y < 186; y += 3) ctx.fillRect(0, y, W, 1);
    if (((t * 7) % 300) < 3) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, 0, W, 186); }
    // The bottom scrim used to start at 86 and reach 0.85 by mid-screen, because four lines
    // of controls sat on it. They live in THE LAIR now, so it only has to carry PRESS Z -
    // it starts lower and stays lighter, and the room's floor is visible again.
    const grad = ctx.createLinearGradient(0, 108, 0, H);
    grad.addColorStop(0, 'rgba(8,4,8,0)');
    grad.addColorStop(0.5, 'rgba(8,4,8,0.55)');
    grad.addColorStop(1, 'rgba(8,4,8,0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 108, W, H - 108);
    // top scrim so the logo reads over the key art
    const top = ctx.createLinearGradient(0, 0, 0, 62);
    top.addColorStop(0, 'rgba(8,4,8,0.85)');
    top.addColorStop(1, 'rgba(8,4,8,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 62);
    drawLogo(ctx, 14);
    ctx.fillStyle = 'rgba(8,4,8,0.55)';
    ctx.fillRect(center('PRESS Z', 2) - 8, 164, textWidth('PRESS Z', 2) + 16, 14);
    if ((t >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 2), 168, '#f8f0e0', 2);
  } else {
    drawStage(ctx, (t * 0.4) % 1400);
    ctx.fillStyle = 'rgba(10,6,10,0.55)';
    ctx.fillRect(0, 0, W, H);
    const hero = getFrame(SPR.player, 'victory', 0, 1);
    blit(ctx, hero, 330, 132);
    const grunt = getFrame(SPR.goonda, 'hurt', 0, -1);
    blit(ctx, grunt, 66, 142);
    drawLogo(ctx, 18);
    if ((t >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 2), 128, '#f8f0e0', 2);
  }
  // The controls used to be listed here too. They belong where you can try them: the
  // title is key art, and THE LAIR is the room you stand in before you go anywhere.
  const hs = 'HI ' + String(G.hiscore).padStart(6, '0');
  drawTextShadow(ctx, 'ENTER THE LAIR', center('ENTER THE LAIR', 1), 202, '#f0b848', 1);
  drawTextShadow(ctx, hs, center(hs, 1), 214, '#ffd94a', 1);
}

export function drawIntro(ctx) {
  ctx.fillStyle = '#100a0c';
  ctx.fillRect(0, 0, W, H);
  const t = G.rawTime - G.stateT;
  const st = G.stage;
  // sliding banner bars
  const slide = Math.min(1, t / 18);
  const bx = Math.round((1 - slide) * -W);
  ctx.fillStyle = '#d82838';
  ctx.fillRect(bx, 96, W, 2);
  ctx.fillRect(-bx, 160, W, 2);
  const label = 'STAGE ' + st.num;
  drawTextShadow(ctx, label, center(label, 3) + bx, 106, '#f8f0e0', 3);
  if (t > 20) drawDisplayTitle(ctx,st.name,W/2,131,{height:24,maxWidth:350});
  if (t > 40) drawTextShadow(ctx, st.sub, center(st.sub, 1), 168, '#686098', 1);
}

export function drawBossIntro(ctx, camX) {
  drawStage(ctx, camX);
  const b = G.boss;
  if (!b) return;
  const t = G.rawTime - G.stateT;
  const bossFrame = (name, idx = 0, filter = '', worldX = b.x) => {
    const f = getFrame(b.set, name, idx, -1);
    ctx.save();
    if (filter) ctx.filter = filter;
    blit(ctx, f, Math.round(worldX - camX - frameW(f) / 2), Math.round(b.y - frameH(f) + 4));
    ctx.restore();
  };
  const drawChad = () => {
    const pf = getFrame(SPR.player, 'idle', (G.rawTime >> 4) & 1, 1);
    blit(ctx, pf, Math.round(G.player.x - camX - frameW(pf) / 2), Math.round(G.player.y - frameH(pf) + 4));
  };
  if (!b.delhi) drawChad();

  const speech=bossIntroDialogue(b,t,camX);
  const dialogue=()=>{if(speech)drawDialogue(ctx,speech);};
  if (b.delhi) {
    // The Delhi fights draw themselves: the reveal is the mechanic arriving - the
    // crowd closing, the wire, the bucket coming down out of the dark.
    // Props nearer the camera than the boss cover him (the vendor starts behind his cart).
    // CHAD sorts among them too: he stands in front of the cart, not behind it.
    const near = pr => !pr.broken && pr.x > camX - 40 && pr.x < camX + W + 40;
    const layers = G.props.filter(near).map(pr => [pr.y, () => drawProp(ctx, pr, camX)]);
    layers.push([b.y + .001, () => b.delhi.draw(ctx, b, camX)], [G.player.y, drawChad]);
    for (const [, draw] of layers.sort((p, q) => p[0] - q[0])) draw();
    if(b.key==='closer')drawRefundForeground(ctx,camX);
    if (b.key === 'neta') {
      if(t>=180){
       ctx.fillStyle='rgba(8,6,12,.9)';ctx.fillRect(0,230,W,40);
       drawDisplayTitle(ctx,'NETAJI AND SHERA',W/2,234,{height:19,maxWidth:330});
       drawTextShadow(ctx,'EVERYONE HAS A PRICE',center('EVERYONE HAS A PRICE',1),257,'#d9bc87',1);
      }
      dialogue();
      return;
    } else if (b.key === 'conductor') {
      if(t>=210){drawDisplayTitle(ctx,'HEAD CONDUCTOR',W/2,244,{height:17,maxWidth:270});dialogue();}
      return;
    } else if (b.key === 'vendor' || b.key === 'closer') {
      if (b.key === 'vendor') {
        // The name lands with the skimmer planted in the floor.
        if (t >= 296) {
          ctx.fillStyle = 'rgba(12,8,10,.8)'; ctx.fillRect(0,230,W,40);
          drawDisplayTitle(ctx,b.def.name,W/2,234,{height:19,maxWidth:310});
          drawTextShadow(ctx,b.def.title,center(b.def.title,1),257,'#e0b070',1);
        }
      } else if (t >= 392) {
        // The Closer is named once he is out from behind his desk, cracking his knuckles.
        // The band fades in from above so both fighters keep their feet on the marble.
        const band = ctx.createLinearGradient(0,236,0,250); band.addColorStop(0,'rgba(14,6,18,0)'); band.addColorStop(1,'rgba(14,6,18,.86)');
        ctx.fillStyle = band; ctx.fillRect(0,236,W,34);
        drawDisplayTitle(ctx,b.def.name,W/2,239,{height:17,maxWidth:300});
        drawTextShadow(ctx,b.def.title,center(b.def.title,1),259,'#ffd772',1);
      }
      dialogue();
      return;
    } else {
      // The Thekedar is named at his levers; the floodlight snaps on as he yanks the grab down.
      if (t >= 190) { ctx.fillStyle = `rgba(255,240,200,${t < 198 ? 0.3 : 0.06})`; ctx.fillRect(0, 0, W, H); }
      if (t >= 100) {
        ctx.fillStyle = 'rgba(4,8,10,.9)'; ctx.fillRect(0, 230, W, 40);
        drawDisplayTitle(ctx, 'THE THEKEDAR', W / 2, 234, { height: 19, maxWidth: 310 });
        drawTextShadow(ctx, 'AT THE LEVERS OF THE DREDGER', center('AT THE LEVERS OF THE DREDGER', 1), 257, '#a8c0c8', 1);
      }
      dialogue();
      return;
    }
  } else if (b.key === 'raja') {
    // Raja arrives as part of the road: brakes sideways, kills the meter,
    // and turns the vehicle itself into phase one's arena hazard.
    if (b.cart) drawProp(ctx, b.cart, camX);
    const skid = Math.max(0, 20 - Math.abs(t - 54)) / 20;
    bossFrame(t < 92 ? 'walk' : t < 132 ? 'taunt' : 'punch', t < 92 ? ((t >> 3) & 1) : 0);
    ctx.globalAlpha = skid * 0.45; ctx.fillStyle = '#e9d7b3';
    for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(b.x - camX + 22 + i * 9), 224 - i % 3, 7, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(20,8,2,0.86)'; ctx.fillRect(0, 202, W, 68);
    drawTextShadow(ctx, 'THE METER STOPS HERE', center('THE METER STOPS HERE', 1), 214, '#ffd66a', 1);
    drawTextShadow(ctx, 'RICKSHAW RAJA', center('RICKSHAW RAJA', 2), 232, '#48d278', 2);
  } else if (b.key === 'refund') {
    // Fluorescent office blackout, monitor wake-up, then the manager walks
    // out of the lift while every abandoned phone begins to ring.
    const on = t > 42;
    ctx.fillStyle = on ? 'rgba(25,220,255,0.10)' : 'rgba(0,0,0,0.76)'; ctx.fillRect(0, 0, W, H);
    if (on) bossFrame(t < 112 ? 'walk' : 'punch', t < 112 ? ((t >> 3) & 1) : 1);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = ((t / 8 + i) | 0) & 1 ? '#31dce8' : '#172c38';
      ctx.fillRect(42 + i * 92, 48 + (i & 1) * 12, 52, 23);
    }
    ctx.fillStyle = 'rgba(2,9,14,0.88)'; ctx.fillRect(0, 202, W, 68);
    drawTextShadow(ctx, 'YOUR ESCALATION HAS ARRIVED', center('YOUR ESCALATION HAS ARRIVED', 1), 214, '#79efff', 1);
    drawTextShadow(ctx, 'MR. REFUND', center('MR. REFUND', 2), 232, '#f5efb0', 2);
  } else if (b.key === 'yadav') {
    // Police lights belong to the station facade and rake across both fighters.
    const blue = ((t / 12) | 0) & 1;
    ctx.fillStyle = blue ? 'rgba(40,100,255,0.12)' : 'rgba(255,36,42,0.12)'; ctx.fillRect(0, 0, W, H);
    bossFrame(t < 105 ? 'walk' : 'punch', t < 105 ? ((t >> 3) & 1) : Math.min(2, ((t - 105) / 18) | 0));
    ctx.fillStyle = 'rgba(5,10,20,0.88)'; ctx.fillRect(0, 20, W, 54);
    drawTextShadow(ctx, 'THE STATION IS CLOSED', center('THE STATION IS CLOSED', 2), 28, '#f4f7ff', 2);
    drawTextShadow(ctx, 'INSPECTOR YADAV - NO WARRANT REQUIRED', center('INSPECTOR YADAV - NO WARRANT REQUIRED', 1), 58, blue ? '#70a8ff' : '#ff6068', 1);
  } else if (b.key === 'rana') {
    // Rana is first read as a lightning silhouette, then answers with the chain slam.
    const reveal = Math.max(0, Math.min(1, (t - 48) / 70));
    ctx.fillStyle = `rgba(3,1,8,${0.72 * (1 - reveal * 0.65)})`; ctx.fillRect(0, 0, W, H);
    const flash = (t >= 50 && t < 58) || (t >= 130 && t < 138);
    // Hold him inside the composition even when the encounter camera begins far
    // from his spawn. The full-body reveal is the point of this intro.
    bossFrame(t < 124 ? 'idle' : 'slam', 0, t < 50 ? 'brightness(0)' : flash ? 'brightness(2.4)' : '', camX + 342);
    if (t > 92) {
      ctx.fillStyle = 'rgba(20,2,8,0.88)'; ctx.fillRect(0, 196, W, 74);
      drawTextShadow(ctx, 'EVERY ROAD LED TO THIS GATE', center('EVERY ROAD LED TO THIS GATE', 1), 207, '#d8b8b8', 1);
      drawTextShadow(ctx, 'COMMANDER RANA', center('COMMANDER RANA', 3), 224, '#ff4f4f', 3);
      drawTextShadow(ctx, 'THE IRON LION', center('THE IRON LION', 1), 254, '#ffd075', 1);
    }
  } else {
    // The neutral card. Every boss reveal is meant to use something only its own
    // stage has, so this is a placeholder to be replaced per boss - but it has to be
    // NEUTRAL: it used to be Rana's lightning, so any boss added without a branch
    // silently inherited a thunderstorm and a camera offset meant for a fort gate.
    const reveal = Math.max(0, Math.min(1, (t - 30) / 60));
    ctx.fillStyle = `rgba(4,3,6,${0.66 * (1 - reveal * 0.7)})`; ctx.fillRect(0, 0, W, H);
    bossFrame(t < 110 ? 'walk' : 'idle', t < 110 ? ((t >> 3) & 1) : 0);
    if (t > 70) {
      ctx.fillStyle = 'rgba(8,6,12,0.86)'; ctx.fillRect(0, 202, W, 68);
      drawTextShadow(ctx, b.def.title, center(b.def.title, 1), 214, '#c8c0d8', 1);
      drawTextShadow(ctx, b.def.name, center(b.def.name, 2), 232, '#ffd075', 2);
    }
  }

  dialogue();
}

export function drawClear(ctx) {
  drawResults(ctx,G.rawTime-G.stateT);
}

const CREDITS = [
  'GIGACHAD: WORLD TOUR',
  '',
  'CHAD',
  '',
  'THE INDIA CHAPTER',
  '',
  'THE NIGHT TRAIN',
  'DIRTY DELHI',
  'REFUND TOWER',
  '',
  'HEAD CONDUCTOR',
  'NETAJI AND SHERA',
  'GHEE PAPPU',
  'THE DREDGER',
  'THE CLOSER',
  '',
  'HE DOES NOT DO IT FOR MONEY',
  'HE DOES NOT DO IT FOR GLORY',
  'HE DOES IT FOR THE LOVE OF THE GAME',
  '',
  'THE TOUR CONTINUES',
  '',
  'THANK YOU FOR PLAYING',
];

export function drawEnding(ctx) {
  const t = G.rawTime - G.stateT;
  ctx.fillStyle = '#0a0608';
  ctx.fillRect(0, 0, W, H);
  if (ASSETS.ending_art) {
    const zoom = 1 + Math.min(0.12, t * 0.00012);
    const w = Math.round(W * zoom), h = Math.round(186 * zoom);
    ctx.drawImage(ASSETS.ending_art, (W - w) / 2 | 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 1; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  } else {
    const hero = getFrame(SPR.player, 'victory', 0, 1);
    blit(ctx, hero, W / 2 - frameW(hero) / 2, 70);
  }
  const grad = ctx.createLinearGradient(0, 40, 0, H);
  grad.addColorStop(0, 'rgba(8,4,8,0)');
  grad.addColorStop(0.6, 'rgba(8,4,8,0.8)');
  grad.addColorStop(1, 'rgba(8,4,8,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 40, W, H - 40);

  // credits scroll
  const top = H - t * 0.35;
  for (let i = 0; i < CREDITS.length; i++) {
    const y = top + i * 13;
    if (y < 30 || y > H) continue;
    const line = CREDITS[i];
    const big = i === 0;
    drawTextShadow(ctx, line, center(line, big ? 2 : 1), y, big ? '#ffd94a' : '#f8f0e0', big ? 2 : 1);
  }
  const done = top + CREDITS.length * 13 < 60;
  if (done) {
    const score = 'FINAL SCORE ' + String(G.score).padStart(6, '0');
    drawTextShadow(ctx, score, center(score, 1), 182, '#ffd94a', 1);
    const rank = 'RANK ' + endRank();
    drawTextShadow(ctx, rank, center(rank, 2), 198, '#d85838', 2);
    if ((G.rawTime >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 1), 232, '#f8f0e0', 1);
  }
}

export function endRank() {
  const s = G.score;
  if (s > 150000) return 'GIGACHAD';
  if (s > 110000) return 'WORLD CLASS';
  if (s > 80000) return 'CONTENDER';
  if (s > 50000) return 'JOURNEYMAN';
  return 'TOURIST';
}

export function drawOver(ctx) {
  const t = G.rawTime - G.stateT;
  ctx.fillStyle = `rgba(10,4,8,${0.85 * Math.min(1, t / 40)})`;
  ctx.fillRect(0, 0, W, H);
  if (t < 30) return;
  drawDisplayTitle(ctx,'GAME OVER',W/2,82,{height:38,maxWidth:330});
  const n = Math.ceil(G.continueT / 60);
  drawTextShadow(ctx, 'CONTINUE? ' + n, center('CONTINUE? 9', 2), 144, '#f8f0e0', 2);
  if ((G.rawTime >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 1), 178, '#ffd94a', 1);
}
