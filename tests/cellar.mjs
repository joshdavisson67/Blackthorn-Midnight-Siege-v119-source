import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {CELLAR} from '../public/game/cellar-layout.mjs';
import {UPPER_Y,ceilingAt} from '../public/game/vertical.mjs';
import {BRUTE} from '../public/game/brute.mjs';
import {isBlocked} from '../public/game/core.mjs';

export function verifyCellarForge(qa,frames,listeners,elements){
  const state=qa.get(),forges=state.interactables.filter(s=>s.type==='upgrade'),forge=forges.find(s=>s.y===CELLAR.y);
  assert.equal(forges.length,2);assert(forge);assert(forges.some(s=>s.y===0));assert(!forges.some(s=>s.y===UPPER_Y),'The forge is moved, without leaving an upstairs copy');
  assert(!isBlocked(6.3825,-6.4,.32,state.colliders,undefined,UPPER_Y),'The old upstairs forge footprint has no leftover collision');
  const visual=state.stationBuilder.visuals.find(v=>v.station===forge);
  const approach={x:forge.x+Math.sin(forge.rotation)*1.6,z:forge.z+Math.cos(forge.rotation)*1.6};
  state.world.updateMatrixWorld(true);
  // Static batching detaches source parts from the group. Their retained world
  // matrices are the transforms baked into the finished scene meshes.
  const bounds=new T.Box3();
  for(const part of visual.parts){part.geometry.computeBoundingBox();bounds.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));}
  assert(bounds.min.y>=CELLAR.y-1e-6&&bounds.max.y<ceilingAt(forge.x,forge.z,CELLAR.y),'The entire forge rests on the cellar floor and fits under its ceiling');
  assert(bounds.min.x>CELLAR.x-CELLAR.w/2+.2&&bounds.max.x<CELLAR.x+CELLAR.w/2-.2&&bounds.max.z<CELLAR.z+CELLAR.d/2-.2,'The complete asset remains inside the armory walls');
  for(const radius of [.32,BRUTE.radius]){
    const height=radius===.32?1.8:BRUTE.height;
    for(const [x,z] of [[approach.x,approach.z],[forge.x-1.6,-66],[forge.x+1.6,-66],[state.cellar.weapon.x,state.cellar.weapon.z-1.6],[state.cellar.armor.x,state.cellar.armor.z-1.6]])
      assert(!isBlocked(x,z,radius,state.colliders,undefined,CELLAR.y,height),'The forge leaves player/brute-sized approaches beside both supplies and around its sides');
  }
  const press=code=>listeners.keydown({code,repeat:false,preventDefault(){}});
  const start=()=>{qa.start();qa.startWave();qa.holdSpawns();qa.setAim(0,0);qa.setKeys([]);qa.setHealth(100000);};
  start();qa.setPlayer(approach.x,approach.z,CELLAR.y);qa.setPoints(50000);press('KeyE');
  assert.equal(qa.get().inventory.glock.forgeRank,0);assert.equal(qa.get().points,50000,'The cellar forge follows the wave-10 lock');
  let trips=0;
  for(const fps of [30,60,144]){
    start();while(qa.get().wave<CELLAR.unlockWave)qa.startWave();qa.holdSpawns();qa.get().cellar.update(2);
    qa.setPlayer(approach.x,approach.z,0);qa.setPoints(50000);press('KeyE');assert.equal(qa.get().inventory.glock.forgeRank,0,'The forge cannot be used through the ceiling');
    const ms=1000/fps;
    function walk(key,arrived){
      qa.setKeys([key]);let n=0;while(!arrived(qa.get().player)&&n++<fps*15)frames(1,ms);qa.setKeys([]);
      assert(n<fps*15,'The forge has a complete keyboard-controlled route from the grounds');
      const p=qa.get().player;assert(!isBlocked(p.x,p.z,.32,state.colliders,undefined,p.y));
    }
    qa.setPlayer(CELLAR.x,CELLAR.topZ-1);walk('KeyS',p=>p.z>=approach.z-.02);
    assert.equal(qa.get().player.y,CELLAR.y);assert(qa.get().grounded);frames(1,ms);
    assert(elements.get('interaction').textContent.includes('THE CELLAR SOUL FORGE'),'The approach reaches the forge, with its readable interaction prompt');
    qa.setPoints(4999);press('KeyE');assert.equal(qa.get().inventory.glock.forgeRank,0);assert.equal(qa.get().points,4999);
    qa.setPoints(50000);press('KeyE');assert.equal(qa.get().inventory.glock.forgeRank,1);assert.equal(qa.get().points,45000);
    // Read the actual pause map so automatic floor selection is also tested.
    const canvas=elements.get('estateMapCanvas'),original=canvas.getContext,labels=[];
    const ctx=new Proxy({fillText(text,x,z){labels.push({text,x,z});}},{get(o,k){return k in o?o[k]:(()=>{});},set(o,k,v){o[k]=v;return true;}});
    canvas.getContext=()=>ctx;
    try{
      qa.openMap();const marker=labels.filter(l=>l.text==='F');assert.equal(marker.length,1,'The cellar map shows the moved forge');
      assert(labels.some(l=>l.text.includes('F SOUL FORGE')),'The cellar legend identifies the forge marker');
      assert(marker[0].x>0&&marker[0].x<canvas.width&&marker[0].z>0&&marker[0].z<canvas.height,'The forge marker fits inside the map');qa.closeMap();
      qa.setPlayer(10,2.5,UPPER_Y);labels.length=0;qa.openMap();assert(!labels.some(l=>l.text==='F'||l.text.includes('F FORGE')),'The upper map no longer shows or advertises a forge');qa.closeMap();
    }finally{canvas.getContext=original;}
    qa.setPlayer(approach.x,approach.z,CELLAR.y);walk('KeyW',p=>p.z<CELLAR.topZ-.5);assert.equal(qa.get().player.y,0);assert(qa.get().grounded);trips++;
  }
  assert(elements.get('guideSupplies').textContent.includes('back wall of the storm cellar'));
  assert(!elements.get('guideEstate').textContent.split('The second floor')[1].split('Bella /')[0].includes('a Soul Forge'),'The field guide no longer advertises an upstairs forge');
  qa.start();assert.equal(forge.forgeRank,0);assert.equal(forge.price,5000);
  console.log(`PASS: moved cellar forge with cleared upstairs footprint, floor/wall/ceiling and brute-sized supply clearance, wave/floor/funds guards, ${trips} real keyboard entry/purchase/exit trips, correct cellar/upper map markers and reset.`);
}
export function verifyCellar(qa,frames,listeners,elements){
  const cx=CELLAR.x,landing=CELLAR.topZ-1;
  qa.start();qa.setHealth(10000);qa.setPlayer(cx,landing);qa.setAim(0,0);
  // Isolate gate/stair geometry from random wave enemies blocking the flight.
  // Live pursuit and crowded stair collision are exercised separately below.
  for(let i=0;i<9;i++)qa.startWave();qa.holdSpawns();qa.setKeys(['KeyS']);frames(60);qa.setKeys([]);assert(qa.get().player.z<CELLAR.topZ,'Closed storm doors must block entry before wave 10');assert(!qa.get().cellar.gate.disabled);
  qa.startWave();qa.holdSpawns();assert(qa.get().cellar.gate.disabled);frames(120);assert(qa.get().cellar.progress===1);assert(qa.get().cellar.doors.every(d=>Math.abs(d.hinge.rotation.z)>1.7),'Both leaves swing open');
  qa.setPlayer(cx,landing);qa.setKeys(['KeyS']);let biggest=0,previous=0;for(let i=0;i<190;i++){frames(1);const y=qa.get().player.y;biggest=Math.max(biggest,Math.abs(y-previous));previous=y;}qa.setKeys([]);
  assert.equal(qa.get().player.y,-4.2,`Cellar flight must descend fully: ${qa.get().player.toArray()}`);assert(biggest<.1);assert(qa.get().player.z>CELLAR.bottomZ);assert(Math.abs(qa.get().camera.position.y+2.52)<.03);
  qa.setKeys(['KeyW']);frames(190);qa.setKeys([]);assert.equal(qa.get().player.y,0,'Cellar flight must climb back to grounds');assert(qa.get().player.z<CELLAR.topZ);
  const s=qa.get();s.nav.rebuild(cx,-76,-4.2);assert(s.nav.direction(cx,landing,0).reachable);assert(s.nav.direction(0,20,0).reachable,'Cellar must connect to the entire estate');
  console.log('PASS: wave-10 locked doors, both animated leaves, smooth W/S cellar descent/ascent, camera height and three-floor connectivity.');

  // Actual AI, including quadrupeds, uses the same walkable flight in both directions.
  for(const dog of [false,true]){
    qa.start();qa.setHealth(10000);for(let i=0;i<10;i++)qa.startWave();qa.setPlayer(cx,-81,-4.2);const e=qa.makeZombie(cx,landing,false,dog);e.speed=3;qa.get().nav.rebuild(cx,-81,-4.2);
    for(let i=0;i<650&&e.floorY> -4.19;i++)frames(1);
    assert(e.floorY< -4.19,`Enemy must descend cellar: ${e.walkPos.toArray()}`);assert(e.group.position.y< -4,'Enemy rendering follows negative floor height');
    qa.setPlayer(cx,landing);qa.get().nav.rebuild(cx,landing,0);for(let i=0;i<650&&e.floorY< -.02;i++)frames(1);assert(e.floorY> -.02,`Enemy must climb out of cellar: ${e.walkPos.toArray()}`);
  }
  console.log('PASS: zombies and dogs chase down into the cellar and return to the grounds.');

  qa.start();for(let i=0;i<10;i++)qa.startWave();qa.holdSpawns();qa.setPoints(2500);qa.setPlayer(cx+3.4,-68.4,0);qa.interact();assert.equal(qa.get().armor,0,'No collecting through ceiling');assert.equal(qa.get().points,2500);
  const armor=qa.get().cellar.armor;assert.equal(armor.price,2500);
  qa.setPlayer(cx+3.4,-68.4,-4.2);qa.setPoints(2499);frames(1);assert(elements.get('interaction').innerHTML.includes('2,500 ESSENCE'));qa.interact();assert.equal(qa.get().armor,0);assert.equal(qa.get().points,2499);assert(!armor.used);assert(armor.model.visible);assert.equal(elements.get('toast').textContent,'NEED 1 MORE ESSENCE');
  qa.setPoints(2500);qa.interact();assert.equal(qa.get().points,0);assert.equal(qa.get().armor,100);assert.equal(qa.get().health,100);assert(!armor.used&&armor.nanoModel.visible);assert(!armor.model.visible);assert(!elements.get('armorHud').classList.contains('hidden'));
  qa.hurtPlayer(40);assert.equal(qa.get().armor,60);assert.equal(qa.get().health,100);qa.hurtPlayer(80);assert.equal(qa.get().armor,0);assert.equal(qa.get().health,80,'Damage exceeding shield spills into health');qa.interact();assert.equal(qa.get().armor,0,'Armor cannot be repeatedly refilled');frames(440);assert.equal(qa.get().armor,0,'Base armor does not regenerate without Nano Shield');assert(qa.get().health>80);
  qa.start();qa.setPoints(5000);qa.setPlayer(-3.34,9.5375);qa.interact();for(let i=0;i<10;i++)qa.startWave();qa.setPlayer(cx+3.4,-68.4,-4.2);qa.interact();assert.equal(qa.get().armor,200);assert.equal(qa.get().health,200);assert.equal(qa.get().points,0);
  qa.start();for(let i=0;i<10;i++)qa.startWave();qa.setPoints(2500);qa.setPlayer(cx+3.4,-68.4,-4.2);qa.interact();qa.hurtPlayer(40);qa.setPoints(3000);qa.setPlayer(-3.34,9.5375);qa.interact();assert.equal(qa.get().armorMax,200);assert.equal(qa.get().armor,120,'Ironheart scales remaining armor without refilling depleted protection');
  console.log('PASS: separate armor bar, shield-first damage/overflow, base-tier regeneration lock, ceiling separation and Ironheart compatibility.');

  qa.start();for(let i=0;i<10;i++)qa.startWave();qa.setHealth(10000);qa.setPlayer(cx-3.4,-68.4,-4.2);
  const lmg=qa.get().cellar.weapon,before=qa.get().toSpawn;assert.equal(lmg.price,5000);
  qa.setPoints(4999);frames(1);assert(elements.get('interaction').innerHTML.includes('5,000 ESSENCE'));qa.interact();assert.equal(qa.get().points,4999);assert.equal(qa.get().weapon,'glock');assert(!qa.get().inventory.lmg.owned);assert(!lmg.used);assert(lmg.model.visible);assert.equal(qa.get().frenzyWave,0);assert.equal(qa.get().toSpawn,before,'Denied LMG purchases cannot trigger reinforcements');assert.equal(elements.get('toast').textContent,'NEED 1 MORE ESSENCE');
  qa.setPoints(5000);qa.interact();assert.equal(qa.get().points,0);assert.equal(qa.get().weapon,'lmg');assert(qa.get().inventory.lmg.owned);assert.equal(qa.get().inventory.lmg.ammo,100);assert.equal(qa.get().inventory.lmg.reserve,500);assert.equal(qa.get().frenzyWave,10);assert(qa.get().toSpawn>=before+12);assert(lmg.used);assert(!lmg.model.visible);qa.interact();assert.equal(qa.get().points,0,'LMG cannot charge twice');assert.equal(qa.get().toSpawn,before+18,'LMG cannot retrigger frenzy');
  qa.setPlayer(cx,-76,-4.2);qa.setAim(0,0);frames(1);const target=qa.makeZombie(cx,-80);target.walkPos.y=target.floorY=-4.2;target.group.position.y=-4.22;qa.get().scene.updateMatrixWorld(true);const hp=target.hp;qa.shoot();assert(target.hp<hp,'LMG bullets hit underground targets');assert.equal(qa.get().inventory.lmg.ammo,99);qa.reload();frames(325);assert.equal(qa.get().inventory.lmg.ammo,100);assert.equal(qa.get().inventory.lmg.reserve,499);
  listeners.keydown({code:'Digit1',repeat:false});assert.equal(qa.get().weapon,'glock');listeners.keydown({code:'Digit4',repeat:false});assert.equal(qa.get().weapon,'lmg');qa.openMap();assert(!elements.get('estateMap').classList.contains('hidden'));qa.closeMap();
  qa.startWave();assert.equal(qa.get().frenzyWave,0,'Frenzy must never carry into next wave');
  qa.start();assert.equal(qa.get().armor,0);assert.equal(qa.get().armorMax,0);assert.equal(qa.get().frenzyWave,0);assert(!qa.get().inventory.lmg.owned);assert(!qa.get().cellar.gate.disabled);assert(!qa.get().cellar.weapon.used);assert(qa.get().cellar.weapon.model.visible);
  console.log('PASS: 5,000-essence one-time LMG, insufficient-funds denial, current-wave frenzy/reinforcements, underground shooting, 100-round reload, key 4, cellar map and complete run reset.');

  qa.start();for(let i=0;i<10;i++)qa.startWave();qa.setPlayer(cx,-77,-4.2);frames(1);qa.grenade();frames(26);const grenade=qa.get().effects.find(e=>e.type==='grenade');grenade.vel.set(0,-3,0);grenade.life=10;frames(50);assert(grenade.mesh.position.y>=-4.08-1e-6&&grenade.mesh.position.y<-3.5,'Grenades stay on cellar floor');
  const victim=qa.makeZombie(cx,-77);const aboveHp=victim.hp;qa.get().scene.updateMatrixWorld(true);qa.explode(new T.Vector3(cx,-4,-77));assert.equal(victim.hp,aboveHp,'Cellar ceiling blocks blast damage to ground floor');
  const corpse=qa.makeZombie(cx+2,-77);corpse.walkPos.y=corpse.floorY=-4.2;corpse.group.position.y=-4.22;qa.damageEnemy(corpse,10000);frames(180);for(const p of Object.values(corpse.ragdoll.points))assert(p.p.y>=-4.2+p.radius+.008-1e-6,'Cellar corpses stay above floor');
  console.log('PASS: cellar grenade bounce, blast ceiling separation and corpse floor support.');
  function travel(frenzy){qa.start();qa.startWave();qa.setPlayer(0,23);const e=qa.makeZombie(0,17);e.speed=2;e.flank=0;if(frenzy)qa.triggerFrenzy();qa.holdSpawns();frames(15);return e.walkPos.z-17;}
  const normal=travel(false),fast=travel(true);assert(Math.abs(fast/normal-1.4)<.005,'Frenzy speeds up already living enemies by 40%');
  qa.start();for(let i=0;i<10;i++)qa.startWave();qa.setHealth(10000);qa.setPoints(5000);qa.setPlayer(cx-3.4,-68.4,-4.2);qa.interact();let ticks=0;
  while(qa.get().waveDelay===0&&ticks++<2600){for(const e of qa.get().zombies)if(!e.dead)qa.damageEnemy(e,100000);frames(1);}
  assert(ticks<2600,'The frenzied wave can actually be completed');assert.equal(qa.get().wave,10);assert.equal(qa.get().frenzyWave,0);assert.equal(qa.get().waveDelay,12);assert(!qa.get().curse.pending,'The wave-ten frenzy keeps normal restock time because its bell choice was before wave ten');frames(719);assert.equal(qa.get().wave,10);frames(2);assert.equal(qa.get().wave,11);assert.equal(qa.get().frenzyWave,0);assert(qa.get().inventory.lmg.owned,'LMG persists beyond frenzy');
  console.log('PASS: actual 40% frenzy movement increase, accelerated reinforcement spawning, natural wave completion and normal wave 11.');qa.start();
}
