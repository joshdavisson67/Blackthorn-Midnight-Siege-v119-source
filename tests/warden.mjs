import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {createWeaponModel} from '../public/game/weapon-models.mjs';
import {weapons,weaponAimFov} from '../public/game/core.mjs';

export function verifyWarden(qa,frames,listeners,elements,canvas){
  const w=weapons.lmg;
  assert.deepEqual([w.mag,w.reserve,w.damage,w.rate,w.reload,w.pellets,w.spread,w.zoom],[100,500,62,.09,5.2,1,.021,3]);
  const model=createWeaponModel('lmg'),repeat=createWeaponModel('lmg');
  assert(model.userData.parts.every((part,i)=>part.geometry===repeat.userData.parts[i].geometry));
  const body=model.userData.body,pouch=body.getObjectByName('Soft 100-round ammunition pouch');
  assert(pouch.geometry.hasAttribute('color')&&pouch.material.vertexColors&&!pouch.material.map,'The soft camo pouch uses cached vertex colors without a new texture');
  assert(new Set(Array.from(pouch.geometry.attributes.color.array)).size>3);
  const shields=model.userData.parts.filter(p=>p.name==='Perforated steel heat-shield side');
  assert.equal(shields.length,2);assert.equal(shields[0].geometry,shields[1].geometry);
  assert.equal(shields[0].geometry.parameters.shapes.holes.length,16,'Heat-shield slots are physical openings');
  assert.equal(body.getObjectByName('Vented heat-shield crown').geometry.parameters.shapes.holes.length,12);
  assert(body.getObjectByName('Skeleton Warden stock').geometry.parameters.shapes.holes.length);
  assert.equal(model.userData.parts.filter(p=>p.name==='Folded telescoping bipod leg').length,2);
  let triangles=0;model.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const a of Object.values(o.geometry.attributes))assert(a.array.every(Number.isFinite));}});
  assert(triangles<13000,'The rebuilt Warden stays in its compact geometry budget');
  assert.equal(model.userData.optic.magnification,3);assert.equal(model.userData.optic.viewFov,22);
  let displayMeshes=0;qa.get().cellar.weapon.model.traverse(o=>{if(o.isMesh)displayMeshes++;});
  assert(displayMeshes<=17,'The cellar display batches the detail too');

  const ray=new T.Raycaster();ray.layers.set(1); // First-person weapons live on layer 1.
  for(const hz of [30,60,144]){
    qa.start();qa.startWave();qa.holdSpawns();qa.get().inventory.lmg.owned=true;qa.selectWeapon('lmg');qa.setAim(0,0);
    canvas.events.mousedown({button:2});frames(hz*2,1000/hz);qa.get().scene.updateMatrixWorld(true);
    const state=qa.get(),gun=state.gunGroups.lmg,sight=gun.userData.optic;
    const magnification=Math.tan(75*Math.PI/360)/Math.tan(state.camera.fov*Math.PI/360);
    assert(Math.abs(magnification-3)<.00001,'The world projection gives actual 3× magnification');
    assert(Math.abs(state.camera.fov-weaponAimFov('lmg'))<.00001);
    assert(Math.abs(state.viewCamera.fov-22)<.00001,'The housing uses a separate projection instead of magnifying the gun');
    assert(sight.mask.visible&&!state.gunGroups.bushmaster.userData.optic.mask.visible);
    assert(sight.glass.material.opacity<=.025&&!sight.glass.material.depthWrite);
    const center=sight.dot.getWorldPosition(new T.Vector3()).project(state.viewCamera);
    assert(Math.hypot(center.x,center.y)<.004,'The optic is centered on the real firing ray');
    const edge=sight.dot.localToWorld(new T.Vector3(sight.dot.geometry.parameters.radius,0,0)).project(state.viewCamera);
    assert((edge.x-center.x)*innerWidth*1.5<4,'The center dot remains under four pixels at 1080p');
    for(const radius of [0,.014,.030,.0395])for(let i=0;i<(radius?16:1);i++){
      const a=i*Math.PI/8,target=sight.group.localToWorld(new T.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,sight.maskZ));
      ray.set(state.viewCamera.position,target.sub(state.viewCamera.position).normalize());
      const hits=ray.intersectObject(gun,true).filter(h=>h.object.visible&&h.object.isMesh&&!h.object.material.transparent&&!h.object.userData.reticle);
      assert.equal(hits.length,0,`The layer-1 housing/body/mask leave the scope window clear at radius ${radius}: ${hits.map(h=>h.object.name).join(', ')}`);
    }
    // Avoid the shared triangle edge at exactly zero elevation.
    const outside=sight.group.localToWorld(new T.Vector3(.048,.006,sight.maskZ));ray.set(state.viewCamera.position,outside.sub(state.viewCamera.position).normalize());
    assert(ray.intersectObject(gun,true).some(h=>h.object===sight.mask),'The same layer-1 ray test hits the mask outside its open aperture');
    let meshes=0;gun.traverse(o=>{if(o.isMesh)meshes++;});assert(meshes<=18,'Fitted scope and receiver keep a bounded view-model draw-call count');
    const damage=weapons.lmg.damage;
    qa.setPlayer(0,20);qa.setAim(0,-.14);frames(1);const enemy=qa.makeZombie(0,16);enemy.hp=enemy.maxHp=10000;qa.get().scene.updateMatrixWorld(true);qa.setSeed(821);
    const ammo=qa.get().inventory.lmg.ammo;qa.shoot();assert(enemy.hp<10000);assert.equal(qa.get().inventory.lmg.ammo,ammo-1);assert.equal(weapons.lmg.damage,damage);
    listeners.mouseup({button:2});frames(hz*2,1000/hz);assert(!sight.mask.visible);assert(Math.abs(qa.get().camera.fov-75)<.00001);
  }
  qa.start();qa.holdSpawns();qa.get().inventory.lmg.owned=true;qa.selectWeapon('lmg');
  canvas.events.mousedown({button:2});frames(144);qa.setAim(0,0);listeners.mousemove({movementX:100,movementY:0});const aimed=Math.abs(qa.get().lookYaw);
  listeners.mouseup({button:2});qa.setAim(0,0);listeners.mousemove({movementX:100,movementY:0});const hip=Math.abs(qa.get().lookYaw);
  assert(Math.abs(aimed/hip-.62/3)<1e-8,'Mouse sensitivity follows the actual threefold zoom');
  canvas.events.mousedown({button:2});frames(120);listeners.keydown({code:'Escape'});const frozen=qa.get().camera.fov;frames(30);assert.equal(qa.get().camera.fov,frozen);
  elements.get('resume').onclick();frames(120);assert(!qa.get().gunGroups.lmg.userData.optic.mask.visible,'Resume clears aim and restores the wide view');
  canvas.events.mousedown({button:2});frames(120);qa.selectWeapon('bushmaster');assert.equal(qa.get().weapon,'lmg','A locked weapon cannot replace the current scope');
  qa.get().inventory.glock.owned=true;qa.selectWeapon('glock');frames(2);assert(!qa.get().gunGroups.lmg.userData.optic.mask.visible);
  qa.start();assert.equal(qa.get().camera.fov,75);assert(!qa.get().gunGroups.lmg.userData.optic.mask.visible);
  console.log(`PASS: reference-inspired Warden receiver/stock/vented shroud/soft camo pouch/folded bipod, cached geometry (${triangles} triangles), unchanged LMG combat stats, real 3× zoom at 30/60/144 Hz, layer-1 scope visibility, precise reticle, scaled sensitivity, firing, pause/switch/reset and no new textures.`);
}
