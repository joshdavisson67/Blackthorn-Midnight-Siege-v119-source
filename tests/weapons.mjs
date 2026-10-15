import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createWeaponModel} from '../public/game/weapon-models.mjs';
import {createModelKit} from '../public/game/station-models.mjs';

function verifyLensSeating(model,repeat,type){
  model.updateMatrixWorld(true);
  const sight=model.userData.optic,lens=sight.glass,housing=sight.housing;
  assert.equal(lens.geometry,repeat.userData.optic.glass.geometry,'Repeated optics reuse their lens geometry');
  assert.equal(lens.material,repeat.userData.optic.glass.material,'Repeated optics reuse their glass finish');
  assert(sight.dot.material.color.r>sight.dot.material.color.g,'Red-dot sights use a red aiming mark');
  const hood=housing.getObjectByName('Reflex sight hood');
  if(hood){
    const aperture=hood.geometry.parameters.shapes.holes[0].getPoints(64),edge=lens.geometry.parameters.shapes.getPoints(64);
    assert.equal(edge.length,aperture.length);
    for(let i=0;i<edge.length;i++)assert(edge[i].distanceTo(aperture[i])<.00001,`${type} lens edge follows the actual sight opening, including rounded corners`);
    const lensBounds=new T.Box3().setFromObject(lens),hoodBounds=new T.Box3().setFromObject(hood);
    assert(lensBounds.min.z>hoodBounds.min.z&&lensBounds.max.z<hoodBounds.max.z,'Glass is seated within the hood depth');
  }else{
    const rim=housing.getObjectByName(type==='bushmaster'?'Scope rim':'Sight lens retaining ring'),innerRadius=rim.geometry.parameters.radius-rim.geometry.parameters.tube;
    const radius=lens.geometry.parameters.radius;
    assert(radius<=innerRadius+.00001&&innerRadius-radius<.001,'Circular lenses meet their retaining rim without protruding or leaving a gap');
  }
  // Probe just inside the entire lens perimeter, not only the center dot. A
  // frame intruding into a corner (or a mismatched rectangular pane) fails here.
  const vertices=lens.geometry.attributes.position,forward=new T.Vector3(0,0,-1).applyQuaternion(sight.group.getWorldQuaternion(new T.Quaternion()));
  for(let i=0;type!=='bushmaster'&&i<vertices.count;i++){
    const origin=sight.group.localToWorld(new T.Vector3(vertices.getX(i)*.96,vertices.getY(i)*.96,.15));
    const hits=new T.Raycaster(origin,forward,0,.50).intersectObject(housing,true);
    assert.equal(hits.length,0,`${type} housing leaves its fitted lens perimeter open`);
  }
  const risers=model.userData.parts.filter(p=>p.name==='Optic riser'||p.name==='Precision scope mount'||p.name==='LMG scope mount');
  assert(risers.some(r=>new T.Box3().setFromObject(r).intersectsBox(new T.Box3().setFromObject(housing))),'The optic physically meets its mount');
}

export function verifyWeaponModels(qa,frames,listeners,gameCanvas){
  const kit=createModelKit(),lengths={},reports=[];
  for(const type of ['rifle','shotgun','smg','lmg','bushmaster']){
    const model=createWeaponModel(type),repeat=createWeaponModel(type);
    assert(model.userData.parts.every((p,i)=>p.geometry===repeat.userData.parts[i].geometry),'Repeated weapons reuse cached geometry');
    verifyLensSeating(model,repeat,type);
    const exhibit=kit.gun(type);assert.equal(exhibit.userData.weaponType,type);
    const worldModel=exhibit.children[0];assert.equal(worldModel.userData.reference,model.userData.reference,'The rack uses the same weapon as the held model');
    const dimensions=new T.Box3().setFromObject(model).getSize(new T.Vector3());lengths[type]=dimensions.z;
    const rackBounds=new T.Box3().setFromObject(exhibit);assert(rackBounds.max.x-rackBounds.min.x<1.7,'Weapon fits the existing rack');
    assert(Math.abs(rackBounds.max.x+rackBounds.min.x)<.002,'Rack weapon is centered');

    qa.start();qa.holdSpawns();qa.get().inventory[type].owned=true;qa.selectWeapon(type);qa.setAim(0,0);
    gameCanvas.events.mousedown({button:2});frames(85);qa.get().scene.updateMatrixWorld(true);
    const state=qa.get(),gun=state.gunGroups[type],sight=gun.userData.optic;
    assert(Math.abs(gun.userData.muzzle.x)<1e-7&&gun.userData.muzzle.z<-.5,'Muzzle lies on the actual barrel axis');
    const projected=sight.dot.getWorldPosition(new T.Vector3()).project(state.camera);assert(Math.hypot(projected.x,projected.y)<.004,'Reticle remains aligned after the model change');
    for(const x of [-.014,0,.014])for(const y of [-.014,0,.014]){
      const target=sight.group.localToWorld(new T.Vector3(x,y,.054)),direction=target.sub(state.camera.position).normalize();
      const hits=new T.Raycaster(state.camera.position,direction).intersectObject(gun,true).filter(h=>h.object.isMesh&&!h.object.material.transparent&&!h.object.userData.reticle);
      assert.equal(hits.length,0,`${type} has a clear central aiming window at ${x},${y}: ${hits.map(h=>h.object.name).join(',')}`);
    }
    let meshes=0,triangles=0;
    gun.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(o.geometry.attributes.position.array.every(Number.isFinite),'Model vertices remain finite');});
    assert(meshes<=24,`${type} preserves a small draw-call budget: ${meshes}`);assert(triangles<20000,`${type} stays within its geometry budget`);
    assert(sight.glass.material.opacity<=.04&&sight.glass.material.depthWrite===false);
    reports.push({type,meshes,triangles});listeners.mouseup({button:2});
  }
  assert(lengths.smg<lengths.rifle&&lengths.rifle<lengths.shotgun&&lengths.shotgun<lengths.lmg,'Compact SMG, carbine, pump and heavy LMG have distinct proportions');
  console.log('PASS: five distinct weapon silhouettes, matching centered exhibits, shared model/optic geometry, fitted lens contours and perimeter rays, seated optic mounts, 45 unobstructed aim rays, muzzle alignment and bounded view-model draw calls:',JSON.stringify(reports));qa.start();
}
