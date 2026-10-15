import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {weapons} from '../public/game/core.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyBushmaster(qa,frames,listeners,canvas,elements){
  const w=weapons.bushmaster;
  assert.equal(w.mag,15);assert.equal(w.damage,weapons.rifle.damage*2);assert.equal(w.zoom,10);
  const rack=qa.get().interactables.find(s=>s.type==='bushmaster');
  assert(rack&&rack.y===UPPER_Y,'Bushmaster is available upstairs');assert.equal(rack.price,2500);
  const front={x:rack.x+Math.sin(rack.rotation||0)*1.6,z:rack.z+Math.cos(rack.rotation||0)*1.6};
  qa.start();qa.startWave();qa.holdSpawns();qa.setPoints(10000);qa.setPlayer(front.x,front.z,0);qa.interact();
  assert(!qa.get().inventory.bushmaster.owned,'The upstairs rack cannot be purchased through the floor');assert.equal(qa.get().points,10000);
  qa.setPlayer(front.x,front.z,UPPER_Y);qa.setPoints(rack.price-1);qa.interact();
  assert(!qa.get().inventory.bushmaster.owned);assert.equal(qa.get().points,rack.price-1);
  qa.setPoints(rack.price);qa.interact();assert.equal(qa.get().points,0);assert.equal(qa.get().weapon,'bushmaster');
  const inv=qa.get().inventory.bushmaster;assert.deepEqual([inv.ammo,inv.reserve],[15,90]);
  qa.selectWeapon('glock');qa.interact();assert.equal(qa.get().weapon,'bushmaster');assert.equal(qa.get().points,0,'An owned rifle can be equipped at its rack without charging again');
  qa.selectWeapon('glock');listeners.keydown({code:'Digit5',repeat:false});assert.equal(qa.get().weapon,'bushmaster');
  frames(2);assert(elements.get('weaponName').textContent.includes('.450 BUSHMASTER'));

  for(const step of [1000/30,1000/60,1000/144]){
    qa.start();qa.startWave();qa.holdSpawns();qa.get().inventory.bushmaster.owned=true;qa.selectWeapon('bushmaster');
    const held=qa.get().inventory.bushmaster;
    canvas.events.mousedown({button:0});assert.equal(held.ammo,14);
    frames(Math.ceil(1500/step),step);assert.equal(held.ammo,14,'Holding fire produces exactly one shot at every frame rate');
    canvas.events.mousedown({button:0});assert.equal(held.ammo,14,'A repeated down event cannot bypass the trigger release');
    listeners.mouseup({button:0});canvas.events.mousedown({button:0});assert.equal(held.ammo,13);
    listeners.mouseup({button:0});frames(1,step);canvas.events.mousedown({button:0});assert.equal(held.ammo,13,'Rapid clicking respects the firing recovery time');
    frames(Math.ceil(500/step),step);assert.equal(held.ammo,13,'A click during recovery is not queued into automatic fire');
    listeners.mouseup({button:0});canvas.events.mousedown({button:0});assert.equal(held.ammo,12);listeners.mouseup({button:0});
  }
  qa.start();qa.startWave();qa.holdSpawns();qa.get().inventory.rifle.owned=true;qa.selectWeapon('rifle');canvas.events.mousedown({button:0});frames(60);assert(qa.get().inventory.rifle.ammo<25,'The M4 retains automatic fire');listeners.mouseup({button:0});

  qa.get().inventory.bushmaster.owned=true;qa.selectWeapon('bushmaster');qa.setPlayer(0,20);qa.setAim(0,0);
  frames(20);
  const reloadInv=qa.get().inventory.bushmaster;reloadInv.ammo=0;reloadInv.reserve=30;
  canvas.events.mousedown({button:0});assert(qa.get().reloadLeft>0);frames(210);
  assert.deepEqual([reloadInv.ammo,reloadInv.reserve],[15,15],'Empty-trigger reload transfers 15 rounds and does not fire again while held');
  listeners.mouseup({button:0});canvas.events.mousedown({button:0});assert.equal(reloadInv.ammo,14);listeners.mouseup({button:0});

  canvas.events.mousedown({button:2});frames(140);const scoped=qa.get();
  const magnification=Math.tan(75*Math.PI/360)/Math.tan(scoped.camera.fov*Math.PI/360);
  assert(Math.abs(magnification-10)<1e-5,'World projection provides actual 10× magnification');
  assert(Math.abs(scoped.viewCamera.fov-16)<1e-5,'Scope housing uses its own projection without magnifying the gun tenfold');
  const optic=scoped.gunGroups.bushmaster.userData.optic;assert(optic.mask.visible);
  const center=optic.dot.getWorldPosition(new T.Vector3()).project(scoped.viewCamera);assert(Math.hypot(center.x,center.y)<.004,'Scope reticle aligns with the actual center shot');
  for(const x of [-.014,0,.014])for(const y of [-.014,0,.014]){
    const target=optic.group.localToWorld(new T.Vector3(x,y,.054)),direction=target.sub(scoped.viewCamera.position).normalize();
    const hits=new T.Raycaster(scoped.viewCamera.position,direction).intersectObject(scoped.gunGroups.bushmaster,true).filter(h=>h.object.visible&&h.object.isMesh&&!h.object.material.transparent&&!h.object.userData.reticle);
    assert.equal(hits.length,0,'The scope mask and long tube leave the central sight window unobstructed');
  }
  qa.setAim(0,0);listeners.mousemove({movementX:100,movementY:0});const scopedYaw=Math.abs(qa.get().lookYaw);
  listeners.mouseup({button:2});qa.setAim(0,0);listeners.mousemove({movementX:100,movementY:0});const hipYaw=Math.abs(qa.get().lookYaw);
  assert(hipYaw>0);assert(Math.abs(scopedYaw/hipYaw-.062)<1e-8,'10× aim reduces mouse motion proportionally');
  frames(140);assert(Math.abs(qa.get().camera.fov-75)<1e-5);assert(!optic.mask.visible,'Releasing aim removes the scope mask');

  function bulletDamage(type){
    qa.start();qa.startWave();qa.holdSpawns();qa.get().inventory[type].owned=true;qa.selectWeapon(type);qa.setPlayer(0,20);qa.setAim(0,-.15);frames(1);
    qa.setSeed(312);const enemy=qa.makeZombie(0,16);enemy.hp=enemy.maxHp=10000;qa.get().scene.updateMatrixWorld(true);qa.setSeed(821);qa.shoot();assert(enemy.hp<10000);return 10000-enemy.hp;
  }
  assert.equal(bulletDamage('bushmaster'),bulletDamage('rifle')*2,'Real Bushmaster bullets deal twice M4 damage');
  qa.start();assert(!qa.get().inventory.bushmaster.owned,'A new run resets weapon ownership');assert.equal(qa.get().camera.fov,75,'A new run resets scope zoom');
  console.log('PASS: upstairs .450 Bushmaster purchase, 15-round reload, key 5, real 2× M4 damage, one shot per click at 30/60/144 FPS, preserved M4 auto fire, true 10× zoom, clear reticle and proportional mouse aim.');
}
