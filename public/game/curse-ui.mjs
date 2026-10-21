import {curseTitle,curseModifiers} from './curse.mjs?v=130';
const percent=multiplier=>`+${Math.round((multiplier-1)*100)}%`;
const effects=[['Enemy speed','speed'],['Essence & score earned','reward'],['Special enemy frequency','special'],['Enemy health','health'],['Enemies per wave','population']];
// In-run curse readouts: the HUD badge and the pause-menu modifier panel.
// The rank is chosen on the title screen and fixed for the run (v130).
export function createCurseUI({document,curse}){
  const el=id=>document.getElementById(id);
  const pausePanel=el('pauseCurse'),pauseStats=effects.map(([,key])=>[key,pausePanel.querySelector(`[data-curse-stat="${key}"]`)]);
  let pauseRank=null;
  // Refresh when a pause screen opens; the readout has no per-frame work.
  function updatePauseStats(){
    if(pauseRank===curse.rank)return;
    pauseRank=curse.rank;const modifiers=curseModifiers(pauseRank);
    pausePanel.dataset.rank=String(pauseRank);
    el('pauseCurseRank').textContent=`RANK ${pauseRank}`;
    el('pauseCurseTitle').textContent=curse.title;
    for(const [key,node] of pauseStats){node.textContent=modifiers[key]===1?'0%':percent(modifiers[key]);node.dataset.modified=String(modifiers[key]>1);}
    el('pauseCurseNote').textContent=pauseRank?'You chose this rank for the whole run. Defeat Sir Blackthorn to climb higher.':'Uncursed. Defeat Sir Blackthorn after wave 20 to unlock the first rank.';
  }
  function update(){
    const status=`CURSE ${curse.rank} · ${curse.title.toUpperCase()}`;if(el('curseHud').textContent!==status)el('curseHud').textContent=status;el('curseHud').classList.toggle('hidden',curse.rank===0);
  }
  return {update,updatePauseStats};
}

// One-line summary of a rank's effects for the title-screen selector.
export function curseSummary(rank){
  if(!rank)return 'No curse. Standard undead, standard rewards.';
  const m=curseModifiers(rank),parts=effects.map(([name,key])=>m[key]>1?`${percent(m[key])} ${name.toLowerCase()}`:null).filter(Boolean);
  return parts.join(' · ');
}
