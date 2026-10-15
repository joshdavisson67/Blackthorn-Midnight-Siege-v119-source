import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {GRENADE_THROW,createGrenadeAssets,createGrenadeThrow} from '../public/game/grenade-throw.mjs';
import {isBlocked} from '../public/game/core.mjs';

export function verifyGrenadeThrows(qa,frames,listeners,elements){
  const assets=createGrenadeAssets(),releasePoints=[];
  for(const fps of [30,60,144]){
    const camera=new T.PerspectiveCamera(75,16/9,.09,240),motion=createGrenadeThrow(assets);camera.position.set(7,3.2,12);camera.rotation.set(.2,.8,0);camera.add(motion.root);
    assert(!motion.root.visible);assert(motion.begin());assert(!motion.begin());let releases=0;
    for(let i=0;i<Math.ceil(GRENADE_THROW.duration*fps)+2;i++){
      motion.update(1/fps,(p,q,lag)=>{
        releases++;assert(p.distanceTo(motion.held.getWorldPosition(new T.Vector3()))<1e-7,'Release uses the actual animated hand grenade');
        assert(Math.abs(q.dot(motion.held.getWorldQuaternion(new T.Quaternion())))>1-1e-7);assert(lag>=0&&lag<=1/fps+1e-7);releasePoints.push(p);
      });
      assert(Math.abs(motion.shoulder.distanceTo(motion.elbow)-motion.upperLength)<1e-7,'Upper arm stays connected without stretching');
      assert(Math.abs(motion.elbow.distanceTo(motion.wrist)-motion.foreLength)<1e-7,'Forearm stays connected without stretching');
      motion.root.traverse(o=>assert(o.position.toArray().concat(o.quaternion.toArray(),o.scale.toArray()).every(Number.isFinite)));
    }
    assert.equal(releases,1);assert(!motion.active&&!motion.root.visible&&!motion.held.visible);
    const first=[],second=[];assets.create().traverse(o=>{if(o.isMesh)first.push(o);});assets.create().traverse(o=>{if(o.isMesh)second.push(o);});
    first.forEach((o,i)=>{assert(o.geometry===second[i].geometry,'Repeated grenades reuse the same geometry');assert(o.material===second[i].material,'Repeated grenades reuse the same materials');});
  }
  assert(releasePoints.every(p=>p.distanceTo(releasePoints[0])<1e-7),'Release origin is independent of frame rate');

  qa.start();qa.holdSpawns();frames(1);const state=qa.get(),ammo=state.inventory.glock.ammo;
  listeners.keydown({code:'KeyG'});assert(state.grenadeThrow.active&&state.grenadeThrow.root.visible&&state.grenadeThrow.held.visible);assert.equal(qa.get().grenades,2);
  for(let i=0;i<20;i++){listeners.keydown({code:'KeyG',repeat:i%2===0});qa.grenade();qa.shoot();}
  assert.equal(qa.get().grenades,2,'A single throw cannot consume multiple grenades');assert.equal(state.inventory.glock.ammo,ammo,'Gun cannot fire while the throwing hand is occupied');
  frames(12);assert(qa.get().gunRoot.position.y<-.40,'The floating gun lowers during the windup');assert.equal(qa.get().effects.filter(e=>e.type==='grenade').length,0,'There is no projectile before hand release');
  const time=state.grenadeThrow.time,hand=state.grenadeThrow.hand.getWorldPosition(new T.Vector3());document.exitPointerLock();frames(90);
  assert.equal(state.grenadeThrow.time,time);assert(state.grenadeThrow.hand.getWorldPosition(new T.Vector3()).distanceTo(hand)<1e-7);assert.equal(qa.get().effects.filter(e=>e.type==='grenade').length,0);
  elements.get('resume').onclick();frames(14);const thrown=qa.get().effects.find(e=>e.type==='grenade');assert(thrown,'Resume finishes the pending windup');assert(!state.grenadeThrow.held.visible);
  const forward=new T.Vector3(0,0,-1).applyQuaternion(state.camera.quaternion),offset=thrown.mesh.position.clone().sub(state.camera.position);
  assert(offset.dot(forward)>.5&&offset.x>.03,'Grenade starts ahead of the player at the throwing hand, rather than in the chest');assert(thrown.life>1.62,'The fuse begins at release');
  const position=thrown.mesh.position.clone(),life=thrown.life;document.exitPointerLock();frames(90);assert(thrown.mesh.position.distanceTo(position)<1e-7);assert.equal(thrown.life,life);elements.get('resume').onclick();
  frames(27);assert(!state.grenadeThrow.active&&!state.grenadeThrow.root.visible);qa.shoot();assert.equal(state.inventory.glock.ammo,ammo-1,'Normal gun use returns after the follow-through');
  assert(qa.grenade(),'Ordinary grenades remain ready when their animation finishes');assert.equal(qa.get().grenadeCooldown,0,'Recovery applies only to infinite grenades');

  for(const fps of [30,60,144]){
    qa.start();qa.holdSpawns();qa.setAim(1.13,.24);frames(1,1000/fps);assert(qa.grenade());
    while(!qa.get().effects.some(e=>e.type==='grenade'))frames(1,1000/fps);
    const s=qa.get(),e=s.effects.find(e=>e.type==='grenade'),direction=new T.Vector3(0,.23,-1).applyQuaternion(s.camera.quaternion).normalize();
    assert(e.vel.clone().setY(e.vel.y+9*(1.65-e.life)).normalize().dot(direction)>.9999,'Projectile follows the current camera aim at release');
    assert(e.mesh.position.distanceTo(s.camera.position)>.5);assert.equal(s.grenades,2);
  }

  qa.start();qa.holdSpawns();qa.setPlayer(8.6,12.70);frames(1);qa.grenade();frames(26);
  const byWall=qa.get().effects.find(e=>e.type==='grenade');assert(byWall.mesh.position.z>12.38,'A throw beside the real mansion wall releases on the player side');assert(!isBlocked(byWall.mesh.position.x,byWall.mesh.position.z,.10,qa.get().colliders,undefined,byWall.mesh.position.y-.10,.20));

  qa.start();qa.grenade();frames(10);qa.hurtPlayer(10000);assert(!qa.get().grenadeThrow.active&&!qa.get().grenadeThrow.root.visible);frames(60);assert.equal(qa.get().effects.filter(e=>e.type==='grenade').length,0,'Death cancels a grenade still in the hand');
  qa.start();qa.grenade();frames(10);qa.start();frames(60);assert.equal(qa.get().grenades,3);assert.equal(qa.get().effects.filter(e=>e.type==='grenade').length,0);assert(!qa.get().grenadeThrow.root.visible,'Restart clears the arm and pending release');
  console.log('PASS: connected throwing arm at 30/60/144 FPS, exact hand release, shared grenade model, windup/follow-through, input suppression, paused animation/fuse, camera aim, safe wall release, death and restart.');qa.start();
}

export function verifyGrenadeBlastDamage(qa,elements){
  const types=[
    ['walker',false,false,false,false],['brute',true,false,false,false],
    ['dog',false,true,false,false],['Ashfang',false,true,true,false],['feral',false,false,false,true]
  ];
  // The low burst height matches a settled grenade. Keep targets at the same
  // height to test exact radial boundaries, without AI movement between hits.
  const origin=new T.Vector3(0,.12,24);
  for(const [type,brute,dog,rareDog,feral] of types){
    for(const [distance,expected] of [[0,450],[4.5,450],[8.999,450],[9,450],[9.001,225],[10.5,225],[11.999,225],[12,0],[12.001,0]]){
      qa.start();qa.holdSpawns();qa.setPlayer(0,34);
      const target=qa.makeZombie(distance,24,brute,dog,rareDog,.12,feral);
      target.group.position.y=origin.y;target.hp=target.maxHp=10000;qa.get().scene.updateMatrixWorld(true);
      qa.explode(origin);assert.equal(10000-target.hp,expected,`${type} at ${distance}m takes the correct damage`);
      assert(!target.dead);assert.equal(qa.get().kills,0);
      const blast=qa.get().effects.find(e=>e.type==='blast');
      assert.equal(blast.life,.35);assert.equal(blast.mesh.material.opacity,.75);
      assert.equal(blast.mesh.geometry.parameters.radius,1);assert.deepEqual(blast.mesh.scale.toArray(),[.3,.3,.3]);
    }
  }
  for(const distance of [4,10.5]){
    qa.start();qa.holdSpawns();qa.setPlayer(0,34);
    const blocked=qa.makeZombie(8.6,14.5-distance);blocked.hp=10000;
    qa.get().scene.updateMatrixWorld(true);qa.explode(new T.Vector3(8.6,.12,14.5));
    assert.equal(blocked.hp,10000,'The mansion wall blocks both full and half damage');
  }
  // A grenade keeps its body-kill bounty and cannot reward the same corpse twice.
  qa.start();qa.holdSpawns();qa.setPlayer(0,34);
  const victim=qa.makeZombie(10.5,24,false,false,false,.12);victim.group.position.y=origin.y;victim.hp=225;
  qa.get().scene.updateMatrixWorld(true);qa.explode(origin);assert(victim.dead);assert.equal(qa.get().kills,1);
  const score=qa.get().totalScore;assert.equal(score,60,'Grenade body kills keep the 10-point hit and 50-point kill rewards');qa.explode(origin);assert.equal(qa.get().kills,1);assert.equal(qa.get().totalScore,score);
  // Preserve the existing close-range self damage.
  qa.start();qa.holdSpawns();qa.setPlayer(0,24);qa.get().scene.updateMatrixWorld(true);
  qa.explode(origin);assert.equal(qa.get().health,75);
  assert(elements.get('guideSupplies').textContent.includes('outer 25%'));
  console.log('PASS: 45 actual grenade hits cover full/half/no damage and the exact 9m/12m boundaries for all five enemy types; wall blocking, retained explosion geometry/lifetime, body-kill rewards, corpse exclusion and close-range self damage.');
  qa.start();
}
