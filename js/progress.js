// Save identity survives changes to the campaign's display order.
export const SAVE_VERSION = 2;
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
  return { unlockedStage, actBest };
}

export function writeProgress(game, stages) {
  return {
    version: SAVE_VERSION, hiscore: game.hiscore, bestComboAll: game.bestComboAll,
    unlockedIds: stages.slice(0, game.unlockedStage + 1).map((stage) => stage.id),
    stageBest: Object.fromEntries(stages.flatMap((stage, i) =>
      Object.hasOwn(game.actBest, i) ? [[stage.id, game.actBest[i]]] : [])),
  };
}

export const hasCleared = (game, index) => Object.hasOwn(game.actBest, index);
