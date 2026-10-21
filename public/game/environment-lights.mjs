import * as T from './three.module.js';
import {LIGHT_BUDGET} from './lighting.mjs?v=120';

// Lamps keep their authored color, range, brightness and flicker. One fixed
// shader light budget serves all floors, including the distant mansion wings.

// Wing ceiling lamps are sized by how high they hang, so every room gets the
// same gentle light on the floor beneath them (v129). Before this, the lamps
// hung low in the ground-floor wings were three times brighter on the floor
// than the tall rooms' lamps and blew out the ceiling just above them.
export const LAMP_FLOOR_LIGHT=1.85;
export function lampIntensity(height,decay=1.5){return LAMP_FLOOR_LIGHT*Math.max(1,height)**decay;}
export function createEnvironmentLights(scene,groundFixtures,upperFixtures,lighting,count=LIGHT_BUDGET.environment){
  const sources=[];
  for(const light of [...scene.children])if(light.isPointLight){
    sources.push({position:light.position.clone(),color:light.color,light,distance:light.distance,decay:light.decay});
    light.visible=false;light.castShadow=false;
  }
  for(const f of groundFixtures)sources.push({position:new T.Vector3(f.x,f.y,f.z),color:new T.Color(f.color),intensity:f.intensity??lampIntensity(f.y-(f.floor??0)),distance:f.distance??18,decay:1.5,cellar:!!f.cellar});
  for(const f of upperFixtures)sources.push({position:new T.Vector3(f.x,f.y,f.z),color:new T.Color(0xffc892),intensity:f.intensity??13,distance:12,decay:1.5,upper:true});
  const lights=Array.from({length:count},()=>{const light=new T.PointLight(0xffffff,0,18,1.5);scene.add(light);lighting.register(light);return light;});
  const slots=new Array(count).fill(null),chosen=new Array(count),scores=new Float64Array(count),lastPosition=new T.Vector3(Infinity,Infinity,Infinity);
  let next=-1,lastUpper=false;
  const intensity=source=>source.light?source.light.intensity:source.intensity;
  function update(position,time,floorY=0){
    const upstairs=floorY>2;
    if(time>=next||upstairs!==lastUpper||lastPosition.distanceToSquared(position)>2.25){
      next=time+.15;lastUpper=upstairs;lastPosition.copy(position);chosen.fill(null);scores.fill(-1);
      for(const source of sources){
        const d2=source.position.distanceToSquared(position);
        if(source.distance>0&&d2>(source.distance+2)**2)continue;
        const floorWeight=floorY<-.5?(source.cellar?1:.06):source.cellar? .06:(!!source.upper!==upstairs? .25:1);
        const score=intensity(source)/(1+d2)*floorWeight*(slots.includes(source)?1.15:1);
        for(let i=0;i<count;i++)if(score>scores[i]){
          for(let j=count-1;j>i;j--){scores[j]=scores[j-1];chosen[j]=chosen[j-1];}
          scores[i]=score;chosen[i]=source;break;
        }
      }
      // Retain each lamp's slot while selected, avoiding needless light swaps.
      for(let i=0;i<count;i++)if(!chosen.includes(slots[i]))slots[i]=null;
      for(const source of chosen)if(source&&!slots.includes(source))slots[slots.indexOf(null)]=source;
    }
    for(let i=0;i<count;i++){
      const source=slots[i],light=lights[i];
      if(!source){lighting.bind(light,null,0);continue;}
      light.position.copy(source.position);light.color.copy(source.color);
      light.distance=source.distance;light.decay=source.decay;lighting.bind(light,source,intensity(source));
    }
  }
  return {lights,sources,slots,update};
}
