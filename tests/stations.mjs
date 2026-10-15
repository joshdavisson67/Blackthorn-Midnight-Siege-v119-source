import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {isBlocked} from '../public/game/core.mjs';
import {UPPER_Y,UPPER_CEILING,STAIR,moveActor} from '../public/game/vertical.mjs';
export function verifyStations(qa,frames,elements){
  const front=s=>({x:s.x+Math.sin(s.rotation||0)*1.6,z:s.z+Math.cos(s.rotation||0)*1.6});
  const at=(s,y=s.y)=>{const p=front(s);qa.setPlayer(p.x,p.z,y);};
  qa.start();const state=qa.get(),upper=state.interactables.filter(s=>s.y===UPPER_Y);
  assert.equal(upper.filter(s=>s.type==='perk').length,4);
  assert.equal(upper.filter(s=>s.type==='powerup').length,2);
  for(const type of ['shotgun','smg','bushmaster'])assert(upper.some(s=>s.type===type));
  assert(!upper.some(s=>s.type==='upgrade'),'The upstairs forge has moved to the storm cellar');
  assert.equal(upper.filter(s=>s.type==='ammo').length,2);
  assert.equal(upper.filter(s=>s.type==='armor').length,1);
  const kinds=new Set(state.stationBuilder.visuals.map(v=>v.station.modelKind));assert.equal(kinds.size,12,'Perks, weapons, ammunition, armor, timed powers and forge each need a model theme');
  const titles=state.stationBuilder.visuals.map(v=>v.parts.map(p=>p.name).join('|')).join('|');
  for(const part of ['Heart lobe','Quick-change magazine','Deadeye target','Wing feather','Ribbed pump','Extended magazine','Cartridge','Pull ring','Raised numeral 2','Anvil face','Armor plate'])assert(titles.includes(part),`Missing themed exhibit: ${part}`);
  state.nav.rebuild(STAIR.x,-10.5,UPPER_Y);
  for(const s of upper){
    const approach=front(s),p=new T.Vector3(approach.x,s.y,approach.z);
    assert(!isBlocked(p.x,p.z,.32,state.colliders,undefined,p.y),`${s.name} must have a clear purchase approach`);
    assert(state.nav.direction(p.x,p.z,p.y).reachable,`${s.name} connects to stairs`);
    let steps=0;while(p.distanceTo(new T.Vector3(STAIR.x,UPPER_Y,-10.5))>.8&&steps++<3000){const d=state.nav.direction(p.x,p.z,p.y),v=new T.Vector2(d.x-p.x,d.z-p.z).normalize().multiplyScalar(.055);moveActor(p,v.x,v.y,state.colliders,{allowFall:false,radius:.32});}
    assert(steps<3000,`${s.name} has a physically walkable purchase route`);
    assert(s.y+s.modelHeight<UPPER_CEILING,'Exhibits fit below the raised ceiling');
  }
  for(const s of state.interactables.filter(s=>s.type==='powerup'&&s.y===0)){const p=front(s);assert(!isBlocked(p.x,p.z,.32,state.colliders),`${s.name} ground-floor approach is clear`);}
  for(const s of upper){
    qa.start();qa.setPoints(10000);at(s);if(s.type==='ammo')qa.get().inventory.glock.reserve=0;const purchasePrice=s.price;qa.interact();assert.equal(qa.get().points,10000-purchasePrice,`${s.name} must be purchasable upstairs`);
    const now=qa.get();if(s.type==='perk'){assert(now.perkOwned.has(s.id));if(s.id==='iron')assert.equal(now.maxHealth,200);qa.interact();assert.equal(qa.get().points,10000-s.price,'Duplicate perk copies cannot stack or charge twice');}
    if(s.type==='shotgun'||s.type==='smg'||s.type==='bushmaster')assert(now.inventory[s.type].owned);
    if(s.type==='upgrade')assert(now.inventory.glock.forgeRank===1);
    if(s.type==='ammo')assert(now.inventory.glock.reserve>0);
    if(s.type==='powerup')assert.equal(s.power==='double'?now.doubleTime:now.grenadeTime,s.power==='double'?20:12);
    if(s.type==='armor'){assert.equal(now.armor,100);assert.equal(now.armorTier,1);assert(!s.used);assert(!s.model.visible);assert(s.nanoModel.visible);}
  }
  qa.start();const armor=upper.find(s=>s.type==='armor');
  assert.equal(armor.price,2500);
  qa.start();qa.holdSpawns();qa.setPoints(2500);at(armor,0);qa.interact();
  assert.equal(qa.get().armor,0);assert(!armor.used,'Upstairs armor cannot be collected through the floor');
  assert.equal(qa.get().points,2500,'Wrong-floor interactions cannot charge essence');
  assert(armor.model.parent,'Collectible armor survives static batching');armor.model.traverse(o=>assert(o.userData.dynamic));
  at(armor);qa.setPoints(2499);frames(1);
  assert(elements.get('interaction').innerHTML.includes('2,500 ESSENCE'));
  qa.interact();assert.equal(qa.get().points,2499);assert.equal(qa.get().armor,0);assert(!armor.used);assert(armor.model.visible);assert.equal(elements.get('toast').textContent,'NEED 1 MORE ESSENCE');
  qa.setPoints(2500);qa.interact();
  assert.equal(qa.get().armor,100);assert.equal(qa.get().armorMax,100);assert.equal(qa.get().health,100);assert.equal(qa.get().points,0,'The vest costs exactly 2,500 essence');
  assert(!elements.get('armorHud').classList.contains('hidden'));
  qa.hurtPlayer(40);qa.interact();assert.equal(qa.get().armor,60,'One vest cannot be repeatedly refilled');assert.equal(qa.get().health,100);
  assert.equal(qa.get().points,0,'A used vest cannot charge again');
  qa.hurtPlayer(100);assert.equal(qa.get().armor,0);assert.equal(qa.get().health,60,'Damage exceeding the shield reaches health');
  qa.start();assert(!armor.used);assert(armor.model.visible);assert.equal(qa.get().armor,0,'Fresh runs restore the vest without granting armor immediately');
  qa.setPoints(10000);qa.setPlayer(-3.34,9.5375);qa.interact();assert.equal(qa.get().points,7500);at(armor);qa.interact();assert.equal(qa.get().points,5000);
  assert.equal(qa.get().armor,200,'Upstairs armor supports Ironheart');qa.hurtPlayer(40);
  const cellarArmor=qa.get().cellar.armor;assert(!cellarArmor.used&&cellarArmor.nanoModel.visible,'First armor purchase unlocks Nano Shield in the cellar');
  for(let i=0;i<10;i++)qa.startWave();qa.holdSpawns();qa.setPlayer(cellarArmor.x,cellarArmor.z-1.4,cellarArmor.y);qa.interact();
  assert.equal(qa.get().armor,160);assert.equal(qa.get().armorMax,200,'Nano Shield preserves remaining protection and capacity');assert.equal(qa.get().armorTier,2);assert(!cellarArmor.used&&!armor.used&&cellarArmor.nanoRank2Model.visible&&armor.nanoRank2Model.visible);assert.equal(qa.get().points,0,'Rank 1 costs 5,000 essence and unlocks Rank 2 at both stations');
  qa.start();assert(!armor.used);assert(armor.model.visible);assert(!cellarArmor.used);
  const shrine=upper.find(s=>s.type==='powerup');qa.start();qa.setPoints(0);at(shrine);qa.interact();assert.equal(qa.get().doubleTime,0);assert.equal(qa.get().grenadeTime,0);assert.equal(qa.get().points,0);
  qa.setPoints(10000);at(shrine,0);qa.interact();assert.equal(qa.get().points,10000,'Cannot activate an upper shrine through the floor');
  at(shrine);qa.openMap();assert(!elements.get('estateMap').classList.contains('hidden'));qa.closeMap();
  console.log(`PASS: ${kinds.size} themed station models; all ${upper.length} upstairs stations have walkable approaches, working purchases, non-stacking perks, floor checks and map access.`);
}
