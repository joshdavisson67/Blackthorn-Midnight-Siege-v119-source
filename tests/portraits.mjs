import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyPortraits(qa){
  qa.start();const s=qa.get(),opaque=[],ray=new T.Raycaster();
  s.world.updateMatrixWorld(true);
  s.world.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material?.transparent)opaque.push(o);});
  assert.equal(s.portraits.length,15,'Every original estate portrait remains mounted');
  let sightlines=0;
  for(const p of s.portraits){
    const center=new T.Vector3().setFromMatrixPosition(p.matrix),name=`Portrait at ${center.toArray()}`;
    assert(p.artwork.parent,`${name}: upstairs cleanup must not remove the artwork`);
    p.artwork.geometry.computeBoundingBox();
    const size=p.artwork.geometry.boundingBox.getSize(new T.Vector3());
    assert(Math.abs(size.x-p.w)<1e-5&&Math.abs(size.y-p.h)<1e-5,`${name}: artwork is never cropped by the upstairs shell`);
    const expected=new T.Box3(new T.Vector3(-p.w/2-.09,-p.h/2-.09,-.05),new T.Vector3(p.w/2+.09,p.h/2+.09,.083)).applyMatrix4(p.matrix);
    assert(p.bounds.min.distanceTo(expected.min)<1e-5&&p.bounds.max.distanceTo(expected.max)<1e-5,`${name}: complete frame survives cleanup`);
    const ceiling=center.z>=-12.65&&center.z<=13.6?UPPER_Y-.24:6.84;
    assert(p.bounds.min.y>.45&&p.bounds.max.y<ceiling-.08,`${name}: floor and ceiling clearance includes the entire frame`);
    for(const furniture of s.furnishings.records)assert(!p.bounds.intersectsBox(furniture.bounds),`${name} intersects ${furniture.type}`);
    for(const sign of s.signage.records)assert(!p.bounds.intersectsBox(sign.bounds),`${name} overlaps ${sign.material.userData.sign.text}`);

    // The actual batched world must expose the full canvas and all four frame
    // edges, including corners; comparing bounds alone would miss curtains,
    // mantle stone, chair rails or plaques cutting across the front surface.
    function exposed(x,y,z,art){
      const target=new T.Vector3(x,y,z).applyMatrix4(p.matrix);
      ray.set(target.clone().addScaledVector(p.normal,.35),p.normal.clone().negate());ray.near=0;ray.far=.351;
      const hit=ray.intersectObjects(opaque,false)[0];
      assert(hit&&Math.abs(hit.distance-.35)<.003,`${name}: another surface covers ${art?'the artwork':'the frame'} at ${x},${y} (${hit?.point.toArray()})`);
      if(art)assert.equal(hit.object.material,p.artwork.material,`${name}: the portrait itself is visible`);
      sightlines++;
    }
    for(const x of [-.46,0,.46])for(const y of [-.46,0,.46])exposed(x*p.w,y*p.h,.083,true);
    for(const side of [-1,1]){
      for(const y of [-p.h/2-.045,0,p.h/2+.045])exposed(side*(p.w/2+.045),y,.081,false);
      for(const x of [-p.w*.45,0,p.w*.45])exposed(x,side*(p.h/2+.045),.081,false);
    }
  }
  console.log(`PASS: all ${s.portraits.length} portraits retain complete artwork/frames after upstairs cleanup and batching, clear floors/ceilings/furnishings/signs, and pass ${sightlines} canvas/frame/corner visibility rays.`);
}
