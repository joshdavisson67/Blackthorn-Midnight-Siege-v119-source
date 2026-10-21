import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {qa,frames,listeners,elements,gameCanvas,windowEvents,qaDir,document,acquireMouse} from './harness.mjs';
let initial=qa.get(),draws=0;initial.scene.traverse(m=>{if(m.isMesh)draws++;});console.log('Initialized scene:',draws,'meshes after static batching,',initial.colliders.length,'colliders.');
assert.equal(initial.renderer.renderDepth,0,'Startup must finish without an active renderer frame');
assert(initial.renderer.shadowCalls.some(call=>call.light.isPointLight),'Startup must prepare lamp occlusion before entry');
assert(initial.renderer.shadowCalls.every(call=>call.renderDepth===1),'Startup shadow passes must run inside renderer.render, with valid frame state');
console.log('PASS: game startup prepares lamp shadows within valid renderer frames, without the currentRenderState crash.');
const {verifyColumnSurfaces}=await import('./column-surfaces.mjs');
verifyColumnSurfaces(qa);
const {verifyFieldGuide}=await import('./field-guide.mjs');
verifyFieldGuide(qa,frames,listeners,elements);
const {verifyChangelog}=await import('./changelog.mjs');
verifyChangelog(qa,frames,listeners,elements);
const {verifyInPlaceEntry}=await import('./startup.mjs');
await verifyInPlaceEntry({qa,frames,elements,gameCanvas,document,acquireMouse});
assert.equal(qa.get().mode,'playing');assert(elements.get('menu').classList.contains('hidden'));assert(!elements.get('hud').classList.contains('hidden'));assert.equal(qa.get().health,100);assert(document.getElementById('reloadStatus').textContent.includes('GRENADE 3'));qa.setKeys(['KeyW']);frames(100);qa.setKeys([]);assert(qa.get().player.z<18);console.log('PASS: initialization, start, keyboard movement.');
qa.setAim(0,.25);frames(1);qa.setPlayer(0,20);qa.startWave();qa.get().nav.rebuild(0,20);for(const [x,z] of [[-18,20],[18,23],[-22,-20],[22,-20],[0,-21],[-18,0],[19,3],[-9,-7],[9,-9],[-10,8],[10,7]]){assert(qa.get().nav.direction(x,z).reachable,`Unreachable spawn ${x},${z}`);}console.log('PASS: all spawn locations navigate to courtyard through mansion.');
qa.setPoints(20000);for(const id of ['iron','quick','eye','stride']){const perk=qa.get().interactables.find(s=>s.type==='perk'&&s.id===id&&s.y===0);qa.setPlayer(perk.x+Math.sin(perk.rotation||0)*1.6,perk.z+Math.cos(perk.rotation||0)*1.6);qa.interact();assert(qa.get().perkOwned.has(id),`Failed perk ${id}, mode ${qa.get().mode}, toast ${elements.get('toast').textContent}`);}assert.equal(qa.get().maxHealth,200);console.log('PASS: all four perk purchases and health upgrade.');
const groundShotgun=qa.get().interactables.find(s=>s.type==='shotgun'&&s.y===0);qa.setPlayer(groundShotgun.x+Math.sin(groundShotgun.rotation||0)*1.6,groundShotgun.z+Math.cos(groundShotgun.rotation||0)*1.6);qa.interact();assert(qa.get().inventory.shotgun.owned);qa.selectWeapon('shotgun');assert.equal(qa.get().weapon,'shotgun');const groundForge=qa.get().interactables.find(s=>s.type==='upgrade'&&s.y===0);qa.setPlayer(groundForge.x,groundForge.z+1.6);qa.interact();assert(qa.get().inventory.shotgun.forgeRank===1);qa.setPlayer(-7,14.8);qa.get().inventory.shotgun.reserve=0;qa.interact();assert(qa.get().inventory.shotgun.reserve>0);console.log('PASS: weapon purchases, switching, forge upgrades, and ammo refills.');
qa.setPlayer(0,20);qa.selectWeapon('glock');qa.setAim(0,0);frames(1);const enemy=qa.makeZombie(0,16,false);qa.get().scene.updateMatrixWorld(true);const before=enemy.hp;qa.shoot();assert(enemy.hp<before,'Center aim should hit the zombie');assert.equal(qa.get().inventory.glock.ammo,12);qa.reload();frames(155);assert.equal(qa.get().inventory.glock.ammo,13);console.log('PASS: raycast shooting hits 3D enemy, ammo consumption and reload.');
const victim=qa.makeZombie(1,16,false);const k=qa.get().kills;qa.damageEnemy(victim,10000,true);assert.equal(qa.get().kills,k+1);assert(victim.dead);qa.setHealth(1);const nearby=qa.makeZombie(0,19.5,false);nearby.attack=0;frames(2);assert.equal(qa.get().mode,'playing','Attack must telegraph before contact');frames(30);assert.equal(qa.get().mode,'dead');console.log('PASS: headshot kills, point rewards, enemy attacks, death screen.');
qa.start();assert.equal(qa.get().kills,0);assert.equal(qa.get().wave,0);assert.equal(qa.get().perkOwned.size,0);frames(600);assert(qa.get().wave>=1);assert(qa.get().zombies.some(e=>!e.dead));console.log('PASS: restart clears run state, timed wave starts and spawns enemies.');

// Capture is mandatory: the simulation and input stay paused until the browser confirms it.
document.exitPointerLock();assert.equal(qa.get().mode,'paused');
let captureCalls=0;gameCanvas.requestPointerLock=()=>{captureCalls++;return acquireMouse();};
listeners.keydown({code:'Escape'});assert.equal(captureCalls,0);assert.equal(qa.get().mode,'paused');
elements.get('resume').onclick();assert.equal(captureCalls,1);assert.equal(qa.get().mode,'playing');assert(qa.get().pointer);assert(gameCanvas.classList.contains('mouse-locked'));
console.log('PASS: Esc releases and pauses without immediately recapturing; Resume locks the mouse before playing.');

document.exitPointerLock();let settleCapture;
gameCanvas.requestPointerLock=()=>new Promise(resolve=>{settleCapture=resolve;});
elements.get('resume').onclick();assert.equal(qa.get().mode,'capturing');
const waiting={x:qa.get().player.x,z:qa.get().player.z,wave:qa.get().wave,health:qa.get().health,ammo:qa.get().inventory.glock.ammo,yaw:qa.get().lookYaw};
listeners.keydown({code:'KeyW'});listeners.mousemove({target:gameCanvas,movementX:100,movementY:10});gameCanvas.events.mousedown({button:0});frames(180);
assert.equal(qa.get().player.x,waiting.x);assert.equal(qa.get().player.z,waiting.z);assert.equal(qa.get().wave,waiting.wave);assert.equal(qa.get().health,waiting.health);assert.equal(qa.get().inventory.glock.ammo,waiting.ammo);assert.equal(qa.get().lookYaw,waiting.yaw);
document.pointerLockElement=gameCanvas;listeners.pointerlockchange();settleCapture();await Promise.resolve();assert.equal(qa.get().mode,'playing');
console.log('PASS: pending mouse permission freezes movement, aiming, firing, enemy attacks, and wave progress until capture succeeds.');

document.exitPointerLock();gameCanvas.requestPointerLock=()=>Promise.reject(new Error('Mouse capture denied'));
elements.get('resume').onclick();await Promise.resolve();assert.equal(qa.get().mode,'paused');assert(!elements.get('captureHelp').classList.contains('hidden'));
const deniedYaw=qa.get().lookYaw,deniedAmmo=qa.get().inventory.glock.ammo;
listeners.mousemove({target:gameCanvas,movementX:100,movementY:0});gameCanvas.events.mousedown({button:0});assert.equal(qa.get().lookYaw,deniedYaw);assert.equal(qa.get().inventory.glock.ammo,deniedAmmo);
gameCanvas.requestPointerLock=acquireMouse;elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');assert(elements.get('captureHelp').classList.contains('hidden'));
console.log('PASS: denial shows a retry; unlocked mouse movement/firing are disabled and retry recovers.');

document.exitPointerLock();gameCanvas.requestPointerLock=()=>{throw new Error('Legacy pointer-lock denial');};elements.get('resume').onclick();assert.equal(qa.get().mode,'paused');
gameCanvas.requestPointerLock=undefined;elements.get('resume').onclick();assert.equal(qa.get().mode,'paused');assert(!elements.get('resume').disabled);
gameCanvas.requestPointerLock=()=>undefined;elements.get('resume').onclick();assert.equal(qa.get().mode,'capturing');document.pointerLockElement=gameCanvas;listeners.pointerlockchange();assert.equal(qa.get().mode,'playing');
console.log('PASS: throwing, unavailable, and event-only pointer-lock implementations are handled without a startup error.');

document.exitPointerLock();let rejectOld;
gameCanvas.requestPointerLock=()=>new Promise((resolve,reject)=>{rejectOld=reject;});elements.get('resume').onclick();assert.equal(qa.get().mode,'capturing');
listeners.keydown({code:'Escape'});assert.equal(qa.get().mode,'paused');
document.pointerLockElement=gameCanvas;listeners.pointerlockchange();assert.equal(document.pointerLockElement,null);assert.equal(qa.get().mode,'paused');
gameCanvas.requestPointerLock=acquireMouse;elements.get('resume').onclick();rejectOld(new Error('Stale rejection'));await Promise.resolve();assert.equal(qa.get().mode,'playing');assert(qa.get().pointer);
windowEvents.blur();assert.equal(qa.get().mode,'paused');assert.equal(document.pointerLockElement,null);assert(!gameCanvas.classList.contains('mouse-locked'));
elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');
console.log('PASS: cancelled capture cannot relock later, stale rejection cannot undo a retry, and switching away releases the mouse.');

// Preparing a run without capture must leave it paused until a user gesture.
qa.start({capture:false});assert.equal(qa.get().mode,'paused');assert.equal(document.pointerLockElement,null);
assert.equal(elements.get('resume').textContent,'CLICK TO PLAY →');assert(!elements.get('resume').disabled);
const preparedWave=qa.get().wave;frames(120);assert.equal(qa.get().wave,preparedWave);
let focusedFallback=false;const originalFocus=gameCanvas.focus;
gameCanvas.focus=options=>{if(options)throw new Error('Options unsupported');focusedFallback=true;};
elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');assert(qa.get().pointer);assert(focusedFallback);
gameCanvas.focus=originalFocus;
console.log('PASS: paused preparation never captures or advances; Play captures, including legacy focus fallback.');

const THREE=await import(pathToFileURL(resolve(qaDir,'three.module.js')));qa.start();assert.equal(qa.get().brightness,1.15);
for(const weapon of ['rifle','shotgun','smg','lmg','bushmaster']){qa.get().inventory[weapon].owned=true;qa.selectWeapon(weapon);gameCanvas.events.mousedown({button:2});frames(70);qa.get().scene.updateMatrixWorld(true);const state=qa.get(),gun=state.gunGroups[weapon];const optic=gun.userData.optic;assert(optic.glass.material.transparent&&optic.glass.material.opacity<=.04,weapon+' glass must be clear');const projected=optic.dot.getWorldPosition(new THREE.Vector3()).project(state.camera);assert(Math.abs(projected.x)<.004&&Math.abs(projected.y)<.004,weapon+' reticle must align with the center firing ray');const ray=new THREE.Raycaster(state.camera.position,new THREE.Vector3(0,0,-1).applyQuaternion(state.camera.quaternion));const opaque=ray.intersectObject(gun,true).filter(h=>!h.object.material?.transparent&&!h.object.userData.reticle&&h.object.isMesh);assert.equal(opaque.length,0,weapon+' sight must have an unobstructed bore');listeners.mouseup({button:2});}
console.log('PASS: brightness factor is 1.15; all five optical weapons have a clear optic, open sightline, and reticle aligned with the shot.');

const {verifyWeaponModels}=await import('./weapons.mjs');
verifyWeaponModels(qa,frames,listeners,gameCanvas);
const {verifyWarden}=await import('./warden.mjs');
verifyWarden(qa,frames,listeners,elements,gameCanvas);
const {verifyReticles}=await import('./reticles.mjs');
verifyReticles(qa,frames,listeners,elements,gameCanvas);
const {verifyWeaponSurfaces}=await import('./weapon-surfaces.mjs');
verifyWeaponSurfaces(qa,frames);
const {verifyCurse}=await import('./curse.mjs');
verifyCurse(qa,frames,listeners,elements,gameCanvas);
const {verifyPauseCurse}=await import('./pause-curse.mjs');
verifyPauseCurse(qa,frames,listeners,elements,gameCanvas);
const {verifyRotundaBell}=await import('./rotunda-bell.mjs');
verifyRotundaBell(qa,frames,listeners,elements);
const {verifyGlock}=await import('./glock.mjs');
verifyGlock(qa,frames,listeners,gameCanvas,elements);
const {verifyAmmoRefills}=await import('./ammo-refill.mjs');
verifyAmmoRefills(qa,frames,listeners,elements);
const {verifyBushmaster}=await import('./bushmaster.mjs');
verifyBushmaster(qa,frames,listeners,gameCanvas,elements);
const {verifyGrenadeThrows,verifyGrenadeBlastDamage}=await import('./grenade-throw.mjs');
verifyGrenadeThrows(qa,frames,listeners,elements);
verifyGrenadeBlastDamage(qa,elements);

const layout=await import('../public/game/estate-layout.mjs');
const core=await import('../public/game/core.mjs');
assert.equal(layout.MANSION_FLOOR_AREA,8064);
assert(layout.MANSION_FLOOR_AREA/layout.ORIGINAL_FLOOR_AREA>=10);
qa.start();let state=qa.get();state.nav.rebuild(0,20);
let usableFloor=0;
for(let z=-83;z<12;z++)for(let x=-41;x<42;x++){
  const i=state.nav.index(x,z);
  if(!state.nav.blocked[i]&&state.nav.distance[i]<99999)usableFloor++;
}
assert(usableFloor>=10*layout.ORIGINAL_FLOOR_AREA,'At least ten old footprints must be reachable floor space');
for(const room of layout.ESTATE_ROOMS){
  let x=room.x,z=room.z,steps=0;
  assert(!core.isBlocked(x,z,.34,state.colliders),room.name+' center must be playable');
  while(state.nav.distance[state.nav.index(x,z)]>0&&steps++<300){
    const next=state.nav.direction(x,z);assert(next?.reachable,room.name+' must connect to entrance');
    assert(x!==next.x||z!==next.z,room.name+' flow field must make progress');
    for(let t=.125;t<=1;t+=.125)assert(!core.isBlocked(x+(next.x-x)*t,z+(next.z-z)*t,.34,state.colliders),room.name+' navigation route must be physically walkable');
    x=next.x;z=next.z;
  }
  assert(steps<300,room.name+' must reach the courtyard');
}
console.log(`PASS: mansion is 12× the original footprint; ${usableFloor} square-meter navigation cells are connected, and all 12 sections have walkable routes to the courtyard.`);

for(const room of layout.ESTATE_ROOMS){
  qa.start();qa.setPlayer(room.x,room.z);qa.startWave();qa.get().nav.rebuild(room.x,room.z);
  qa.spawnEnemy();const current=qa.get(),spawn=current.zombies[0]?.group.position;
  assert(spawn,room.name+' must support local wave spawns');
  assert(!core.isBlocked(spawn.x,spawn.z,.34,current.colliders));
  assert(current.nav.direction(spawn.x,spawn.z)?.reachable);
  assert(current.nav.direction(spawn.x,spawn.z).distance<42,room.name+' should not wait for enemies across the estate');
}
console.log('PASS: every section receives reachable nearby enemies, with spawns outside walls and furniture.');

qa.start();qa.openMap();assert.equal(qa.get().mode,'paused');assert(!document.getElementById('estateMap').classList.contains('hidden'));
qa.closeMap();assert.equal(qa.get().mode,'playing');assert(document.getElementById('estateMap').classList.contains('hidden'));
listeners.keydown({code:'KeyM',repeat:false,preventDefault(){}});assert.equal(qa.get().mode,'paused');
listeners.keydown({code:'Escape',preventDefault(){}});assert.equal(qa.get().mode,'paused');assert.equal(document.pointerLockElement,null);elements.get('resume').onclick();assert.equal(qa.get().mode,'playing');
console.log('PASS: closing the map captures before resuming; Escape closes it while leaving the mouse released.');

// The world and weapon must render into separate depth contents, preserving
// self-occlusion without clipping the held weapon through nearby world walls.
const {renderCleanFrame}=await import('../public/game/graphics.mjs');
const calls=[];const renderer={setRenderTarget(t){calls.push(['target',t]);},clear(){calls.push(['clear']);},clearDepth(){calls.push(['depth']);},render(s,c){calls.push(['render',c.layers.mask]);}};
const testScene=new THREE.Scene();testScene.background=new THREE.Color(0x123456);
const worldCamera=new THREE.PerspectiveCamera(),viewCamera=new THREE.PerspectiveCamera();
const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera();
renderCleanFrame(renderer,testScene,worldCamera,viewCamera,{},postScene,postCamera,true);
assert.deepEqual(calls.map(c=>c[0]),['target','clear','render','depth','render','target','clear','render']);
assert.deepEqual(calls.filter(c=>c[0]==='render').map(c=>c[1]),[1,2,1]);
assert.equal(testScene.background.getHex(),0x123456);
for(const gun of Object.values(qa.get().gunGroups))gun.traverse(o=>{
  if(!o.isMesh)return;
  assert(o.layers.test(qa.get().viewCamera.layers)&&!o.layers.test(qa.get().camera.layers),'Weapon geometry must render in the depth-cleared weapon pass');
  assert(o.material.depthTest,'Gun parts must not draw through each other');
  if(!o.material.transparent&&!o.userData.reticle)assert(o.material.depthWrite,'Opaque gun parts must occlude rear surfaces');
});
assert.equal(qa.get().rt.depthTexture,null,'The removed depth halo pass must not remain active');
console.log('PASS: explicit frame clears, isolated weapon depth, restored background, and opaque gun self-occlusion.');

const {verifyZombieIntegration}=await import('./zombies.mjs');
verifyZombieIntegration(qa,frames);

const {verifyCombatFeedback,verifyReloadProgress}=await import('./combat-feedback.mjs');
verifyCombatFeedback(qa,frames,listeners,gameCanvas,elements,document);
verifyReloadProgress(qa,frames,listeners,elements);

const {verifyStairs}=await import('./stairs.mjs');
verifyStairs(qa,frames,listeners,elements);
const {verifyExteriorStairs}=await import('./exterior-stairs.mjs');
verifyExteriorStairs(qa,frames,listeners,elements);

const {verifyDogs}=await import('./dogs.mjs');
verifyDogs(qa,frames);

const {verifyBella}=await import('./bella.mjs');
verifyBella(qa,frames,listeners,elements,document);

const {verifyUpstairsCleanup}=await import('./upstairs-cleanup.mjs');
verifyUpstairsCleanup(qa);

const {verifyUpstairsSeams,verifyUpstairsCeiling}=await import('./upstairs-seams.mjs');
verifyUpstairsSeams(qa);
verifyUpstairsCeiling(qa);
const {verifyInteriors}=await import('./interiors.mjs');verifyInteriors(qa,frames,listeners);
const {verifyDoorways}=await import('./doorways.mjs');verifyDoorways(qa,frames);
const {verifySignage}=await import('./signage.mjs');verifySignage(qa);
const {verifyPortraits}=await import('./portraits.mjs');verifyPortraits(qa);

const {verifyPerformance}=await import('./performance.mjs');
verifyPerformance(qa,frames,listeners);
const {verifyRenderPerformance}=await import('./render-performance.mjs');
verifyRenderPerformance(qa,frames);
const {verifyLighting}=await import('./lighting.mjs');verifyLighting(qa,frames,listeners,elements);
const {verifyFaces}=await import('./faces.mjs');
verifyFaces(qa);

const {verifyPowerups}=await import('./powerups.mjs');
verifyPowerups(qa,frames,listeners,elements);

const {verifyStations}=await import('./stations.mjs');
verifyStations(qa,frames,elements);

const {verifyAshfang}=await import('./ashfang.mjs');
verifyAshfang(qa,frames);

const {verifyCellar,verifyCellarForge}=await import("./cellar.mjs");
verifyCellarForge(qa,frames,listeners,elements);
verifyCellar(qa,frames,listeners,elements);
const {verifyShed,verifyShedM4}=await import('./shed.mjs');
verifyShed(qa,frames,listeners,elements);
verifyShedM4(qa,frames,listeners,elements);
const {verifyNanoShield}=await import('./nano-shield.mjs');
verifyNanoShield(qa,frames,elements);

const {verifyGraveyard}=await import("./graveyard.mjs");
verifyGraveyard(qa,frames,listeners,elements);
const {verifyNuke}=await import('./nuke.mjs');
verifyNuke(qa,frames,listeners,elements);
const {verifyBlackthorn}=await import('./blackthorn.mjs');
verifyBlackthorn(qa,frames,listeners,elements);

const {verifyGrounds}=await import('./grounds.mjs');
verifyGrounds(qa);

const {verifyPathing}=await import('./pathing.mjs');
verifyPathing(qa,frames);

const {verifyEnrage}=await import('./enrage.mjs');
verifyEnrage(qa,frames);

const {verifyFeral}=await import('./feral.mjs');
verifyFeral(qa,frames);

const {verifyExterior}=await import('./exterior.mjs');
verifyExterior(qa);
const {verifyFacade}=await import('./facade.mjs');
verifyFacade(qa);

const {verifyWaveFiveFinale}=await import('./wave-five-finale.mjs');
verifyWaveFiveFinale(qa,frames,listeners,elements);

const {verifyLayoutFixes}=await import('./layout-fixes.mjs');
verifyLayoutFixes(qa,frames,listeners,elements);

const {verifyBrutes}=await import('./brutes.mjs');
verifyBrutes(qa,frames);

const {verifySoulForge}=await import('./forge.mjs');
verifySoulForge(qa,frames,listeners,elements);

const {verifyWorldEvents}=await import('./world-events.mjs');
verifyWorldEvents(qa,frames,listeners,elements);

const {verifyTouchControls}=await import('./touch.mjs');
verifyTouchControls(qa,frames,listeners,elements,document,gameCanvas);

const {verifyGamepad}=await import('./gamepad.mjs');
verifyGamepad(qa,frames,listeners,elements,windowEvents);

const {verifyCrowdSpread}=await import('./crowd-spread.mjs');
verifyCrowdSpread(qa,frames);

const {verifyZombieMotion}=await import('./zombie-motion.mjs');
verifyZombieMotion(qa,frames);

const {verifyFloorLighting}=await import('./floor-lighting.mjs');
verifyFloorLighting(qa);
