import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {weaponSurfaces,weaponSurfaceGeometry,WEAPON_SURFACE_BUDGET} from '../public/game/weapon-surfaces.mjs?v=87';
import {createWeaponModel} from '../public/game/weapon-models.mjs';
import {createModelKit} from '../public/game/station-models.mjs';

export function verifyWeaponSurfaces(qa,frames){
  const surface=weaponSurfaces(),textures=new Set(surface.textures),kit=createModelKit();
  assert.equal(weaponSurfaces(),surface,'Surface maps are built once');
  assert(textures.size<=WEAPON_SURFACE_BUDGET.maxTextures);
  let bytes=0;
  for(const texture of textures){
    const {width,height,data}=texture.image;bytes+=width*height*4*4/3;
    assert(width<=WEAPON_SURFACE_BUDGET.maxDimension&&height<=WEAPON_SURFACE_BUDGET.maxDimension);
    assert(data instanceof Uint8Array&&data.length===width*height*4,'Budget counts the actual opaque RGBA texture allocation');
    assert.equal(texture.wrapS,T.RepeatWrapping);assert.equal(texture.wrapT,T.RepeatWrapping);
    assert.equal(texture.minFilter,T.LinearMipmapLinearFilter);assert.equal(texture.magFilter,T.LinearFilter);assert(texture.generateMipmaps);
    assert(texture.anisotropy<=4,'Weapon texture filtering stays bounded');
    const values=new Set();
    for(let i=0;i<data.length;i+=4){assert.equal(data[i+3],255);values.add(data[i+1]);}
    assert(values.size>10,'Surface data contains real color/finish variation rather than a solid swatch');
    for(let x=0;x<width;x++)for(let c=0;c<4;c++)assert.equal(data[x*4+c],data[((height-1)*width+x)*4+c],'Top and bottom tile edges meet');
    for(let y=0;y<height;y++)for(let c=0;c<4;c++)assert.equal(data[y*width*4+c],data[(y*width+width-1)*4+c],'Left and right tile edges meet');
  }
  assert(bytes<=1024*1024&&bytes<=WEAPON_SURFACE_BUDGET.bytes,'All weapon maps including mipmaps fit within 1MiB');
  for(const map of [surface.metal,surface.wood])assert.equal(map.colorSpace,T.SRGBColorSpace);
  for(const map of [surface.metalFinish,surface.woodFinish])assert.equal(map.colorSpace,T.NoColorSpace,'Roughness and relief data remain linear');

  const seen=new Set();
  for(const type of ['glock','rifle','shotgun','smg','lmg','bushmaster']){
    const held=createWeaponModel(type),repeat=createWeaponModel(type),rack=kit.gun(type);
    assert(held.userData.parts.every((p,i)=>p.geometry===repeat.userData.parts[i].geometry),'UV variants remain cached across repeated models');
    for(const model of [held,rack])model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const material=mesh.material;
      assert(!material.displacementMap&&!material.normalMap,'Surface pass adds no geometry displacement or extra normal map');
      const maps=['map','roughnessMap','bumpMap'].map(k=>material[k]).filter(Boolean);
      for(const map of maps){assert(textures.has(map),'Held guns and exhibits reuse the same four surface maps');seen.add(map);}
      if(material.map===surface.metal)assert(material.roughnessMap===surface.metalFinish&&!material.bumpMap,'Metal uses only color and roughness samplers');
      if(material.map===surface.wood)assert(material.roughnessMap===surface.woodFinish&&material.bumpMap===surface.woodFinish,'Walnut reuses its finish map for the existing shallow relief');
      assert(mesh.geometry.attributes.uv.array.every(Number.isFinite),'Updated grain UVs remain finite');
    });
    if(held.userData.optic)assert(!held.userData.optic.glass.material.map&&!held.userData.optic.dot.material.map,'Sight glass and aiming marks stay clean');
  }
  assert.equal(seen.size,textures.size);

  const unit=new T.BoxGeometry(1,1,1),small=weaponSurfaceGeometry(unit,[.05,.05,.05],'metal'),long=weaponSurfaceGeometry(unit,[.05,.05,.25],'metal');
  assert.equal(weaponSurfaceGeometry(unit,[.05,.05,.05],'metal'),small);
  for(const key of ['position','normal'])assert.deepEqual(small.attributes[key].array,unit.attributes[key].array,'UV mapping preserves geometry and normals');
  assert.deepEqual(small.index.array,unit.index.array,'UV mapping adds no triangles');
  function span(geometry,axis){const uv=geometry.attributes.uv,values=Array.from({length:4},(_,i)=>axis==='u'?uv.getX(i):uv.getY(i));return Math.max(...values)-Math.min(...values);}
  assert(Math.abs(span(long,'u')/span(small,'u')-5)<.00001,'Grain repeats with length instead of stretching over a longer part');
  assert.equal(span(long,'v'),span(small,'v'),'Changing length preserves the grain scale across the part');

  if(qa){
    const actual=new Set(),state=qa.get();
    for(const gun of Object.values(state.gunGroups))gun.traverse(mesh=>{if(mesh.isMesh)for(const key of ['map','roughnessMap','bumpMap']){const map=mesh.material[key];if(map?.name.startsWith('weapon-'))actual.add(map);}});
    assert.equal(actual.size,textures.size,'The running game allocates one surface set for all weapons');
    for(const map of actual)assert(state.renderer.initializedTextures.has(map),'Every weapon surface uploads under the loading screen');
    const versions=[...actual].map(t=>t.version);qa.start();qa.holdSpawns();frames(120);
    assert.deepEqual([...actual].map(t=>t.version),versions,'Gameplay does not regenerate or re-upload surface data');
  }
  console.log(`PASS: four shared opaque, seamless, mipmapped weapon maps (${(bytes/1024/1024).toFixed(3)}MiB), linear finish data, sampler limits, metric/cached UVs without extra triangles, matching displays, clean sights and startup upload.`);
}
