import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {EASTER_EGG} from '../public/game/olivia.mjs';
import {OLIVIA_ATTIC as A} from '../public/game/vertical.mjs';
import {BELLA} from '../public/game/bella.mjs';

// The Olivia Easter egg (v131): bone chips from Bella's kills open the attic,
// and Olivia turns Bella into a fire-breathing rat dragon.
export function verifyOliviaEasterEgg(qa,frames,listeners,elements){
  const st=()=>qa.get(),bella=st().bella,S=A.stair;
  qa.start();qa.holdSpawns();qa.setHealth(1e6);frames(2);
  assert(st().attic.station.secret,'Olivia is a secret: no map or radar marker');
  assert.equal(qa.atticRoute(S.x,S.bottomZ+.6,4.3,true),null,'The attic is unreachable while sealed');
  assert.equal(st().attic.progress,0);assert(!st().attic.treads.some(t=>t.visible),'The stairs are folded away');

  // ---- Bone chips drop only from Bella's kills ---------------------------------------
  bella.unlock();frames(60);
  const shot=qa.makeZombie(-20,20);qa.damageEnemy(shot,1e6,false,{source:'glock',part:'torso'});
  assert(!st().pickups.some(p=>p.type==='bone'),'Your own kills drop no bone chips');
  const bitten=qa.makeZombie(-20,22);qa.damageEnemy(bitten,1e6,false,{source:'Bella',part:'leg'});
  const chip=st().pickups.find(p=>p.type==='bone');assert(chip,'Bella’s kills drop a bone chip');
  assert(chip.mesh.userData.model,'The chip spins like other pickups');
  qa.setPlayer(chip.mesh.position.x,chip.mesh.position.z);frames(2);
  assert.equal(st().boneChips,1,'Walking over a chip collects it');assert(!st().pickups.includes(chip));
  assert.equal(elements.get('boneHud').textContent,'BONE CHIPS · 1/25');assert(!elements.get('boneHud').classList.contains('hidden'));
  assert(elements.get('toast').textContent.startsWith('BONE CHIP · 1/25'));
  for(let i=1;i<EASTER_EGG.chips-1;i++)qa.collectBoneChip();
  assert.equal(st().boneChips,24);assert(!st().atticState.opening,'Twenty-four chips are not enough');

  // ---- The 25th chip opens the attic -----------------------------------------------------
  qa.collectBoneChip();assert(st().atticState.opening);assert(elements.get('banner').textContent.includes('A HATCH OPENS ABOVE BELLA’S KENNEL'));
  frames(Math.ceil(EASTER_EGG.openTime*60)+2);
  assert(st().atticState.open&&st().attic.progress===1);assert(st().attic.treads.every(t=>t.visible),'Every tread has dropped into place');
  assert(Math.abs(st().attic.hatch.rotation.x-Math.PI/2)<1e-6,'The hatch hangs open');
  assert.equal(elements.get('boneHud').textContent,'BONE CHIPS · 25/25 · THE ATTIC IS OPEN');
  const treadTop=st().attic.treads[st().attic.treads.length-1].position;assert(treadTop.z<S.bottomZ&&treadTop.y>S.baseY,'Treads climb toward the hatch');

  // ---- Climb the pull-down stairs with the keyboard -------------------------------------------
  qa.setPlayer(S.x,S.bottomZ+.7,4.3);qa.setAim(0,0);qa.setKeys(['KeyW']);
  let peak=0;for(let i=0;i<150;i++){frames(1);peak=Math.max(peak,st().player.y);}
  qa.setKeys([]);
  assert(Math.abs(st().player.y-A.y)<1e-6,`The stairs lead up into the attic (${st().player.y.toFixed(2)})`);
  assert(st().player.z<S.topZ,'and out onto the attic floor');
  // Bella follows you up.
  for(let i=0;i<60*8&&Math.abs(bella.pos.y-A.y)>.05;i++)frames(1);
  assert(Math.abs(bella.pos.y-A.y)<.05,'Bella climbs up after you');

  // ---- Olivia ------------------------------------------------------------------------------------
  const o=st().attic.station;qa.setPlayer(o.x,o.z,o.y);frames(2);
  assert(elements.get('interaction').innerHTML.includes('OLIVIA'));assert(elements.get('interaction').innerHTML.includes('25/25 BONE CHIPS'));
  const tail=bella.rig.tail.children;
  assert(!bella.dragon&&bella.dragonParts.parts.every(p=>!p.visible));
  qa.interact();
  assert(bella.dragon,'Olivia turns Bella into a rat dragon');assert.equal(st().boneChips,0,'She takes the 25 chips');
  assert(bella.dragonParts.wings.length===2&&bella.dragonParts.wings.every(w=>w.pivot.visible),'Bella has dragon wings');
  assert(bella.dragonParts.tailRoot.visible&&bella.dragonParts.segments.length>=6,'and a dragon tail');assert(tail.every(m=>!m.visible),'which replaces her curly tail');
  assert(elements.get('banner').textContent.includes('BELLA THE RAT DRAGON'));assert(st().oliviaCheer>0,'Olivia cheers');
  frames(1);assert(elements.get('boneHud').classList.contains('hidden'));assert(elements.get('interaction').innerHTML.includes('RAT DRAGON'));
  qa.interact();assert(elements.get('toast').textContent.includes('LOOKS SO COOL'));
  // Wings beat and the tail sways as she moves.
  const before=bella.dragonParts.wings[0].pivot.rotation.z;frames(10);assert.notEqual(bella.dragonParts.wings[0].pivot.rotation.z,before);

  // ---- Fire breath ----------------------------------------------------------------------------------
  qa.setPlayer(-36,-6,4.3);for(let i=0;i<60*8&&Math.abs(bella.pos.y-4.3)>.05;i++)frames(1);
  assert(Math.abs(bella.pos.y-4.3)<.05,'Bella follows you back down');
  const victim=qa.makeZombie(bella.pos.x+2.4,bella.pos.z,false,false,false,4.3);victim.speed=0;victim.hp=victim.maxHp=1e5;
  let breathed=false;for(let i=0;i<120&&!breathed;i++){qa.setHealth(1e6);frames(1);breathed=bella.breath>=0;}
  assert(breathed,'A rat dragon breathes fire at nearby undead');
  frames(30);assert(bella.flames.active>10,'Flames pour from her mouth');assert(victim.hp<1e5,'The fire burns');
  assert.equal(bella.activity,'BREATHING FIRE');
  const dps=(40+7*st().wave)*BELLA.fire.pulse;
  // Walls stop the fire.
  const behind=qa.makeZombie(-26.5,-6,false,false,false,4.3);behind.speed=0;const hp=behind.hp;
  qa.bellaBreath(new T.Vector3(-29.6,4.75,-6),new T.Vector3(1,0,0),BELLA.fire.range,BELLA.fire.angle);assert.equal(behind.hp,hp,'Fire does not pass through walls');
  const open=qa.makeZombie(-31,-6,false,false,false,4.3);open.speed=0;const ohp=open.hp;
  qa.bellaBreath(new T.Vector3(-33,4.75,-6),new T.Vector3(1,0,0),BELLA.fire.range,BELLA.fire.angle);assert(Math.abs(ohp-open.hp-dps)<1e-6,`Each pulse burns for ${dps}`);
  const aside=qa.makeZombie(-33,-3.5,false,false,false,4.3);aside.speed=0;const ahp=aside.hp;
  qa.bellaBreath(new T.Vector3(-33,4.75,-6),new T.Vector3(1,0,0),BELLA.fire.range,BELLA.fire.angle);assert.equal(aside.hp,ahp,'Only the cone burns');
  for(const e of [victim,behind,open,aside])qa.damageEnemy(e,1e9,false,{source:'Bella'});
  assert(!st().pickups.some(p=>p.type==='bone'),'A rat dragon’s kills no longer drop chips');

  // ---- Undead follow you up; brutes cannot fit -------------------------------------------------------
  qa.setPlayer(o.x,o.z,o.y);bella.reset();
  const climber=qa.makeZombie(-36,-6,false,false,false,4.3),brute=qa.makeZombie(-38,-4,true,false,false,4.3);
  for(let i=0;i<60*20&&climber.walkPos.y<A.y-.05;i++){qa.setHealth(1e6);frames(1);}
  assert(Math.abs(climber.walkPos.y-A.y)<.05,'Walkers climb into the attic after you');
  assert(brute.walkPos.y<4.5,'Brutes are too tall for the attic stairs');
  qa.damageEnemy(climber,1e9);qa.damageEnemy(brute,1e9);

  // ---- A new run seals everything again --------------------------------------------------------------
  qa.start();
  assert.equal(st().boneChips,0);assert(!st().atticState.open&&st().attic.progress===0);assert(!bella.dragon);
  assert(bella.dragonParts.parts.every(p=>!p.visible)&&tail.every(m=>m.visible));
  assert.equal(qa.atticRoute(S.x,S.bottomZ+.6,4.3,true),null);
  qa.setPlayer(S.x,S.bottomZ+.7,4.3);qa.setAim(0,0);qa.setKeys(['KeyW']);frames(90);qa.setKeys([]);
  assert.equal(st().player.y,4.3,'Sealed, there is nothing to climb');
  qa.start();
  console.log(`PASS: Olivia Easter egg — bone chips only from Bella’s kills, a HUD tally, the 25th chip opening the hatch and dropping ${S.steps} treads, keyboard climb into the attic with Bella following, Olivia’s 25-chip upgrade to a winged, dragon-tailed rat dragon, cone fire at ${dps} per pulse that stops at walls, no chips afterwards, walkers climbing after you while brutes can’t, and a sealed attic on every new run.`);
}
