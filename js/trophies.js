import { hasCleared } from './progress.js';

// Stable stage IDs also let old clears receive the new art without a save migration.
export const TROPHIES = Object.freeze({
  train: { name: 'LAST STOP: CHAD', description: 'END OF THE LINE.',
    shelf: 'trophy_train', detail: 'trophy_train_detail' },
  delhi: { name: 'SCRAPYARD KING', description: 'STEEL JAWS. IRON FIST.',
    shelf: 'trophy_delhi', detail: 'trophy_delhi_detail' },
  refund: { name: 'CALL TERMINATED', description: 'NO REFUNDS. NO SURVIVORS.',
    shelf: 'trophy_refund', detail: 'trophy_refund_detail' },
});

export const trophyForStage = (stage) => TROPHIES[stage?.id] || null;
export const earnedTrophies = (game, stages) => stages.flatMap((stage, act) =>
  hasCleared(game, act) ? [{ act, k: stage.boss, stage, trophy: trophyForStage(stage) }] : []);
