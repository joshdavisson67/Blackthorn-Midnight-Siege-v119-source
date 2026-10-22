import * as T from './three.module.js';

// Blackout world event (v135). Every light source in the estate fades with the
// event's darkness level: the sky and moonlight, the image-based ambience,
// every pooled lamp/candle/fire point light, and glowing fixtures (bulbs,
// windows, candle flames, the hearth). The player's flashlight, muzzle flash,
// enemy eyes, pickups and event essence are never touched. No lights are added
// or removed, so the shader light signature stays fixed; only intensities and
// colours change, and only while the level is moving.
export const BLACKOUT=Object.freeze({ambient:.04,environment:.04,fog:.22,signs:.4,view:.25,particles:.15});

export function createBlackout({scene,world,hemisphere,moonlight,viewLights=[],environmentLights,sky=null,skip=()=>false}){
  const base={hemisphere:hemisphere.intensity,moon:moonlight.intensity,environment:scene.environmentIntensity??1,fog:scene.fog?.color.clone(),background:scene.background?.isColor?scene.background.clone():null,view:viewLights.map(l=>l.intensity)};
  let registry=null,level=0;
  // Collected once, the first time the lights go down, so every station and
  // fixture built during start-up is included.
  function collect(){
    const emissive=new Map(),glows=new Map(),signs=new Map(),flames=new Map(),particles=new Map();
    // Rain, dust and mist are unlit; without dimming they would hang in the dark like stars.
    scene.traverse(o=>{if(o.isPoints&&o.material&&!particles.has(o.material))particles.set(o.material,o.material.opacity);});
    world.traverse(o=>{
      if(!o.isMesh||skip(o))return;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(!m||m.userData.enemyEyes)continue;
        if(m.isMeshStandardMaterial&&m.emissive&&m.emissive.getHex()!==0&&m.emissiveIntensity>0){if(!emissive.has(m))emissive.set(m,{base:m.emissiveIntensity,set:m.emissiveIntensity});}
        else if(m.isShaderMaterial&&m.blending===T.AdditiveBlending)flames.set(o,o.visible);
        else if(m.isMeshBasicMaterial&&!o.userData.dynamic){
          const target=m.map?signs:glows;if(!target.has(m))target.set(m,m.color.clone());
        }
      }
    });
    return {emissive,glows,signs,flames,particles};
  }
  function apply(next){
    next=Math.min(1,Math.max(0,next||0));
    if(next===0&&level===0&&!registry)return;
    if(!registry)registry=collect();
    // Track other code animating an emissive (pulsing stones, armed lights):
    // a value we did not write becomes that material's new base.
    for(const [m,r] of registry.emissive){if(Math.abs(m.emissiveIntensity-r.set)>1e-6)r.base=m.emissiveIntensity;r.set=m.emissiveIntensity=r.base*(1-next);}
    if(next===level)return;level=next;
    const on=1-level;
    hemisphere.intensity=base.hemisphere*(BLACKOUT.ambient+(1-BLACKOUT.ambient)*on);
    moonlight.intensity=base.moon*on;
    scene.environmentIntensity=base.environment*(BLACKOUT.environment+(1-BLACKOUT.environment)*on);
    viewLights.forEach((l,i)=>{l.intensity=base.view[i]*(BLACKOUT.view+(1-BLACKOUT.view)*on);});
    if(environmentLights)environmentLights.scale=on;
    if(base.fog)scene.fog.color.copy(base.fog).multiplyScalar(BLACKOUT.fog+(1-BLACKOUT.fog)*on);
    if(base.background)scene.background.copy(base.background).multiplyScalar(BLACKOUT.fog+(1-BLACKOUT.fog)*on);
    if(sky?.skyLight)sky.skyLight.value=BLACKOUT.fog+(1-BLACKOUT.fog)*on;
    for(const [m,c] of registry.glows)m.color.copy(c).multiplyScalar(on);
    for(const [m,c] of registry.signs)m.color.copy(c).multiplyScalar(BLACKOUT.signs+(1-BLACKOUT.signs)*on);
    for(const [o,visible] of registry.flames)o.visible=visible&&level<.6;
    for(const [m,opacity] of registry.particles)m.opacity=opacity*(BLACKOUT.particles+(1-BLACKOUT.particles)*on);
  }
  return {apply,reset(){apply(0);},get level(){return level;},get registry(){return registry;}};
}
