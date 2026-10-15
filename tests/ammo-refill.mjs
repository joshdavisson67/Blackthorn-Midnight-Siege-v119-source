import assert from 'node:assert/strict';
import {weapons} from '../public/game/core.mjs';
import {forgeBonuses} from '../public/game/soul-forge.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyAmmoRefills(qa,frames,listeners,elements){
  const start=()=>{qa.start();qa.startWave();qa.holdSpawns();qa.setHealth(100000);qa.setAim(0,0);qa.setKeys([]);};
  const at=s=>qa.setPlayer(s.x+Math.sin(s.rotation||0)*1.6,s.z+Math.cos(s.rotation||0)*1.6,s.y);
  const press=code=>listeners.keydown({code,repeat:false,preventDefault(){}});
  const capacity=(type,rank)=>{const multiplier=forgeBonuses(rank).ammoMultiplier;return [Math.ceil(weapons[type].mag*multiplier),Math.ceil(weapons[type].reserve*multiplier)];};
  const stations=()=>qa.get().interactables.filter(s=>s.type==='ammo');
  function collect(){qa.setPlayer(0,20);qa.dropPickup(0,20,'ammo');frames(1);}
  function purchase(s){at(s);qa.setPoints(s.price+17);const score=qa.get().totalScore;press('KeyE');assert.equal(qa.get().points,17);assert.equal(qa.get().totalScore,score,'Buying ammo preserves earned leaderboard score');}
  start();let cases=0;
  for(const [index,type] of Object.keys(weapons).entries())for(const rank of [0,1,2,3]){
    const inv=qa.get().inventory[type];inv.owned=true;inv.forgeRank=rank;qa.selectWeapon(type);
    const [mag,reserve]=capacity(type,rank),fps=[30,60,144][(index+rank)%3],ms=1000/fps;
    // Empty, deterministically varied partial, and full magazines cover the
    // states that previously lost rounds or bypassed a normal reload.
    const partial=1+(index*17+rank*11)%(mag-1);
    for(const loaded of [0,partial,mag])for(const source of ['pickup','purchase']){
      inv.ammo=loaded;inv.reserve=0;const label=`${source}, ${type}, forge ${rank}, ${loaded} loaded, ${fps} FPS`;
      if(source==='pickup')collect();else purchase(stations()[(index+rank)%stations().length]);
      assert.equal(inv.ammo,loaded,label+' keeps the magazine unchanged');
      assert.equal(inv.ammo+inv.reserve,mag+reserve,label+' supplies the complete carrying capacity');
      assert.equal(qa.get().reloadLeft,0,label+' does not start a reload');
      // Waiting after collection also cannot silently load an empty/partial clip.
      frames(Math.ceil(fps*.12),ms);assert.equal(inv.ammo,loaded,label+' waits for reload input');
      press('KeyR');const duration=qa.get().reloadDuration;
      if(loaded<mag){
        assert(qa.get().reloadLeft>0,label+' allows the normal manual reload');
        frames(Math.max(1,Math.floor(duration*fps*.2)),ms);assert.equal(inv.ammo,loaded,label+' does not transfer rounds early');
        frames(Math.ceil(duration*fps),ms);
      }else assert.equal(qa.get().reloadLeft,0,'A full magazine does not need a reload');
      assert.deepEqual([inv.ammo,inv.reserve],[mag,reserve],label+' leaves magazine and reserve 100% full');
      cases++;
    }
  }
  assert.equal(qa.get().grenades,4,'Repeated refills keep the existing grenade cap');
  console.log(`PASS: ${cases} pickup/purchase/manual-reload cases preserve empty, partial and full magazines for all six weapons and four forge states at 30/60/144 Hz.`);

  start();const inventory=qa.get().inventory,locked=structuredClone(Object.fromEntries(Object.entries(inventory).filter(([,inv])=>!inv.owned)));
  inventory.glock.ammo=4;inventory.glock.reserve=2;qa.setGrenades(0);collect();
  assert.equal(qa.get().grenades,1);assert.deepEqual([inventory.glock.ammo,inventory.glock.reserve],[4,87]);
  collect();assert.equal(qa.get().grenades,2);assert.deepEqual([inventory.glock.ammo,inventory.glock.reserve],[4,87],'Repeated refills cannot accumulate extra reload rounds');
  for(const [type,before] of Object.entries(locked))assert.deepEqual(inventory[type],before,'Refills never alter or unlock an unowned weapon');
  qa.shoot();assert.equal(inventory.glock.ammo,3);press('KeyR');frames(120);
  assert.deepEqual([inventory.glock.ammo,inventory.glock.reserve],[13,77],'A round fired after restocking is still spent after reloading');
  for(const [i,type] of Object.keys(weapons).entries()){
    const inv=inventory[type],[mag]=capacity(type,i%4);inv.owned=true;inv.forgeRank=i%4;inv.ammo=i%(mag-1);inv.reserve=1;
  }
  const carried=Object.fromEntries(Object.entries(inventory).map(([type,inv])=>[type,inv.ammo]));collect();
  for(const [type,inv] of Object.entries(inventory)){
    assert.equal(inv.ammo,carried[type],'One pickup preserves every owned magazine');
    const [mag,reserve]=capacity(type,inv.forgeRank),loaded=inv.ammo;assert.equal(loaded+inv.reserve,mag+reserve,'One pickup replenishes each weapon using its own capacity');
    qa.selectWeapon(type);press('KeyR');frames(Math.ceil(qa.get().reloadDuration*60)+1);assert.deepEqual([inv.ammo,inv.reserve],[mag,reserve]);
  }
  console.log('PASS: repeated refill allowances do not stack; locked weapons stay untouched, post-refill firing spends ammo, grenades remain capped and one pickup restocks differently forged inventory.');

  // A refill during a reload must preserve its timer, animation and progress bar.
  for(const source of ['pickup','purchase']){
    start();const inv=qa.get().inventory.glock;inv.ammo=5;inv.reserve=1;press('KeyR');frames(15);
    const before=qa.get().reloadLeft,duration=qa.get().reloadDuration;
    if(source==='pickup')collect();else purchase(stations().find(s=>s.y===UPPER_Y));
    assert.equal(inv.ammo,5,'A mid-reload refill never transfers rounds');
    assert.equal(inv.ammo+inv.reserve,91);assert.equal(qa.get().reloadDuration,duration);
    assert(qa.get().reloadLeft>0&&Math.abs(qa.get().reloadLeft-before)<=1/60+.001,'The existing reload continues without a restart, cancellation or shortcut');
    assert(!elements.get('reloadProgress').classList.contains('hidden'));
    document.exitPointerLock();const paused=qa.get().reloadLeft;frames(90);assert.equal(qa.get().reloadLeft,paused);
    elements.get('resume').onclick();frames(Math.ceil(paused*60)+1);
    assert.deepEqual([inv.ammo,inv.reserve],[13,78]);assert(elements.get('reloadProgress').classList.contains('hidden'));
  }
  start();const s=stations()[0],inv=qa.get().inventory.glock;inv.ammo=2;inv.reserve=0;
  at(s);qa.setPoints(s.price-1);press('KeyE');assert.deepEqual([inv.ammo,inv.reserve],[2,0],'An unaffordable refill cannot supply ammunition');
  qa.setPlayer(0,20);qa.dropPickup(0,20,'ammo',UPPER_Y);frames(1);assert.deepEqual([inv.ammo,inv.reserve],[2,0],'Ammo cannot be picked up through a floor');
  assert(elements.get('guideSupplies').textContent.includes('magazine unchanged'));
  console.log('PASS: pickup and upstairs purchase preserve mid-reload progress and pause/resume, with affordability/floor guards and updated field-guide guidance.');
  qa.start();
}
