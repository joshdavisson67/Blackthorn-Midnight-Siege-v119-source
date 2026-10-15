import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {ESTATE_ROOMS} from '../public/game/estate-layout.mjs';
import {UPPER_Y,UPPER_CEILING} from '../public/game/vertical.mjs';

const visible=r=>r.ancestry.every(p=>p.visible);

export function verifySignage(qa){
  qa.start();const s=qa.get(),{signage}=s,ray=new T.Raycaster();
  assert(signage.records.length>110,'All station, room, cemetery and cellar plaques are captured');
  let pixels=0;
  for(const material of signage.materials.values()){
    const {map}=material,sign=material.userData.sign,{width,height}=map.image,layout=sign.layout;
    assert(sign.explicitDimensions,`Panel dimensions are required for ${sign.text}`);
    assert(Math.abs((width/height)/(sign.width/sign.height)-1)<.005,`Unstretched lettering: ${sign.text}`);
    assert(height>=128&&width<=2048,'Each panel has enough source pixels without oversized sheets');
    assert.equal(map.colorSpace,T.SRGBColorSpace);assert.equal(map.minFilter,T.LinearMipmapLinearFilter);
    assert(map.anisotropy>1&&!material.toneMapped,'Angled lettering keeps its sampling and contrast');
    assert(layout.rows.length<=sign.maxLines&&layout.font>0,`All words fit ${sign.text}`);
    for(const [i,row] of layout.rows.entries()){
      assert(row.x>=layout.padX-.01&&row.x+row.width<=width-layout.padX+.01,`Side padding: ${sign.text}`);
      assert(row.y-row.ascent>=layout.padY-.01&&row.y+row.descent<=height-layout.padY+.01,`Top/bottom padding: ${sign.text}`);
      if(i)assert(row.y-row.ascent>layout.rows[i-1].y+layout.rows[i-1].descent,`Separated text lines: ${sign.text}`);
    }
    if(sign.kind==='room'&&sign.maxLines===1)assert(layout.font/height*sign.height>.13,'Room names remain readable rather than shrinking into captions');
    pixels+=width*height;
  }
  assert(pixels*4*4/3<80*1024*1024,'Sign textures including mipmaps stay under an 80MiB shared budget');
  for(const room of ESTATE_ROOMS.filter(r=>r.id!=='original')){
    const labels=signage.records.filter(r=>r.material.userData.sign.text===room.name);
    assert.equal(labels.length,2,room.name+' is marked from both travel directions');
  }
  for(const r of signage.records){
    const sign=r.material.userData.sign;
    if(r.center.y>UPPER_Y&&r.center.y<UPPER_CEILING&&sign.kind==='room'&&Math.abs(r.center.z)<12){
      assert(r.bounds.min.y>UPPER_Y+2.30&&r.bounds.max.y<UPPER_CEILING-.07,'Upper door plaques clear the doorway and ceiling trim');
    }
    for(const f of s.furnishings.records)assert(!r.bounds.intersectsBox(f.bounds),sign.text+' must not overlap '+f.type);
  }
  let sightlines=0;
  function auditMounts(){
    s.world.updateMatrixWorld(true);const opaque=[];
    s.world.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||o.material?.transparent||o.material?.alphaTest>0)return;
      for(let p=o;p;p=p.parent)if(!p.visible)return;
      opaque.push(o);
    });
    const mounted=signage.records.filter(visible);
    for(const r of mounted){
      const sign=r.mesh.material.userData.sign,offsets=sign.kind==='crest'?[-.30,0,.30]:[-.44,0,.44];
      for(const x of offsets)for(const y of offsets){
        const target=new T.Vector3(x*sign.width,y*sign.height,0).applyMatrix4(r.matrix);
        ray.set(target.clone().addScaledVector(r.normal,.30),r.normal.clone().negate());ray.near=0;ray.far=.301;
        const hit=ray.intersectObjects(opaque,false)[0];
        assert(hit?.object.material===r.mesh.material,`${sign.text}: another element covers the plaque at ${x},${y} (${hit?.object.name||hit?.object.material.name||'missing surface'})`);
        sightlines++;
      }
      const inverse=r.matrix.clone().invert();
      for(const other of mounted){
        if(other===r||r.normal.dot(other.normal)<.99||Math.abs(other.center.clone().sub(r.center).dot(r.normal))>.025)continue;
        const o=other.bounds.clone().applyMatrix4(inverse),overlapX=Math.min(r.local.max.x,o.max.x)-Math.max(r.local.min.x,o.min.x),overlapY=Math.min(r.local.max.y,o.max.y)-Math.max(r.local.min.y,o.min.y);
        assert(overlapX<=.001||overlapY<=.001,sign.text+' overlaps '+other.mesh.material.userData.sign.text);
      }
    }
  }
  auditMounts();s.graveyard.unlock();s.graveyard.update(2);auditMounts();
  const cache=signage.materials.size;
  for(const rank of [1,2,3,0]){for(const station of s.interactables.filter(v=>v.type==='upgrade'))station.setForgeRank(rank);auditMounts();}
  for(const tier of [1,2,3,4,0]){s.cellar.armor.setArmorTier(tier);s.interactables.find(v=>v.type==='armor'&&v.y===UPPER_Y).setArmorTier(tier);auditMounts();}
  assert.equal(signage.materials.size,cache,'Armor ranks and resets reuse warmed sign textures');
  qa.start();
  console.log(`PASS: ${signage.records.length} mounted signs, measured text margins/line spacing, aspect-correct mipmapped textures (${(pixels*4*4/3/1024/1024).toFixed(1)}MiB), both-direction room names, furnishing/ceiling clearance and ${sightlines} unobstructed panel sightlines across unlocks/armor ranks.`);
}
