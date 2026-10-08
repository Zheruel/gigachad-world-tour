// Save identity survives changes to the campaign's display order.
export const SAVE_VERSION = 2;
const OLD_SLOTS = { stage2a: 'train_a', stage2b: 'train_b', boss2: 'train_boss', stage1a: 'delhi_a', stage1b: 'delhi_b',
  boss1: 'delhi_boss', stage3a: 'refund_a', stage3b: 'refund_a', refund_b: 'refund_a', final: 'refund_boss', boss: null }; // the shared miniboss theme was retired
export function readProgress(saved = {}, stages) {
  const oldOrder = ['delhi', 'train'];
  const legacy = saved.version !== SAVE_VERSION;
  const scores = legacy ? Object.fromEntries(oldOrder.map((id, i) => [id, saved.actBest?.[i]])) : saved.stageBest || {};
  const unlockedIds = legacy && Number.isFinite(saved.unlockedStage)
    ? oldOrder.slice(0, Math.max(0, Math.min(1, saved.unlockedStage)) + 1)
    : Array.isArray(saved.unlockedIds) ? saved.unlockedIds : [];
  let unlockedStage = 0;
  const actBest = {};
  stages.forEach((stage, i) => {
    if (unlockedIds.includes(stage.id)) unlockedStage = Math.max(unlockedStage, i);
    if (Number.isFinite(scores[stage.id]) && scores[stage.id] >= 0) actBest[i] = scores[stage.id];
  });
  const delhi=stages.findIndex(s=>s.id==='delhi'),refund=stages.findIndex(s=>s.id==='refund');
  if(refund>=0&&delhi>=0&&Object.hasOwn(actBest,delhi))unlockedStage=Math.max(unlockedStage,refund);
  // Jukebox tracks CHAD has heard (js/music_library.js). A save from before tracks were
  // kept has no `tracks` at all; main.js checks for that to backfill cleared stages.
  // Slots were once named by act number; old ids map onto the stage-named ones.
  const tr = saved.tracks, list = (a) => Array.isArray(a)
    ? [...new Set(a.filter((s) => typeof s === 'string').map((s) => s in OLD_SLOTS ? OLD_SLOTS[s] : s).filter(Boolean))] : [];
  return { unlockedStage, actBest, tracksHeard: list(tr?.heard), tracksNew: list(tr?.pending),
    tracksUnseen: list(tr?.unseen) };
}

export function writeProgress(game, stages) {
  return {
    version: SAVE_VERSION, hiscore: game.hiscore, bestComboAll: game.bestComboAll,
    unlockedIds: stages.slice(0, game.unlockedStage + 1).map((stage) => stage.id),
    stageBest: Object.fromEntries(stages.flatMap((stage, i) =>
      Object.hasOwn(game.actBest, i) ? [[stage.id, game.actBest[i]]] : [])),
    tracks: { heard: game.tracksHeard || [], pending: game.tracksNew || [], unseen: game.tracksUnseen || [] },
  };
}

export const hasCleared = (game, index) => Object.hasOwn(game.actBest, index);
