import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {animateZombie,beginZombieDeath,updateZombieDeath} from '../public/game/zombies.mjs';
import {animateZombieDog} from '../public/game/zombie-dog.mjs';

function eyeCenters(rig){
  rig.group.updateMatrixWorld(true);
  const inverse=rig.head.matrixWorld.clone().invert(),points=[[],[]];
  rig.head.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.material.userData.enemyEyes)return;
    const transform=inverse.clone().multiply(mesh.matrixWorld),p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(transform);
      points[v.x>0?1:0].push(v);
    }
  });
  return points.map(side=>{assert(side.length>0,`${rig.style} needs two eyes`);return new T.Box3().setFromPoints(side).getCenter(new T.Vector3());});
}

function visibleEyes(rig){
  for(const center of eyeCenters(rig))for(const yaw of [-.35,0,.35])for(const pitch of [-.08,0,.08]){
    const target=rig.head.localToWorld(center.clone()),offset=new T.Vector3(Math.sin(yaw),pitch,Math.cos(yaw));
    const origin=rig.head.localToWorld(center.clone().add(offset));
    const ray=new T.Raycaster(origin,target.clone().sub(origin).normalize());
    const first=ray.intersectObject(rig.head,true)[0];
    assert(first?.object.material.userData.enemyEyes,`${rig.style}: brow/skull must not hide an eye at ${yaw},${pitch}`);
  }
}

export function verifyFaces(qa){
  qa.start();const assets=qa.get().enemyAssets,eyeMaterials=new Set();
  for(let i=0;i<assets.templates.length;i++){
    const template=assets.templates[i],options={rng:()=>i<4?(i+.2)/4:i>=5&&i<8?(i-5+.2)/3:.3,brute:template.brute,dog:template.dog,rareDog:template.rareDog,feral:template.feral};
    const rig=assets.instantiate(options);rig.speed=2;rig.attack=1;
    let draws=0,triangles=0,lights=0;
    rig.group.traverse(o=>{
      if(o.isLight)lights++;
      if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
      if(o.material.userData.enemyEyes){
        const m=o.material;eyeMaterials.add(m);
        assert(m.emissive.r>40*Math.max(m.emissive.g,m.emissive.b),'Eyes emit red light at full intensity');
        assert(m.emissiveIntensity>=2&&!m.transparent&&m.depthTest,'The red glow is bright and correctly occluded by world geometry');
        const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
        assert(shader.vertexShader.includes('vEyeUv=uv;')&&shader.fragmentShader.includes('exp(-dot(irisOffset,irisOffset))'),'Glowing iris cores use a finite falloff on both sides of the pupil');
      }
    });
    assert.equal(lights,0,'Enemy eyes must not add shader lights');
    assert(draws<=24&&triangles<40000,`${rig.style} exceeds the warmed model budget: ${draws}/${triangles}`);
    visibleEyes(rig);
    const animate=rig.dog?animateZombieDog:animateZombie;
    for(let j=0;j<30;j++)animate(rig,1/60,5,.026);
    visibleEyes(rig);
    rig.attack=0;for(let j=0;j<20;j++)animate(rig,1/60,1,0);
    visibleEyes(rig);
    const before=[];rig.head.traverse(o=>{if(o.isMesh&&o.material.userData.enemyEyes)before.push(o.material);});
    assets.enrage(rig);const after=[];rig.head.traverse(o=>{if(o.isMesh&&o.material.userData.enemyEyes)after.push(o.material);});
    assert.deepEqual(after,before,'Blood Rage must not dim or replace the glowing eyes');visibleEyes(rig);
    beginZombieDeath(rig,{direction:new T.Vector3(0,0,-1),part:'head'},()=>.4);
    for(let j=0;j<30;j++)updateZombieDeath(rig,1/60);
    visibleEyes(rig);
    assert(template.head.parent,'Death cannot alter the cached face');
  }
  assert.equal(eyeMaterials.size,10,'All ten cached designs reuse their own warmed eye material');
  console.log('PASS: all ten faces have visible red eyes through idle/walk/attack/rage/ragdoll poses; armored skulls/brows do not hide them, rage preserves their glow, and batched draw/light/triangle budgets remain bounded.');
}
