import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {weapons} from '../public/game/core.mjs';
import {ceilingAt} from '../public/game/vertical.mjs';
import {CELLAR} from '../public/game/cellar-layout.mjs';
const close=(a,b,message)=>assert(Math.abs(a-b)<1e-7,`${message||'Values differ'} (${a} versus ${b})`);

export function verifySoulForge(qa,frames,listeners,elements){
  const at=s=>qa.setPlayer(s.x+Math.sin(s.rotation||0)*1.6,s.z+Math.cos(s.rotation||0)*1.6,s.y);
  qa.start();qa.startWave();qa.holdSpawns();
  const forges=qa.get().stationBuilder.visuals.filter(v=>v.station.type==='upgrade');
  assert.equal(forges.length,2,'Keep the first-floor forge and relocate the other to the cellar');
  assert.deepEqual(forges.map(v=>v.station.y).sort((a,b)=>a-b),[CELLAR.y,0]);
  const lights=[];qa.get().scene.traverse(o=>{if(o.isLight)lights.push(o.uuid);});
  const snapshots=forges.map(v=>({minY:v.core.position.y,maxY:v.core.position.y,rotation:v.core.rotation.y}));
  for(const v of forges){
    assert(v.core.parent===v.group,'Hovering stone survives static batching on both floors');
    assert(v.parts.some(p=>p.name==='Forged iron anvil'&&p.geometry.type==='ExtrudeGeometry'),'Anvil has a curved waist, flared foot and real beveled shape');
    assert(v.parts.some(p=>p.name==='Tapered anvil horn'));
    assert(!v.parts.some(p=>p.name==='Forge electrode'||p.name==='Induction hoop'),'Old machine silhouette is removed');
    const stone=v.core.getObjectByName('Faceted soul stone');assert(stone&&stone.geometry.type==='OctahedronGeometry');assert(stone.material.emissiveIntensity>1);
    v.core.traverse(o=>assert(o.userData.dynamic,'Every stone component is excluded from static merging'));
  }
  for(let i=0;i<120;i++){
    frames(1);
    for(const [index,v] of forges.entries()){
      snapshots[index].minY=Math.min(snapshots[index].minY,v.core.position.y);
      snapshots[index].maxY=Math.max(snapshots[index].maxY,v.core.position.y);
      const bounds=new T.Box3().setFromObject(v.core),face=v.parts.find(p=>p.name==='Anvil face');
      const faceTop=v.station.y+face.position.y+face.scale.y/2;
      assert(bounds.min.y-faceTop>.1,'Soul stone keeps a visible air gap above the anvil throughout its orbit');
      assert(bounds.max.y<v.station.y+v.station.modelHeight,'Animation stays inside exhibit clearance');
      assert(bounds.max.y<ceilingAt(v.station.x,v.station.z,v.station.y),'The animated soul stone fits below the local ceiling');
    }
  }
  // Two endpoints can have equal height on a working sine-wave animation.
  // Check its observed travel, independent of the phase left by earlier tests.
  forges.forEach((v,i)=>{assert(snapshots[i].maxY-snapshots[i].minY>.03);assert(Math.abs(v.core.rotation.y-snapshots[i].rotation)>.5);});
  const afterLights=[];qa.get().scene.traverse(o=>{if(o.isLight)afterLights.push(o.uuid);});assert.deepEqual(afterLights,lights,'Stone glow adds no changing light membership');

  const baseline=JSON.stringify(weapons),expected={
    glock:[[17,98],[21,122],[26,153]],
    rifle:[[38,225],[47,282],[59,352]],shotgun:[[10,70],[13,88],[16,110]],
    smg:[[50,300],[63,375],[79,469]],lmg:[[125,625],[157,782],[196,977]],
    bushmaster:[[19,113],[24,141],[30,176]]
  },prices=[5000,10000,15000],signCache=qa.get().signage.materials.size;
  for(const v of forges)for(const material of v.station.forgeMaterials)assert(qa.get().renderer.initializedTextures.has(material.map),'Rank finishes upload while the loading screen is active');
  function prepare(type,forgeY=0,quick=false){
    qa.start();qa.startWave();qa.holdSpawns();qa.setPoints(50000);qa.setHealth(10000);
    // Tests use both forge locations; the cellar copy follows the real gate.
    while(qa.get().wave<CELLAR.unlockWave)qa.startWave();qa.holdSpawns();
    if(type==='lmg'){
      while(qa.get().wave<10)qa.startWave();
      const s=qa.get().cellar.weapon;at(s);qa.interact();qa.holdSpawns();
    }else if(type==='rifle'){
      while(qa.get().wave<7)qa.startWave();
      at(qa.get().shed.weapon);qa.interact();qa.holdSpawns();
    }else if(type!=='glock'){
      const s=qa.get().interactables.find(s=>s.type===type&&(s.y===0||type==='bushmaster'));at(s);qa.interact();qa.selectWeapon(type);
    }
    assert.equal(qa.get().weapon,type);assert(qa.get().inventory[type].owned);
    if(quick){const s=qa.get().interactables.find(s=>s.type==='perk'&&s.id==='quick'&&s.y===0);at(s);qa.interact();assert(qa.get().perkOwned.has('quick'));}
    const forge=qa.get().interactables.find(s=>s.type==='upgrade'&&s.y===forgeY);at(forge);
    return forge;
  }
  for(const [index,type] of Object.keys(expected).entries()){
    const quick=index%2===1;prepare(type,0,quick);const inv=qa.get().inventory[type],w=weapons[type];
    inv.ammo=2;inv.reserve=w.reserve-3;
    for(let rank=1;rank<=3;rank++){
      const forge=forges[(index+rank)%2].station;at(forge);frames(1);
      const cost=prices[rank-1],points=qa.get().points,score=qa.get().totalScore,carried=[inv.ammo,inv.reserve];
      assert.equal(forge.price,cost);assert(elements.get('interaction').textContent.includes(cost.toLocaleString()+' ESSENCE'));
      assert(elements.get('interaction').textContent.includes('RANK '+rank+' OF 3'));
      assert(elements.get('interaction').textContent.includes([2,4,6][rank-1]+'× base damage'),'The offer describes the resulting damage, not another doubling');
      for(const v of forges)assert(v.station.forgeMaterials.some(m=>m.userData.sign.text.includes([2,4,6][rank-1]+'× BASE DAMAGE')),'Both forge signs include the resulting rank damage');
      const materials=forges.map(v=>v.station.forgeMaterials.map(m=>m.map));
      qa.setPoints(cost-1);qa.interact();assert.equal(inv.forgeRank,rank-1);assert.equal(qa.get().points,cost-1,'Every rank refuses an unaffordable purchase');
      assert.deepEqual([inv.ammo,inv.reserve],carried);assert(elements.get('toast').textContent.includes('NEED 1 MORE ESSENCE'));
      qa.setPoints(points);qa.interact();assert.equal(inv.forgeRank,rank);assert.equal(qa.get().points,points-cost);
      assert.equal(qa.get().totalScore,score,'Spending at the forge never lowers the leaderboard score');
      assert.deepEqual([inv.ammo,inv.reserve],carried,'Forging keeps carried rounds');
      assert(elements.get('toast').textContent.includes('RANK '+rank+'/3'));
      assert(elements.get('toast').textContent.includes([2,4,6][rank-1]+'× DAMAGE'));
      assert(elements.get('weaponName').textContent.includes('FORGED '+rank+'/3'));
      for(const [i,v] of forges.entries()){
        assert.equal(v.station.forgeRank,rank,'Both forges follow the selected weapon');assert.equal(v.station.price,prices[rank]??0);
        assert.deepEqual(v.station.forgeMaterials.map(m=>m.map),materials[i],'Purchases reuse warmed finishes');
      }
      const [mag,reserve]=expected[type][rank-1];inv.ammo=0;inv.reserve=w.reserve;qa.reload();
      const duration=w.reload*.75**rank*(quick?.5:1);close(qa.get().reloadDuration,duration,'Each rank compounds reload time and Quickhands');
      frames(Math.floor(duration*60)-1);assert.equal(inv.ammo,0,'Ammo transfers after the reload completes');
      frames(3);assert.equal(inv.ammo,mag);assert.equal(inv.reserve,w.reserve-mag);
      qa.reload();assert.equal(qa.get().reloadLeft,0,'A full magazine cannot reload again');
      qa.setPlayer(0,20);inv.ammo=inv.reserve=0;qa.dropPickup(0,20,'ammo');frames(8);assert.deepEqual([inv.ammo,inv.reserve],[0,mag+reserve],'Max Ammo includes a full magazine’s rounds without loading it');
      qa.reload();frames(Math.ceil(duration*60)+1);assert.deepEqual([inv.ammo,inv.reserve],[mag,reserve],'A manual reload leaves both rank capacities full');
      const ammo=qa.get().interactables.find(s=>s.type==='ammo'&&s.y===0);inv.ammo=inv.reserve=0;at(ammo);qa.interact();assert.deepEqual([inv.ammo,inv.reserve],[0,mag+reserve],'Bought ammo preserves the empty magazine at every rank');
      qa.reload();frames(Math.ceil(duration*60)+1);assert.deepEqual([inv.ammo,inv.reserve],[mag,reserve],'Bought ammo leaves full reserves after reloading');
      const other=type==='glock'?'shotgun':'glock';
      if(!qa.get().inventory[other].owned){at(qa.get().interactables.find(s=>s.type===other&&s.y===0));qa.interact();}
      qa.selectWeapon(other);assert.equal(qa.get().weapon,other);qa.selectWeapon(type);assert.equal(inv.forgeRank,rank);assert.deepEqual([inv.ammo,inv.reserve],[mag,reserve]);
      for(const [other,otherInv] of Object.entries(qa.get().inventory))if(other!==type)assert.equal(otherInv.forgeRank,0,'Other weapons keep their own rank');
      assert.equal(JSON.stringify(weapons),baseline);
    }
    const forge=forges[0].station;at(forge);frames(1);
    assert(elements.get('interaction').textContent.includes('MAX RANK'));assert(!elements.get('interaction').textContent.includes('FREE'));
    const before=qa.get(),carried=[inv.ammo,inv.reserve];qa.interact();qa.interact();
    assert.equal(inv.forgeRank,3);assert.equal(qa.get().points,before.points,'A fourth rank cannot charge');assert.equal(qa.get().totalScore,before.totalScore);assert.deepEqual([inv.ammo,inv.reserve],carried);
  }

  // A purchase partway through a reload preserves its progress at every rank.
  prepare('rifle');const inv=qa.get().inventory.rifle;
  for(let rank=1;rank<=3;rank++){
    inv.ammo=0;inv.reserve=200;qa.reload();frames(Math.floor(qa.get().reloadDuration*60*.23));
    const before=qa.get(),remaining=before.reloadLeft,duration=before.reloadDuration;qa.interact();
    close(qa.get().reloadLeft,remaining*.75);close(qa.get().reloadDuration,duration*.75);close(qa.get().reloadLeft/qa.get().reloadDuration,remaining/duration,'Mid-reload rank preserves progress');
    const paused=qa.get().reloadLeft;listeners.keydown({code:'Escape',preventDefault(){}});frames(150);assert.equal(qa.get().reloadLeft,paused);assert.equal(inv.ammo,0);
    elements.get('resume').onclick();frames(Math.ceil(paused*60)+1);assert.equal(inv.ammo,expected.rifle[rank-1][0]);assert.equal(inv.reserve,200-inv.ammo);
  }
  const quick=qa.get().interactables.find(s=>s.type==='perk'&&s.id==='quick'&&s.y===0);at(quick);qa.interact();inv.ammo=0;qa.reload();close(qa.get().reloadDuration,weapons.rifle.reload*.75**3*.5,'Quickhands also stacks when bought after Rank 3');
  frames(40);assert.equal(inv.ammo,59);

  // Switching to another owned weapon reveals its independent rank and cost.
  const shotgun=qa.get().interactables.find(s=>s.type==='shotgun'&&s.y===0);at(shotgun);qa.interact();
  const forge=forges[1].station;at(forge);frames(1);assert.equal(forge.price,5000);qa.interact();assert.equal(qa.get().inventory.shotgun.forgeRank,1);
  qa.selectWeapon('rifle');frames(1);assert(forge.forgeMaximum);assert.equal(qa.get().inventory.rifle.forgeRank,3);
  qa.selectWeapon('shotgun');frames(1);assert.equal(forge.price,10000);assert(!forge.forgeMaximum);

  // Shoot real targets through the raycast path, including pellets and semi-auto.
  function hit(type,rank){
    prepare(type);for(let i=0;i<rank;i++)qa.interact();qa.setPlayer(0,20);qa.setAim(0,0);frames(1);
    qa.setSeed(3711);const target=qa.makeZombie(0,16);target.hp=target.maxHp=100000;qa.get().scene.updateMatrixWorld(true);qa.setSeed(821);qa.shoot();assert(target.hp<100000);return 100000-target.hp;
  }
  const normal=hit('rifle',0);for(const rank of [1,2,3])close(hit('rifle',rank),normal*[2,4,6][rank-1],'Rifle damage reaches the requested multiplier at each rank');
  for(const type of ['glock','shotgun','smg','lmg','bushmaster'])close(hit(type,3),hit(type,0)*6,type+' Rank 3 applies to its real shots');
  assert.equal(qa.get().signage.materials.size,signCache,'Ranks, switches and restarts create no textures');
  qa.start();for(const inv of Object.values(qa.get().inventory))assert.equal(inv.forgeRank,0);
  assert.deepEqual([qa.get().inventory.glock.ammo,qa.get().inventory.glock.reserve],[13,78]);assert(!qa.get().inventory.rifle.owned);
  for(const v of forges){assert.equal(v.station.price,5000);assert(!v.station.forgeMaximum);}
  console.log('PASS: both accessible animated forges, three per-weapon ranks, 5,000/10,000/15,000 costs, unaffordable/max-rank guards, shared cross-floor progress, unchanged earned score; all 18 weapon/rank ammo and reload combinations, 2×/4×/6× actual shots, matching offers/signs/notifications, Quickhands, partial reloads/pause, independent switches, warmed labels and fresh-run reset.');
}
