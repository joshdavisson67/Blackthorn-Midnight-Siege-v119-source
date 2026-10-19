import * as T from './three.module.js';
import {LIGHT_BUDGET} from './lighting.mjs?v=120';
import {POWERUPS} from './powerups.mjs?v=125';
// Three's light count is part of its shader-program key. Never add/remove lights
// for short-lived pickups or flashes: choose the two strongest nearby sources.
export function createCombatLights(scene,lighting){
  const count=LIGHT_BUDGET.combat,lights=Array.from({length:count},()=>{const l=new T.PointLight(0xffffff,0,15);scene.add(l);lighting.register(l,'combat');return l;}),selected=new Array(count),scores=new Float64Array(count),slots=new Array(count).fill(null);
  function reset(){slots.fill(null);for(const l of lights)lighting.bind(l,null,0);}
  function update(effects,pickups,player){
    selected.fill(null);scores.fill(-1);
    function consider(source,blast){
      const p=source.mesh.position,intensity=blast?25*source.life/source.max:2,score=intensity/(1+p.distanceToSquared(player))*(slots.includes(source)?1.15:1);
      for(let i=0;i<count;i++)if(score>scores[i]){for(let j=count-1;j>i;j--){scores[j]=scores[j-1];selected[j]=selected[j-1];}scores[i]=score;selected[i]=source;break;}
    }
    for(const e of effects)if(e.type==='blast'&&e.life>0)consider(e,true);
    for(const p of pickups)if(p.life>0&&POWERUPS[p.type])consider(p,false);
    for(let i=0;i<count;i++)if(!selected.includes(slots[i]))slots[i]=null;
    for(const source of selected)if(source&&!slots.includes(source))slots[slots.indexOf(null)]=source;
    for(let i=0;i<count;i++){const s=slots[i],l=lights[i];if(!s){lighting.bind(l,null,0);continue;}const blast=s.type==='blast';s.lightingPosition??=new T.Vector3(s.mesh.position.x,blast?s.mesh.position.y:s.y+.85,s.mesh.position.z);l.position.copy(s.lightingPosition);l.distance=blast?15:3;l.color.setHex(blast?0xffb86a:POWERUPS[s.type].color);lighting.bind(l,s,blast?25*s.life/s.max:2);}
  }
  return {lights,update,reset};
}
