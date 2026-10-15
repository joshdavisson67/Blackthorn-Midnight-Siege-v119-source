// Repeatable CPU-only benchmark. The shared harness models Three scene updates; it does not measure browser/GPU FPS.
import {qa,frames,listeners,elements} from './harness.mjs';
import * as T from '../public/game/three.module.js';
function stats(a){a.sort((a,b)=>a-b);return {median:+a[Math.floor(a.length*.5)].toFixed(3),p95:+a[Math.floor(a.length*.95)].toFixed(3),max:+a.at(-1).toFixed(3)}}
const samples={},counts={};
function setup(){qa.start();qa.holdSpawns();qa.setSeed(443);qa.setHealth(1000000);qa.setPlayer(0,20);for(let i=0;i<32;i++)qa.makeZombie(-20+i%8*5,12+Math.floor(i/8)*3,i%7===0,i%5===0,i%11===0,0,i%13===0);frames(1);}
function measure(key,n,fn,prepare=()=>{}){const times=[];for(let i=0;i<n;i++){prepare(i);const start=performance.now();fn(i);times.push(performance.now()-start);}samples[key]=stats(times)}
setup();const s=qa.get();s.scene.traverse(o=>{if(o.isMesh){counts.meshes=(counts.meshes||0)+1;counts.triangles=(counts.triangles||0)+(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}if(o.isLight&&o.visible)counts[o.type]=(counts[o.type]||0)+1});counts.enemyMeshes=0;for(const e of s.zombies)e.group.traverse(o=>{if(o.isMesh)counts.enemyMeshes++});counts.colliders=s.colliders.length;
frames(30);measure('live32',360,()=>frames(1));
setup();for(const e of qa.get().zombies.slice(0,14))qa.damageEnemy(e,10000);measure('corpses14',120,()=>frames(1));
setup();qa.setAim(Math.PI,0);qa.setPoints(10000);qa.get().inventory.shotgun.owned=true;qa.selectWeapon('shotgun');measure('shotgun',120,()=>qa.shoot(),()=>{frames(80);qa.get().inventory.shotgun.ammo=100;});
qa.start();qa.holdSpawns();measure('navigation',120,i=>qa.get().nav.rebuild(i%20,18,0));
qa.start();qa.holdSpawns();measure('spawn',64,i=>qa.makeZombie(-20+i%8*4,12+Math.floor(i/8)*2,i%7===0,i%5===0));
console.log('PROFILE',JSON.stringify({counts,samples}));
