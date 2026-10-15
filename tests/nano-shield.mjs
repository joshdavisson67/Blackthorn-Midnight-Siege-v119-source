import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {UPPER_Y} from '../public/game/vertical.mjs';
import {isBlocked,waveConfig} from '../public/game/core.mjs';

export function verifyNanoShield(qa,frames,elements){
  const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-7,`${message}: ${actual} / ${expected}`);
  qa.start();const stations=qa.get().interactables.filter(s=>s.type==='armor');
  const upper=stations.find(s=>s.y===UPPER_Y),cellar=stations.find(s=>s.y<0);
  assert.equal(stations.length,2);
  const assets=new Set();
  for(const s of stations){
    for(const [i,model] of s.nanoModels.entries()){
      let draws=0;model.traverse(o=>{assert(o.userData.dynamic&&o.userData.collectible);if(o.isMesh){draws++;assets.add(o.geometry);assets.add(o.material);}});
      assert.equal(draws,i===2?4:3,'Ranks reuse three finishes, with one extra mesh for Rank 3 rays');
      assert(model.parent&&!model.visible,'All ranks stay hidden before Aegis');
    }
    const colors=[];s.nanoRank2Model.traverse(o=>{if(o.isMesh)colors.push(o.material.color.getHex());});
    assert(colors.includes(0xffc868),'Rank 2 uses the prebuilt gold emitter finish');
    const rays=s.nanoRank3Model.getObjectByName('Rank 3 gold rays');
    assert(rays?.isMesh,'Rank 3 includes visible gold-ray geometry');
    assert.equal(rays.geometry.attributes.position.count/3,24,'Gold rays stay within a 24-triangle budget');
    assert(rays.material.isMeshBasicMaterial&&rays.material.vertexColors&&rays.material.blending===T.AdditiveBlending);
    assert(rays.material.depthTest&&!rays.material.depthWrite&&!rays.castShadow&&!rays.receiveShadow,'Gold rays respect solid walls without shadow passes');
    assert(!rays.material.map,'Gold rays require no new texture');
    let lights=0;s.nanoRank3Model.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0,'Rank 3 adds no dynamic lights');
  }
  const at=s=>{const distance=s.y<0?1.4:1.6,rotation=s.rotation??(s.y<0?Math.PI:0);qa.setPlayer(s.x+Math.sin(rotation)*distance,s.z+Math.cos(rotation)*distance,s.y);};
  function prepare(first=upper){
    qa.start();for(let i=0;i<10;i++)qa.startWave();qa.holdSpawns();qa.setPoints(7500);at(first);qa.interact();
    assert.equal(qa.get().armorTier,1);assert.equal(qa.get().points,5000);assert.equal(qa.get().armor,100);
    for(const s of stations){assert.equal(s.price,5000);assert.equal(s.name,'NANO SHIELD RANK 1');assert(!s.used&&!s.model.visible&&s.nanoModel.visible&&!s.nanoRank2Model.visible&&!s.nanoRank3Model.visible);}
  }

  // Either vest unlocks the upgrade at both original locations, with floor/gate
  // guards and exact costs. Buying it adds the mechanic, not an instant refill.
  for(const first of stations){
    prepare(first);qa.hurtPlayer(30);qa.setPoints(4999);frames(1,50);
    assert(elements.get('interaction').innerHTML.includes('NANO SHIELD'));
    assert(elements.get('interaction').innerHTML.includes('5,000 ESSENCE'));
    qa.interact();assert.equal(qa.get().points,4999);assert.equal(qa.get().armorTier,1);assert.equal(qa.get().armor,70);
    qa.setPoints(5000);qa.setPlayer(first.x,first.z,first.y===UPPER_Y?0:UPPER_Y);qa.interact();
    assert.equal(qa.get().points,5000,'Wrong-floor upgrade attempts cannot charge essence');
    const second=first===upper?cellar:upper;at(second);qa.interact();
    assert.equal(qa.get().points,0);assert.equal(qa.get().armorTier,2);assert.equal(qa.get().armor,70);assert.equal(qa.get().armorMax,100);
    assert.equal(elements.get('armorLabel').textContent,'NANO SHIELD RANK 1');assert(elements.get('armorHud').classList.contains('nano'));
    for(const s of stations){assert(!s.used&&!s.model.visible&&!s.nanoModel.visible&&s.nanoRank2Model.visible);assert.equal(s.price,7500);assert.equal(s.name,'NANO SHIELD RANK 2');}
    qa.setPoints(7499);frames(1,50);assert(elements.get('interaction').innerHTML.includes('7,500 ESSENCE'));
    assert(elements.get('interaction').innerHTML.includes('10 shield/s after 3s'));
    qa.interact();assert.equal(qa.get().points,7499);assert.equal(qa.get().armorTier,2);near(qa.get().armor,70,'An unaffordable Rank 2 cannot refill or replace Rank 1');
    qa.setPoints(7500);qa.setPlayer(first.x,first.z,first.y===UPPER_Y?0:UPPER_Y);qa.interact();
    assert.equal(qa.get().points,7500,'Rank 2 cannot be bought through another floor');
    at(first);qa.interact();assert.equal(qa.get().points,0);assert.equal(qa.get().armorTier,3);near(qa.get().armor,70,'Rank 2 keeps the current shield');assert.equal(qa.get().armorMax,100);
    assert.equal(elements.get('armorLabel').textContent,'NANO SHIELD RANK 2');assert(elements.get('armorHud').classList.contains('nanoRank2'));
    qa.setPoints(19999);for(const s of stations){assert(!s.used&&!s.model.visible&&!s.nanoModel.visible&&!s.nanoRank2Model.visible&&s.nanoRank3Model.visible);assert.equal(s.name,'NANO SHIELD RANK 3');assert.equal(s.price,20000);at(s);qa.interact();}
    assert.equal(qa.get().points,19999,'An unaffordable Rank 3 cannot charge or fall through to a nearby perk');assert.equal(qa.get().armorTier,3);
    qa.setPoints(20000);qa.setPlayer(first.x,first.z,first.y===UPPER_Y?0:UPPER_Y);qa.interact();assert.equal(qa.get().points,20000,'Rank 3 cannot be bought through another floor');
    at(second);qa.interact();assert.equal(qa.get().points,0);assert.equal(qa.get().armorTier,4);near(qa.get().armor,70,'Rank 3 preserves the remaining shield rather than instantly refilling');assert.equal(qa.get().armorMax,100);
    assert.equal(elements.get('armorLabel').textContent,'NANO SHIELD RANK 3');assert(elements.get('armorHud').classList.contains('nanoRank3'));assert(!elements.get('armorHud').classList.contains('nanoRank2'));
    qa.setPoints(100000);for(const s of stations){assert(s.used&&!s.model.visible&&s.nanoModels.every(m=>!m.visible));at(s);qa.interact();}
    assert.equal(qa.get().points,100000,'Maximum-rank attempts cannot charge, refill, or fall through to a nearby perk');assert.equal(qa.get().armorTier,4);
    assert.equal(elements.get('toast').textContent,'NANO SHIELD RANK 3 IS ALREADY ACTIVE');
  }
  prepare();qa.setPlayer(cellar.x,cellar.z,0);qa.interact();assert.equal(qa.get().armorTier,1);
  qa.start();qa.startWave();qa.holdSpawns();qa.setPoints(7500);at(upper);qa.interact();at(cellar);qa.interact();
  assert.equal(qa.get().armorTier,1);assert.equal(qa.get().points,5000,'Locked cellar still blocks the upgrade before wave 10');
  at(upper);qa.interact();assert.equal(qa.get().armorTier,2,'The same location sells both tiers');
  qa.setPlayer(0,24);qa.hurtPlayer(50);const hitAt=qa.get().lastHurt;
  frames(99,50);near(qa.get().runTime-hitAt,4.95,'Delay advances in gameplay seconds');near(qa.get().armor,50,'No early regeneration');
  frames(1,50);near(qa.get().armor,50,'Five-second boundary does not credit a whole extra frame');
  frames(20,50);near(qa.get().armor,55,'One second restores exactly five shield');
  assert(elements.get('armorStatus').textContent.includes('RECHARGING'));
  qa.hurtPlayer(10);near(qa.get().armor,45,'A hit during recharge consumes shield');assert.equal(qa.get().health,100,'Fully absorbed hits still reset recharge');
  frames(99,50);near(qa.get().armor,45,'New hit restarts the entire delay');frames(21,50);near(qa.get().armor,50,'Interrupted regeneration resumes at five per second');

  // A depleted shield recovers, pause freezes both delay and recovery, and the
  // bar never exceeds its capacity. Overflow keeps the ordinary health rules.
  qa.hurtPlayer(70);near(qa.get().armor,0,'Shield depletes');near(qa.get().health,80,'Excess damage reaches health');
  frames(40,50);const paused=qa.get();qa.openMap();frames(160,50);
  near(qa.get().runTime,paused.runTime,'Pause does not advance recovery time');near(qa.get().armor,0,'Pause cannot recharge armor');qa.closeMap();
  frames(80,50);near(qa.get().armor,5,'Remaining delay continues after resume');
  const charging=qa.get();qa.openMap();frames(160,50);near(qa.get().armor,charging.armor,'Active recovery also pauses');qa.closeMap();
  frames(420,50);near(qa.get().armor,100,'Recovery caps at full shield');assert.equal(elements.get('armorStatus').textContent,'FULL SHIELD');
  qa.hurtPlayer(10);frames(100,50);near(qa.get().armor,90,'Hits against full shield restart delay too');

  for(const fps of [30,60,120]){
    prepare();qa.interact();qa.setPlayer(0,24);qa.hurtPlayer(50);frames(fps*6,1000/fps);
    near(qa.get().armor,55,`Recharge rate is stable at ${fps} FPS`);
  }
  prepare();qa.interact();qa.setPlayer(-3.34,9.5375);qa.setPoints(2500);qa.hurtPlayer(40);qa.interact();
  assert.equal(qa.get().armorMax,200);near(qa.get().armor,120,'Ironheart scales current Nano Shield protection');assert.equal(qa.get().armorTier,2);
  qa.setPlayer(0,24);frames(120,50);near(qa.get().armor,125,'Ironheart does not change the five-per-second rate');frames(400,50);near(qa.get().armor,200,'Nano Shield fills the Ironheart capacity');
  qa.hurtPlayer(10000);assert.equal(qa.get().mode,'dead');const deadArmor=qa.get().armor;frames(200,50);near(qa.get().armor,deadArmor,'Dead runs never regenerate');

  // Rank 2 inherits shield capacity and the last-hit timer, then uses its own
  // exact delay/rate, including a fractional frame crossing the threshold.
  function prepareRank2(){prepare();qa.interact();qa.setPoints(7500);qa.interact();assert.equal(qa.get().armorTier,3);qa.setPlayer(0,24);}
  prepareRank2();qa.hurtPlayer(50);const rank2Hit=qa.get().lastHurt;
  frames(59,50);near(qa.get().runTime-rank2Hit,2.95,'Rank 2 waits three gameplay seconds');near(qa.get().armor,50,'Rank 2 cannot regenerate early');
  frames(1,50);near(qa.get().armor,50,'Exact three-second boundary does not credit an extra frame');frames(20,50);near(qa.get().armor,60,'Rank 2 restores exactly ten shield in one second');
  assert(elements.get('armorStatus').textContent.includes('10 SHIELD/S'));
  qa.hurtPlayer(10);near(qa.get().armor,50,'Fully absorbed hits stop Rank 2 recharge');assert.equal(qa.get().health,100);frames(60,50);near(qa.get().armor,50,'Every hit restarts the full three-second delay');frames(20,50);near(qa.get().armor,60,'Interrupted Rank 2 resumes at ten per second');
  qa.hurtPlayer(80);near(qa.get().armor,0,'Rank 2 can be depleted');near(qa.get().health,80,'Rank 2 keeps normal shield overflow');
  frames(20,50);const rank2Paused=qa.get();qa.openMap();frames(160,50);near(qa.get().runTime,rank2Paused.runTime,'Rank 2 delay pauses with gameplay');near(qa.get().armor,0,'Rank 2 cannot recover during pause');qa.closeMap();
  frames(60,50);near(qa.get().armor,10,'Rank 2 recovers from zero after its remaining delay');const rank2Charging=qa.get().armor;qa.openMap();frames(160,50);near(qa.get().armor,rank2Charging,'Rank 2 active recharge pauses');qa.closeMap();frames(300,50);near(qa.get().armor,100,'Rank 2 caps at full shield');
  qa.hurtPlayer(10);frames(60,50);near(qa.get().armor,90,'A hit against full Rank 2 armor restarts the delay');
  for(const fps of [30,60,120]){prepareRank2();qa.hurtPlayer(50);frames(fps*4,1000/fps);near(qa.get().armor,60,`Rank 2 rate is stable at ${fps} FPS`);}
  prepareRank2();qa.hurtPlayer(50);frames(59,50);frames(1,30);frames(1,50);near(qa.get().armor,50.3,'Only the part of a frame after the three-second boundary regenerates');
  prepare();qa.interact();qa.setPlayer(0,24);qa.hurtPlayer(50);frames(80,50);at(upper);qa.setPoints(7500);qa.interact();near(qa.get().armor,50,'Buying Rank 2 after four seconds adds no instant refill');qa.setPlayer(0,24);frames(1,50);near(qa.get().armor,50.5,'Rank 2 uses elapsed time since the last hit without starting a new purchase delay');
  prepareRank2();qa.hurtPlayer(40);qa.setPlayer(-3.34,9.5375);qa.setPoints(2500);qa.interact();assert.equal(qa.get().armorMax,200);near(qa.get().armor,120,'Ironheart scales Rank 2 remaining shield');assert.equal(qa.get().armorTier,3);
  qa.setPlayer(0,24);frames(80,50);near(qa.get().armor,130,'Ironheart preserves Rank 2 rate');frames(300,50);near(qa.get().armor,200,'Rank 2 fills the larger capacity');
  qa.hurtPlayer(10000);assert.equal(qa.get().mode,'dead');frames(200,50);near(qa.get().armor,0,'Dead Rank 2 runs cannot recharge');
  qa.start();qa.startWave();qa.holdSpawns();qa.setPoints(15000);at(upper);qa.interact();qa.interact();at(cellar);qa.interact();assert.equal(qa.get().armorTier,2);assert.equal(qa.get().points,7500,'The cellar wave gate also protects Rank 2');at(upper);qa.interact();assert.equal(qa.get().armorTier,3);assert.equal(qa.get().points,0,'The upper station sells Rank 2 before the cellar unlocks');

  // Rank 3 has no last-hit window: it restores shield every playing frame,
  // including zero shield and repeated absorbed hits. Purchases keep capacity.
  function prepareRank3(){prepareRank2();at(upper);qa.setPoints(20000);const earned=qa.get().totalScore;qa.interact();assert.equal(qa.get().armorTier,4);assert.equal(qa.get().totalScore,earned,'Purchasing Rank 3 does not alter earned leaderboard score');qa.setPlayer(0,24);}
  prepareRank3();qa.hurtPlayer(50);frames(1,50);near(qa.get().armor,50.75,'Rank 3 starts in the first frame after damage');frames(19,50);near(qa.get().armor,65,'Rank 3 restores fifteen shield in exactly one second');
  assert(elements.get('armorStatus').textContent.includes('CONTINUOUS · 15 SHIELD/S'));
  for(let i=0;i<20;i++){qa.hurtPlayer(.5);frames(1,50);}near(qa.get().armor,70,'Repeated hits do not interrupt Rank 3 regeneration');near(qa.get().health,100,'Absorbed hits retain separate health');
  qa.hurtPlayer(90);near(qa.get().armor,0,'Rank 3 can deplete');near(qa.get().health,80,'Rank 3 keeps normal damage overflow');frames(1,50);near(qa.get().armor,.75,'Depleted Rank 3 regenerates immediately');
  const rank3Paused=qa.get();qa.openMap();frames(160,50);near(qa.get().runTime,rank3Paused.runTime,'Rank 3 respects pause');near(qa.get().armor,rank3Paused.armor,'Continuous regeneration stops while paused');qa.closeMap();frames(20,50);near(qa.get().armor,15.75,'Rank 3 resumes at fifteen per second');
  frames(200,50);near(qa.get().armor,100,'Rank 3 cannot overfill shield');assert.equal(elements.get('armorStatus').textContent,'FULL SHIELD');
  prepareRank3();qa.hurtPlayer(50);const attacker=qa.makeZombie(0,22.8);attacker.attackTime=.32;attacker.attack=1;frames(1,50);
  near(qa.get().lastHurt,qa.get().runTime,'The zombie lands a real hit inside the simulation frame');
  near(qa.get().armor,Math.max(0,50-waveConfig(qa.get().wave).damage)+.75,'Rank 3 regenerates even in the same frame as a zombie hit');
  for(const fps of [30,60,120]){prepareRank3();qa.hurtPlayer(50);frames(fps,1000/fps);near(qa.get().armor,65,`Rank 3 rate is stable at ${fps} FPS`);}
  prepareRank3();qa.hurtPlayer(50);frames(1,30);near(qa.get().armor,50.45,'Rank 3 credits the actual fractional frame');
  qa.setPlayer(-3.34,9.5375);qa.setPoints(2500);qa.interact();assert.equal(qa.get().armorMax,200);near(qa.get().armor,100.9,'Ironheart scales Rank 3 remaining shield');qa.setPlayer(0,24);frames(20,50);near(qa.get().armor,115.9,'Ironheart keeps the fifteen-per-second rate');frames(200,50);near(qa.get().armor,200,'Rank 3 fills the larger capacity');
  qa.hurtPlayer(10000);assert.equal(qa.get().mode,'dead');frames(200,50);near(qa.get().armor,0,'Rank 3 cannot resurrect shield after death');
  qa.start();qa.startWave();qa.holdSpawns();qa.setPoints(35000);at(upper);qa.interact();qa.interact();qa.interact();at(cellar);qa.interact();assert.equal(qa.get().armorTier,3);assert.equal(qa.get().points,20000,'Rank 3 respects the locked cellar gate');at(upper);frames(1,50);assert(elements.get('interaction').innerHTML.includes('20,000 ESSENCE'));assert(elements.get('interaction').innerHTML.includes('15 shield/s continuously'));qa.interact();assert.equal(qa.get().armorTier,4);assert.equal(qa.get().points,0,'Upstairs sells Rank 3 before the cellar unlocks');

  qa.start();qa.startWave();qa.holdSpawns();assert.equal(qa.get().armorTier,0);assert.equal(qa.get().armorMax,0);
  for(const s of stations){assert.equal(s.price,2500);assert(!s.used&&s.model.visible&&s.nanoModels.every(m=>!m.visible));for(const model of s.nanoModels)model.traverse(o=>{if(o.isMesh){assert(assets.has(o.geometry));assert(assets.has(o.material));}});}
  assert.equal(elements.get('armorLabel').textContent,'AEGIS SHIELD');assert(elements.get('armorStatus').classList.contains('hidden'));
  assert(!elements.get('armorHud').classList.contains('nanoRank2'),'Fresh runs clear the Rank 2 HUD finish');
  assert(!elements.get('armorHud').classList.contains('nanoRank3'),'Fresh runs clear the Rank 3 HUD finish');
  qa.setPoints(2500);at(upper);qa.interact();qa.hurtPlayer(100);qa.setPlayer(0,24);frames(300,50);near(qa.get().armor,0,'Base armor stays nonregenerating');
  qa.get().scene.updateMatrixWorld(true);
  for(const s of stations){
    for(const model of s.nanoModels){const bounds=new T.Box3().setFromObject(model);assert(bounds.min.y>=s.y&&bounds.max.y<s.y+(s.y<0?2:2.3),'All rank emitters and rays fit the original exhibit collision volume');}
    assert(!isBlocked(s.x,s.z+(s.y<0?-1.4:1.6),.32,qa.get().colliders,undefined,s.y),'Upgrade leaves purchase approaches open');
  }
  assert(elements.get('guideBody').textContent.includes('Nano Shield Rank 2 · 7,500 essence'));
  assert(elements.get('guideBody').textContent.includes('Nano Shield Rank 3 · 20,000 essence'));
  console.log('PASS: both original armor stations, 2,500/5,000/7,500/20,000 costs and rank unlocks, duplicate/floor/wave guards; all three rates/delays across FPS/partial frames, uninterrupted Rank 3 combat recovery, zero/pause/death/reset, Ironheart, prebuilt gold rays and bounded cached emitters.');
  qa.start();
}
