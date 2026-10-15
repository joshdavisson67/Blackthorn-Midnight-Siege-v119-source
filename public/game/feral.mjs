import {enemyKind} from './core.mjs?v=116';
export const FERAL=Object.freeze({unlockWave:7,chance:1/8,speedMultiplier:3,damageMultiplier:2});
export function chooseEnemyKind(wave,slot,roll=Math.random()){
  const kind=enemyKind(wave,slot);
  if(wave<FERAL.unlockWave||kind==='brute'||kind==='ashfang')return kind;
  // The existing brute/Ashfang schedule reserves 26 of every 140 slots.
  // Compensate across the other 114 slots for ~1 in 8 total spawns.
  return roll<FERAL.chance*140/114?'feral':kind;
}
