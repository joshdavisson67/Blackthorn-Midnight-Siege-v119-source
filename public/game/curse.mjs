import {waveConfig} from './core.mjs?v=116';
import {FERAL,chooseEnemyKind} from './feral.mjs?v=116';

// The curse is a ladder (v130): each run is played at one chosen rank, and
// defeating Sir Blackthorn at the highest unlocked rank unlocks the next.
export const MAX_CURSE_RANK=25;
export const CURSE_RULES=Object.freeze({aliveLimit:32,speedPerRank:.15,speedBonusCap:1,rewardPerRank:.25,specialPerRank:.10,specialBonusCap:1,healthPerRank:.20,populationPerRank:.15});
const titles=Object.freeze(['Uncursed','The Whispered','The Marked','The Forsaken','The Damned',"Blackthorn's Chosen"]);
export function curseTitle(rank=0){return titles[rank]??'Endless Corruption';}
export function curseModifiers(rank=0){
  return {speed:1+Math.min(CURSE_RULES.speedBonusCap,rank*CURSE_RULES.speedPerRank),reward:1+rank*CURSE_RULES.rewardPerRank,special:1+Math.min(CURSE_RULES.specialBonusCap,rank*CURSE_RULES.specialPerRank),health:1+Math.max(0,rank-2)*CURSE_RULES.healthPerRank,population:1+Math.max(0,rank-3)*CURSE_RULES.populationPerRank};
}
export function curseWaveConfig(wave,rank=0){const base=waveConfig(wave),m=curseModifiers(rank);return {...base,count:Math.ceil(base.count*m.population),health:base.health*m.health,speed:base.speed*m.speed};}
export function curseReward(base,rank=0){return Math.round(base*(1+rank*CURSE_RULES.rewardPerRank));}
export function clampCurseRank(rank){return Number.isSafeInteger(rank)?Math.min(MAX_CURSE_RANK,Math.max(0,rank)):0;}

// The existing seven/five/twenty-slot schedule repeats every 140 spawns.
// Convert only ordinary walkers; keep every special's unlock and relative mix.
// Cache the wave bands, rather than allocating/rolling per AI update.
const specialBands=new Map();
function specialDistribution(wave){
  const band=wave>=7?7:wave>=6?6:wave>=5?5:1;
  if(specialBands.has(band))return specialBands.get(band);
  const weights=new Map(),feralChance=band>=FERAL.unlockWave?FERAL.chance*140/114:0;
  for(let slot=0;slot<140;slot++){
    const kind=chooseEnemyKind(band,slot,1),feralEligible=feralChance&&kind!=='brute'&&kind!=='ashfang';
    if(feralEligible)weights.set('feral',(weights.get('feral')||0)+feralChance/140);
    weights.set(kind,(weights.get(kind)||0)+(1-(feralEligible?feralChance:0))/140);
  }
  const total=1-(weights.get('walker')||0),kinds=[...weights].filter(([kind])=>kind!=='walker');
  const result={total,kinds,feralChance};specialBands.set(band,result);return result;
}
export function chooseCurseEnemyKind(wave,slot,roll,rank=0){
  const kind=chooseEnemyKind(wave,slot,roll);if(!rank||kind!=='walker')return kind;
  const {total,kinds,feralChance}=specialDistribution(wave),extra=Math.min(1,total*(curseModifiers(rank).special-1)/(1-total));
  const walkerRoll=(roll-feralChance)/(1-feralChance);if(walkerRoll>=extra)return kind;
  let target=walkerRoll/extra*total;
  for(const [special,weight] of kinds){target-=weight;if(target<=0)return special;}
  return kinds.at(-1)[0];
}

// One rank for the whole run, fixed when the run starts.
export function createCurse(initial=0){
  let rank=clampCurseRank(initial);
  return {
    setRank(next){rank=clampCurseRank(next);return rank;},
    get rank(){return rank;},get title(){return curseTitle(rank);},
  };
}

// Unlocked and selected ranks, remembered on this device.
export const CURSE_LADDER_KEYS=Object.freeze({unlocked:'blackthorn-curse-unlocked',selected:'blackthorn-curse-selected'});
export function createCurseLadder({storage}={}){
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  const read=key=>{try{const v=Number(storage?.getItem(key));return Number.isSafeInteger(v)?v:0;}catch{return 0;}};
  const write=(key,value)=>{try{storage?.setItem(key,String(value));}catch{}};
  let unlocked=clampCurseRank(read(CURSE_LADDER_KEYS.unlocked)),selected=Math.min(unlocked,clampCurseRank(read(CURSE_LADDER_KEYS.selected)));
  return {
    get unlocked(){return unlocked;},get selected(){return selected;},
    select(rank){selected=Math.min(unlocked,clampCurseRank(rank));write(CURSE_LADDER_KEYS.selected,selected);return selected;},
    // Beating Sir Blackthorn at the highest unlocked rank opens the next one.
    // Returns the newly unlocked rank, or null when nothing new opened.
    victory(rank){
      if(rank!==unlocked||unlocked>=MAX_CURSE_RANK)return null;
      unlocked++;write(CURSE_LADDER_KEYS.unlocked,unlocked);return unlocked;
    }
  };
}
