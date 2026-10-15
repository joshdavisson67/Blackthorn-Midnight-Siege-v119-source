import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {SHED,SHED_FRONT,inShed} from '../public/game/shed-layout.mjs';
import {CELLAR} from '../public/game/cellar-layout.mjs';
import {isLawn,isStonePath} from '../public/game/grounds.mjs';
import {isBlocked} from '../public/game/core.mjs';
import {moveActor} from '../public/game/vertical.mjs';

export function verifyShed(qa,frames,listeners,elements){
  const {x,z,w,d,wall}=SHED,front=SHED_FRONT;
  assert((w-2*wall)*(d-2*wall)>35,'Shed has a weapon-sized usable interior');
  assert(CELLAR.x-CELLAR.stairWidth/2-(x+w/2)>8,'Keep generous clearance beside cellar stairs');
  assert(-84-front>10,'Shed stays clear of rear mansion doors and forecourt');
  assert(!isLawn(x,z)&&isStonePath(x,front+2),'No grass grows through the shed or its approach');
  qa.start();qa.setHealth(10000);qa.setPlayer(x,front+1.5);qa.setAim(0,0);
  const shed=qa.get().shed;
  for(let wave=1;wave<=6;wave++){
    qa.startWave();qa.holdSpawns();
    assert(!shed.open&&!shed.gate.disabled&&shed.progress===0,`Shed stays locked in wave ${wave}`);
  }
  frames(1);qa.interact();assert.match(elements.get('toast').textContent,/SEALED.*wave 7/);
  const points=qa.get().points;qa.setKeys(['KeyW']);frames(90);qa.setKeys([]);
  assert(qa.get().player.z>front,'W cannot enter the locked shed');
  listeners.keydown({code:'Space',preventDefault(){}});qa.setKeys(['KeyW']);frames(65);qa.setKeys([]);
  assert(qa.get().player.z>front,'Jumping cannot bypass the lock');
  assert.equal(qa.get().points,points,'Locked door never charges essence');
  qa.get().nav.rebuild(x,front+3);assert(!qa.get().nav.direction(x,z).reachable,'Locked shed has no route through walls');
  const closedRay=new T.Raycaster(new T.Vector3(x,1.68,front+1),new T.Vector3(0,0,-1),0,2);
  qa.get().world.updateMatrixWorld(true);
  assert(closedRay.intersectObjects(qa.get().shed.doors.flatMap(({hinge})=>hinge.children),true).length,'Closed leaves block the center sightline');

  qa.startWave();qa.holdSpawns();assert.equal(qa.get().wave,7);
  assert(shed.open&&shed.gate.disabled&&!shed.sealed.visible);
  assert.equal(elements.get('toast').textContent,'A DOOR HAS BLOWN OPEN SOMEWHERE…');
  assert(qa.get().nav.direction(x,z).reachable,'Unlock immediately rebuilds zombie navigation');
  const invalidations=qa.get().lighting.metrics.invalidations;
  frames(50);assert.equal(shed.progress,1);assert(shed.doors.every(({hinge})=>Math.abs(hinge.rotation.y)>3.13));
  assert.equal(qa.get().lighting.metrics.invalidations,invalidations+1,'Opened shed doors refresh architectural shadows');
  assert.equal(Number(elements.get('toast').style.opacity),1);
  qa.get().world.updateMatrixWorld(true);
  assert.equal(closedRay.intersectObjects(shed.doors.flatMap(({hinge})=>hinge.children),true).length,0,'Open leaves clear the central sightline');
  qa.setPlayer(x,front+1.5);qa.setKeys(['KeyW','ShiftLeft']);frames(55);qa.setKeys([]);
  assert(inShed(qa.get().player.x,qa.get().player.z),'Sprinting enters the actual interior');
  assert.equal(qa.get().player.y,0);assert.match(elements.get('location').textContent,/GROUNDSKEEPER’S SHED/);
  assert(qa.get().environmentLights.lights.some(light=>light.intensity>0),'Shed has local illumination using the existing light pool');
  qa.setKeys(['KeyS']);frames(95);qa.setKeys([]);assert(qa.get().player.z>front+1,'S exits without sticking');
  qa.setPlayer(x,front+.8);frames(1);qa.interact();assert.match(elements.get('toast').textContent,/OPEN.*workshop/);
  const afterInteraction=elements.get('toast').textContent;qa.startWave();qa.holdSpawns();assert.equal(elements.get('toast').textContent,afterInteraction,'Opening notice occurs only once per run');
  for(const offset of [-.65,0,.65])for(const direction of [-1,1]){
    const actor=new T.Vector3(x+offset,0,front-direction*1.5);
    for(let step=0;step<60;step++)moveActor(actor,0,direction*.05,qa.get().colliders,{allowFall:false});
    assert(Math.abs(actor.z-(front+direction*1.5))<.001,'Door has bidirectional lane clearance');
    assert.equal(actor.y,0,'Shed threshold never creates a hole');
  }
  for(const xx of [x-w/2-.8,x+w/2+.8])assert(qa.get().nav.direction(xx,z).reachable,'Grounds stay connected around both sides');
  assert(isBlocked(x+w/2,z,.32,qa.get().colliders),'Glazed wall cannot bypass the locked entrance');
  assert(!isBlocked(x,z,.57,qa.get().colliders,undefined,0,2.8),'Center aisle has room for a brute and weapon');
  console.log('PASS: rear shed placement, no grass/doorway interference, locked waves 1–6, wave-7 blast animation and one-time notice, real keyboard entry/exit, multiple doorway lanes, clear weapon space and pooled illumination.');

  for(const kind of ['walker','dog','ashfang','feral','brute']){
    qa.start();qa.setHealth(10000);for(let wave=0;wave<7;wave++)qa.startWave();qa.holdSpawns();frames(50);
    qa.setPlayer(x,z+.4);qa.get().nav.rebuild(x,z+.4);
    const e=qa.makeZombie(x,front+3,kind==='brute',kind==='dog'||kind==='ashfang',kind==='ashfang',0,kind==='feral');e.speed=3;e.flank=0;
    for(let i=0;i<200&&e.walkPos.z>front-.8;i++)frames(1);
    assert(e.walkPos.z<front-.8,`${kind} can pursue into the shed: ${e.walkPos.toArray()}`);
    qa.setPlayer(x,front+5);qa.get().nav.rebuild(x,front+5);
    for(let i=0;i<200&&e.walkPos.z<front+.7;i++)frames(1);
    assert(e.walkPos.z>front+.7,`${kind} can pursue back out of the shed`);
    assert.equal(e.floorY,0,'All shed enemies remain on the grounds level');
  }
  const signature=[];qa.get().scene.traverseVisible(o=>{if(o.isPointLight)signature.push(o.uuid);});assert.equal(signature.length,9,'Shed adds no shader light slots');
  qa.start();for(let wave=0;wave<7;wave++)qa.startWave();qa.holdSpawns();frames(5);
  assert(shed.progress>0&&shed.progress<1);document.exitPointerLock();const pausedProgress=shed.progress;frames(50);assert.equal(shed.progress,pausedProgress,'Shed animation pauses with the run');
  const beforeReset=qa.get().lighting.metrics.invalidations;qa.start();assert.equal(qa.get().lighting.metrics.invalidations,beforeReset+1,'Resetting partial door animation clears cached shadows');
  assert(!shed.open&&!shed.gate.disabled&&shed.progress===0&&shed.sealed.visible);
  assert.equal(Number(elements.get('toast').style.opacity),0,'A new run cannot show the previous opening notice');
  assert(shed.doors.every(({hinge})=>hinge.rotation.y===0));
  for(const {piece} of shed.barPieces)assert.equal(piece.position.y,1.55);
  assert.equal(shed.lock.position.y,1.38);
  for(let wave=0;wave<7;wave++)qa.startWave();qa.holdSpawns();assert.equal(elements.get('toast').textContent,'A DOOR HAS BLOWN OPEN SOMEWHERE…','New runs can trigger the opening again');
  qa.start();console.log('PASS: all five enemy types pursue into/out of the shed, stable 9-light budget, pause-safe opening, shadow reset and complete door/bar/lock restoration on a new run.');
}

export function verifyShedM4(qa,frames,listeners,elements){
  const pressE=()=>listeners.keydown({code:'KeyE',repeat:false,preventDefault(){}});
  const unlock=()=>{for(let i=0;i<7;i++)qa.startWave();qa.holdSpawns();frames(50);};
  qa.start();qa.setHealth(10000);qa.setPoints(4500);
  const weapon=qa.get().shed.weapon;
  assert.equal(qa.get().weapon,'glock');assert(!qa.get().inventory.rifle.owned,'The M4 must be bought in this run');
  assert.equal(weapon.type,'rifle');assert.equal(weapon.price,4500);assert(weapon.locked&&!weapon.purchased);
  assert(weapon.displayBounds.min.y>.94&&weapon.displayBounds.max.y<2.3,'M4 clears the workbench and ceiling');
  assert(weapon.displayBounds.min.x>SHED.x-SHED.w/2+SHED.wall&&weapon.displayBounds.max.x<SHED.x+SHED.w/2-SHED.wall,'M4 fits on the rear rack');
  qa.get().inventory.rifle.ammo=2;qa.get().inventory.rifle.reserve=3;
  qa.setPlayer(weapon.x,weapon.z+1.4);pressE();assert.equal(qa.get().points,4500);assert.equal(qa.get().inventory.rifle.ammo,2,'No purchase through a locked shed');
  for(let i=0;i<6;i++)qa.startWave();qa.holdSpawns();pressE();assert(weapon.locked&&!weapon.purchased);assert.equal(qa.get().points,4500);
  qa.startWave();qa.holdSpawns();frames(50);assert(!weapon.locked);
  qa.setPlayer(weapon.x,SHED.z-SHED.d/2-.8);assert(Math.hypot(weapon.x-qa.get().player.x,weapon.z-qa.get().player.z)<2.3);pressE();assert.equal(qa.get().points,4500,'Outside the rear wall cannot reach the rifle');
  qa.setPlayer(weapon.x,weapon.z+1.4,4.3);pressE();assert.equal(qa.get().points,4500,'No wrong-floor purchase');
  qa.setPlayer(SHED.x,SHED_FRONT+1.5);qa.setAim(0,0);qa.setKeys(['KeyW']);frames(87);qa.setKeys([]);
  assert(inShed(qa.get().player.x,qa.get().player.z));assert(Math.hypot(weapon.x-qa.get().player.x,weapon.z-qa.get().player.z)<2.3,'Rear M4 has a keyboard-walkable purchase approach');
  qa.get().inventory.smg.owned=true;qa.get().inventory.smg.ammo=13;qa.get().inventory.smg.reserve=42;qa.selectWeapon('smg');qa.setPoints(4499);frames(1);
  assert.match(elements.get('interaction').textContent,/M4.*4,500 ESSENCE/);pressE();assert.equal(elements.get('toast').textContent,'NEED 1 MORE ESSENCE');
  assert.equal(qa.get().points,4499);assert.equal(qa.get().weapon,'smg');assert(!weapon.purchased);assert.equal(qa.get().inventory.rifle.ammo,2);assert.equal(qa.get().inventory.rifle.reserve,3);
  qa.setPoints(4500);const score=qa.get().totalScore;pressE();assert.equal(qa.get().points,0);assert.equal(qa.get().totalScore,score,'Buying changes essence, not earned leaderboard score');
  assert(weapon.purchased&&qa.get().inventory.rifle.owned);assert.equal(qa.get().weapon,'rifle');assert.equal(qa.get().inventory.rifle.ammo,30);assert.equal(qa.get().inventory.rifle.reserve,180);
  assert.equal(qa.get().inventory.smg.ammo,13);assert.equal(qa.get().inventory.smg.reserve,42,'M4 purchase does not refill other guns');
  frames(1);assert.match(elements.get('interaction').textContent,/OWNED/);
  qa.setPlayer(SHED.x,SHED.z-1);qa.setAim(Math.PI,0);frames(1);const enemy=qa.makeZombie(SHED.x,SHED.z+.9),hp=enemy.hp;
  qa.get().scene.updateMatrixWorld(true);qa.shoot();assert(enemy.hp<hp,'Purchased M4 fires real bullets from the equipped model');assert.equal(qa.get().inventory.rifle.ammo,29);
  const afterShotPoints=qa.get().points;qa.setPlayer(weapon.x,weapon.z+1.4);qa.selectWeapon('smg');pressE();assert.equal(qa.get().weapon,'rifle');assert.equal(qa.get().points,afterShotPoints);assert.equal(qa.get().inventory.rifle.ammo,29,'Later equips are free and cannot grant repeated free ammo');
  qa.selectWeapon('smg');listeners.keydown({code:'Digit6',repeat:false});assert.equal(qa.get().weapon,'rifle','Key 6 selects the purchased M4');
  qa.openMap();assert(!elements.get('estateMap').classList.contains('hidden'));qa.closeMap();

  qa.start();unlock();qa.setPoints(4500);qa.setPlayer(weapon.x,weapon.z+1.4);
  const upgraded=qa.get().inventory.rifle;upgraded.forgeRank=2;upgraded.ammo=1;upgraded.reserve=1;
  qa.get().inventory.smg.owned=true;qa.selectWeapon('smg');qa.get().inventory.smg.ammo=20;qa.reload();assert(qa.get().reloadLeft>0);
  pressE();assert.equal(qa.get().points,0);assert.equal(qa.get().reloadLeft,0);assert.equal(qa.get().weapon,'rifle');assert.equal(upgraded.forgeRank,2,'M4 purchase preserves earned Soul Forge ranks');assert.equal(upgraded.ammo,47);assert.equal(upgraded.reserve,282,'Purchase fills upgraded M4 capacities');
  qa.start();assert(weapon.locked&&!weapon.purchased);assert.equal(qa.get().inventory.rifle.forgeRank,0);assert.equal(qa.get().inventory.rifle.ammo,30);
  unlock();qa.setPlayer(weapon.x,weapon.z+1.4);qa.setPoints(4500);pressE();assert(weapon.purchased&&qa.get().points===0,'New run can buy the M4 again');
  qa.start();console.log('PASS: visible rear-wall M4, wave-7 and interior/floor guards, clear keyboard approach, exact 4,500 cost/funds denial, full M4-only ammo, real shooting, free later equips/key 6, preserved forge capacities, reload cancellation and new-run reset.');
}
