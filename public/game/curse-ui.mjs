import {curseTitle,curseModifiers} from './curse.mjs?v=116';
const percent=multiplier=>`+${Math.round((multiplier-1)*100)}%`;
const effects=[['Enemy speed','speed'],['Essence & score earned','reward'],['Special enemy frequency','special'],['Enemy health','health'],['Enemies per wave','population']];
export function createCurseUI({document,curse,onChoice,onClose}){
  const el=id=>document.getElementById(id),modal=el('curseChoice'),notice=el('curseNotice');
  const buttons=[el('curseEmbrace'),el('curseResist'),el('curseClose')];
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
    el('pauseCurseNote').textContent=pauseRank?'These are your curse modifiers. The mark remains until this run ends.':'No curse accepted. The house has yet to leave its mark.';
  }
  function clock(){const seconds=Math.max(0,Math.ceil(curse.timeLeft-1e-9));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  function update(mode){
    const visible=curse.pending&&mode==='playing'&&modal.classList.contains('hidden');notice.classList.toggle('hidden',!visible);
    const time=clock();for(const id of ['curseCountdown','curseDialogCountdown'])if(el(id).textContent!==time)el(id).textContent=time;
    notice.classList.toggle('urgent',curse.timeLeft<=10);modal.classList.toggle('urgent',curse.timeLeft<=10);
    const status=`CURSE ${curse.rank} · ${curse.title.toUpperCase()}`;if(el('curseHud').textContent!==status)el('curseHud').textContent=status;el('curseHud').classList.toggle('hidden',curse.rank===0);
  }
  function open(){
    if(!curse.pending)return false;
    const next=curse.rank+1,current=curseModifiers(curse.rank),offered=curseModifiers(next);
    el('curseCurrent').textContent=`RANK ${curse.rank} · ${curse.title}`;el('curseNext').textContent=`RANK ${next} · ${curseTitle(next)}`;
    const body=el('curseComparison');body.replaceChildren();
    for(const [name,key] of effects){
      const row=document.createElement('tr');for(const value of [name,percent(current[key]),percent(offered[key])]){const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell);}body.appendChild(row);
    }
    el('curseEmbrace').textContent=`EMBRACE · RANK ${next}`;el('curseResist').textContent=`RESIST · KEEP RANK ${curse.rank}`;
    modal.classList.remove('hidden');notice.classList.add('hidden');el('curseChoiceBody').scrollTop=0;el('curseResist').focus({preventScroll:true});return true;
  }
  function close(){modal.classList.add('hidden');}
  function keydown(event){
    if(event.code==='Escape'){event.preventDefault?.();onClose();return;}
    if(event.code==='Tab'){event.preventDefault?.();const i=buttons.indexOf(document.activeElement);buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
  }
  el('curseEmbrace').onclick=()=>onChoice('embrace');el('curseResist').onclick=()=>onChoice('resist');el('curseClose').onclick=onClose;
  return {open,close,update,updatePauseStats,keydown,get visible(){return !modal.classList.contains('hidden');}};
}
