import assert from 'node:assert/strict';
import * as T from '../public/game/three.module.js';
import {LIGHT_BUDGET} from '../public/game/lighting.mjs';
import {UPPER_Y} from '../public/game/vertical.mjs';
import {CELLAR} from '../public/game/cellar-layout.mjs';

export function verifyLighting(qa,frames,listeners,elements){
  qa.start();qa.holdSpawns();qa.setHealth(1000000);qa.setPlayer(0,20);frames(20);
  const s=qa.get(),{lighting,environmentLights,combatLights,renderer}=s;
  assert.equal(environmentLights.lights.length,LIGHT_BUDGET.environment);
  assert.equal(combatLights.lights.length,LIGHT_BUDGET.combat);
  const signature=()=>{const out=[];s.scene.traverseVisible(o=>{if(o.isLight)out.push([o.uuid,o.type,o.castShadow,o.layers.mask]);});return out;};
  const originalSignature=signature();
  for(const light of [...environmentLights.lights,...combatLights.lights]){
    assert(light.visible&&light.castShadow);assert.equal(light.shadow.autoUpdate,false);
    assert(light.shadow.normalBias+28*Math.abs(light.shadow.bias)<.01,'Bias must be smaller than thin floor/wall panels');
  }
  assert(s.flashlight.castShadow&&s.moonlight.castShadow);
  assert(environmentLights.sources.filter(source=>source.light).every(source=>!source.light.visible&&!source.light.castShadow),'The chandelier participates in the same cached pool');
  assert.equal(s.scene.environment.name,'soft-ambient-reflections');
  assert(s.scene.environment.images.every(face=>face.width===64&&face.height===64));

  // Real Three geometry: no collision proxy can stand in for a floor or roof.
  s.world.updateMatrixWorld(true);const casters=[];
  s.world.traverseVisible(o=>{if(o.isMesh&&o.castShadow)casters.push(o);});
  const rays=[
    ['upstairs floor',[-10,2,-8],[-10,5.9,-8],true],
    ['library wall',[-4,2,-7],[-7,2,-7],true],
    ['wing wall',[-24,2,-34],[-24,2,-39],true],
    ['rear ceiling',[0,4.8,-50],[0,8,-50],true],
    ['cellar roof',[CELLAR.x,-1.6,CELLAR.z+1],[CELLAR.x,1.7,CELLAR.z+1],true],
    ['mausoleum roof',[70,2,-15],[70,6,-15],true],
    ['entrance',[0,2,11],[0,2,13],false],
    ['interior doorway',[0,2,-35],[0,2,-37],false],
    ['upstairs doorway',[21,5.6,-1.5],[21,5.6,-2.5],false],
    ['clear window pane',[-19.4,5.6,11],[-19.4,5.6,13],false],
    ['atrium',[0,2,1],[0,5.5,1],false]
  ];
  for(const [name,a,b,blocked] of rays){
    const origin=new T.Vector3(...a),delta=new T.Vector3(...b).sub(origin),length=delta.length();
    const hits=new T.Raycaster(origin,delta.normalize(),.015,length-.015).intersectObjects(casters,false);
    assert.equal(hits.length>0,blocked,name+' must have the correct architectural occlusion');
  }
  for(const object of casters)if(object.material.isMeshStandardMaterial){assert.equal(object.material.shadowSide,T.DoubleSide);assert(object.material.userData.estateLighting);}

  const basic=casters.find(o=>o.material.isMeshStandardMaterial).material;
  for(const shaderType of ['standard','physical']){
    const shader={vertexShader:T.ShaderLib[shaderType].vertexShader,fragmentShader:T.ShaderLib[shaderType].fragmentShader};basic.onBeforeCompile(shader);
    assert(!shader.vertexShader.includes('vPointShadowCoord')&&!shader.fragmentShader.includes('vPointShadowCoord'),'Point shadows must not consume eight extra varyings');
    assert.equal((shader.fragmentShader.match(/estatePointCompare\(shadowMap,shadowMapSize,direction/g)||[]).length,4);
    const branch=shader.fragmentShader.slice(shader.fragmentShader.indexOf('getPointLightInfo('),shader.fragmentShader.indexOf('#if ( NUM_SPOT_LIGHTS'));
    assert(branch.indexOf('directLight.color *=')<branch.indexOf('RE_Direct('),'Occlusion must block both diffuse lighting and direct reflections');
    assert(shader.fragmentShader.includes('geometryPosition - pointLight.position')&&shader.fragmentShader.includes('* viewMatrix'));
    assert(shader.fragmentShader.includes('nonPerturbedNormal * pointLightShadow.shadowNormalBias'),'Bump-map detail cannot move the shadow receiver into the wall or ground');
    assert(shader.fragmentShader.includes('estateDepthGradient(shadowCoord.xyz)')&&shader.fragmentShader.includes('floor(uv*atlasSize)'),'All lamp, moon and flashlight samples compensate for the receiving plane at texel centers');
  }
  for(const rig of s.enemyAssets.templates){
    const normal=rig.group.clone(true),rage=rig.group.clone(true);s.enemyAssets.enrage({group:rage});
    const a=[],b=[];normal.traverse(o=>{if(o.isMesh)a.push(o);});rage.traverse(o=>{if(o.isMesh)b.push(o);});
    for(let i=0;i<a.length;i++)if(a[i].material.userData.bakedPalette){
      assert.notEqual(a[i].material.customProgramCacheKey(),b[i].material.customProgramCacheKey(),'Normal and rage shader programs must stay distinct');
      const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};b[i].material.onBeforeCompile(shader);
      assert(shader.vertexShader.includes('vColor.xyz = rageColor;')&&shader.fragmentShader.includes('enemySurface.rgb'));
    }
  }

  // Flicker and moving actors retain architectural maps, without frozen horde
  // silhouettes. Live moon/flashlight shadows still see those same actors.
  const enemy=qa.makeZombie(0,17);frames(8);const before=lighting.metrics.bakes,startCalls=renderer.shadowCalls.length;
  frames(120);assert.equal(lighting.metrics.bakes,before,'Stationary lamps must not render cube shadows every frame');
  const steadyCalls=renderer.shadowCalls.slice(startCalls);
  assert(steadyCalls.every(call=>!call.light.isPointLight));
  assert(steadyCalls.some(call=>call.enemies.length>0),'Moving enemies retain live shadows');
  assert(steadyCalls.reduce((n,call)=>n+call.views,0)<210,'Two seconds of steady lighting must use far fewer than the old 840 shadow views');
  for(const [x,z,y] of [[-33,-74,0],[21,-7,UPPER_Y],[CELLAR.x,CELLAR.z,CELLAR.y],[70,-15,0],[0,20,0],[-28,-48,0],[28,-72,0],[-28,0,0]]){
    qa.setPlayer(x,z,y);frames(10);
    assert(environmentLights.lights.some(light=>light.intensity>0),'Local light coverage at '+[x,y,z]);
    assert.deepEqual(signature(),originalSignature);
    assert(lighting.fixtures.size<=LIGHT_BUDGET.cachedFixtures);
    for(const light of environmentLights.lights)if(light.intensity>0){
      const binding=lighting.bindings.get(light);assert(binding.record.ready&&light.shadow.map);
      assert.equal(light.shadow.camera.far,light.distance);
      assert(light.position.distanceTo(binding.key.position)<1e-6);
    }
  }
  assert.equal(lighting.metrics.maxLiveBakes,1,'A floor/room change must amortize new cube renders');

  qa.setPlayer(0,20);qa.dropPickup(-1,19,'ammo');qa.dropPickup(1,19,'double');frames(12);
  const pickupBakes=lighting.metrics.bakes,anchors=combatLights.lights.map(l=>l.position.clone());frames(80);
  assert.equal(lighting.metrics.bakes,pickupBakes,'Pickup bobbing must not churn shadow maps or slots');
  assert(combatLights.lights.every((light,i)=>light.position.distanceTo(anchors[i])<1e-6));
  qa.explode(new T.Vector3(1,1,18));frames(1);
  assert(combatLights.lights.some(light=>light.intensity>2));
  assert(s.effects.filter(effect=>effect.type==='blast').every(effect=>!effect.mesh.castShadow),'The explosion shell must not block its own light');
  assert(s.pickups.every(pickup=>pickup.mesh.userData.lightingTransient),'Bobbing pickups must not freeze into the fixture cache');
  const cachedCalls=renderer.shadowCalls.filter(call=>call.light.isPointLight);
  assert(cachedCalls.every(call=>call.enemies.length===0),'Cached maps must never retain enemy silhouettes');
  assert.equal(renderer.renderDepth,0);
  assert(renderer.shadowCalls.every(call=>call.renderDepth===1),'Room changes and combat shadows must also stay inside initialized renderer frames');
  assert(enemy.group.children.length>0);

  let invalidations=lighting.metrics.invalidations;lighting.setBlockerState('open:closed');assert.equal(lighting.metrics.invalidations,++invalidations);
  assert(environmentLights.lights.every(light=>light.intensity===0),'Stale shadows must not be shown after a door changes');
  lighting.setBlockerState('open:closed');assert.equal(lighting.metrics.invalidations,invalidations);
  frames(10);assert(environmentLights.lights.some(light=>light.intensity>0));

  for(const quality of ['low','ultra','high']){
    elements.get('quality').value=quality;elements.get('quality').onchange();frames(10);
    assert.equal(renderer.shadowMap.enabled,true,'Low quality must still block walls and floors');
    assert.deepEqual(signature(),originalSignature);
    for(const light of environmentLights.lights)if(light.intensity>0)assert.equal(light.shadow.mapSize.x,quality==='low'?192:quality==='ultra'?384:256);
  }
  listeners.keydown({code:'KeyF'});frames(3);assert.equal(s.flashlight.shadow.autoUpdate,false);
  assert.deepEqual(signature(),originalSignature);listeners.keydown({code:'KeyF'});frames(1);assert(s.flashlight.shadow.autoUpdate);
  qa.start();qa.holdSpawns();
  for(let i=0;i<10;i++)qa.startWave();s.cellar.update(.25);
  assert(s.cellar.progress>0&&s.cellar.progress<1);
  const beforePartialReset=lighting.metrics.invalidations;qa.start();
  assert.equal(s.cellar.progress,0);assert.equal(lighting.metrics.invalidations,beforePartialReset+1,'Resetting a partially open door must invalidate its shadows, even before its state becomes fully open');
  qa.holdSpawns();frames(10);
  console.log('PASS: real wall/floor/roof occlusion and open portals, 9 stable point lights, bounded cached shadows without frozen enemies, 4-tap reflection-safe filtering, low-quality occlusion and preserved rage shaders.');
}
