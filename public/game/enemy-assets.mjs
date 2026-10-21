import * as T from './three.module.js';
import {BRUTE} from './brute.mjs?v=30';
import {createZombieRig,tagZombie,rollGait} from './zombies.mjs?v=133';
import {createZombieDogRig} from './zombie-dog.mjs?v=133';
import {ENEMY_SURFACE,enemySurfaces,atlasUV,enemySurfaceShader} from './enemy-surfaces.mjs?v=133';

export function bakeEnemyPalette(rig){
  const palette=new Map(),geometries=new Map(),red=new T.Color(0xff3925),surfaces=enemySurfaces();
  rig.group.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const material=mesh.material,original=mesh.geometry.attributes.color;
    if(!material.isMeshStandardMaterial||!original||material.map||material.transparent||material.emissive.getHex()!==0)return;
    const key=material.side;
    if(!palette.has(key)){
      const merged=material.clone();merged.color.setRGB(1,1,1);merged.roughness=.87;merged.metalness=0;merged.userData.bakedPalette=true;
      merged.map=surfaces.map;merged.bumpMap=surfaces.bumpMap;merged.bumpScale=.0008;merged.userData.enemySurfaceAtlas=true;
      merged.onBeforeCompile=shader=>{
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 surfaceFinish;varying vec2 vSurfaceFinish;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceFinish=surfaceFinish;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vSurfaceFinish;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=vSurfaceFinish.x;').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=vSurfaceFinish.y;');
        enemySurfaceShader(shader);
      };
      palette.set(key,merged);rig.resources.materials.add(merged);
    }
    let variants=geometries.get(mesh.geometry);if(!variants){variants=new Map();geometries.set(mesh.geometry,variants);}
    let geometry=variants.get(material);
    if(!geometry){
      geometry=mesh.geometry.clone();atlasUV(geometry,geometry.userData.enemySurfaceTile??material.userData.enemySurfaceTile??ENEMY_SURFACE.plain);
      const color=geometry.attributes.color,normal=material.color,rage=normal.clone().lerp(red,.32),rageColor=new Float32Array(color.count*3),surfaceFinish=new Float32Array(color.count*2);
      for(let i=0;i<color.count;i++){
        const r=color.getX(i),g=color.getY(i),b=color.getZ(i);
        color.setXYZ(i,r*normal.r,g*normal.g,b*normal.b);
        rageColor[i*3]=r*rage.r;rageColor[i*3+1]=g*rage.g;rageColor[i*3+2]=b*rage.b;
        surfaceFinish[i*2]=material.roughness;surfaceFinish[i*2+1]=material.metalness;
      }
      geometry.setAttribute('rageColor',new T.BufferAttribute(rageColor,3));geometry.setAttribute('surfaceFinish',new T.BufferAttribute(surfaceFinish,2));variants.set(material,geometry);rig.resources.geometries.add(geometry);
    }
    mesh.geometry=geometry;mesh.material=palette.get(key);
  });
}

// Prepare immutable GPU assets once. Live enemies own only their articulated
// transforms and gameplay state, so spawning never tessellates or merges meshes.
export function createEnemyAssets(batch){
  const templates=[],surfaces=enemySurfaces();
  for(let i=0;i<10;i++){
    let seed=9147+i*137,first=true;
    const rng=()=>{if(first){first=false;return i<4?(i+.2)/4:i>=5&&i<8?(i-5+.2)/3:.3;}return ((seed=(seed*1664525+1013904223)>>>0)/4294967296);};
    const rig=i===9?createZombieRig({rng,feral:true}):i>=5?createZombieDogRig({rng,rare:i===8}):createZombieRig({rng,brute:i===4});
    // Bake paint into vertex colors so equal surface finishes share batches.
    // Roughness, metalness, normals, silhouettes and rage colors are retained.
    bakeEnemyPalette(rig);batch(rig.group);tagZombie(rig,null);
    // Retain merged buffers as well as the few remaining unmerged primitives.
    rig.group.traverse(o=>{if(o.isMesh){rig.resources.geometries.add(o.geometry);o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();o.updateMatrix();o.matrixAutoUpdate=false;}});
    templates.push(rig);
  }
  // Cache rage colors before play. No per-kill materials, lights or geometry.
  const rageMaterials=new Map();
  for(const rig of templates)rig.group.traverse(o=>{
    if(!o.isMesh)return;
    for(const material of (Array.isArray(o.material)?o.material:[o.material])){
      if(rageMaterials.has(material))continue;
      // The eyes keep their full red glow in rage and reuse the same GPU assets.
      if(material.userData.enemyEyes){rageMaterials.set(material,material);continue;}
      const rage=material.clone();
      if(material.userData.bakedPalette){
        // Use the pre-baked original rage tint, rather than tinting paint twice.
        const finishShader=material.onBeforeCompile;
        rage.onBeforeCompile=shader=>{
          finishShader(shader);
          shader.vertexShader=shader.vertexShader.replace('#include <color_pars_vertex>','#include <color_pars_vertex>\nattribute vec3 rageColor;').replace('#include <color_vertex>','#include <color_vertex>\nvColor.xyz = rageColor;');
        };
      }else rage.color?.lerp(new T.Color(0xff3925),.32);
      if(rage.emissive){rage.emissive.setHex(0xb71e0d);rage.emissiveIntensity=.48;}
      rageMaterials.set(material,rage);
    }
  });
  function enrage(enemy){enemy.group.traverse(o=>{
    if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>rageMaterials.get(m)||m):rageMaterials.get(o.material)||o.material;
  });}
  function instantiate({rng=Math.random,brute=false,dog=false,rareDog=false,feral=false,scale=null}={}){
    const template=templates[feral?9:rareDog?8:dog?5+Math.floor(rng()*3):brute?4:Math.floor(rng()*4)],group=template.group.clone(true),original=[],copies=[],nodes=new Map();
    template.group.traverse(o=>original.push(o));group.traverse(o=>copies.push(o));for(let i=0;i<original.length;i++)nodes.set(original[i],copies[i]);
    const remap=value=>{if(value?.isObject3D)return nodes.get(value);if(Array.isArray(value))return value.map(remap);if(value&&Object.getPrototypeOf(value)===Object.prototype){const out={};for(const [k,v] of Object.entries(value))out[k]=remap(v);return out;}return value;};
    const rig={};for(const [key,value] of Object.entries(template))rig[key]=key==='resources'?value:remap(value);
    rig.sharedAssets=true;rig.phase=rng()*Math.PI*2;rig.attackHand=Math.floor(rng()*2);rig.limp=feral?.025:.12+rng()*.28;rig.lean=feral?.025:-.12+rng()*.24;rig.stride=feral?1.55+rng()*.15:(dog||rareDog)?.75+rng()*.12:.85+rng()*.3;
    if(!dog&&!rareDog)rig.gait=rollGait(rng,{feral,brute});rig.crawling=false;rig.crawl=0;rig.legDamage=0;
    // Bosses and their tanks pass an explicit uniform scale (v130).
    group.scale.setScalar(scale??(rareDog?1.06+rng()*.045:brute?BRUTE.scale:dog?.97+rng()*.06:.97+rng()*.09));
    return rig;
  }
  return {templates,instantiate,enrage,surfaces};
}
