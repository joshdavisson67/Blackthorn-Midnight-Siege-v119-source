import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {RETICLES,reticleSvg,createOpticReticle} from '../public/game/reticles.mjs';
import {createWeaponModel} from '../public/game/weapon-models.mjs';

export function verifyReticles(qa,frames,listeners,elements,canvas){
  const crosshair=elements.get('crosshair'),keys={glock:'Digit1',rifle:'Digit6',shotgun:'Digit2',smg:'Digit3',lmg:'Digit4',bushmaster:'Digit5'};
  const nodes=[...crosshair.querySelectorAll('svg')];assert.equal(nodes.length,6);assert.equal(new Set(Object.keys(RETICLES).map(reticleSvg)).size,6);
  const signatures=new Set();
  for(const [type,p] of Object.entries(RETICLES)){
    qa.start();qa.setHealth(100000);qa.holdSpawns();qa.get().inventory[type].owned=true;listeners.keydown({code:keys[type],repeat:false});
    assert.equal(qa.get().weapon,type);assert.equal(qa.get().reticleHud.weapon,type);assert.equal(crosshair.dataset.weapon,type);assert.equal(crosshair.dataset.reticle,p.name);
    assert.deepEqual([...crosshair.querySelectorAll('svg')],nodes,'Weapon changes reuse the same HUD nodes');
    const visible=nodes.filter(n=>!n.classList.contains('hidden'));assert.equal(visible.length,1);assert.equal(visible[0].getAttribute('data-reticle-weapon'),type);
    const dot=visible[0].querySelector('.reticle-center');assert.equal(dot.getAttribute('cx'),'0');assert.equal(dot.getAttribute('cy'),'0');
    // The lower aiming marks leave the reticle-centered reload bar clear.
    const lower=Math.max(...p.segments.flatMap(([,y,,yy])=>[-y,-yy]),...p.arcs.map(([r])=>r),0)*p.size/56+p.stroke/2;
    assert(lower<26,'The reticle must not intrude on the reload progress bar');
    frames(1);canvas.events.mousedown({button:2});frames(100);qa.get().scene.updateMatrixWorld(true);
    assert.equal(Number(crosshair.style.opacity),0,'Aiming removes the HUD mark in favor of the fitted weapon sight');
    const sight=qa.get().gunGroups[type].userData.optic;
    if(type==='glock'){assert(!sight,'Keep the Glock factory iron sights');}
    else{
      assert.equal(sight.name,p.name);assert.equal(sight.marks.length,2,'Each optic uses just two small meshes');
      const repeat=createOpticReticle(type,sight.dot.position.z),again=createOpticReticle(type,sight.dot.position.z);assert.equal(again.dot.geometry,repeat.dot.geometry);assert.equal(again.outline.geometry,repeat.outline.geometry,'Optic marks reuse cached geometry');
      assert.deepEqual(sight.dot.geometry.attributes.position.array,repeat.dot.geometry.attributes.position.array);assert.deepEqual(sight.outline.geometry.attributes.position.array,repeat.outline.geometry.attributes.position.array,'Held sights use the same cached pattern as the model factory');
      signatures.add(JSON.stringify([...sight.outline.geometry.attributes.position.array]));
      let triangles=0;const bounds=new T.Box3();
      for(const mark of sight.marks){
        assert(mark.userData.reticle&&mark.userData.reticleType===type);assert(!mark.material.depthWrite&&!mark.castShadow&&!mark.receiveShadow);assert(!mark.material.map,'Reticles allocate no new textures');
        assert(mark.geometry.attributes.position.array.every(Number.isFinite));assert(mark.geometry.attributes.normal.array.every(Number.isFinite));mark.geometry.computeBoundingBox();bounds.union(mark.geometry.boundingBox);
        triangles+=(mark.geometry.index?.count??mark.geometry.attributes.position.count)/3;
      }
      assert(triangles<180,'All optic outlines and center dots stay within a small triangle budget');
      assert(bounds.min.x>-.03&&bounds.max.x<.03&&bounds.min.y>-.03&&bounds.max.y<.03,'Marks fit inside every lens');
      if(type==='bushmaster')assert(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.y),Math.abs(bounds.max.y))<.023,'The precision marks fit the 10x viewing mask');
      const center=sight.dot.getWorldPosition(new T.Vector3()).project(qa.get().viewCamera);assert(Math.hypot(center.x,center.y)<.004,'The distinctive reticle stays on the actual firing ray');
      if(type==='bushmaster'){
        const edge=sight.dot.localToWorld(new T.Vector3(sight.dot.geometry.parameters.radius,0,0)).project(qa.get().viewCamera);
        assert((edge.x-center.x)*innerWidth<4,'The high-magnification center dot stays small enough to see the target');
      }
      const model=createWeaponModel(type);assert.equal(model.userData.optic.name,p.name,'Displays use the same weapon-specific sight');
    }
    qa.setPlayer(0,20);qa.setAim(0,-.14);frames(1);const enemy=qa.makeZombie(0,16);enemy.hp=enemy.maxHp=10000;qa.get().scene.updateMatrixWorld(true);qa.setSeed(821);const ammo=qa.get().inventory[type].ammo;qa.shoot();assert(enemy.hp<10000,'The centered sight still hits an actual target');assert.equal(qa.get().inventory[type].ammo,ammo-1);
    listeners.mouseup({button:2});qa.setAim(0,0);frames(100);assert.equal(Number(crosshair.style.opacity),1,'Releasing aim restores the weapon-specific HUD');
    qa.reload();assert(qa.get().reloadLeft>0);assert(!elements.get('reloadProgress').classList.contains('hidden'));
    const selection=qa.get().weapon;qa.get().inventory.glock.owned=true;listeners.keydown({code:'Digit1',repeat:false});assert.equal(qa.get().weapon,selection,'Reload-blocked switches retain the matching reticle');assert.equal(qa.get().reticleHud.weapon,selection);
    const remaining=qa.get().reloadLeft;listeners.keydown({code:'Escape'});frames(5);assert.equal(qa.get().reloadLeft,remaining);assert.equal(qa.get().reticleHud.weapon,type);elements.get('resume').onclick();
    frames(Math.ceil(remaining*60)+2);assert(elements.get('reloadProgress').classList.contains('hidden'));assert.equal(qa.get().reticleHud.weapon,type);
  }
  assert.equal(signatures.size,5,'All five optic patterns are distinct');
  qa.start();assert.equal(qa.get().reticleHud.weapon,'glock');listeners.keydown({code:'Digit4',repeat:false});assert.equal(qa.get().reticleHud.weapon,'glock','Locked weapon keys cannot change the reticle');
  console.log('PASS: six distinct reusable HUD reticles, five unique cached/fitted optical patterns, retained Glock irons, live weapon-key selection and actual hits, precise aim centers, clear reload-bar spacing, ADS/reload/pause/locked-switch/reset behavior; two meshes per optic with no added textures or lights.');
}
