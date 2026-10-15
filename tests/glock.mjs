import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {weapons} from '../public/game/core.mjs';
import {createWeaponModel} from '../public/game/weapon-models.mjs';

export function verifyGlock(qa,frames,listeners,canvas,elements){
  const down=()=>canvas.events.mousedown({button:0}),up=()=>listeners.mouseup({button:0});
  const key=code=>listeners.keydown({code,repeat:false,preventDefault(){}});
  const w=weapons.glock;
  qa.start();qa.holdSpawns();
  assert.equal(qa.get().weapon,'glock');assert.deepEqual([qa.get().inventory.glock.ammo,qa.get().inventory.glock.reserve],[13,78]);
  assert.deepEqual(Object.keys(qa.get().inventory).filter(k=>qa.get().inventory[k].owned),['glock'],'Only the Glock is owned at the start');
  assert.match(elements.get('weaponName').textContent,/GLOCK 21/);assert.equal(elements.get('ammo').textContent,'13');
  for(const code of ['Digit2','Digit3','Digit4','Digit5','Digit6']){key(code);assert.equal(qa.get().weapon,'glock','Unpurchased guns cannot be equipped');}
  key('Digit1');assert.equal(qa.get().weapon,'glock');assert.equal(w.mag,13);assert(w.semiAuto);

  // One trigger pull stays one shot, including repeated down events, recovery,
  // and resuming after a paused slide cycle at each supported frame rate.
  for(const fps of [30,60,144]){
    qa.start();qa.holdSpawns();const inv=qa.get().inventory.glock,slide=qa.get().gunGroups.glock.userData;
    down();assert.equal(inv.ammo,12);frames(1,1000/fps);assert(slide.slide.position.z>0&&slide.slide.position.z<=.026);
    document.exitPointerLock();const paused=[slide.slideTime,slide.slide.position.z];frames(fps,1000/fps);
    assert.deepEqual([slide.slideTime,slide.slide.position.z],paused,'Pause freezes the moving slide');
    elements.get('resume').onclick();frames(Math.ceil(.3*fps),1000/fps);down();frames(fps,1000/fps);assert.equal(inv.ammo,11);
    down();assert.equal(inv.ammo,11,'A duplicate down event cannot fire the semi-auto Glock');
    up();down();assert.equal(inv.ammo,10);up();frames(1,1000/fps);down();assert.equal(inv.ammo,10,'Rapid clicks respect firing recovery');
    frames(Math.ceil(.5*fps),1000/fps);assert.equal(inv.ammo,10,'A blocked click cannot queue a shot');
    up();down();assert.equal(inv.ammo,9);up();frames(Math.ceil(.3*fps),1000/fps);assert.equal(slide.slide.position.z,0);
  }

  // Fire the complete magazine, then verify an empty click reloads exactly 13
  // rounds without producing an extra shot when fire is held.
  qa.start();qa.holdSpawns();const inv=qa.get().inventory.glock;
  for(let i=0;i<13;i++){down();up();frames(16);assert.equal(inv.ammo,12-i);}
  assert.equal(inv.reserve,78);assert.equal(qa.get().gunGroups.glock.userData.slide.position.z,.026,'Empty slide locks back');
  down();assert(qa.get().reloadLeft>0);const remaining=qa.get().reloadLeft;document.exitPointerLock();frames(90);assert.equal(qa.get().reloadLeft,remaining);
  elements.get('resume').onclick();down();frames(120);assert.deepEqual([inv.ammo,inv.reserve],[13,65]);
  assert.equal(qa.get().gunGroups.glock.userData.slide.position.z,0,'Reload closes the slide');up();
  inv.ammo=0;inv.reserve=0;down();frames(40);up();assert.equal(inv.ammo,0);assert.equal(qa.get().reloadLeft,0,'An empty reserve cannot conjure ammo');
  qa.dropPickup(0,20,'ammo');frames(1);assert.deepEqual([inv.ammo,inv.reserve],[0,91]);assert.equal(qa.get().reloadLeft,0);assert.equal(qa.get().gunGroups.glock.userData.slide.position.z,.026,'Ammo pickup leaves the empty slide locked back');
  key('KeyR');frames(120);assert.deepEqual([inv.ammo,inv.reserve],[13,78]);assert.equal(qa.get().gunGroups.glock.userData.slide.position.z,0,'Manual reload closes the slide');
  const ammo=qa.get().interactables.find(s=>s.type==='ammo'&&s.y===0);
  inv.ammo=3;inv.reserve=5;qa.setPoints(ammo.price);qa.setPlayer(ammo.x,ammo.z+1.6);key('KeyE');assert.deepEqual([inv.ammo,inv.reserve],[3,88]);
  key('KeyR');frames(120);assert.deepEqual([inv.ammo,inv.reserve],[13,78]);
  assert(!qa.get().inventory.rifle.owned,'Refills never unlock the M4');

  const model=createWeaponModel('glock'),repeat=createWeaponModel('glock'),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
  assert(size.z>.25&&size.z<.5&&size.x>.07&&size.x<.13&&size.y<.4,'Pistol keeps compact full-size Glock proportions');
  assert(model.userData.parts.every((part,i)=>part.geometry===repeat.userData.parts[i].geometry&&part.material===repeat.userData.parts[i].material),'Repeated Glock models share cached geometry and finishes');
  const guard=model.getObjectByName('Squared open pistol trigger guard');assert(guard.geometry.parameters.shapes.holes.length===1);
  assert(model.getObjectByName('Flush 13-round magazine floorplate'));assert(model.getObjectByName('Front white sight dot'));
  const steel=model.getObjectByName('Glock 21 steel slide');
  assert.equal(steel.geometry.userData.glock.frontSerrations,8);assert.equal(steel.geometry.userData.glock.rearSerrations,8);
  const cast=(origin,direction)=>new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction)).intersectObject(steel)[0];
  const port=cast([.015,.15,.070],[0,-1,0]),roof=cast([-.028,.15,.070],[0,-1,0]),sidePort=cast([.10,.058,.070],[-1,0,0]);
  assert(Math.abs(port.point.y-.044)<1e-6&&Math.abs(roof.point.y-.078)<1e-6,'The chamber opening has a real lower floor, beside an intact left roof');
  assert(Math.abs(sidePort.point.x+.021)<1e-6,'The side opening reaches the inner chamber wall instead of a painted exterior panel');
  const groove=cast([-.1,.04,.144],[1,0,0]),shoulder=cast([-.1,.04,.1484],[1,0,0]);
  assert(groove.point.x-shoulder.point.x>.0013,'The serrations are recessed into the steel');
  const pocket=cast([0,.15,.1575],[0,-1,0]);assert(Math.abs(pocket.point.y-.0725)<1e-6);
  assert(model.getObjectByName('Recessed MOS cover plate'));assert.equal(model.userData.parts.filter(p=>p.name==='MOS cover screw').length,2);
  assert.equal(model.userData.parts.filter(p=>p.name==='Grip stippling panel').length,4);assert(!model.getObjectByName('Grip finger ridge'),'The reference grip has no finger grooves');
  model.updateMatrixWorld(true);
  const gripTop=new T.Raycaster(new T.Vector3(0,.02,.172),new T.Vector3(0,-1,0)).intersectObject(model.getObjectByName('Glock double-stack grip'))[0];
  const frameBottom=new T.Raycaster(new T.Vector3(0,-.10,.172),new T.Vector3(0,1,0)).intersectObject(model.getObjectByName('Moulded Glock polymer frame'))[0];
  assert(gripTop&&frameBottom&&gripTop.point.y>=frameBottom.point.y,'The curved grip joins the actual underside of the frame without a gap');
  assert(new T.Box3().setFromObject(model.getObjectByName('Pistol trigger')).intersectsBox(new T.Box3().setFromObject(model.getObjectByName('Trigger safety blade'))),'The safety blade has a solid contact with the trigger');
  const hood=model.getObjectByName('Exposed chamber hood');assert.equal(hood.parent,model.userData.body,'The barrel hood stays on the frame as the slide recoils');
  const hoodPosition=hood.getWorldPosition(new T.Vector3());
  for(const travel of [0,.026]){
    model.userData.slide.position.z=travel;model.updateMatrixWorld(true);
    assert(hood.getWorldPosition(new T.Vector3()).distanceTo(hoodPosition)<1e-8);
    for(const name of ['Front sight base','Rear iron sight base']){
      const base=model.getObjectByName(name),bounds=new T.Box3().setFromObject(base),center=bounds.getCenter(new T.Vector3());
      const support=new T.Raycaster(new T.Vector3(center.x,bounds.max.y+.03,center.z),new T.Vector3(0,-1,0)).intersectObject(steel)[0];
      assert(support&&bounds.min.y<=support.point.y+.0001&&bounds.max.y>support.point.y,`${name} seats directly into the steel slide without a floating gap`);
      assert.equal(base.parent,model.userData.slide,'Sight shoes move with the slide');
    }
    const frontBase=new T.Box3().setFromObject(model.getObjectByName('Front sight base')),frontBlade=new T.Box3().setFromObject(model.getObjectByName('Front iron sight blade'));
    assert(frontBase.intersectsBox(frontBlade),'Front blade has a solid contact with its mounting shoe');
    const rearBase=new T.Box3().setFromObject(model.getObjectByName('Rear iron sight base'));
    for(const wing of model.userData.parts.filter(p=>p.name==='Rear iron sight wing'))assert(rearBase.intersectsBox(new T.Box3().setFromObject(wing)),'Rear notch wings have a solid contact with their mounting shoe');
    for(const mark of model.userData.parts.filter(p=>/^(Front white sight dot|Rear white sight marking|Rear white U-notch base)$/.test(p.name))){
      const bounds=new T.Box3().setFromObject(mark),center=bounds.getCenter(new T.Vector3());
      const supports=model.userData.parts.filter(p=>/^(Front iron sight blade|Rear iron sight wing|Rear iron sight base)$/.test(p.name));
      const face=new T.Raycaster(new T.Vector3(center.x,center.y,bounds.max.z+.01),new T.Vector3(0,0,-1)).intersectObjects(supports)[0];
      assert(face&&center.z-face.point.z>=-.0001&&center.z-face.point.z<.002,'White sight markings sit on an actual iron-sight face without a floating gap');
    }
  }
  model.userData.slide.position.z=0;model.updateMatrixWorld(true);
  assert(!model.userData.optic,'The Glock uses iron sights');assert.equal(model.userData.muzzle.x,0);assert(model.userData.muzzle.z<bounds.min.z+.01);
  assert(!model.userData.parts.some(part=>/palm|firing.hand|supporting|forearm|thumb|glove/i.test(part.name)),'Held Glock keeps the floating-gun presentation');
  qa.start();qa.holdSpawns();qa.setAim(0,0);canvas.events.mousedown({button:2});frames(85);qa.get().scene.updateMatrixWorld(true);
  const state=qa.get(),gun=state.gunGroups.glock;
  const frontBounds=new T.Box3().setFromObject(model.getObjectByName('Front iron sight blade')),rearWing=model.userData.parts.find(p=>p.name==='Rear iron sight wing'),rearBounds=new T.Box3().setFromObject(rearWing);
  const frontTop=gun.localToWorld(new T.Vector3(0,frontBounds.max.y,(frontBounds.min.z+frontBounds.max.z)/2)).project(state.camera);
  const rearTop=gun.localToWorld(new T.Vector3(0,rearBounds.max.y,(rearBounds.min.z+rearBounds.max.z)/2)).project(state.camera);
  assert(Math.abs(frontTop.y-rearTop.y)<.003,'Front post top aligns with the rear notch shoulders from the actual aimed camera');
  for(const x of [-.002,0,.002])for(const y of [0,.002]){
    const direction=gun.localToWorld(new T.Vector3(x,gun.userData.sightHeight+y,-.055)).sub(state.camera.position).normalize();
    const ray=new T.Raycaster(state.camera.position,direction);ray.layers.set(1);
    const hits=ray.intersectObject(gun,true).filter(h=>h.object.isMesh&&!h.object.material.transparent);
    assert.equal(hits.length,0,'Open iron sights keep the center target visible');
  }
  const blade=gun.localToWorld(new T.Vector3(.001,.0915,-.022)),sightRay=new T.Raycaster(state.camera.position,blade.sub(state.camera.position).normalize());sightRay.layers.set(1);
  assert(sightRay.intersectObject(gun,true).some(h=>h.object.isMesh&&!h.object.material.transparent),'The same layer-1 sight test hits the blade beside the open aiming ray');
  let meshes=0,triangles=0;gun.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(o.geometry.attributes.position.array.every(Number.isFinite));});
  assert(meshes<=18&&triangles<12000,'Pistol preserves a small mesh and geometry budget');listeners.mouseup({button:2});
  // Keep the rear of the moving slide in front of the render near plane,
  // including aiming with an empty magazine and its slide locked back.
  canvas.events.mousedown({button:2});qa.get().inventory.glock.ammo=0;frames(45);qa.get().scene.updateMatrixWorld(true);
  const slideBounds=new T.Box3().setFromObject(gun.userData.slide).applyMatrix4(state.camera.matrixWorldInverse);
  assert(slideBounds.max.z<-state.viewCamera.near-.01,'Empty aimed slide cannot be cut off by the near plane');listeners.mouseup({button:2});

  function damage({head=false,rank=0,eye=false,double=false}={}){
    qa.start();qa.startWave();qa.holdSpawns();qa.setPoints(10000);
    if(eye){const perk=qa.get().interactables.find(s=>s.type==='perk'&&s.id==='eye'&&s.y===0);qa.setPlayer(perk.x+Math.sin(perk.rotation||0)*1.6,perk.z+Math.cos(perk.rotation||0)*1.6);qa.interact();}
    qa.get().inventory.glock.forgeRank=rank;qa.setPlayer(0,20);if(double){qa.dropPickup(0,20,'double');frames(1);}
    qa.setAim(0,head?0:-.15);frames(1);qa.setSeed(312);const enemy=qa.makeZombie(0,16);enemy.hp=enemy.maxHp=10000;
    qa.get().scene.updateMatrixWorld(true);qa.setSeed(821);down();up();assert.equal(qa.get().inventory.glock.ammo,12);assert(enemy.hp<10000);return 10000-enemy.hp;
  }
  const body=damage();assert.equal(body,w.damage);assert(Math.abs(damage({head:true})-body*2.6)<1e-7);
  assert.equal(damage({eye:true}),body*1.5);assert.equal(damage({double:true}),body*2);assert.equal(damage({rank:3}),body*6);
  assert.equal(damage({rank:1,eye:true,double:true}),body*6,'Pistol shares the existing damage bonuses');

  // Buying the shed M4 retains the pistol, and both number keys select their
  // correct weapon after an actual paid purchase.
  qa.start();for(let i=0;i<7;i++)qa.startWave();qa.holdSpawns();frames(50);
  const rack=qa.get().shed.weapon;qa.setPoints(4500);qa.setPlayer(rack.x,rack.z+1.4);key('KeyE');assert.equal(qa.get().weapon,'rifle');
  key('Digit1');assert.equal(qa.get().weapon,'glock');key('Digit6');assert.equal(qa.get().weapon,'rifle');
  qa.start({capture:false});assert.equal(qa.get().weapon,'glock');assert.equal(qa.get().mode,'paused');assert(!qa.get().inventory.rifle.owned&&!rack.purchased);
  assert.deepEqual([qa.get().inventory.glock.ammo,qa.get().inventory.glock.reserve,qa.get().inventory.glock.forgeRank],[13,78,0]);
  assert.equal(gun.userData.slide.position.z,0);assert.equal(gun.userData.slideTime,0);elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');
  console.log(`PASS: Glock-only 13-round starter, real semi-auto mouse input at 30/60/144 FPS, slide cycle/lock-back/pause, 13-round reload and both ammo supplies, clear iron sights, damage/perk/forge bonuses, paid M4/key 6, key 1 and reset; ${meshes} meshes / ${triangles} triangles.`);qa.start();
}
