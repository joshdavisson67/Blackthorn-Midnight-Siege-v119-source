import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {ROTUNDA_BELL,BELL_BUDGET} from '../public/game/rotunda-bell.mjs';
import {BRUTE} from '../public/game/brute.mjs';
import {roomAt} from '../public/game/estate-layout.mjs';
import {isBlocked} from '../public/game/core.mjs';
import {drawStationMarker} from '../public/game/station-models.mjs';

export function verifyRotundaBell(qa,frames,listeners,elements){
  const state=qa.get(),bell=state.rotundaBell,station=bell.station;
  assert.equal(roomAt(ROTUNDA_BELL.x,ROTUNDA_BELL.z).id,'rotunda');
  assert.equal(state.interactables.filter(s=>s.type==='bell').length,0,'The bell is a landmark, not a curse choice (v130)');
  assert.equal(station.y,0);assert.equal(station.price,0);assert(bell.group.parent);
  assert(bell.bodyBounds.getSize(new T.Vector3()).x>2.6,'The bell is a large fixture rather than a small prop');
  assert(bell.bodyBounds.min.y>BRUTE.height,'Large brutes retain headroom under the bell');
  assert(bell.handleBounds.min.y>1&&bell.handleBounds.max.y<1.6,'A standing player can reach the rope loop');
  assert(bell.bounds.max.y>=13.35&&bell.bounds.max.y<=13.42,'Suspension reaches and embeds in the dome apex');
  let meshes=0,triangles=0;bell.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert(o.geometry.attributes.position.array.every(Number.isFinite));assert(o.geometry.attributes.normal.array.every(Number.isFinite));assert(!o.matrixAutoUpdate,'Bell joins the frozen static world');}});
  assert(meshes<=BELL_BUDGET.meshes);assert(triangles<=BELL_BUDGET.triangles);assert.equal(triangles,bell.triangles);
  for(const material of bell.materials)assert(!material.map&&!material.bumpMap&&!material.normalMap,'Bell adds no texture memory');
  const shell=bell.solids.find(o=>o.name==='Hollow bronze bell shell');assert(shell);
  const p=shell.geometry.attributes.position,n=shell.geometry.attributes.normal;
  let exterior=0;
  for(let i=0;i<p.count;i++)if(p.getY(i)>.55&&p.getY(i)<.65&&Math.hypot(p.getX(i),p.getZ(i))>.90){assert(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)>0,'Cast exterior faces outward, rather than vanishing through back-face culling');exterior++;}
  assert(exterior>30);
  state.world.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(ROTUNDA_BELL.x+.13,1.68,ROTUNDA_BELL.z+.07),new T.Vector3(0,1,0));
  assert.equal(ray.intersectObject(shell,false).length,1,'Bell mouth is hollow, with a single inner ceiling rather than a cap at its lip');
  assert(ray.intersectObject(shell,false)[0].point.y>ROTUNDA_BELL.lipY+1.7);

  qa.start();qa.holdSpawns();qa.setPlayer(station.x,station.z+.6);qa.setAim(0,0);frames(2);
  assert(!elements.get('interaction').innerHTML.includes('GREAT ROTUNDA BELL'),'No prompt appears at the rope');
  const snapshot=()=>{const s=qa.get();return {points:s.points,totalScore:s.totalScore,health:s.health,wave:s.wave,toSpawn:s.toSpawn,mode:s.mode,rank:s.curse.rank};};
  const before=snapshot();qa.interact();listeners.keydown({code:'KeyE',repeat:false});listeners.keyup({code:'KeyE'});
  assert.deepEqual(snapshot(),before,'E at the rope does nothing');
  // Standing movement, a real jump and tall enemies all keep the central lane.
  for(const height of [1.8,BRUTE.height])for(let z=ROTUNDA_BELL.z-4;z<=ROTUNDA_BELL.z+4;z+=.25)assert(!isBlocked(ROTUNDA_BELL.x,z,.58,state.colliders,undefined,0,height));
  qa.setPlayer(ROTUNDA_BELL.x,ROTUNDA_BELL.z+3);qa.setAim(0,0);qa.setKeys(['KeyW']);frames(105);qa.setKeys([]);
  assert(qa.get().player.z<ROTUNDA_BELL.z-3,'The real keyboard loop crosses beneath the bell');
  qa.setPlayer(ROTUNDA_BELL.x,ROTUNDA_BELL.z);listeners.keydown({code:'Space',preventDefault(){}});let peak=0;
  for(let i=0;i<70;i++){frames(1);peak=Math.max(peak,qa.get().player.y+1.8);}
  listeners.keyup({code:'Space'});assert(peak<bell.bodyBounds.min.y);assert.equal(qa.get().player.y,0);assert(qa.get().grounded);
  console.log(`PASS: rotunda bell landmark with no interaction, hollow outward-facing shell, dome attachment, clear ground/jump/brute routes, and restart; ${meshes} static meshes / ${triangles} triangles / no new textures or lights.`);qa.start();
}
