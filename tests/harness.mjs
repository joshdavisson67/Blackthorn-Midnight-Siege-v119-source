import {parseHTML} from 'linkedom';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const qaDir=resolve(root,'.qa');mkdirSync(qaDir,{recursive:true});
// Model the renderer's frame-scoped state and shadow map dimensions, without
// claiming GPU rendering. The real renderer clears currentRenderState after
// every render; shadow passes cannot be called directly between frames.
writeFileSync(resolve(qaDir,'three.module.js'),`export * from '../public/game/three.module.js';
import {WebGLRenderTarget} from '../public/game/three.module.js';
export class WebGLRenderer {
  constructor(){this.pr=1;this.renderDepth=0;this.shadowCalls=[];this.shadowMap={enabled:false,render:(lights,scene,camera)=>{
    if(!this.shadowMap.enabled)return;
    if(lights.length&&this.renderDepth===0)throw new Error('Cannot read currentRenderState.state outside a render frame');
    for(const light of lights){const shadow=light.shadow;if(!shadow.autoUpdate&&!shadow.needsUpdate)continue;
      const size=shadow.mapSize,extent=shadow.getFrameExtents();
      shadow.map??=new WebGLRenderTarget(size.x*extent.x,size.y*extent.y);
      for(let face=0;face<shadow.getViewportCount();face++)shadow.updateMatrices(light,face);
      const enemies=[];scene.traverseVisible(o=>{if(o.isMesh&&o.castShadow&&o.userData.enemy)enemies.push(o.uuid);});
      this.shadowCalls.push({light,views:shadow.getViewportCount(),enemies,renderDepth:this.renderDepth});shadow.needsUpdate=false;
    }
  }};}
  setPixelRatio(p){this.pr=p;}getPixelRatio(){return this.pr;}
  initTexture(texture){(this.initializedTextures??=new Set()).add(texture);}
  setSize(){}setRenderTarget(){}compileAsync(scene,camera){(this.compileCalls??=[]).push(camera.layers.mask);return Promise.resolve();}
  clear(){}clearDepth(){}
  render(scene,camera){this.renderDepth++;
    try{if(scene.matrixWorldAutoUpdate===true)scene.updateMatrixWorld();if(camera.parent===null&&camera.matrixWorldAutoUpdate===true)camera.updateMatrixWorld();
      const lights=[];scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o.layers.test(camera.layers))lights.push(o);});
      this.shadowMap.render(lights,scene,camera);
    }finally{this.renderDepth--;}
  }
}`);
for(const file of ['glock-model-parts.mjs','reticles.mjs','facade.mjs','curse.mjs','curse-ui.mjs','column-surfaces.mjs','world-events.mjs','world-event-visuals.mjs','rotunda-bell.mjs','combat-feedback.mjs','bella.mjs','minimap-settings.mjs','render-scale.mjs','shed-layout.mjs','shed.mjs','lighting.mjs','enemy-surfaces.mjs','soul-forge.mjs','signage.mjs','furnishings.mjs','rugs.mjs','version.mjs','changelog-data.mjs','changelog.mjs','armor.mjs','brute.mjs','feral.mjs','enrage.mjs','crowd.mjs','grounds.mjs','leaderboard.mjs','graveyard-layout.mjs','graveyard.mjs','mausoleum-nuke.mjs','cellar-layout.mjs','cellar.mjs','core.mjs','estate-layout.mjs','mansion-expansion.mjs','zombies.mjs','zombie-dog.mjs','enemy-faces.mjs','vertical.mjs','second-floor.mjs','exterior-stairs.mjs','upper-shell.mjs','enemy-assets.mjs','combat-lights.mjs','powerups.mjs','station-models.mjs','weapon-models.mjs','grenade-throw.mjs','environment-lights.mjs','effect-pool.mjs'])writeFileSync(resolve(qaDir,file),readFileSync(resolve(root,'public/game',file)));
writeFileSync(resolve(qaDir,'graphics.mjs'),readFileSync(resolve(root,'public/game/graphics.mjs')));
writeFileSync(resolve(qaDir,'weapon-surfaces.mjs'),readFileSync(resolve(root,'public/game/weapon-surfaces.mjs')));
writeFileSync(resolve(qaDir,'estate-detail.mjs'),readFileSync(resolve(root,'public/game/estate-detail.mjs')));
const exports="export const qa={start:resetRun,openMap:openEstateMap,closeMap:closeEstateMap,tick,shoot,interact,activateMausoleumNuke,reload,selectWeapon,spawnEnemy,damageEnemy,startWave,makeZombie,grenade,explode,dropPickup,hurtPlayer,triggerFrenzy,openCurseChoice,resolveCurseChoice,get(){return {reticleHud,facade,mainRoof,curse,curseUI,worldEvents,eventVisuals,rotundaBell,weaponRecoil,combatHud,shotTimer,hitTime,bella,mode,changelog,signage,portraits,furnishings,rugs,groundDoors,expansion,player,health,maxHealth,armor,armorMax,armorTier,runTime,lastHurt,frenzyWave,waveFiveFinale,waveDelay,cellar,graveyard,shed,points,totalScore,kills,wave,inventory,perkOwned,weapon,reloadLeft,reloadDuration,toSpawn,zombies,colliders,nav,scene,world,lookYaw,lookPitch,pointer,camera,viewCamera,gunRoot,gunGroups,grenadeThrow,grenadeAssets,rt,renderer,postMat,interactables,spawns,grounded,feetY,jumpV,secondFloor,effects,pickups,enemyAssets,combatLights,flashlight,stationBuilder,powerupAssets,environmentLights,bloodPool,markPool,frozenTransforms,lighting,moonlight,grenades,grenadeTime,grenadeCooldown,doubleTime,nukeFlashTime,brightness:postMat.uniforms.brightness.value};},holdSpawns(){spawnTimer=Infinity;},clearQueuedSpawns(){toSpawn=0;},setEventRandom(fn){eventRandom=fn;},setSeed(v){seed=v;},setPoints(v){points=v;},setAim(y,p){lookYaw=y;lookPitch=p;},setPlayer(x,z,y=0){player.set(x,y,z);jumpV=0;feetY=0;grounded=true;},setHealth(v){health=v;},setGrenades(v){grenades=v;},setKeys(v){keys.clear();for(const k of v)keys.add(k);}};";
writeFileSync(resolve(qaDir,'game.js'),"let eventRandom=()=>1;\n"+readFileSync(resolve(root,'public/game/game.js'),'utf8').replace('createWorldEvents({\n','createWorldEvents({\n  random:()=>eventRandom(),\n')+'\n'+exports);
const ctx=new Proxy({createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:(()=>{});},set(o,k,v){o[k]=v;return true;}});
const parsed=parseHTML(readFileSync(resolve(root,'public/game/index.html'),'utf8'));
const {document,window:domWindow}=parsed;const listeners={},windowEvents={};const elements=new Map([...document.querySelectorAll('[id]')].map(el=>[el.id,el]));
// Linkedom's select.value is getter-only; model the browser's standard setter.
for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{configurable:true,get(){return (select.querySelector('option[selected]')||select.querySelector('option'))?.getAttribute('value')||'';},set(value){for(const option of select.querySelectorAll('option'))option.toggleAttribute('selected',option.getAttribute('value')===String(value));}});
domWindow.HTMLCanvasElement.prototype.getContext=()=>ctx;
const gameCanvas=elements.get('game');gameCanvas.events={};gameCanvas.addEventListener=(name,fn)=>{gameCanvas.events[name]=fn;};const acquireMouse=()=>{document.pointerLockElement=gameCanvas;listeners.pointerlockchange?.();return Promise.resolve();};gameCanvas.requestPointerLock=acquireMouse;
document.addEventListener=(name,fn)=>{listeners[name]=fn;};document.exitPointerLock=()=>{document.pointerLockElement=null;listeners.pointerlockchange?.();};
globalThis.document=document;globalThis.window={addEventListener(name,fn){windowEvents[name]=fn;}};globalThis.devicePixelRatio=1;globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.localStorage={getItem(){return null},setItem(){}};globalThis.requestAnimationFrame=()=>{};
elements.get('sound').checked=true;elements.get('quality').querySelector('option[value="high"]').setAttribute('selected','');
const {qa}=await import(pathToFileURL(resolve(qaDir,'game.js'))) ;let t=performance.now();function frames(n,stepMs=16.6667){for(let i=0;i<n;i++){t+=stepMs;qa.tick(t);}}

export {qa,frames,listeners,elements,gameCanvas,windowEvents,qaDir,document,acquireMouse};
