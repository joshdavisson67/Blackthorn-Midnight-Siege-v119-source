import {waveConfig} from './core.mjs?v=116';
import {FERAL,chooseEnemyKind} from './feral.mjs?v=116';

export const CURSE_RULES=Object.freeze({firstMilestone:4,milestoneInterval:5,choiceSeconds:60,decisionDelaySeconds:7,aliveLimit:32,speedPerRank:.15,speedBonusCap:1,rewardPerRank:.25,specialPerRank:.10,specialBonusCap:1,healthPerRank:.20,populationPerRank:.15});
const titles=Object.freeze(['Uncursed','The Whispered','The Marked','The Forsaken','The Damned',"Blackthorn's Chosen"]);
export function curseTitle(rank=0){return titles[rank]??'Endless Corruption';}
export function curseModifiers(rank=0){
  return {speed:1+Math.min(CURSE_RULES.speedBonusCap,rank*CURSE_RULES.speedPerRank),reward:1+rank*CURSE_RULES.rewardPerRank,special:1+Math.min(CURSE_RULES.specialBonusCap,rank*CURSE_RULES.specialPerRank),health:1+Math.max(0,rank-2)*CURSE_RULES.healthPerRank,population:1+Math.max(0,rank-3)*CURSE_RULES.populationPerRank};
}
export function curseWaveConfig(wave,rank=0){const base=waveConfig(wave),m=curseModifiers(rank);return {...base,count:Math.ceil(base.count*m.population),health:base.health*m.health,speed:base.speed*m.speed};}
export function curseReward(base,rank=0){return Math.round(base*(1+rank*CURSE_RULES.rewardPerRank));}
// The rank is earned at the cleared milestone, before the next wave starts.
// A death during the post-choice countdown must retain a valid rank and title.
export function maxCurseRank(wave){return Math.max(0,Math.floor((wave-CURSE_RULES.firstMilestone)/CURSE_RULES.milestoneInterval)+1);}

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

export function createCurse(){
  let rank=0,lastMilestone=0,pending=false,timeLeft=0;
  return {
    offer(wave){if(pending||wave<CURSE_RULES.firstMilestone||(wave-CURSE_RULES.firstMilestone)%CURSE_RULES.milestoneInterval||wave<=lastMilestone)return false;lastMilestone=wave;pending=true;timeLeft=CURSE_RULES.choiceSeconds;return true;},
    update(dt){if(!pending||dt<=0)return false;timeLeft=Math.max(0,timeLeft-dt);return timeLeft<=1e-9;},
    resolve(choice){if(!pending||!['embrace','resist','timeout'].includes(choice))return false;if(choice==='embrace')rank++;pending=false;timeLeft=0;return true;},
    cancel(){pending=false;timeLeft=0;},
    reset(){rank=lastMilestone=0;pending=false;timeLeft=0;},
    get rank(){return rank;},get title(){return curseTitle(rank);},get pending(){return pending;},get timeLeft(){return timeLeft;},get lastMilestone(){return lastMilestone;},
  };
}
