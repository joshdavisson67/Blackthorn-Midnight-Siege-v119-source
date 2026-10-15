import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {bakeEnemyPalette} from '../public/game/enemy-assets.mjs';
import {createZombieRig} from '../public/game/zombies.mjs';
import {createZombieDogRig} from '../public/game/zombie-dog.mjs';
import {createEffectPool} from '../public/game/effect-pool.mjs';
import {freezeStaticTransforms,renderCleanFrame} from '../public/game/graphics.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';

export function verifyRenderPerformance(qa,frames){
  // Material merging must retain paint, dirt tint, surface finish and rage tint.
  for(const make of [()=>createZombieRig({rng:()=>.3}),()=>createZombieRig({rng:()=>.3,brute:true}),()=>createZombieRig({rng:()=>.3,feral:true}),()=>createZombieDogRig({rng:()=>.3}),()=>createZombieDogRig({rng:()=>.3,rare:true})]){
    const rig=make(),original=[];
    rig.group.traverse(mesh=>{if(mesh.isMesh){const color=mesh.geometry.attributes.color;original.push({mesh,material:mesh.material,geometry:mesh.geometry,tint:[0,Math.floor(color.count/2),color.count-1].map(i=>[i,color.getX(i),color.getY(i),color.getZ(i)])});}});
    bakeEnemyPalette(rig);
    for(const {mesh,material,geometry,tint} of original){
      if(material.emissive.getHex()!==0){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry);continue;}
      const paint=mesh.geometry.attributes.color,rage=mesh.geometry.attributes.rageColor,finish=mesh.geometry.attributes.surfaceFinish;
      const rageColor=material.color.clone().lerp(new T.Color(0xff3925),.32);
      for(const [i,r,g,b] of tint){
        for(const [actual,expected] of [[paint.getX(i),r*material.color.r],[paint.getY(i),g*material.color.g],[paint.getZ(i),b*material.color.b],[rage.getX(i),r*rageColor.r],[rage.getY(i),g*rageColor.g],[rage.getZ(i),b*rageColor.b],[finish.getX(i),material.roughness],[finish.getY(i),material.metalness]])assert(Math.abs(actual-expected)<1e-6);
      }
      const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
      assert(shader.vertexShader.includes('vSurfaceFinish=surfaceFinish;'));
      assert(shader.fragmentShader.includes('roughnessFactor=mix(vSurfaceFinish.x,0.38,enemySurface.a);')&&shader.fragmentShader.includes('metalnessFactor=vSurfaceFinish.y;'));
      assert(shader.fragmentShader.includes('diffuseColor.rgb = mix( diffuseColor.rgb * enemySurface.rgb, enemySurface.rgb, enemySurface.a );'),'Blood color must survive dark clothing and rage without changing opacity');
    }
    for(const geometry of rig.resources.geometries)geometry.dispose();for(const material of rig.resources.materials)material.dispose();
  }

  const scene=new T.Scene(),world=new T.Group();scene.add(world);
  const fixed=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()),dynamic=new T.Group(),moving=fixed.clone();world.add(fixed,dynamic);dynamic.add(moving);dynamic.userData.dynamic=true;moving.position.set(0,0,2);
  freezeStaticTransforms(scene,world);const unchanged=fixed.matrixWorld.clone();dynamic.rotation.y=Math.PI/2;scene.updateMatrixWorld();
  assert(fixed.matrixWorld.equals(unchanged));assert(moving.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(2,0,0))<1e-6,'Dynamic descendants must still move beside frozen architecture');

  const pool=createEffectPool(world,new T.MeshStandardMaterial(),'particle',4),effects=[];
  for(let i=0;i<4;i++){const effect=pool.acquire();effect.mesh.position.set(i,1,3);effect.mesh.scale.setScalar(.025);effects.push(effect);}
  assert.equal(pool.acquire(),null,'Decorative effects have a fixed allocation budget');pool.sync();assert.equal(pool.instances.count,4);
  const matrix=new T.Matrix4();for(const effect of effects){pool.instances.getMatrixAt(effect.slot,matrix);assert(new T.Vector3().setFromMatrixPosition(matrix).distanceTo(effect.mesh.position)<1e-6);}
  pool.release(effects[2]);assert.equal(pool.acquire(),effects[2],'Freed effect slots are reused');pool.reset();assert.equal(pool.instances.count,0);

  const camera=new T.PerspectiveCamera(),viewCamera=new T.PerspectiveCamera(),postScene=new T.Scene(),postCamera=new T.Camera(),background=new T.Color(0x112233);scene.background=background;
  const renderer={setRenderTarget(){},clear(){},clearDepth(){},render(s,c){if(c===viewCamera){assert.equal(s.matrixWorldAutoUpdate,false);assert.equal(world.visible,false);throw new Error('test view failure');}}};
  assert.throws(()=>renderCleanFrame(renderer,scene,camera,viewCamera,{},postScene,postCamera,true,world),/test view failure/);
  assert.equal(scene.background,background);assert.equal(scene.matrixWorldAutoUpdate,true);assert.equal(world.visible,true,'The next world pass must recover even after a render failure');

  qa.start();qa.setHealth(100000);const state=qa.get(),lighting=[];state.scene.traverseVisible(o=>{if(o.isLight)lighting.push(o.uuid);});
  let pointLights=0;state.scene.traverseVisible(o=>{if(o.isPointLight)pointLights++;});assert.equal(pointLights,9,'One environment pool replaces separate pools for each floor');
  for(const [x,z,y] of [[0,20,0],[-33,-74,0],[21,-7,UPPER_Y]]){
    qa.setPlayer(x,z,y);frames(1);assert(state.environmentLights.lights.some(l=>l.intensity>0),'Every playable floor must retain local light');
    const next=[];state.scene.traverseVisible(o=>{if(o.isLight)next.push(o.uuid);});assert.deepEqual(next,lighting,'Moving between floors must not change the shader light signature');
  }
  for(const template of state.enemyAssets.templates)template.group.traverse(mesh=>{if(mesh.isMesh&&mesh.material.userData.bakedPalette){assert.equal(mesh.geometry.attributes.surfaceFinish.count,mesh.geometry.attributes.position.count);assert.equal(mesh.geometry.attributes.rageColor.count,mesh.geometry.attributes.position.count);}});
  const {map,bumpMap,width,height,gutter,tile,cols,rows}=state.enemyAssets.surfaces;
  assert(width*height*4*2*4/3<=24*1024*1024,'Enemy texture allocation is bounded to one mipmapped atlas pair');
  assert(state.renderer.initializedTextures.has(map)&&state.renderer.initializedTextures.has(bumpMap),'Both surface maps must upload before the game starts');
  for(const template of state.enemyAssets.templates){
    const instance=state.enemyAssets.instantiate({rng:()=>.2,brute:template.brute,dog:template.dog,rareDog:template.rareDog,feral:template.feral});
    state.enemyAssets.enrage(instance);
    instance.group.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.material.userData.bakedPalette)return;
      assert.equal(mesh.material.map,map);assert.equal(mesh.material.bumpMap,bumpMap);assert(mesh.material.depthWrite&&!mesh.material.transparent);
      const uv=mesh.geometry.attributes.uv;
      for(let i=0;i<uv.count;i++){
        const x=uv.getX(i)*width,y=(1-uv.getY(i))*height,localX=x%tile,localY=y%tile;
        assert(x>=0&&x<cols*tile&&y>=0&&y<rows*tile&&localX>=gutter-.001&&localX<=tile-gutter+.001&&localY>=gutter-.001&&localY<=tile-gutter+.001,'Surface UVs must remain inside padded atlas cells to prevent bleeding/flickering');
      }
      const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
      assert(shader.vertexShader.includes('vColor.xyz = rageColor;')&&shader.fragmentShader.includes('diffuseColor.rgb = mix'),'Rage keeps the surface, blood mask and baked paint shader');
    });
  }
  qa.start();qa.setHealth(100000);qa.setPlayer(0,23);const enemy=qa.makeZombie(0,18);qa.damageEnemy(enemy,10000);frames(1);
  assert(state.effects.some(e=>e.type==='particle'&&e.pool===state.bloodPool));assert(state.bloodPool.instances.count>0);frames(45);assert.equal(state.bloodPool.instances.count,0,'Expired blood effects release their instances');
  assert(state.frozenTransforms>0);assert.equal(state.rt.samples,4,'World antialiasing stays enabled');
  console.log('PASS: preserved normal/rage paint and material finish, dynamic transforms beside static geometry, bounded reusable particle instances, render-state recovery, 9 fixed point lights and lighting on both floors.');
}
