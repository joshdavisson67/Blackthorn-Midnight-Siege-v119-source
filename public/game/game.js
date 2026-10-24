import {BRUTE} from './brute.mjs?v=30';
import {FERAL} from './feral.mjs?v=116';
import {CURSE_RULES,MAX_CURSE_RANK,createCurse,createCurseLadder,curseTitle,curseWaveConfig,curseReward,chooseCurseEnemyKind} from './curse.mjs?v=130';
import {createCurseUI,curseSummary} from './curse-ui.mjs?v=130';
import {BOSS,WARDEN,bossPhase,dueSummons,lanceVolley,cooldownScale,segmentDistance,wakeStep,dressKnight,dressWarden,createBossEffects} from './blackthorn-boss.mjs?v=130';
import {ENRAGE,enrageNearby} from './enrage.mjs?v=130';
import {createCrowd,enemyBody,PLAYER_RADIUS,SPREAD} from './crowd.mjs?v=123';
import {createLeaderboard} from './leaderboard.mjs?v=142';
import {createChangelog} from './changelog.mjs?v=142';
import {configureMinimap} from './minimap-settings.mjs?v=79';
import {COMBAT,createWeaponRecoil,staggerLimits,advanceStagger,registerStagger,createCombatHud} from './combat-feedback.mjs?v=84';
import {ARMOR,armorRank} from './armor.mjs?v=94';
import {createGrassMaterial,alignGrassPatch,ESTATE_PATHS,ESTATE_PAVING,bakeLawnMap} from './grounds.mjs?v=131';
import {MAUSOLEUM,SARCOPHAGUS,GRAVE_PLOTS,inMausoleum,inGraveyard} from './graveyard-layout.mjs?v=28';
import {buildGraveyard} from './graveyard.mjs?v=131';
import {CELLAR,isCellarOpen,setCellarOpen,cellarStairHeight} from './cellar-layout.mjs?v=28';
import {buildCellar,drawCellarMap} from './cellar.mjs?v=129';
import {SHED,SHED_FRONT,inShed} from './shed-layout.mjs?v=76';
import {buildShed} from './shed.mjs?v=129';
import * as T from './three.module.js';
import {createRenderScale} from './render-scale.mjs?v=120';
import {createTouchControls,TOUCH} from './touch-controls.mjs?v=141';
import {createControlScheme} from './input-scheme.mjs?v=142';
import {createGamepadControls} from './gamepad-controls.mjs?v=128';
import {columnSurfaceGeometry} from './column-surfaces.mjs?v=93';
import {createStationBuilder} from './station-models.mjs?v=129';
import {createWeaponModel,updatePistolSlide} from './weapon-models.mjs?v=129';
import {weaponSurfaces} from './weapon-surfaces.mjs?v=87';
import {GRENADE_THROW,createGrenadeAssets,createGrenadeThrow} from './grenade-throw.mjs?v=44';
import {POWERUPS,choosePowerup,powerupIcon,createPowerupAssets} from './powerups.mjs?v=129';
import {createEnemyAssets} from './enemy-assets.mjs?v=140';
import {createCombatLights} from './combat-lights.mjs?v=129';
import {createLighting,prepareLightingMaterials,patchLightingMaterial} from './lighting.mjs?v=120';
import {createEnvironmentLights} from './environment-lights.mjs?v=135';
import {createEffectPool} from './effect-pool.mjs?v=47';
import {animateZombieDog,DOG_SPEED_MULTIPLIER,RARE_DOG_SPEED_MULTIPLIER} from './zombie-dog.mjs?v=140';
import {UPPER_Y,UPPER_CEILING,UPPER_SPAWNS,hasUpperFloor,STAIR,EXTERIOR_STAIRS,supportBelow,stairHeight,stairAt,moveActor,updateActorHeight,buildVerticalNavigation,upperLocation,OLIVIA_ATTIC,setAtticOpen,isAtticOpen,inAttic} from './vertical.mjs?v=131';
import {EASTER_EGG,buildOliviaAttic,boneChipModel} from './olivia.mjs?v=131';
import {buildSecondFloor,drawUpperMap} from './second-floor.mjs?v=131';
import {BELLA,BELLA_PAW,createBellaCompanion} from './bella.mjs?v=131';
import {tagZombie,reactToHit,animateZombie,beginZombieDeath,updateZombieDeath,noteLegDamage,CRAWL} from './zombies.mjs?v=140';
import {addEstateDetail} from './estate-detail.mjs?v=131';
import {buildFacade,mansionRoofGeometry,PORTICO} from './facade.mjs?v=131';
import {createReticleHud} from './reticles.mjs?v=116';
import {createFurnishings} from './furnishings.mjs?v=59';
import {createRugBuilder} from './rugs.mjs?v=59';
import {createSignage} from './signage.mjs?v=94';
import {FORGE,forgeBonuses,configureForgeStation} from './soul-forge.mjs?v=118';
import {loadEstateTextures,tiledBox,ambientEnvironment,makeFilmPass,renderCleanFrame,freezeStaticTransforms,finishMapFrom,OAK_FINISH,WET_STONE_FINISH,flashlightBeamTexture} from './graphics.mjs?v=129';
import {ESTATE_SPAWNS,roomAt,estateLocation} from './estate-layout.mjs?v=28';
import {buildMansionExpansion,drawEstateMap} from './mansion-expansion.mjs?v=131';
import {buildRotundaBell} from './rotunda-bell.mjs?v=130';
import {UPPER_SLAB_BOTTOM} from './upper-shell.mjs?v=131';
import {EVENT_RULES,WORLD_EVENTS,createWorldEvents} from './world-events.mjs?v=135';
import {createBlackout} from './blackout.mjs?v=135';
import {createWorldEventVisuals} from './world-event-visuals.mjs?v=135';
const domCache=new Map();const $=id=>{if(!domCache.has(id))domCache.set(id,document.getElementById(id));return domCache.get(id);}, hudMarkup=new Map(),hudOpacity=new Map(),setMarkup=(id,markup)=>{if(hudMarkup.get(id)!==markup){hudMarkup.set(id,markup);$(id).innerHTML=markup;}},setOpacity=(id,value)=>{if(hudOpacity.get(id)!==value){hudOpacity.set(id,value);$(id).style.opacity=value;}}, rand=(a,b)=>a+rng()*(b-a), clamp=T.MathUtils.clamp;
const reticleHud=createReticleHud($('crosshair'));
const canvas=$('game');let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}catch(e){$('loading').classList.add('hidden');$('error').classList.remove('hidden');$('error').textContent='This game needs WebGL hardware acceleration. Enable hardware acceleration in your browser and reload.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();scene.background=new T.Color(0x09131e);scene.fog=new T.FogExp2(0x101c26,.014);
const camera=new T.PerspectiveCamera(75,innerWidth/innerHeight,.09,240);camera.rotation.order='YXZ';scene.add(camera);const viewCamera=new T.PerspectiveCamera();let weaponViewFov=75;
const world=new T.Group();scene.add(world);const colliders=[],solidMeshes=[],interactables=[],lamps=[],zombies=[],effects=[],pickups=[],portraits=[];
// Keep room entrances explicit so layout checks cover the full approach to
// each opening, including the library entrance beside the stair flight.
const groundDoors=[
  {x:0,z:12,axis:'x',width:6.4,height:4},
  {x:0,z:-12,axis:'x',width:6,height:4.2},
  ...[-14,14].map(x=>({x,z:0,axis:'z',width:6,height:4.2})),
  {x:-5.6,z:1.1,axis:'z',width:5,height:3.08},
  {x:5.6,z:0,axis:'z',width:7.2,height:3.08}
];
let seed=7123;function rng(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function texture(kind,size=512){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
const palettes={wood:['#31281f','#433227'],floor:['#40362b','#59452f'],stone:['#485050','#354043'],plaster:['#4c5149','#636358'],brick:['#333b3d','#545951'],cloth:['#292d27','#45423a'],skin:['#65715d','#808067'],metal:['#313c3c','#4c5752'],roof:['#273035','#3c4647']};const p=palettes[kind]||palettes.stone;x.fillStyle=p[0];x.fillRect(0,0,size,size);
for(let i=0;i<16000;i++){const b=rng()*80;x.fillStyle=`rgba(${b+80},${b+80},${b+60},${rng()*.075})`;x.fillRect(rng()*size,rng()*size,rand(1,5),rand(1,4));}
if(kind==='wood'||kind==='floor'){let boards=kind==='floor'?8:4;for(let j=0;j<boards;j++){const y=j*size/boards;x.fillStyle=j%2?p[1]:p[0];x.globalAlpha=.5;x.fillRect(0,y,size,size/boards);x.globalAlpha=1;x.fillStyle='#101714';x.fillRect(0,y,size,2);for(let k=0;k<80;k++){x.strokeStyle=`rgba(0,0,0,${rng()*.12})`;x.beginPath();let yy=y+rng()*size/boards;x.moveTo(0,yy);for(let q=0;q<=size;q+=20)x.lineTo(q,yy+Math.sin(q*.018+k)*rand(.2,2));x.stroke();}if(kind==='floor'){x.fillStyle='#151a17';x.fillRect((j%2)*size/2+size/4,y,2,size/boards);}}}
if(kind==='brick'||kind==='stone'||kind==='roof'){let rows=kind==='roof'?14:8;for(let j=0;j<rows;j++)for(let k=-1;k<5;k++){let xx=k*size/4+(j%2)*size/8,yy=j*size/rows;x.fillStyle=`rgba(100,111,108,${rng()*.25})`;x.fillRect(xx+3,yy+3,size/4-6,size/rows-6);x.strokeStyle='#192729';x.lineWidth=2;x.strokeRect(xx,yy,size/4,size/rows);}}
if(kind==='plaster'){for(let i=0;i<35;i++){x.strokeStyle='rgba(14,25,20,.2)';x.beginPath();let xx=rng()*size,yy=rng()*size;x.moveTo(xx,yy);for(let j=0;j<4;j++){xx+=rand(-15,15);yy+=rand(5,22);x.lineTo(xx,yy);}x.stroke();}}
const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
const maps={};for(const k of ['wood','floor','stone','plaster','brick','cloth','skin','metal','roof'])maps[k]=texture(k);for(const k of ['wood','floor','stone','plaster','brick','roof'])maps[k].repeat.set(k==='floor'?7:k==='wood'?2:4,k==='floor'?7:k==='wood'?2:4);
await loadEstateTextures(maps);
function mat(color,map=null,roughness=.85,metalness=0){return new T.MeshStandardMaterial({color,map:map?maps[map]:null,roughness,metalness,bumpMap:['brick','stone','wood','floor','plaster'].includes(map)?maps[map]:null,bumpScale:map==='brick'?.009:map==='plaster'?.003:.004});}
const M={wall:mat(0x969d87,'plaster'),wood:mat(0x807569,'wood'),floor:mat(0xaaa08c,'floor'),stone:mat(0x9ca5a0,'stone'),brick:mat(0x8d9994,'brick'),roof:mat(0x616f72,'roof'),dark:mat(0x151c1d,'metal',.5,.65),gold:mat(0x93724c,null,.35,.7),leather:mat(0x29342b,'cloth'),red:mat(0x62352e,'cloth'),skin:mat(0xa2ab88,'skin'),shirt:mat(0x7a7663,'cloth'),pants:mat(0x4c554e,'cloth'),white:mat(0xc4c2a6),glass:new T.MeshStandardMaterial({color:0x4e7f96,metalness:.05,roughness:.38,emissive:0x163949,emissiveIntensity:.08}),blood:mat(0x402018,null,.6),trim:mat(0x6f7462,'stone')};
M.wood.color.set(0xccb49b);M.wood.roughness=.78;M.stone.color.set(0xc0c7c4);M.stone.roughness=.8;M.stone.bumpScale=.009;M.brick.color.set(0xc4c1b5);M.brick.bumpScale=.009;M.dark.color.set(0x353f44);M.dark.roughness=.64;M.gold.roughness=.48;
// Natural floors (v125). Interior oak is a satin finish with no lacquer coat:
// grain and board gaps break highlights up instead of smearing lamps into
// streaks, and the flat ambient sheen is subdued. Outdoor stone stays wet,
// with water gathering in joints and pits rather than one plastic coat.
M.wetStone=new T.MeshPhysicalMaterial({color:0xb0b9b5,map:maps.stone,bumpMap:maps.stone,bumpScale:.007,roughness:.74,clearcoat:.22,clearcoatRoughness:.42});
M.floor=new T.MeshStandardMaterial({color:0xf4ead7,map:maps.floor,bumpMap:maps.floor,bumpScale:.0018,roughness:.8,envMapIntensity:.55});
{const oak=finishMapFrom(maps.floor,OAK_FINISH);if(oak){M.floor.roughnessMap=oak;M.floor.roughness=1;}
 const wet=finishMapFrom(maps.stone,WET_STONE_FINISH);if(wet){M.wetStone.clearcoatMap=wet;M.wetStone.clearcoatRoughnessMap=wet;M.wetStone.clearcoat=.55;M.wetStone.clearcoatRoughness=.52;}}
const furnishings=createFurnishings({world,M,colliders}),rugs=createRugBuilder({world});
scene.environment=ambientEnvironment();scene.environmentIntensity=.48;
M.wetStone.name='wet-stone';
const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.SphereGeometry(1,32,24),cylGeo=new T.CylinderGeometry(1,1,1,24);
function mesh(geo,material,pos,scale,parent=world,shadow=true){const m=new T.Mesh(geo,material);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=shadow&&!material.transparent&&!material.isMeshBasicMaterial;m.receiveShadow=shadow;parent.add(m);return m;}
function box(x,y,z,w,h,d,m=M.stone,parent=world,collision=false){const obj=mesh(tiledBox(boxGeo,m,w,h,d),m,[x,y,z],[w,h,d],parent);if(collision){colliders.push({x,z,w,d,minY:y-h/2,maxY:y+h/2});solidMeshes.push(obj);}return obj;}
function cylinder(x,y,z,r,h,m=M.dark,parent=world){const scale=[r,h,r];return mesh(m===M.stone?columnSurfaceGeometry(cylGeo,m,scale):cylGeo,m,[x,y,z],scale,parent);}
function sphere(x,y,z,sx,sy,sz,m=M.skin,parent=world){return mesh(sphereGeo,m,[x,y,z],[sx,sy,sz],parent);}
const signage=createSignage({anisotropy:Math.min(16,renderer.capabilities?.getMaxAnisotropy?.()??16)});
const label=signage.label;
function painting(x,y,z,w,h,rotation=0){const c=document.createElement('canvas');c.width=256;c.height=384;const p=c.getContext('2d');const g=p.createRadialGradient(120,120,5,128,180,240);g.addColorStop(0,'#665543');g.addColorStop(1,'#12171a');p.fillStyle=g;p.fillRect(0,0,256,384);p.fillStyle='#171d1d';p.beginPath();p.ellipse(128,345,100,155,0,0,7);p.fill();p.fillStyle='#6f6a52';p.beginPath();p.ellipse(128,130,43,65,-.08,0,7);p.fill();p.fillStyle='#28291f';p.beginPath();p.ellipse(128,94,47,30,0,Math.PI,Math.PI*2);p.fill();p.fillRect(100,122,22,6);p.fillRect(139,122,20,6);p.fillStyle='#b8b493';p.fillRect(106,123,4,3);p.fillRect(144,123,4,3);p.strokeStyle='#302f23';p.beginPath();p.moveTo(130,137);p.lineTo(124,162);p.lineTo(137,163);p.stroke();p.fillRect(115,180,27,3);for(let i=0;i<2000;i++){p.fillStyle='rgba(0,0,0,.04)';p.fillRect(rng()*256,rng()*384,rand(1,6),rand(1,10));}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const grp=new T.Group();grp.position.set(x,y,z);grp.rotation.y=rotation;world.add(grp);box(0,0,0,w+.18,h+.18,.10,M.wood,grp);for(const side of [-1,1]){box(side*(w/2+.045),0,.056,.09,h+.18,.05,M.gold,grp);box(0,side*(h/2+.045),.056,w,.09,.05,M.gold,grp);}const art=new T.PlaneGeometry(w,h),uv=art.attributes.uv,aspect=w/h,sourceAspect=c.width/c.height;if(aspect>sourceAspect){const span=sourceAspect/aspect,center=Math.min(1-span/2,.58);for(let i=0;i<uv.count;i++)uv.setY(i,center+(uv.getY(i)-.5)*span);}else{const span=aspect/sourceAspect;for(let i=0;i<uv.count;i++)uv.setX(i,.5+(uv.getX(i)-.5)*span);}const artwork=mesh(art,new T.MeshStandardMaterial({map:tex,roughness:1}),[0,0,.083],null,grp);grp.name='Blackthorn portrait';portraits.push({group:grp,artwork,w,h});return grp;}
const hemisphere=new T.HemisphereLight(0x8ba8bf,0x222019,1.1);scene.add(hemisphere);const moonlight=new T.DirectionalLight(0x93b9de,2.8);moonlight.position.set(-64,112,12);moonlight.target.position.set(0,0,-36);scene.add(moonlight.target);moonlight.castShadow=true;moonlight.shadow.mapSize.set(2048,2048);Object.assign(moonlight.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:240});moonlight.shadow.bias=-.00003;moonlight.shadow.normalBias=.008;scene.add(moonlight);
const moon=sphere(-35,44,-55,3,3,3,new T.MeshBasicMaterial({color:0xc6d9db}));moon.castShadow=false;
function point(x,y,z,color,intensity=2,dist=9){const l=new T.PointLight(color,intensity,dist,1.5);l.position.set(x,y,z);scene.add(l);lamps.push({light:l,base:intensity,phase:rand(0,7)});return l;}
function candle(x,y,z,parent=world){cylinder(x,y+.14,z,.045,.28,M.white,parent);const f=sphere(x,y+.31,z,.028,.07,.028,new T.MeshBasicMaterial({color:0xffc77c}),parent);return f;}
function sconce(x,y,z,rot=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rot;world.add(g);box(0,0,0,.16,.5,.1,M.gold,g);box(0,-.12,.17,.07,.07,.4,M.gold,g);candle(0,-.08,.32,g);point(x+Math.sin(rot)*.34,y+.26,z+Math.cos(rot)*.34,0xffb564,4.5,7);}
// GROUNDS: grass lawns, clear stone paths, trees and bounded iron fencing.
const earth=createGrassMaterial();
alignGrassPatch(box(0,-.22,-26.5,112,.3,117,earth));
// Cut only the new stair footprint; the former doorway obstruction is turf.
const turfNorth=-110,turfSouth=-85,leftStair=CELLAR.x-CELLAR.stairWidth/2,rightStair=CELLAR.x+CELLAR.stairWidth/2;
for(const [a,b] of [[turfNorth,CELLAR.topZ],[CELLAR.bottomZ,turfSouth]])alignGrassPatch(box(0,-.22,(a+b)/2,112,.3,b-a,earth));
for(const [a,b] of [[-56,leftStair],[rightStair,56]])alignGrassPatch(box((a+b)/2,-.22,(CELLAR.topZ+CELLAR.bottomZ)/2,b-a,.3,CELLAR.bottomZ-CELLAR.topZ,earth));
for(const {x,z,w,d,y} of ESTATE_PAVING)box(x,y,z,w,.1,d,M.wetStone);
for(let side of [-1,1]){if(side<0)box(side*54,1,-39,.45,2.1,138,M.brick,world,true);else for(const [z,d] of [[-52.75,110.5],[19.75,20.5]])box(54,1,z,.45,2.1,d,M.brick,world,true);for(let z=-107;z<30;z+=1.6){if(side>0&&z>2.5&&z<9.5)continue;cylinder(side*54,2.4,z,.035,1.3);mesh(new T.ConeGeometry(.11,.24,4),M.dark,[side*54,3.14,z]);}}
for(let z of [-108,30]){box(0,.4,z,108,.8,.45,M.brick,world,true);for(let x=-53;x<=53;x+=1.6){cylinder(x,1.45,z,.035,2.1);mesh(new T.ConeGeometry(.1,.24,4),M.dark,[x,2.6,z]);}box(0,1.15,z,108,.05,.05,M.dark);box(0,2.1,z,108,.05,.05,M.dark);}
function branch(a,b,r){const dir=new T.Vector3().subVectors(b,a),m=mesh(new T.CylinderGeometry(r*.35,r,dir.length(),7),M.wood,a.clone().add(b).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());}
const estateTrees=[];for(let i=0;i<54;i++){const x=(i%2?1:-1)*rand(49,52),rawZ=rand(-91,26),z=x>0&&rawZ>1&&rawZ<11?rawZ+12:rawZ,h=rand(5,10);cylinder(x,h/2,z,.23,h,M.wood);colliders.push({x,z,w:.7,d:.7});estateTrees.push({x,z});for(let j=0;j<6;j++){let a=new T.Vector3(x,h*.55,z),b=new T.Vector3(x+rand(-3,3),h+rand(-2,2),z+rand(-3,3));branch(a,b,.13);branch(b,b.clone().add(new T.Vector3(rand(-1.5,1.5),rand(1,2),rand(-1.5,1.5))),.06);}}
function lampPost(x,z){cylinder(x,1.8,z,.07,3.6);cylinder(x,.15,z,.25,.3);for(const y of [3.31,3.89])box(x,y,z,.55,.055,.55,M.dark);for(const dx of [-.255,.255])for(const dz of [-.255,.255])box(x+dx,3.6,z+dz,.035,.55,.035,M.dark);const bulb=box(x,3.6,z,.42,.43,.42,new T.MeshStandardMaterial({color:0xffc884,emissive:0xffbb66,emissiveIntensity:2}));bulb.castShadow=false;mesh(new T.ConeGeometry(.45,.3,4),M.dark,[x,4.03,z]);point(x,3.5,z,0xffbb77,9,11);}
lampPost(-7,21);lampPost(7,21);lampPost(-47,-36);lampPost(47,18);
// MANSION: accessible ground floor with open central circulation.
box(0,.02,0,28,.15,24,M.floor);box(0,6.9,0,28,.25,24,M.wood);rugs.add(0,0,6,22);
function wall(x,z,w,d,h=6.8){return box(x,h/2,z,w,h,d,M.wall,world,true);}
wall(-8.6,12,10.8,.55);wall(8.6,12,10.8,.55);box(0,5.4,12,6.4,2.8,.55,M.wall);for(const x of [-8.5,8.5])wall(x,-12,11,.55);box(0,5.5,-12,6,2.6,.55,M.wall);for(const x of [-14,14]){for(const z of [-7.5,7.5])wall(x,z,.55,9);}
for(let x of [-5.6,5.6]){const start=x<0?-1.4:-3.6;wall(x,(-12+start)/2,.38,12+start,UPPER_SLAB_BOTTOM);wall(x,7.8,.38,8.4,UPPER_SLAB_BOTTOM);for(let z of [start,3.6]){box(x,2.2,z,.65,4.4,.28,M.wood);box(x,4.25,z,.68,.16,.7,M.gold);}}
for(let z of [-12,12]){for(const side of [-1,1])box(side*(z===12?8.6:8.5),.2,z,z===12?10.8:11,.3,.65,M.wood);box(0,6.65,z,28,.24,.72,M.trim);}for(let x of [-14,14]){for(const z of [-7.5,7.5])box(x,.2,z,.65,.3,9,M.wood);box(x,6.65,0,.72,.24,24,M.trim);}
// Exterior ornament and gothic windows.
// Crossbars meet the vertical mullion at their ends, with no competing faces.
for(let x of [-10,-7,7,10]){box(x,3.4,12.32,1.5,3.1,.08,M.dark);box(x,3.4,12.38,1.28,2.9,.04,M.glass);box(x,3.4,12.41,.05,3,.05,M.gold);for(const side of [-1,1])box(x+side*.3375,3.4,12.41,.625,.05,.05,M.gold);box(x,1.9,12.36,1.9,.15,.35,M.stone);}

// Sloping roof and attic facade.
const roofMat=M.roof.clone();roofMat.side=T.DoubleSide;const roofGeo=mansionRoofGeometry(roofMat);const mainRoof=mesh(roofGeo,roofMat,[0,0,0]);mainRoof.name='Blackthorn slate roof';box(-10,9,-5,1.3,6,1.5,M.brick);box(9,9,-8,1.3,6,1.5,M.brick);
const crest=mesh(new T.CircleGeometry(.68,32),label('B\n1893','#d4b77a',512,{width:1.36,height:1.36,kind:'crest',maxLines:2}),[0,8.45,12.84],[1,1,1]);
box(0,.08,13,8,.15,3,M.stone);
for(const side of [-1,1]){const hinge=new T.Group();hinge.name='Fully open main entrance door';hinge.position.set(side*3.2,0,12.1);hinge.rotation.y=side*1.75;world.add(hinge);box(-side*.5,2,0,1,4,.18,M.wood,hinge);box(-side*.5,3,.116,.6,.8,.05,M.gold,hinge);}
// Hall columns, balcony, staircase alcove and chandelier.
for(let x of [-4.5,4.5])for(let z of [-8,7]){if(x<0&&z<0)continue;cylinder(x,6.55,z,.43,.3,M.stone);}
// Hang the hall portrait on a solid side wall below the upstairs slab.
painting(5.31,2.55,5.25,2.5,1.8,-Math.PI/2);for(let x of [-3,3])sconce(x,3.6,-11.7);
cylinder(0,(5.9+UPPER_CEILING)/2,1,.03,UPPER_CEILING-5.9,M.gold);const ring=mesh(new T.TorusGeometry(1.25,.045,8,32),M.gold,[0,5.85,1]);ring.rotation.x=Math.PI/2;for(let i=0;i<10;i++){let a=i/10*Math.PI*2;candle(Math.cos(a)*1.25,5.85,1+Math.sin(a)*1.25);sphere(Math.cos(a)*1.25,5.65,1+Math.sin(a)*1.25,.035,.13,.035,M.glass);}point(0,5.5,1,0xffc17b,22,19);
for(let x of [-5.35,5.35])for(let z of [-7,7])sconce(x,3,z,x<0?Math.PI/2:-Math.PI/2);
// Library: bookcases, furniture, scattered books.
function bookcase(x,z,rot=0){return furnishings.bookcase(x,z,{rotation:rot});}
for(let z of [-8.5,-4.8,4.8,8.5])bookcase(-13.25,z,Math.PI/2);bookcase(-9,-11.35);bookcase(-9,11.35,Math.PI);
furnishings.table(-9.2,-4.65,{w:1.75,d:.82,desk:true});furnishings.chair(-9.2,-3.59);point(-9.4,1.5,-4.65,0xffb265,4,7);
function sofa(x,z,rot=0){return furnishings.sofa(x,z,{rotation:rot});}
sofa(-10,5.3);furnishings.table(-10,3.55,{w:1.5,d:.72,h:.42});candle(-10,.515,3.55);
// Dining room and fireplace.
furnishings.table(9.7,5,{w:4.45,d:1.20,h:.78});for(const x of [8.2,9.7,11.2])for(const side of [-1,1]){furnishings.chair(x,5+side*.98,{rotation:side<0?Math.PI:0});mesh(new T.CylinderGeometry(.14,.14,.015,20),M.white,[x,.883,5+side*.36]);}for(const x of [8.2,9.7,11.2])candle(x,.875,5);point(9.7,1.7,5,0xffb564,9,10);
box(13.55,1.5,-7,1,3,3.5,M.stone,world,true);box(12.98,1,-7,.05,1.8,2.3,M.dark);box(12.92,.35,-7,.1,.16,2,M.wood);const fire=sphere(12.88,.65,-7,.14,.55,.7,new T.MeshBasicMaterial({color:0xff8f35}));point(12.1,1,-7,0xff8b38,13,10);box(13.25,3,-7,1.6,.25,4.0,M.stone);
// The mantel has less than a meter of headroom; use the clear north wall.
painting(9.5,2.45,-11.65,2,2.5);sofa(9.5,-8.5,Math.PI);
// Keep this frame above the chair rail and between the window curtains.
painting(13.64,2.65,6.9,2.2*2/3,2.2,-Math.PI/2);
// Environmental storytelling: boards, debris, cloth rugs, broken plaster.
for(let i=0;i<24;i++){let x=rand(-13,13),z=rand(-11,11);if(Math.abs(x)<3||groundDoors.some(d=>Math.abs(x-d.x)<(d.axis==='x'?d.width/2:3)+.4&&Math.abs(z-d.z)<(d.axis==='z'?d.width/2:3)+.4))continue;let debris=box(x,.16,z,rand(.08,.35),rand(.08,.3),rand(.1,.4),i%2?M.stone:M.wood);debris.rotation.set(rand(0,1),rand(0,3),rand(0,1));}
for(let x of [-10,10])for(let k=0;k<2;k++){const board=box(x,3+k*.8,12.44,1.8,.14,.05,M.wood);board.rotation.z=k?.14:-.25;}
// Interactive machines.
// Center downstairs Ironheart between the column base (z=7.4) and entrance trim (z=11.675).
// Deadeye is centered on the dining room's front wall, between the partition and outer wall trim.
const perkDefs=[{id:'iron',name:'IRONHEART',icon:'♥',price:2500,color:0xd54337,hex:'#ef7969',desc:'Double maximum health',x:-4.94,z:(7.4+11.675)/2},{id:'quick',name:'QUICKHANDS',icon:'ϟ',price:1500,color:0x46bea1,hex:'#66dcb7',desc:'Reload twice as fast',x:-6.265,z:8.3},{id:'eye',name:'DEADEYE',icon:'◎',price:2000,color:0xc79435,hex:'#e6bf61',desc:'Increase weapon damage 50%',x:(5.79+13.675)/2,z:11.2},{id:'stride',name:'NIGHTSTRIDE',icon:'»',price:1500,color:0x4d88c7,hex:'#7aaff0',desc:'Move and sprint 30% faster',x:20,z:-12.86}];
const stationBuilder=createStationBuilder({world,colliders,solidMeshes,interactables,label});
function perkStation(def,x=def.x,z=def.z,y=0){return stationBuilder.add({...def,x,z,y,type:'perk',modelCaption:def.desc});}
// Quickhands backs onto the library partition; the previously aligned perks retain their facing.
for(const def of perkDefs)perkStation({...def,rotation:def.id==='quick'?-Math.PI/2:def.id==='iron'?Math.PI/2:(def.id==='eye'||def.id==='stride')?Math.PI:0});
function station(x,z,name,type,price,y=0,rotation=0){return stationBuilder.add({x,z,y,rotation,name,type,price,hex:type==='smg'?'#7aaff0':type==='ammo'?'#67efbb':'#e6bf61',modelCaption:type==='ammo'?'RESTOCK · ALL WEAPONS':type==='shotgun'?'M12 · CLOSE-RANGE STOPPING POWER':type==='bushmaster'?'15 ROUNDS · SEMI-AUTO · 10× SCOPE':'RAVEN · RAPID FIRE'});}
function powerStation(x,z,power,y=0,rotation=0){const def=POWERUPS[power];return stationBuilder.add({x,z,y,rotation,type:'powerup',power,name:def.name,price:power==='double'?800:900,hex:def.hex,modelCaption:power==='double'?'THE TWOFOLD RELIC · 20 SECONDS':'THE ENDLESS ARSENAL · 12 SECONDS'});}
station(-7,13.2,'AMMUNITION','ammo',350);
station(-6.315,-8,'M12 SHOTGUN','shotgun',1200,0,-Math.PI/2);
station(6.31,-5.3,'RAVEN SMG','smg',1500,0,Math.PI/2);
const groundForge=stationBuilder.add({x:4.15,z:-10.65,name:'THE SOUL FORGE',type:'upgrade',pedestal:false,price:FORGE.prices[0],hex:'#c1a1ff',modelCaption:'2× BASE DAMAGE · +25% AMMO · 25% FASTER RELOAD'});point(4.15,2,-10.65,0xa474ff,8,8);
const groundForgePlaque=mesh(new T.PlaneGeometry(1.85,.72),M.stone,[4.15,2.43,-11.69]);
configureForgeStation(groundForge.station,{plates:[groundForgePlaque],label});
// The ballroom shrine sits in the clear outer-wall bay between its windows.
powerStation(-41.21,0,'double',0,Math.PI/2);powerStation(41.24,0,'grenades',0,-Math.PI/2);
// Rain and low courtyard mist.
const rainGeo=new T.BufferGeometry();const rainPos=new Float32Array(1600*3);for(let i=0;i<rainPos.length;i+=3){rainPos[i]=rand(-22,22);rainPos[i+1]=rand(0,18);rainPos[i+2]=rand(-2,42);}rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:0x90aebd,size:.033,transparent:true,opacity:.35}));scene.add(rain);
const mistCanvas=document.createElement('canvas');mistCanvas.width=mistCanvas.height=128;const mx=mistCanvas.getContext('2d');const mg=mx.createRadialGradient(64,64,2,64,64,62);mg.addColorStop(0,'rgba(160,190,190,.24)');mg.addColorStop(1,'rgba(160,190,190,0)');mx.fillStyle=mg;mx.fillRect(0,0,128,128);const mistTex=new T.CanvasTexture(mistCanvas);const mist=[];for(let i=0;i<26;i++){const s=new T.Sprite(new T.SpriteMaterial({map:mistTex,transparent:true,depthWrite:false,opacity:.1}));s.position.set(rand(-40,40),rand(.1,.6),rand(17,27));s.scale.set(rand(8,15),rand(1,2),1);scene.add(s);mist.push(s);}
// Floating view model: a detailed receiver, rail, sight, stock and barrel.
const gunRoot=new T.Group();camera.add(gunRoot);gunRoot.position.set(.28,-.26,-.48);const gunGroups={};
function buildGun(type){
  const g=createWeaponModel(type,{hands:false});gunRoot.add(g);
  if(g.userData.optic)batchArticulated(g.userData.optic.housing);
  if(g.userData.optic?.magnification){
    // A single opaque annulus frames the magnified view without another world
    // render target. The rack keeps the complete, unmasked scope model.
    const sight=g.userData.optic,mask=new T.Mesh(new T.RingGeometry(sight.maskRadius??.023,.9,64),new T.MeshBasicMaterial({color:0x05090c,side:T.DoubleSide}));
    mask.position.set(0,0,sight.maskZ??.094);mask.name='Scope peripheral mask';mask.visible=false;sight.group.add(mask);sight.mask=mask;
  }
  // Batch the fixed gun by finish; the clear optic and reticle remain separate.
  batchArticulated(g.userData.body);
  const viewMats=new Map();g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(!viewMats.has(o.material)){const vm=o.material.clone();vm.depthTest=true;vm.depthWrite=!vm.transparent&&!o.userData.reticle;viewMats.set(o.material,vm);}o.material=viewMats.get(o.material);o.renderOrder=o.userData.reticle?4:o.material.transparent?2:0;}});
  return g;
}
for(const k of ['glock','rifle','shotgun','smg','lmg','bushmaster'])gunGroups[k]=buildGun(k);
const scopedGuns=Object.entries(gunGroups).filter(([,g])=>g.userData.optic?.mask).map(([type,g])=>({type,sight:g.userData.optic}));
const grenadeAssets=createGrenadeAssets(batchArticulated),grenadeThrow=createGrenadeThrow(grenadeAssets,batchArticulated);camera.add(grenadeThrow.root);
const flashMat=new T.MeshBasicMaterial({color:0xffd37a,transparent:true,opacity:1,depthWrite:false});const flash=mesh(new T.ConeGeometry(.1,.32,8),flashMat,[0,0,-.9],null,gunRoot,false);flash.rotation.x=-Math.PI/2;flash.renderOrder=3;flash.material.depthTest=true;flash.visible=false;const muzzleLight=new T.PointLight(0xffc278,0,6);gunRoot.add(muzzleLight);muzzleLight.position.set(0,0,-.7);
gunRoot.traverse(o=>o.layers.set(1));muzzleLight.layers.enable(1);const viewFill=new T.HemisphereLight(0xcbd9df,0x4d5544,2.2);viewFill.layers.set(1);scene.add(viewFill);const viewKey=new T.DirectionalLight(0xe6d0af,2.3);viewKey.layers.set(1);viewKey.position.set(-1,3,2);viewKey.target=gunRoot;camera.add(viewKey);
// A shaped torch beam: wider cone, soft rim, and a core that no longer clips the floor to white.
const FLASHLIGHT_INTENSITY=22;
const flashlight=new T.SpotLight(0xe2eddd,FLASHLIGHT_INTENSITY,28,.5,.35,1.1);flashlight.map=flashlightBeamTexture();flashlight.position.set(.18,-.1,0);camera.add(flashlight);camera.add(flashlight.target);flashlight.target.position.set(0,0,-15);flashlight.visible=true;let flashlightOn=true;
// Clear each frame and resolve with spatial antialiasing; preserve the 15% brightness boost.
const film=makeFilmPass(innerWidth,innerHeight);const rt=film.target,postMat=film.material;const postScene=new T.Scene();const postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
// The night sky uses layered clouds instead of a flat backdrop.
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time:{value:0},skyLight:{value:1}},vertexShader:'varying vec3 localP;void main(){localP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 localP;uniform float time;uniform float skyLight;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}void main(){vec3 d=normalize(localP);vec2 uv=d.xz/(abs(d.y)+.4)*3.;uv+=vec2(time*.007,time*.002);float cloud=0.;float a=.5;for(int i=0;i<5;i++){cloud+=noise(uv)*a;uv*=2.03;a*=.5;}vec3 base=mix(vec3(.027,.042,.061),vec3(.008,.019,.039),max(0.,d.y));base+=vec3(.024,.032,.035)*smoothstep(.32,.8,cloud);float halo=pow(max(0.,dot(d,normalize(vec3(-35.,44.,-55.)))),18.);base+=vec3(.04,.065,.08)*halo;gl_FragColor=vec4(base*skyLight,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});const sky=new T.Mesh(new T.SphereGeometry(220,32,16),skyMat);sky.renderOrder=-5;scene.add(sky);
const starGeo=new T.BufferGeometry(),starPos=[];for(let i=0;i<300;i++){const p=new T.Vector3(rand(-1,1),rand(.1,1),rand(-1,1)).normalize().multiplyScalar(90);starPos.push(p.x,p.y,p.z);}starGeo.setAttribute('position',new T.Float32BufferAttribute(starPos,3));scene.add(new T.Points(starGeo,new T.PointsMaterial({color:0xb4cedc,size:.09,transparent:true,opacity:.45,depthWrite:false})));
// Carved wall panels, interior windows, cobwebs, and architectural trim.
for(const side of [-1,1])for(let z=-10;z<=10;z+=2){if(Math.abs(z)<4)continue;box(side*13.63,.72,z,.09,1.3,1.8,M.wood);box(side*13.55,1.4,z,.12,.08,2,M.gold);for(const dz of [-.7,.7])box(side*13.54,.75,z+dz,.05,1.03,.055,M.gold);for(const y of [.24,1.22])box(side*13.54,y,z,.05,.055,1.45,M.gold);}
for(const side of [-1,1])for(const z of [-4,4,10]){const g=new T.Group();g.position.set(side*13.66,3.5,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;world.add(g);box(0,0,0,1.85,3.2,.1,M.wood,g);box(0,.0,.061,1.55,2.93,.025,M.glass,g);box(0,0,.09,.04,3,.05,M.gold,g);box(0,0,.09,1.6,.04,.05,M.gold,g);for(const dx of [-1.05,1.05]){box(dx,.05,0,.28,3.5,.15,M.red,g);}sphere(0,1.65,0,.93,.42,.06,M.wood,g);}
box(0,9.7,-9.7,3.8,6,3.8,M.brick);const towerTop=mesh(new T.ConeGeometry(3.2,5,4),M.roof,[0,15,-9.7]);towerTop.rotation.y=Math.PI/4;box(0,11.8,-7.78,1.8,2.1,.06,M.glass);box(0,11.8,-7.73,.06,2.1,.06,M.gold);
const webMat=new T.LineBasicMaterial({color:0xaeb7a4,transparent:true,opacity:.14});for(const corner of [[-5.3,6.6,11.6],[5.3,6.6,11.6],[-13.6,6.6,-11.6],[13.6,6.6,-11.6]]){const pp=[],sign=corner[0]<0?1:-1;for(let i=0;i<8;i++){const a=i/7*Math.PI/2;pp.push(0,0,0,Math.cos(a)*sign*1.5,-Math.sin(a)*1.5,0);}for(let r=.35;r<1.6;r+=.25)for(let i=0;i<7;i++){const a=i/7*Math.PI/2,b=(i+1)/7*Math.PI/2;pp.push(Math.cos(a)*sign*r,-Math.sin(a)*r,0,Math.cos(b)*sign*r,-Math.sin(b)*r,0);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pp,3));const w=new T.LineSegments(geo,webMat);w.position.set(...corner);world.add(w);}
const shed=buildShed({world,M,box,mesh,cylinder,label,colliders,solidMeshes,interactables,batchArticulated});
const shedEntrance={type:'shedDoor',x:SHED.x,z:SHED_FRONT+.6,y:0,price:0,name:'GROUNDSKEEPER’S SHED',hex:'#c4c9a9',get open(){return shed.open;}};interactables.push(shedEntrance);
earth.userData.lawnMap=bakeLawnMap(estateTrees)||earth.userData.lawnMap;
const estateDetail=addEstateDetail({scene,world,M,box,mesh,mistTex,fire,colliders,interactables,trees:estateTrees});
const expansion=buildMansionExpansion({scene,world,M,box,mesh,cylinder,sphere,painting,sofa,bookcase,label,station,colliders,furnishings,rugs});
const rotundaBell=buildRotundaBell({world,solidMeshes,interactables,batchArticulated});
const secondFloor=buildSecondFloor({scene,world,M,box,mesh,cylinder,sphere,label,colliders,solidMeshes,interactables,station,furnishings,rugs});
// Olivia's attic (v131 Easter egg): built with the house, sealed until 25 bone chips.
const attic=buildOliviaAttic({world,M,box,colliders,solidMeshes,interactables,upperFixtures:secondFloor.fixtures});
let boneChips=0,atticState={opening:false,time:0,open:false},oliviaCheer=0;
const facade=buildFacade({world,M,secondFloor,colliders,solidMeshes});
// The family crest now sits in the pediment's roundel.
crest.position.set(0,PORTICO.entablature[1]+15*PORTICO.slope*.42,12.24+.925);crest.scale.set(1.45,1.45,1);if(!crest.parent)world.add(crest);
// Upper exhibits use solid wall bays, with their fronts facing the room.
// Keep the exterior windows, bedroom furniture and wing doorways clear.
for(const [id,x,z,rotation] of [
  ['iron',-41.24,-4,Math.PI/2],['quick',-14.5825,-5.2,-Math.PI/2],
  ['eye',14.5825,-4.7,Math.PI/2],['stride',41.24,-4,-Math.PI/2]
])perkStation({...perkDefs.find(p=>p.id===id),rotation},x,z,UPPER_Y);
station(-41.21,4.2,'M12 SHOTGUN','shotgun',1200,UPPER_Y,Math.PI/2);
station(41.21,4.2,'RAVEN SMG','smg',1500,UPPER_Y,-Math.PI/2);
station(27.3675,-5.2,'AR-15 / .450 BUSHMASTER','bushmaster',2500,UPPER_Y,-Math.PI/2);
powerStation(-18,2.5825,'double',UPPER_Y);powerStation(18,2.5825,'grenades',UPPER_Y);
stationBuilder.add({x:16.8,z:-11.2775,y:UPPER_Y,name:'AEGIS / BODY ARMOR',type:'armor',price:2500,hex:'#8ee0df',modelCaption:'2,500 ESSENCE · HEALTH SHIELD'});
const cellar=buildCellar({world,M,box,mesh,cylinder,label,colliders,solidMeshes,interactables,batchArticulated});
stationBuilder.add({x:CELLAR.x,z:CELLAR.z+CELLAR.d/2-.95,y:CELLAR.y,rotation:Math.PI,name:'THE CELLAR SOUL FORGE',type:'upgrade',price:FORGE.prices[0],hex:'#c1a1ff',modelCaption:'2× BASE DAMAGE · +25% AMMO · 25% FASTER RELOAD'});
const cellarEntrance={type:'cellarDoor',x:CELLAR.x,z:CELLAR.topZ-.5,y:0,price:0,name:'STORM CELLAR',hex:'#8ee0df'};interactables.push(cellarEntrance);
const graveyard=buildGraveyard({world,M,earth,box,mesh,cylinder,label,colliders,solidMeshes,interactables,batchArticulated});
const bella=createBellaCompanion({world,colliders,solidMeshes,interactables,batchArticulated});
const eventVisuals=createWorldEventVisuals(world),baseFogDensity=scene.fog.density;
// Survival systems.
const armorStations=interactables.filter(s=>s.type==='armor'),forgeStations=interactables.filter(s=>s.type==='upgrade');
for(const station of forgeStations)for(const material of station.forgeMaterials)patchLightingMaterial(material);
for(const s of armorStations)for(const model of s.nanoModels){batchArticulated(model);model.traverse(o=>{o.userData.dynamic=true;o.userData.collectible=true;});}
for(const portrait of portraits){portrait.group.updateWorldMatrix(true,true);portrait.matrix=portrait.group.matrixWorld.clone();portrait.bounds=new T.Box3().setFromObject(portrait.group);portrait.normal=new T.Vector3(0,0,1).transformDirection(portrait.matrix);}
for(const {hinge} of [...cellar.doors,...graveyard.doors,...shed.doors])hinge.userData.lightingBlocker=true;
prepareLightingMaterials(world);signage.capture(world);batchStaticWorld();
const bloodPool=createEffectPool(world,M.blood,'particle',256),markPool=createEffectPool(world,M.dark,'mark',96);
const lighting=createLighting({renderer,scene,world,camera,moonlight,flashlight});
const cellarFixtures=[-6,2,8].flatMap(z=>[-1,1].map(side=>({x:CELLAR.x+side*(CELLAR.w/2-.7),y:-1.6,z:CELLAR.z+z,color:0x80cbd2,intensity:6,distance:11,cellar:true})));
const tombFixtures=[-1,1].map(side=>({x:MAUSOLEUM.x+side*3.2,y:1.8,z:MAUSOLEUM.z-1,color:0xffc777,intensity:5,distance:8}));
const environmentLights=createEnvironmentLights(scene,[...expansion.fixtures,...cellarFixtures,...tombFixtures,...shed.fixtures],secondFloor.fixtures,lighting);
// Blackout event: every estate light fades; the flashlight, enemy eyes, pickups and event essence never do.
const blackout=createBlackout({scene,world,hemisphere,moonlight,viewLights:[viewFill,viewKey],environmentLights,sky:skyMat.uniforms,skip:o=>{for(let p=o;p;p=p.parent)if(p===eventVisuals.root||p.userData.enemy||p.userData.companion||p.userData.lightingTransient||p.userData.powerup)return true;return false;}});
const frozenTransforms=freezeStaticTransforms(scene,world);
for(const m of solidMeshes){m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}
const enemyAssets=createEnemyAssets(batchArticulated),combatLights=createCombatLights(scene,lighting);
// Sir Blackthorn and the curse ladder (v130).
const bossFx=createBossEffects(world),curseLadder=createCurseLadder();
let boss={stage:'dormant',enemy:null,clock:0,summons:0,lance:0,cry:0,cast:null,victories:0};
for(const rig of enemyAssets.templates){prepareLightingMaterials(rig.group);const rage=rig.group.clone(true);enemyAssets.enrage({group:rage});prepareLightingMaterials(rage);}
const powerupAssets=createPowerupAssets();
const {weapons,weaponAimFov,waveConfig,isBlocked,indexColliders}=await import('./core.mjs?v=116');indexColliders(colliders);let nav=makeNavigation();
function makeNavigation(){
  const navigation=buildVerticalNavigation(colliders),brutes=buildVerticalNavigation(colliders,{radius:BRUTE.radius,groundHeight:BRUTE.height,upperHeight:BRUTE.crouchHeight}),rebuild=navigation.rebuild;
  bella.setNavigation(bella.unlocked?buildVerticalNavigation(colliders,{radius:BELLA.bodyRadius,groundHeight:BELLA.height,upperHeight:BELLA.height}):null);
  // One shared field per body size; never rebuild a route for each enemy/frame.
  navigation.brutes=brutes;navigation.rebuild=(x,z,y=0)=>{rebuild(x,z,y);brutes.rebuild(x,z,y);};
  return navigation;
}
let armor=0,armorMax=0,armorTier=0,frenzyWave=0,waveFiveFinale=null;
let mode='menu',elapsed=0,lookYaw=0,lookPitch=0,mouseDown=false,aiming=false,pointer=false,lastTime=performance.now(),recoil=0,shotTimer=0,reloadLeft=0,reloadDuration=0,flashTime=0,hitTime=0,damageFlash=0,nukeFlashTime=0,toastTime=0,bannerTime=0,waveDelay=7,spawnTimer=0,toSpawn=0,spawned=0,navTimer=0,walkPhase=0,jumpV=0,feetY=0,grounded=true,lastHurt=-20,grenades=3,weapon='glock',points=500,totalScore=0,kills=0,wave=0,health=100,maxHealth=100,runTime=0,perkOwned=new Set(),inventory={};const keys=new Set(),player=new T.Vector3(0,0,20);
const curse=createCurse();
const curseUI=createCurseUI({document,curse});
const weaponRecoil=createWeaponRecoil(),combatHud=createCombatHud({hit:$('hit'),headshot:$('headshotIndicator'),directions:$('damageDirections'),toggle:$('headshotToggle')});
let reloadHudVisible=false,reloadHudProgress=-1,reloadHudPercent=-1;
const worldEvents=createWorldEvents({
  graves:graveyard.graves,
  onWarning(id,graves){
    const def=WORLD_EVENTS[id];announce(def.name,def.warning);
    if(id==='awakening')eventVisuals.mark(graves);
    if(id==='shroud'){tone(320,.9,.055,'sine',95);tone(155,1.4,.035,'triangle',45);}
    else if(id==='surge')tone(65,1.2,.065,'sawtooth',220);
    else if(id==='blackout'){tone(120,1.2,.035,'square',117);noise(.35,.05,1800);}
    else {noise(.7,.07,240);tone(55,1,.045,'triangle',30);}
    updateHud();
  },
  onStart(id){const def=WORLD_EVENTS[id];announce(def.name,def.description);if(id==='surge')tone(220,.8,.065,'triangle',55);if(id==='blackout'){tone(170,1.4,.08,'sawtooth',24);noise(.18,.07,900);}updateHud();},
  onEnd(id,reason){if(id==='blackout'&&reason==='expired')tone(32,1.1,.05,'sawtooth',150);eventVisuals.clearMarkers();scene.fog.density=baseFogDensity;setOpacity('eventPulse',0);$('eventStatus').innerHTML='';},
  spawn:spawnGraveEnemy,
});
function spawnGraveEnemy({grave,slot}){
  if(mode!=='playing'||zombies.filter(e=>!e.dead).length>=EVENT_RULES.aliveLimit)return false;
  const body=enemyBody(),offsets=slot?[[.58,.38],[-.58,.38],[0,.9],[.8,0]]:[[0,.22],[.58,.38],[-.58,.38],[0,.9]];
  for(const [dx,dz] of offsets){
    const x=grave.x+dx,z=grave.z+dz;
    if(isBlocked(x,z,body.radius,colliders,undefined,0,body.height)||supportBelow(x,z,0)!==0||!nav.direction(x,z,0)?.reachable)continue;
    if(Math.hypot(x-player.x,z-player.z)<body.radius+PLAYER_RADIUS+.12||!crowd.canOccupy(x,z,0,body.radius+.06,body.height))continue;
    const e=makeZombie(x,z);e.graveBorn=true;e.bonusEssence=EVENT_RULES.graveBonus;e.emergeLeft=1.05;e.group.position.y-=1.65;return true;
  }
  return false;
}

let bestWave=0,bestKills=0;try{const b=JSON.parse(localStorage.getItem('blackthorn-best')||'{}');bestWave=b.wave||0;bestKills=b.kills||0;}catch{}
$('best').textContent=bestWave?`PERSONAL BEST / WAVE ${bestWave} · ${bestKills} KILLS`:'';
const soundOn=()=>$('sound').checked;let audio=null,noiseBuffer=null,ambience=null;
function initAudio(){if(audio){if(audio.state==='suspended')audio.resume();return;}try{audio=new (window.AudioContext||window.webkitAudioContext)();noiseBuffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const n=audio.createBufferSource();n.buffer=noiseBuffer;n.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=200;ambience=audio.createGain();ambience.gain.value=soundOn()?.018:0;n.connect(filter);filter.connect(ambience);ambience.connect(audio.destination);n.start();}catch{}}
function tone(freq,dur=.1,volume=.06,type='sine',end=0){if(!audio||audio.state==='closed'||!soundOn())return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(end||freq*.65,audio.currentTime+dur);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur);}
function noise(dur,volume=.15,frequency=1600){if(!audio||audio.state==='closed'||!soundOn())return;const n=audio.createBufferSource();n.buffer=noiseBuffer;const g=audio.createGain(),f=audio.createBiquadFilter();f.type='lowpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);n.connect(f);f.connect(g);g.connect(audio.destination);n.start();n.stop(audio.currentTime+dur);}
function notify(s,duration=2.6){$('toast').textContent=s;toastTime=duration;}
function announce(title,sub=''){ $('banner').innerHTML=title+(sub?`<small>${sub}</small>`:'');bannerTime=3.2;}
function addPoints(n){const earned=curseReward(n,curse.rank);points+=earned;totalScore+=earned;return earned;}
function updateForgeStations(){for(const s of forgeStations)if(s.forgeRank!==inventory[weapon].forgeRank)s.setForgeRank(inventory[weapon].forgeRank);}
function ammoCapacity(k=weapon){const multiplier=forgeBonuses(inventory[k].forgeRank).ammoMultiplier;return {mag:Math.ceil(weapons[k].mag*multiplier),reserve:Math.ceil(weapons[k].reserve*multiplier)};}
function freshInventory(){return Object.fromEntries(Object.entries(weapons).map(([k,v])=>[k,{ammo:v.mag,reserve:v.reserve,owned:k==='glock',forgeRank:0}]));}
inventory=freshInventory();let doubleTime=0,grenadeTime=0,grenadeCooldown=0;
function selectWeapon(k){if(!inventory[k].owned||reloadLeft>0)return;if(weapon!==k){weaponRecoil.reset();camera.fov=weaponViewFov=75;camera.updateProjectionMatrix();}weapon=k;reticleHud.select(k);recoil=.06;flash.position.copy(gunGroups[k].userData.muzzle);flash.scale.setScalar(k==='glock'?.58:1);flash.position.z-=.11*flash.scale.x;for(const t in gunGroups)gunGroups[t].visible=t===k;updateHud();}
selectWeapon('glock');
const crowd=createCrowd(zombies,player);
const playerCanOccupy=(x,z,y)=>crowd.canOccupy(x,z,y,PLAYER_RADIUS,1.8,null,player);
function bruteCrouchAt(x,z,y){
  return y>UPPER_Y-2||(y>-.3&&Math.abs(x-MAUSOLEUM.x)<MAUSOLEUM.w/2+1&&z>MAUSOLEUM.z-MAUSOLEUM.d/2-1&&z<MAUSOLEUM.frontZ+2);
}
function makeZombie(x,z,brute=false,dog=false,rareDog=false,y=0,feral=false,asset={}){
  if(feral){dog=rareDog=brute=false;}else if(rareDog){dog=true;brute=false;}
  const rig=enemyAssets.instantiate({rng,brute,dog,rareDog,feral,...asset}),cfg=curseWaveConfig(wave,curse.rank),hp=cfg.health*(dog?.85:brute?BRUTE.healthMultiplier:1)*(rareDog?2:1);
  const e={...rig,walkPos:new T.Vector3(x,y,z),floorY:y,hp,maxHp:hp,speed:cfg.speed*(feral?FERAL.speedMultiplier:rareDog?RARE_DOG_SPEED_MULTIPLIER:dog?DOG_SPEED_MULTIPLIER:brute?.77:rand(.85,1.15)),attack:rand(.2,1),enraged:false,dead:false,death:0,groan:rand(4,12),pathTimer:0,clearPath:false};
  const body=enemyBody(e);e.radius=body.radius;
  e.staggerProfile=staggerLimits(e);e.staggerMeter=e.staggerLeft=e.staggerCooldown=0;e.staggerShotId=-1;e.staggerShotStrength=0;
  e.crouch=e.brute&&bruteCrouchAt(x,z,y)?1:0;e.bodyHeight=e.crouch?BRUTE.crouchHeight:body.height;
  e.routeSide=rng()<.5?-1:1;e.flank=rand(.25,1)*e.routeSide;e.stuck=0;e.waypoint=null;
  e.navigation={seed:Math.floor(rng()*2147483647),crowding:(x,z,y)=>crowd.density(x,z,y,e)};
  e.canOccupy=(x,z,y)=>crowd.canOccupy(x,z,y,e.radius,e.bodyHeight,e,e.walkPos);
  world.add(e.group);e.group.position.set(x,Math.abs(y)>.1?y-.02:enemyFloorHeight(x,z)-.02,z);tagZombie(e,e);zombies.push(e);return e;
}
const spawns=ESTATE_SPAWNS;let upperSpawnSlot=0;
function spawnEnemy(){
  if(toSpawn<=0)return false;
  const finale=waveFiveFinale?.wave===wave;
  const kind=finale?waveFiveFinale.kinds[waveFiveFinale.enemies.length]:chooseCurseEnemyKind(wave,spawned,rng(),curse.rank),body=enemyBody({brute:kind==='brute',dog:kind==='dog'||kind==='ashfang',rareDog:kind==='ashfang'}),routes=kind==='brute'?nav.brutes:nav;
  function valid([x,z,y=0]){
    const radius=Math.max(.48,body.radius),height=kind==='brute'&&bruteCrouchAt(x,z,y)?BRUTE.crouchHeight:body.height;
    if(isBlocked(x,z,radius,colliders,undefined,y,height)||Math.abs(supportBelow(x,z,y)-y)>.01)return false;
    if(y===UPPER_Y&&!hasUpperFloor(x,z,radius))return false;
    if(Math.hypot(x-player.x,z-player.z)<=10||!nav.direction(x,z,y)?.reachable||!routes.direction(x,z,y)?.reachable)return false;
    if(!crowd.canOccupy(x,z,y,body.radius+.18,height))return false;
    return true;
  }
  const ground=spawns.filter(valid);
  // One in four spawn slots moves upstairs from wave 11. Crowded/blocked
  // upper rooms fall back to clear ground positions rather than losing enemies.
  const upper=wave>10?UPPER_SPAWNS.filter(valid):[];
  const reachable=wave>10&&spawned%4===upperSpawnSlot&&upper.length?upper:ground.length?ground:upper;
  let options=reachable.filter(([x,z,y=0])=>routes.direction(x,z,y).distance<42);
  if(!options.length)options=reachable.filter(([x,z,y=0])=>routes.direction(x,z,y).distance<80);
  if(!options.length)options=reachable;
  if(!options.length)return false;
  const point=options[Math.floor(rng()*options.length)],y=point[2]||0;
  let candidate=[point[0]+rand(-.2,.2),point[1]+rand(-.2,.2),y];
  if(!valid(candidate))candidate=point;
  const enemy=makeZombie(candidate[0],candidate[1],kind==='brute',kind==='dog'||kind==='ashfang',kind==='ashfang',y,kind==='feral');
  if(finale)waveFiveFinale.enemies.push(enemy);
  spawned++;toSpawn--;if(wave>10&&spawned%4===0)upperSpawnSlot=Math.floor(rng()*4);return true;
}
function beginWaveFiveFinale(){
  // Four brutes arrive among thirteen walkers. Advance this fixed roster only
  // after a safe spawn succeeds, so blocked routes cannot change the count.
  waveFiveFinale={wave:5,kinds:Array.from({length:17},(_,slot)=>[0,4,8,12].includes(slot)?'brute':'walker'),enemies:[]};
  frenzyWave=wave;toSpawn=waveFiveFinale.kinds.length;
  announce('FRENZIED FINALE','WAVE 05 · 17 UNDEAD, INCLUDING 4 BRUTES');tone(50,1.3,.12,'sawtooth',180);
  spawnEnemy();spawnTimer=waveConfig(wave).interval*.4;
}
function unlockShed(){if(!shed.unlock())return false;nav=makeNavigation();nav.rebuild(player.x,player.z,player.y);notify('A DOOR HAS BLOWN OPEN SOMEWHERE…',5);noise(.45,.16,350);tone(65,.65,.09,'sawtooth',28);return true;}
function startWave(){wave++;frenzyWave=0;waveFiveFinale=null;upperSpawnSlot=wave>10?Math.floor(rng()*4):0;if(wave>=SHED.unlockWave)unlockShed();if(wave>MAUSOLEUM.unlockAfterWave)unlockMausoleum();if(wave===CELLAR.unlockWave){setCellarOpen(true);cellar.gate.disabled=true;nav=makeNavigation();nav.rebuild(player.x,player.z,player.y);notify('NORTH GROUNDS · THE STORM CELLAR IS OPEN');}const cfg=curseWaveConfig(wave,curse.rank);toSpawn=cfg.count;spawned=0;spawnTimer=.7;waveDelay=0;announce(`WAVE ${String(wave).padStart(2,'0')}`,wave===10?'STORM CELLAR UNSEALED · NORTH GROUNDS':wave===11?'THE DEAD NOW RISE ON THE SECOND FLOOR':wave===1?'THE ESTATE HAS AWAKENED':wave===6?'ASHFANG HOUNDS JOIN THE HUNT':wave===7?'FERAL STALKERS JOIN THE HUNT':wave%5===0?'THE BRUTES HAVE RISEN':'THE DEAD GROW RESTLESS');tone(130,1,.1,'sawtooth',45);worldEvents.beginWave(wave);}
function killZombie(e,headshot=false,impact={}){if(e.dead)return;e.dead=true;e.death=0;if(impact.source==='Bella'&&!bella.dragon)dropBoneChip(e);endWarCry(e);if(e.boss)defeatBlackthorn(e);else if(e.warden)addPoints(WARDEN.reward);const massKill=impact.source==='nuke';if(massKill)e.hp=0;const reward=addPoints(worldEvents.killReward(headshot?(e.brute?200:75):e.brute?110:50));kills++;if(e.bonusEssence)eventVisuals.dropEssence(e.walkPos.x,e.walkPos.z,e.floorY,pickups);const enraged=massKill?0:enrageNearby(e,zombies,Math.random,enemyAssets.enrage);if(!massKill){if(headshot){notify(`HEADSHOT +${reward}`);}else tone(280,.06,.025,'triangle');}if(Math.random()<.13)dropPickup(e.group.position.x,e.group.position.z,choosePowerup(Math.random()),e.floorY);bloodBurst(e.group.position.clone().add(new T.Vector3(0,e.dog?.55:1.4,0)),massKill?4:10);beginZombieDeath(e,{...impact,source:massKill?'grenade':impact.source,part:headshot?'head':impact.part},rng);
if(enraged&&e.walkPos.distanceToSquared(player)<324)notify(`BLOOD RAGE · ${enraged} NEARBY ${enraged===1?'ENEMY':'ENEMIES'} ENRAGED`);
const corpses=zombies.filter(z=>z.dead&&z.ragdoll.life>z.death);if(corpses.length>14){const oldest=corpses.reduce((a,b)=>a.death>b.death?a:b);oldest.ragdoll.life=oldest.death;}
}
function damageEnemy(e,amount,headshot=false,impact={}){if(e.dead||e.waking)return;if(e.warden&&impact.part==='shield'){amount*=WARDEN.shieldFactor;tone(900,.05,.02,'square',600);}e.hp-=amount;if(impact.part==='leg'&&!headshot&&noteLegDamage(e,amount)){e.bodyHeight=CRAWL.height;tone(55,.18,.05,'sine',38);noise(.12,.05,260);}addPoints(10);hitTime=headshot?.22:.14;const reaction=headshot&&impact.part!=='head'?{...impact,part:'head'}:impact;if(combatHud.hit(headshot,impact.shotId)){tone(1250,.055,.035,'triangle',1850);tone(1850,.07,.022,'sine',1200);}reactToHit(e,reaction);if(!e.elite)registerStagger(e,reaction);if(e.hp<=0)killZombie(e,headshot,reaction);}
function bloodBurst(pos,count){for(let i=0;i<count;i++){const sx=rand(.01,.025),sy=rand(.01,.03),sz=rand(.01,.025),vx=rand(-1.4,1.4),vy=rand(.5,2),vz=rand(-1.4,1.4),effect=bloodPool.acquire();if(!effect)continue;effect.mesh.position.copy(pos);effect.mesh.scale.set(sx,sy,sz);effect.vel.set(vx,vy,vz);effect.life=effect.max=.6;effects.push(effect);}}
const raycaster=new T.Raycaster();const dir=new T.Vector3();let shotId=0;
function shoot(){if(mode!=='playing'||grenadeThrow.active||reloadLeft>0||shotTimer>0)return;const inv=inventory[weapon],w=weapons[weapon];if(inv.ammo<=0){shotTimer=.25;tone(120,.045,.03,'square');reload();return;}inv.ammo--;shotTimer=w.rate;{const r=SHOT_RUMBLE[weapon];if(r)padRumble(...r);}const id=++shotId;if(weapon==='glock')gunGroups.glock.userData.slideTime=.12;flashTime=.045;noise(weapon==='shotgun'?.22:.12,.18,weapon==='shotgun'?1200:2500);tone(80,.13,.1,'triangle',35);const active=zombies.filter(e=>!e.dead).map(e=>e.group);const hitObjects=[...solidMeshes,...active];
camera.rotation.set(clamp(lookPitch+weaponRecoil.pitch,-1.3,1.3),lookYaw+weaponRecoil.yaw,0);camera.updateMatrixWorld();
for(let i=0;i<w.pellets;i++){const spread=aiming?(w.aimSpread??w.spread*.28):w.spread;dir.set(rand(-spread,spread),rand(-spread,spread),-1).normalize().applyQuaternion(camera.quaternion);raycaster.set(camera.position,dir);const hits=raycaster.intersectObjects(hitObjects,true);if(hits.length){const h=hits[0],e=h.object.userData.enemy;if(e&&!e.dead){const head=h.object.userData.head;const damage=w.damage*(perkOwned.has('eye')?1.5:1)*forgeBonuses(inv.forgeRank).damageMultiplier*(head?2.6:1)*(doubleTime>0?2:1);damageEnemy(e,damage,head,{direction:dir.clone(),point:h.point.clone(),part:h.object.userData.part,side:h.object.userData.side,limb:h.object.userData.limb,force:COMBAT[weapon].force,source:weapon,shotId:id});bloodBurst(h.point,3);}else if(Math.random()<.5){const effect=markPool.acquire();if(effect){effect.mesh.position.copy(h.point);effect.mesh.scale.set(.025,.025,.025);effect.vel.set(0,0,0);effect.life=effect.max=6;effects.push(effect);}}}}
weaponRecoil.fire(weapon,aiming);if(inv.ammo===0)notify('MAGAZINE EMPTY · PRESS R');updateHud();}
function reload(){const inv=inventory[weapon],w=weapons[weapon];if(mode!=='playing'||grenadeThrow.active||reloadLeft>0||inv.ammo>=ammoCapacity().mag||inv.reserve<=0)return;reloadDuration=w.reload*forgeBonuses(inv.forgeRank).reloadMultiplier*(perkOwned.has('quick')?.5:1);reloadLeft=reloadDuration;updateReloadHud();tone(330,.12,.06,'square');}
function finishReload(){const inv=inventory[weapon],needed=Math.max(0,ammoCapacity().mag-inv.ammo),n=Math.min(needed,inv.reserve);inv.ammo+=n;inv.reserve-=n;tone(500,.1,.05,'square');}

function dropPickup(x,z,type,y=0){const m=powerupAssets.create(type);m.userData.lightingTransient=true;m.position.set(x,y+.85,z);world.add(m);pickups.push({mesh:m,type,y,life:20,phase:rand(0,6)});}
function refillAmmo(){
  for(const k in inventory)if(inventory[k].owned){
    const inv=inventory[k],capacity=ammoCapacity(k);
    // Include the missing magazine rounds in reserve, so a normal reload leaves
    // both compartments full. Repeated refills replace this allowance, not stack it.
    inv.reserve=capacity.reserve+Math.max(0,capacity.mag-inv.ammo);
  }
  grenades=Math.min(4,grenades+1);
}
function grenade(){
  if(mode!=='playing'||grenadeThrow.active||(grenades<=0&&grenadeTime<=0))return false;
  const unlimited=grenadeTime>0;
  if(unlimited&&grenadeCooldown>0)return false;
  if(!grenadeThrow.begin())return false;
  // Infinite throws recover for half a second after the arm retracts.
  grenadeCooldown=unlimited?GRENADE_THROW.duration+POWERUPS.grenades.cooldown:0;
  if(!unlimited)grenades--;flashTime=0;updateHud();tone(650,.08,.035,'square');return true;
}
const grenadeLaunchRay=new T.Raycaster();
function releaseGrenade(position,rotation,firstStep){
  // Sweep from the eye to the releasing hand so nearby walls cannot be bypassed.
  const offset=position.clone().sub(camera.position),distance=offset.length();grenadeLaunchRay.set(camera.position,offset.normalize());grenadeLaunchRay.near=0;grenadeLaunchRay.far=distance+.10;
  const hit=grenadeLaunchRay.intersectObjects(solidMeshes,true)[0];if(hit)position.copy(camera.position).addScaledVector(offset,Math.max(0,Math.min(distance,hit.distance-.11)));
  const delta=position.clone().sub(camera.position),steps=Math.max(1,Math.ceil(delta.length()/.025));
  for(let i=0;i<=steps;i++){
    const p=camera.position.clone().addScaledVector(delta,i/steps);
    if(isBlocked(p.x,p.z,.10,colliders,undefined,p.y-.10,.20)){position.copy(camera.position).addScaledVector(delta,Math.max(0,i-1)/steps);break;}
  }
  const g=grenadeAssets.create();g.userData.lightingTransient=true;g.position.copy(position);g.quaternion.copy(rotation);world.add(g);
  const velocity=new T.Vector3(0,.23,-1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(11);
  effects.push({mesh:g,vel:velocity,life:1.65,max:1.65,type:'grenade',firstStep});noise(.09,.035,1800);
}
function blastLine(from,to){const delta=to.clone().sub(from),len=delta.length();return new T.Raycaster(from,delta.normalize(),.05,Math.max(.05,len-.15)).intersectObjects(solidMeshes,true).length===0;}
const GRENADE_BLAST_RADIUS=12,GRENADE_DAMAGE=450;
function explode(pos){
  noise(.6,.35,700);tone(65,.65,.2,'sine',25);
  {const d=Math.hypot(pos.x-player.x,pos.z-player.z);if(d<14)padRumble(1-d/14,.8*(1-d/14),320);}
  const s=sphere(pos.x,pos.y+.2,pos.z,.3,.3,.3,new T.MeshBasicMaterial({color:0xffb45b,transparent:true,opacity:.75}));
  effects.push({mesh:s,vel:new T.Vector3(),life:.35,max:.35,type:'blast'});
  for(const e of zombies){
    const d=e.group.position.distanceTo(pos);
    if(d<GRENADE_BLAST_RADIUS&&!e.dead&&blastLine(pos,e.group.position.clone().add(new T.Vector3(0,.9,0)))){
      // Full damage through 75% of the radius; the outer quarter takes half.
      const damage=GRENADE_DAMAGE*(d<=GRENADE_BLAST_RADIUS*.75?1:.5);
      damageEnemy(e,damage,false,{direction:e.group.position.clone().sub(pos),part:'torso',force:2.7*(1-d/18),source:'grenade'});
    }
  }
  if(player.distanceTo(pos)<3&&blastLine(pos,player.clone().add(new T.Vector3(0,.9,0))))hurtPlayer(25,pos);
  recoil=.1;
}
function hurtPlayer(amount,source){padRumble(Math.min(1,.35+amount/60),.5,amount>=30?260:170);const absorbed=Math.min(armor,amount);armor-=absorbed;health-=amount-absorbed;lastHurt=runTime;damageFlash=absorbed===amount?.28:.75;combatHud.hurt(player,source,lookYaw+weaponRecoil.yaw,absorbed===amount);if(health<=0)gameOver();}
function unlockMausoleum(){if(!graveyard.unlock())return false;nav=makeNavigation();nav.rebuild(player.x,player.z,player.y);notify('EAST CEMETERY · THE MAUSOLEUM IS UNSEALED');tone(160,1,.09,'sine',70);return true;}
function activateMausoleumNuke(){
  const device=graveyard.nuke,s=device.station;
  if(mode!=='playing'||!graveyard.open||s.locked||s.used||!inMausoleum(player.x,player.z)||Math.abs(player.y-s.y)>=1.2||Math.hypot(player.x-s.x,player.z-s.z)>=2.3)return false;
  if(points<s.price){notify(`NEED ${s.price-points} MORE ESSENCE`);tone(110,.2,.03,'square');return false;}
  const victims=zombies.filter(e=>!e.dead);
  // Detonating always wakes Sir Blackthorn, even on an empty estate (v130).
  if(!device.spend())return false;
  points-=s.price;const scoreBefore=totalScore,origin=new T.Vector3(s.x,1,s.z);
  // Use the same body-kill path on every floor. No synthetic bullet hit, blast
  // distance limit, or wall ray can change the bounty or leave an enemy alive.
  for(const e of victims)killZombie(e,false,{source:'nuke',part:'torso',force:1.5,direction:e.group.position.clone().sub(origin)});
  const reward=totalScore-scoreBefore;nukeFlashTime=.75;
  noise(.7,.18,180);tone(45,1.1,.15,'sawtooth',26);
  announce('ATOMIC PURGE',`${victims.length} UNDEAD DESTROYED · +${reward.toLocaleString()} ESSENCE`);
  notify(`THE LAST DAWN · +${reward.toLocaleString()} ESSENCE · DEVICE SPENT`);wakeBlackthorn();updateHud();return true;
}

// ---- Sir Blackthorn -----------------------------------------------------------------
// The Last Dawn wakes him. The lid slides off, he rises out of the tomb and
// steps down; regular spawns hold until he falls, then the run carries on.
function blackthornHoldsSpawns(){return boss.stage==='waking'||boss.stage==='active';}
function resetBlackthorn(){boss={stage:'dormant',enemy:null,clock:0,summons:0,lance:0,cry:0,cast:null,victories:0};bossFx.clear();graveyard.openLid(0);$('bossHud').classList.add('hidden');}
function wakeBlackthorn(){
  if(boss.stage!=='dormant')return false;
  boss.stage='waking';boss.clock=0;boss.enemy=null;
  announce('THE SARCOPHAGUS STIRS','SIR BLACKTHORN AWAKENS · GET CLEAR OF THE TOMB');
  noise(1.2,.12,120);tone(38,2.4,.14,'sawtooth',30);return true;
}
function makeElite(kind,x,z,y=0){
  const knight=kind==='knight',cfg=curseWaveConfig(wave,curse.rank);
  const e=makeZombie(x,z,!knight,false,false,y,false,{scale:knight?BOSS.scale:BRUTE.scale*WARDEN.scale});
  // Both use brute-sized collision and brute routes, whatever rig they wear.
  // Sir Blackthorn cuts like a swordsman; the Gravewarden hammers down.
  e.gait={...e.gait,attack:knight?'swiper':'slammer'};
  e.brute=true;e.elite=true;e.noEnrage=true;const body=enemyBody(e);e.radius=body.radius;e.bodyHeight=body.height;e.crouch=0;
  e.staggerProfile=staggerLimits(e);
  if(knight){e.boss=true;e.maxHp=e.hp=cfg.health*BOSS.healthMultiplier;e.speed=cfg.speed*BOSS.speed;const dress=dressKnight(e);e.orb=dress.orb;}
  else{e.warden=true;e.maxHp=e.hp=cfg.health*BRUTE.healthMultiplier*WARDEN.healthMultiplier;e.speed=cfg.speed*WARDEN.speed;const dress=dressWarden(e);e.shield=dress.shield;}
  tagZombie(e,e);if(e.shield)for(const m of e.shield)m.userData.part='shield';
  return e;
}
function updateWaking(dt){
  boss.clock+=dt;const step=wakeStep(boss.clock);
  graveyard.openLid(step.lid);
  if(step.stage==='lid'&&step.lid<.1&&!boss.lidSound){boss.lidSound=true;noise(1.1,.16,260);tone(52,1.2,.1,'sawtooth',40);}
  if((step.stage==='rise'||step.stage==='step'||step.stage==='done')&&!boss.enemy){
    const e=makeElite('knight',BOSS.front.x,BOSS.front.z);e.waking=true;boss.enemy=e;
    boss.lance=2.5;boss.cry=BOSS.cry.firstDelay;boss.summons=0;boss.cast=null;
  }
  const e=boss.enemy;if(!e)return;
  const g=e.group,face=Math.atan2(player.x-g.position.x,player.z-g.position.z);g.rotation.y=face;
  if(step.stage==='rise'){const r=step.rise;g.position.set(BOSS.rest.x,-2.6+(r*r*(3-2*r))*3.05,BOSS.rest.z);}
  else if(step.stage==='step'){const t=step.step;g.position.set(BOSS.rest.x,(.45+Math.sin(t*Math.PI)*.35)*(1-t)+enemyFloorHeight(BOSS.front.x,BOSS.front.z)*t,T.MathUtils.lerp(BOSS.rest.z,BOSS.front.z,t));if(t>.85&&!boss.landed){boss.landed=true;noise(.4,.2,180);tone(45,.6,.12,'sine',30);padRumble(.8,.5,300);}}
  else if(step.stage==='done'){
    e.waking=false;boss.stage='active';g.position.set(BOSS.front.x,enemyFloorHeight(BOSS.front.x,BOSS.front.z)-.02,BOSS.front.z);
    announce(BOSS.name,`${BOSS.title} · CURSE RANK ${curse.rank}`);tone(70,1.8,.16,'sawtooth',35);
    $('bossHud').classList.remove('hidden');
  }
}
// Called from the enemy loop for the boss: casts lances and war cries, and
// summons Gravewardens at health thresholds. Returns true while casting.
function updateBlackthorn(e,dt,dist,sameFloor){
  const fraction=Math.max(0,e.hp/e.maxHp),phase=bossPhase(fraction),pace=1/cooldownScale(fraction);
  if(phase==='enraged'&&!e.furious){e.furious=true;e.speed*=BOSS.enragedSpeed;enemyAssets.enrage(e);notify('SIR BLACKTHORN IS ENRAGED',3);tone(55,1.2,.14,'sawtooth',38);}
  for(let n=dueSummons(fraction,boss.summons);n>0;n--){boss.summons++;summonWarden(e);boss.cry=Math.min(boss.cry,1.4);}
  if(boss.cast){
    const c=boss.cast;c.left-=dt;e.orb.scale.setScalar(c.kind==='lance'?.04+.12*(1-c.left/c.time):.001);
    if(c.left<=0){boss.cast=null;e.orb.scale.setScalar(.001);if(c.kind==='lance')throwLances(e,fraction);else warCry(e);}
    return true;
  }
  boss.lance-=dt*pace;boss.cry-=dt*pace;
  const allies=zombies.some(o=>o!==e&&!o.dead&&o.walkPos.distanceTo(e.walkPos)<BOSS.cry.radius);
  if(boss.cry<=0&&allies){boss.cast={kind:'cry',left:BOSS.cry.windup,time:BOSS.cry.windup};boss.cry=BOSS.cry.cooldown;tone(90,.9,.08,'sawtooth',260);return true;}
  if(boss.lance<=0&&sameFloor&&dist>=BOSS.lance.minRange&&dist<=BOSS.lance.maxRange&&bossCanSee(e)){
    boss.cast={kind:'lance',left:BOSS.lance.windup,time:BOSS.lance.windup};boss.lance=rand(...BOSS.lance.cooldown);tone(330,.7,.05,'sine',880);return true;
  }
  return false;
}
const bossEye=new T.Vector3(),bossTarget=new T.Vector3(),lanceDir=new T.Vector3(),lanceUp=new T.Vector3(0,1,0);
function bossCanSee(e){
  bossEye.set(e.walkPos.x,e.walkPos.y+2.1,e.walkPos.z);bossTarget.set(player.x,player.y+1.2,player.z);
  lanceDir.subVectors(bossTarget,bossEye);const d=lanceDir.length();lanceDir.divideScalar(d);
  raycaster.set(bossEye,lanceDir);raycaster.far=d;const hit=raycaster.intersectObjects(solidMeshes,false)[0];raycaster.far=Infinity;
  return !hit;
}
// Applied after the walk animation: the lance arm rises, the cry flings both wide.
function poseBlackthorn(e){
  const c=boss.cast;if(!c)return;const f=Math.min(1,(c.time-c.left)/.25);
  if(c.kind==='lance'){const a=e.arms[0];a.pivot.rotation.x=T.MathUtils.lerp(a.pivot.rotation.x,-2.4,f);a.pivot.rotation.z=T.MathUtils.lerp(a.pivot.rotation.z,-.2,f);a.forearm.rotation.x=T.MathUtils.lerp(a.forearm.rotation.x,-.3,f);}
  else{for(const [i,a] of e.arms.entries()){a.pivot.rotation.x=T.MathUtils.lerp(a.pivot.rotation.x,-1.5,f);a.pivot.rotation.z=T.MathUtils.lerp(a.pivot.rotation.z,i?.95:-.95,f);}if(e.jaw)e.jaw.rotation.x=.55*f;e.spine.rotation.x=T.MathUtils.lerp(e.spine.rotation.x,-.25,f);}
}
function throwLances(e,fraction){
  const from=new T.Vector3();e.orb.getWorldPosition(from);
  bossTarget.set(player.x,player.y+1.15,player.z);const base=bossTarget.sub(from).normalize();
  const count=lanceVolley(fraction);
  for(let i=0;i<count;i++){const angle=(i-(count-1)/2)*BOSS.lance.spread;bossFx.launch(from,base.clone().applyAxisAngle(lanceUp,angle));}
  noise(.25,.1,1400);tone(520,.4,.05,'triangle',140);
}
const lanceChest=new T.Vector3();
function lanceHit(prev,next){
  lanceChest.set(player.x,player.y+1.1,player.z);
  if(segmentDistance(prev,next,lanceChest)>BOSS.lance.hitRadius)return false;
  hurtPlayer(waveConfig(wave).damage*BOSS.lance.damage,next);tone(160,.25,.08,'sawtooth',60);
  if(health<=0)gameOver();return true;
}
function lanceBlocked(p){return p.y<supportBelow(p.x,p.z,p.y+.1)||isBlocked(p.x,p.z,.08,colliders,undefined,p.y-.08,.16);}
// War cry: every undead within reach is driven into a red fury for a while.
function warCry(e){
  bossFx.cry(e.walkPos);noise(.9,.18,220);tone(62,1.3,.18,'sawtooth',150);padRumble(.6,.6,400);
  let roused=0;
  for(const o of zombies){
    if(o===e||o.dead||o.walkPos.distanceTo(e.walkPos)>BOSS.cry.radius)continue;
    if(!o.warCry&&!o.enraged){o.cryMaterials=new Map();o.group.traverse(m=>{if(m.isMesh)o.cryMaterials.set(m,m.material);});enemyAssets.enrage(o);}
    o.warCry=BOSS.cry.duration;roused++;
  }
  notify(roused?`SIR BLACKTHORN'S WAR CRY · ${roused} UNDEAD IN A FURY`:'SIR BLACKTHORN SCREAMS',3);
}
function endWarCry(o){
  o.warCry=0;
  if(o.cryMaterials){if(!o.enraged)for(const [m,material] of o.cryMaterials)m.material=material;o.cryMaterials=null;}
}
function summonWarden(e){
  const body=enemyBody({brute:true});
  for(let i=0;i<16;i++){
    const a=i*2.4,r=3+(i%4)*.8,x=e.walkPos.x+Math.sin(a)*r,z=e.walkPos.z+Math.cos(a)*r,y=e.walkPos.y;
    if(isBlocked(x,z,body.radius+.1,colliders,undefined,y,body.height)||Math.abs(supportBelow(x,z,y)-y)>.01||!nav.brutes.direction(x,z,y)?.reachable)continue;
    if(!crowd.canOccupy(x,z,y,body.radius+.1,body.height)||Math.hypot(x-player.x,z-player.z)<2)continue;
    const w=makeElite('warden',x,z,y);w.emergeLeft=w.emergeTime=WARDEN.emergeTime;w.emergeDepth=WARDEN.emergeDepth;w.group.position.y-=WARDEN.emergeDepth;
    bossFx.summon(w.walkPos);announce('A GRAVEWARDEN RISES','SHOTS INTO ITS SHIELD DO A QUARTER DAMAGE');noise(.8,.14,160);tone(48,1.4,.12,'sawtooth',36);
    return w;
  }
  return null;
}
function defeatBlackthorn(e){
  if(boss.stage!=='active')return;
  boss.stage='defeated';boss.cast=null;boss.victories++;bossFx.clear();$('bossHud').classList.add('hidden');
  const reward=addPoints(BOSS.reward);
  dropPickup(e.walkPos.x,e.walkPos.z,'ammo',e.floorY);
  const unlocked=curseLadder.victory(curse.rank);renderCurseMenu();
  announce('SIR BLACKTHORN FALLS',unlocked!==null?`CURSE RANK ${unlocked} UNLOCKED · CHOOSE IT ON THE TITLE SCREEN`:`+${reward.toLocaleString()} ESSENCE · THE HOUSE REMEMBERS`);
  notify(`+${reward.toLocaleString()} ESSENCE · THE ROTUNDA BELL TOLLS`,5);
  // The great bell tolls across the estate.
  tone(110,3.2,.12,'triangle',55);tone(220,3.6,.07,'sine',110);tone(330,2.4,.04,'sine',165);
}
function updateBossHud(){
  const e=boss.enemy;if(boss.stage!=='active'||!e)return;
  const fraction=Math.max(0,e.hp/e.maxHp),wardens=zombies.filter(o=>o.warden&&!o.dead).length;
  $('bossBar').style.width=`${(fraction*100).toFixed(1)}%`;
  const state=`${e.furious?'ENRAGED · ':''}${Math.ceil(fraction*100)}%${wardens?` · ${wardens} GRAVEWARDEN${wardens>1?'S':''}`:''}`;
  if($('bossState').textContent!==state)$('bossState').textContent=state;$('bossHud').classList.toggle('enraged',!!e.furious);
}
// Title-screen curse selector: every unlocked rank, plus the next one locked.
function renderCurseMenu(){
  const select=$('curseRank');select.replaceChildren();
  for(let rank=0;rank<=curseLadder.unlocked;rank++){const o=document.createElement('option');o.value=String(rank);o.textContent=`RANK ${rank} · ${curseTitle(rank).toUpperCase()}`;select.appendChild(o);}
  if(curseLadder.unlocked<MAX_CURSE_RANK){const o=document.createElement('option');o.value='locked';o.disabled=true;o.textContent=`RANK ${curseLadder.unlocked+1} · LOCKED`;select.appendChild(o);}
  select.value=String(curseLadder.selected);
  const next=curseLadder.selected===curseLadder.unlocked&&curseLadder.unlocked<MAX_CURSE_RANK?` · Defeat Sir Blackthorn on this rank to unlock rank ${curseLadder.unlocked+1}.`:'';
  $('curseRankInfo').textContent=curseSummary(curseLadder.selected)+next;
  $('menuCurse').dataset.rank=String(curseLadder.selected);
}
$('curseRank').onchange=()=>{const v=Number($('curseRank').value);if(Number.isSafeInteger(v))curseLadder.select(v);renderCurseMenu();};
renderCurseMenu();

// ---- Olivia's attic (v131 Easter egg) -----------------------------------------------
// Bella's kills drop bone chips; 25 open a hatch above her kennel. Olivia, up in
// the garret, turns the chips into wings, a dragon tail and fire breath for Bella.
function dropBoneChip(e){
  const m=boneChipModel(),y=e.floorY||0;m.position.set(e.walkPos.x,y+.85,e.walkPos.z);world.add(m);
  pickups.push({mesh:m,type:'bone',y,life:EASTER_EGG.chipLife,phase:rand(0,6)});
}
function collectBoneChip(){
  boneChips++;tone(880,.12,.05,'triangle',1320);
  if(boneChips<EASTER_EGG.chips)notify(`BONE CHIP · ${boneChips}/${EASTER_EGG.chips}`);
  else if(!atticState.opening&&!atticState.open)openAttic();
  else notify(`BONE CHIPS · ${boneChips}`);
  updateHud();
}
function openAttic(){
  if(atticState.opening||atticState.open)return false;
  atticState.opening=true;atticState.time=0;
  announce('SOMETHING CREAKS ABOVE',`${EASTER_EGG.chips} BONE CHIPS · A HATCH OPENS ABOVE BELLA’S KENNEL`);
  noise(1.2,.08,420);tone(150,1.4,.06,'triangle',90);return true;
}
function updateAtticOpening(dt){
  atticState.time+=dt;attic.setProgress(atticState.time/EASTER_EGG.openTime);
  if(atticState.time>=EASTER_EGG.openTime){atticState.opening=false;atticState.open=true;setAtticOpen(true);nav=makeNavigation();nav.rebuild(player.x,player.z,player.y);tone(523,.2,.05,'triangle',784);updateHud();}
}
function talkToOlivia(){
  if(bella.dragon){notify('OLIVIA: “BELLA LOOKS SO COOL!”',3);return false;}
  if(!bella.unlocked){notify('OLIVIA: “WHERE’S BELLA? LET HER OUT OF HER KENNEL!”',3);return false;}
  if(boneChips<EASTER_EGG.chips){notify(`OLIVIA: “I NEED ${EASTER_EGG.chips} BONE CHIPS!” · ${boneChips}/${EASTER_EGG.chips}`,3);return false;}
  boneChips-=EASTER_EGG.chips;bella.becomeDragon();oliviaCheer=2.5;
  announce('BELLA THE RAT DRAGON','OLIVIA GAVE HER WINGS, A DRAGON TAIL AND FIRE BREATH');
  tone(523,.25,.06,'triangle',659);tone(659,.3,.05,'triangle',784);tone(784,.5,.05,'triangle',1046);updateHud();return true;
}
function playerInAttic(){return player.y>OLIVIA_ATTIC.y-.3&&inAttic(player.x,player.z);}
// Steering for the narrow attic stairs, which the navigation grid does not
// cover: from the bedchamber to the stair foot, up the flight, and back down.
const BEDCHAMBER={x0:-41.76,x1:-28,z0:-11.76,z1:-2};
function atticRoute(x,z,y,goalInAttic){
  if(!isAtticOpen())return null;
  // On the treads, not walking underneath the flight's high end.
  const S=OLIVIA_ATTIC.stair,ramp=stairAt(x,z)===S?stairHeight(x,z):null,onStair=ramp!==null&&y>ramp-.45,inRoom=y>OLIVIA_ATTIC.y-.3&&inAttic(x,z);
  if(goalInAttic){
    if(inRoom)return null;
    if(onStair)return {x:S.x,z:S.topZ-.7};
    if(Math.abs(y-UPPER_Y)<.35&&x>BEDCHAMBER.x0&&x<BEDCHAMBER.x1&&z>BEDCHAMBER.z0&&z<BEDCHAMBER.z1){
      // Never walk under the flight: go round its side to the foot, line up, climb.
      const side=x>=S.x?1:-1,lane=S.w/2+.6;
      if(ramp!==null)return {x:S.x+side*lane,z};
      if(z<S.bottomZ)return Math.abs(x-S.x)<lane-.1?{x:S.x+side*lane,z}:{x:S.x+side*lane,z:S.bottomZ+.75};
      if(Math.abs(x-S.x)<.45&&z<S.bottomZ+1)return {x:S.x,z:S.topZ-.7};
      return {x:S.x,z:S.bottomZ+.6};
    }
    return null;
  }
  if(onStair)return {x:S.x,z:S.bottomZ+.6};
  if(inRoom)return {x:S.x,z:S.topZ+.3};
  return null;
}
// Rat-dragon fire: every pulse burns each enemy inside the cone, through no walls.
function bellaBreath(origin,dir,range,angle){
  const damage=(40+7*Math.max(1,wave))*BELLA.fire.pulse;
  for(const e of zombies){
    if(e.dead||e.waking||e.emergeLeft>0)continue;const p=e.walkPos;if(Math.abs(p.y-(origin.y-.45))>1.1)continue;
    const dx=p.x-origin.x,dz=p.z-origin.z,d=Math.hypot(dx,dz);if(d>range+(e.radius||.3))continue;
    if(d>.5&&(dx*dir.x+dz*dir.z)/d<Math.cos(angle))continue;
    if(d>.5&&!hasClearPath(origin.x,origin.z,p.x,p.z,p.y,p.y,.08,1.2))continue;
    damageEnemy(e,damage,false,{direction:new T.Vector3(dx,0,dz).normalize(),part:'torso',force:.25,source:'Bella'});
  }
}
function completeWave(){
  worldEvents.endWave();frenzyWave=0;
  const bonus=addPoints(300+wave*50);
  health=Math.min(maxHealth,health+30);grenades=Math.min(4,grenades+1);
  const tombUnlocked=wave>=MAUSOLEUM.unlockAfterWave&&unlockMausoleum();
  waveDelay=12;
  announce(waveFiveFinale?.wave===wave?'FINALE CLEARED':'WAVE CLEARED',`+${bonus} ESSENCE · ${tombUnlocked?'EAST MAUSOLEUM UNSEALED · SOMETHING STIRS IN THE TOMB':'RESTOCK AND PREPARE'}`);
  tone(390,.6,.07,'triangle',780);
  // Show the notice, minute clock and HUD state in this clearing frame.
  updateHud();
}
function triggerFrenzy(){if(waveDelay>0||waveFiveFinale?.wave===wave)return;frenzyWave=wave;waveDelay=0;toSpawn+=Math.max(12,Math.ceil(curseWaveConfig(wave,curse.rank).count*.5));spawnTimer=.1;announce('THE WARDEN HAS AWAKENED','FRENZY · FASTER UNDEAD + REINFORCEMENTS UNTIL THIS WAVE ENDS');tone(65,1.5,.16,'sawtooth',160);}
function closestStation(){let nearest=null,min=2.3;for(const s of interactables){if((s.used&&s.type!=='armor')||s.locked||(s.shedWeapon&&!inShed(player.x,player.z))||(s.type==='nuke'&&!inMausoleum(player.x,player.z))||(s.y<0&&!isCellarOpen()))continue;const d=Math.hypot(s.x-player.x,s.z-player.z);if(Math.abs((s.y||0)-player.y)<1.2&&d<min){nearest=s;min=d;}}return nearest;}
function armorStationDescription(){
  if(armorTier===0)return `Absorbs ${maxHealth} damage before health · Unlocks Nano Shield Rank 1 at both stations`;
  const maximum=ARMOR.nanoRanks.length+1,rank=armorRank(Math.min(armorTier+1,maximum));
  const recharge=rank.regenDelay?`Regenerates ${rank.regenRate} shield/s after ${rank.regenDelay}s without a hit`:`Regenerates ${rank.regenRate} shield/s continuously · No hit delay`;
  return `${armorTier===maximum?'ACTIVE':'UPGRADE'} · ${recharge}${armorTier<maximum?' · Keeps current shield':''}`;
}
function stationDescription(s){if(s.type==='olivia')return bella.dragon?'Bella is a rat dragon now · Olivia is very proud':bella.unlocked?`She can turn Bella into a fire-breathing rat dragon · Bring ${EASTER_EGG.chips} bone chips from Bella’s kills`:'Free Bella from her kennel first';if(s.type==='kennel')return 'BELLA · White Maltipoo · Immortal companion · Follows you and bites undead within 12 yards of you';if(s.shedWeapon)return s.purchased?'M4 PURCHASED · PRESS 6 TO EQUIP':'30-ROUND FULL-AUTO · Includes full magazine and reserve · Keeps Soul Forge ranks';if(s.type==='shedDoor')return shed.open?'OPEN · Explore the groundskeeper’s workshop':'SEALED · Opens automatically at wave 7';if(s.type==='nuke')return s.used?'DEVICE SPENT':'ONE USE · Destroys all active undead across the estate · Wakes Sir Blackthorn';if(s.type==='mausoleumDoor')return graveyard.open?'OPEN · Enter the Blackthorn family tomb':'SEALED · Clear wave 20 to unlock';if(s.type==='cellarDoor')return isCellarOpen()?'OPEN · Descend to the underground armory':'LOCKED · Opens automatically at wave 10';if(s.type==='bushmaster')return inventory.bushmaster.owned?'WEAPON OWNED · PRESS 5 TO EQUIP':'15-round semi-auto · 2× M4 damage · 10× precision scope';if(s.type==='lmg')return '100-round belt · 3× combat scope · Taking it triggers frenzy for the rest of this wave';if(s.type==='armor')return armorStationDescription();if(s.type==='powerup')return s.power==='double'?'Double bullet damage for 20 seconds':'Unlimited throws for 12 seconds · 0.5s recovery after each throw';if(s.type==='perk')return perkOwned.has(s.id)?'PERK ACTIVE':s.desc;if(s.type==='ammo')return 'Restock every owned weapon · Reload to fill magazines · +1 grenade';if(s.type==='upgrade')return s.forgeMaximum?'FORGED 3/3 · '+forgeBonuses(FORGE.maxRank).damageMultiplier+'× base damage · Maximum rank · Switch weapons to forge another':'RANK '+(inventory[weapon].forgeRank+1)+' OF 3 · '+forgeBonuses(inventory[weapon].forgeRank+1).damageMultiplier+'× base damage · 25% faster reload · +25% magazine and reserve capacity';return inventory[s.type].owned?'WEAPON OWNED · USE NUMBER KEYS':'Unlock a new weapon for this run';}
function interact(){
  if(mode!=='playing')return;
  updateForgeStations();const s=closestStation();if(!s)return;
  if(s.type==='lmg'&&waveDelay>0){notify('THE WARDEN AWAKENS DURING A WAVE · WAIT FOR THE COUNTDOWN');return;}
  if(s.type==='nuke'){activateMausoleumNuke();return;}
  if(s.type==='olivia'){talkToOlivia();return;}
  if(s.type==='cellarDoor'||s.type==='mausoleumDoor'||s.type==='shedDoor'){notify(stationDescription(s));return;}
  if(s.type==='perk'&&perkOwned.has(s.id)){notify('THIS PERK IS ALREADY ACTIVE');return;}
  if(s.type==='armor'&&s.used){notify(`${armorRank(armorTier).name} IS ALREADY ACTIVE`);return;}
  if(s.type==='upgrade'&&s.forgeMaximum){notify('SOUL FORGE RANK 3 · THIS WEAPON IS FULLY FORGED');return;}
  if((s.type==='shotgun'||s.type==='smg'||s.type==='bushmaster')&&inventory[s.type].owned){selectWeapon(s.type);return;}
  if(s.shedWeapon&&s.purchased){selectWeapon('rifle');return;}
  if(points<s.price){notify(`NEED ${s.price-points} MORE ESSENCE`);tone(110,.2,.03,'square');return;}
  points-=s.price;
  if(s.type==='kennel'){bella.unlock();nav=makeNavigation();nav.rebuild(player.x,player.z,player.y);notify('BELLA IS FREE · IMMORTAL COMPANION · 12-YARD GUARD RADIUS',5);tone(740,.12,.045,'triangle',1000);tone(940,.18,.035,'triangle',680);updateHud();return;}
  if(s.shedWeapon){const capacity=ammoCapacity('rifle');inventory.rifle.owned=true;inventory.rifle.ammo=capacity.mag;inventory.rifle.reserve=capacity.reserve;reloadLeft=0;s.purchased=true;selectWeapon('rifle');notify('M4 ASSAULT RIFLE ACQUIRED');tone(440,.3,.09,'triangle',880);updateHud();return;}
  if(s.type==='lmg'){s.used=true;s.model.visible=false;inventory.lmg.owned=true;reloadLeft=0;selectWeapon('lmg');triggerFrenzy();updateHud();return;}
  if(s.type==='armor'){
    if(armorTier===0){armorTier=1;armor=armorMax=maxHealth;notify(`AEGIS BODY ARMOR · +${armorMax} SHIELD · NANO SHIELD RANK 1 UNLOCKED`);}
    else{armorTier++;const rank=armorRank(armorTier),next=ARMOR.nanoRanks[rank.rank];notify(`${rank.name} ONLINE · ${rank.regenRate} SHIELD/S ${rank.regenDelay?`AFTER ${rank.regenDelay}S WITHOUT A HIT`:'CONTINUOUS REGENERATION'}${next?` · RANK ${next.rank} UNLOCKED`:''}`);}
    for(const station of armorStations)station.setArmorTier(armorTier);
    tone(620,.4,.1,'triangle',1000);updateHud();return;
  }
  if(s.type==='perk'){perkOwned.add(s.id);if(s.id==='iron'){if(armorMax>0){armor*=200/maxHealth;armorMax=200;}maxHealth=200;health=200;}notify(`${s.name} ACQUIRED`);}
  else if(s.type==='powerup'){grantPowerup(s.power);}
  else if(s.type==='ammo'){refillAmmo();notify('AMMUNITION RESTOCKED');}
  else if(s.type==='upgrade'){inventory[weapon].forgeRank++;if(reloadLeft>0){reloadLeft*=FORGE.reloadMultiplier;reloadDuration*=FORGE.reloadMultiplier;}notify(`SOUL FORGE RANK ${inventory[weapon].forgeRank}/3 · ${forgeBonuses(inventory[weapon].forgeRank).damageMultiplier}× DAMAGE · +25% AMMO · 25% FASTER RELOAD`);}
  else {inventory[s.type].owned=true;reloadLeft=0;selectWeapon(s.type);notify(`${s.name} ACQUIRED`);}
  tone(440,.3,.09,'triangle',880);updateHud();
}
function updateHud(){
  updateReloadHud();
  updateForgeStations();curseUI.update(mode);
  const finale=waveFiveFinale?.wave===wave&&waveDelay===0;
  {const chips=boneChips>0&&!bella.dragon,text=chips?`BONE CHIPS · ${Math.min(boneChips,EASTER_EGG.chips)}/${EASTER_EGG.chips}${atticState.open?' · THE ATTIC IS OPEN':''}`:'';$('boneHud').classList.toggle('hidden',!chips);if($('boneHud').textContent!==text)$('boneHud').textContent=text;}
  const remaining=toSpawn+worldEvents.pendingSpawns+zombies.filter(e=>!e.dead).length;
  const eventMarkup=worldEvents.badge();setMarkup('eventStatus',eventMarkup);
  const bruteRemaining=finale?waveFiveFinale.enemies.filter(e=>e.brute&&!e.dead).length+waveFiveFinale.kinds.slice(waveFiveFinale.enemies.length).filter(kind=>kind==='brute').length:0;
  $('frenzyHud').textContent=finale?`WAVE 5 FRENZY · ${remaining} UNDEAD · ${bruteRemaining} BRUTES`:'FRENZY · SURVIVE THE CURRENT WAVE';
  const rank=armorRank(armorTier);$('armorLabel').textContent=rank?.name||'AEGIS SHIELD';$('armorHud').classList.toggle('nano',!!rank);$('armorHud').classList.toggle('nanoRank2',rank?.rank===2);$('armorHud').classList.toggle('nanoRank3',rank?.rank===3);const recovering=!!rank&&armor<armorMax;const shieldWait=rank?Math.max(0,rank.regenDelay-(runTime-lastHurt)):0;$('armorStatus').classList.toggle('hidden',!rank);$('armorStatus').textContent=!recovering?'FULL SHIELD':shieldWait>0?`RECHARGE IN ${Math.ceil(shieldWait)}s`:`${rank.regenDelay===0?'CONTINUOUS':'RECHARGING'} · ${rank.regenRate} SHIELD/S`;$('armorHud').classList.toggle('regenerating',recovering&&shieldWait===0&&mode==='playing');$('armorHud').classList.toggle('depleted',armorMax>0&&armor<=0);$('armorHud').classList.toggle('hidden',armorMax===0);$('armorValue').textContent=Math.ceil(armor)+' / '+armorMax;$('armorBar').style.width=(armorMax?armor/armorMax*100:0)+'%';$('frenzyHud').classList.toggle('hidden',frenzyWave!==wave||!frenzyWave);const inv=inventory[weapon];$('wave').textContent=String(Math.max(wave,1)).padStart(2,'0');$('points').textContent=points.toLocaleString();$('kills').textContent=kills;$('healthLabel').textContent=doubleTime>0?`SPECTRAL FURY · ${Math.ceil(doubleTime)}s`:'VITAL SIGNS';$('health').textContent=Math.max(0,Math.ceil(health));$('healthBar').style.width=`${Math.max(0,health/maxHealth*100)}%`;$('healthReadout').classList.toggle('critical',health<maxHealth*.35);$('healthReadout').classList.toggle('spectral',doubleTime>0);$('weaponName').textContent=weapons[weapon].name+(inv.forgeRank?` / FORGED ${inv.forgeRank}/3`:'');$('ammo').textContent=inv.ammo;$('reserve').textContent=inv.reserve;$('reloadStatus').innerHTML=`R RELOAD <span> · </span> G GRENADE ${grenadeTime>0?'∞ · '+Math.ceil(grenadeTime)+'s':grenades}`;$('waveState').textContent=boss.stage==='active'?'SIR BLACKTHORN · THE DEAD WAIT ON HIM':waveDelay>0?`NEXT WAVE IN ${Math.ceil(waveDelay)}s`:finale?`FRENZIED FINALE · ${remaining} UNDEAD REMAIN`:`${frenzyWave===wave&&wave?'FRENZY · ':''}${remaining} UNDEAD REMAIN`;const perkMarkup=perkDefs.filter(p=>perkOwned.has(p.id)).map(p=>`<span title="${p.name}" style="color:${p.hex}">${p.icon}</span>`).join('');setMarkup('perks',perkMarkup);const powerupMarkup=[['double',doubleTime],['grenades',grenadeTime]].filter(([,time])=>time>0).map(([type,time])=>`<div class="powerupBadge" style="color:${POWERUPS[type].hex}">${powerupIcon(type)}<span>${POWERUPS[type].name}<b>${Math.ceil(time)}s</b></span></div>`).join('')+(bella.unlocked?`<div class="powerupBadge companionBadge" style="color:#f0dbc1">${BELLA_PAW}<span>IMMORTAL COMPANION<b>BELLA · ${bella.activity}</b></span></div>`:'');setMarkup('powerups',powerupMarkup);}
const changelog=createChangelog({document,onOpen:pauseGame});
const leaderboard=createLeaderboard({document,onOpen:()=>{if(mode==='playing')pauseGame();},onNewRun:()=>resetRun()});
// Reuse two HUD nodes; transform the fill each frame without changing layout.
function updateReloadHud(){
  const visible=reloadLeft>0&&reloadDuration>0&&mode!=='menu'&&mode!=='dead';
  const progress=visible?clamp(1-reloadLeft/reloadDuration,0,1):0;
  if(visible!==reloadHudVisible){$('reloadProgress').classList.toggle('hidden',!visible);reloadHudVisible=visible;}
  if(progress!==reloadHudProgress){$('reloadProgressFill').style.transform=`scaleX(${progress})`;reloadHudProgress=progress;}
  const percent=Math.round(progress*100);
  if(percent!==reloadHudPercent){$('reloadProgress').setAttribute('aria-valuenow',String(percent));reloadHudPercent=percent;}
}
function resetRun({capture=true}={}){applyFormFactor();boneChips=0;atticState={opening:false,time:0,open:false};oliviaCheer=0;setAtticOpen(false);attic.setProgress(0);lighting.setBlockerState('closed:closed',cellar.progress>0||graveyard.progress>0||shed.progress>0);releaseMouse();grenadeThrow.cancel();worldEvents.reset();eventVisuals.reset();curse.setRank(curseLadder.selected);resetBlackthorn();leaderboard.startRun();armor=armorMax=armorTier=frenzyWave=0;waveFiveFinale=null;setCellarOpen(false);cellar.reset();bella.reset();stationBuilder.reset();graveyard.reset();shed.reset();nav=makeNavigation();$('estateMap').classList.add('hidden');mapWasPlaying=false;for(const e of zombies){world.remove(e.group);disposeEnemy(e);}zombies.length=0;for(const e of effects){world.remove(e.mesh);if(e.type==='blast')e.mesh.material.dispose();}effects.length=0;bloodPool.reset();markPool.reset();for(const p of pickups)world.remove(p.mesh);pickups.length=0;combatLights.reset();player.set(0,0,20);lookYaw=0;lookPitch=0;camera.fov=weaponViewFov=75;camera.updateProjectionMatrix();health=maxHealth=100;points=500;totalScore=0;kills=0;wave=0;waveDelay=7;toSpawn=0;runTime=0;lastHurt=-20;perkOwned.clear();grenades=3;doubleTime=0;grenadeTime=0;grenadeCooldown=0;inventory=freshInventory();reloadLeft=0;shotTimer=0;feetY=0;jumpV=0;grounded=true;damageFlash=nukeFlashTime=hitTime=0;shotId=0;weaponRecoil.reset();combatHud.reset();toastTime=0;setOpacity('toast',0);clearPlayInput();gunGroups.glock.userData.slideTime=0;updatePistolSlide(gunGroups.glock,0,inventory.glock.ammo);selectWeapon('glock');mode='paused';$('menu').classList.add('hidden');$('pause').classList.add('hidden');$('hud').classList.remove('hidden');if(capture)requestPointer();else{$('pauseTitle').textContent='The estate is ready.';$('pauseText').textContent=padPlay()?'Press A to begin. Menu pauses the game.':touchControls?.enabled?'Tap Play to begin. The II button pauses the game.':'Click Play to lock your mouse and begin. Esc releases it and pauses the game.';$('captureHelp').classList.add('hidden');$('resume').classList.remove('hidden');$('resume').textContent=padPlay()?'PRESS A TO PLAY →':touchControls?.enabled?'TAP TO PLAY →':'CLICK TO PLAY →';showPauseMenu();}announce('BLACKTHORN ESTATE','BUY PERKS. WATCH YOUR AMMO. SURVIVE.');nav.rebuild(player.x,player.z,player.y);updateHud();}
let capturePending=false,captureWanted=false,captureAttempt=0,captureTimer=null,touchControls=null;
function hasMouseLock(){return document.pointerLockElement===canvas;}
function clearPlayInput(){mouseDown=false;aiming=false;keys.clear();touchControls?.reset();}
function finishCaptureRequest(){clearTimeout(captureTimer);captureTimer=null;capturePending=false;$('resume').disabled=false;$('restart').disabled=false;}
function releaseMouse(){
  captureWanted=false;captureAttempt++;finishCaptureRequest();pointer=false;
  canvas.classList.remove('mouse-locked');
  if(hasMouseLock()&&typeof document.exitPointerLock==='function')try{document.exitPointerLock();}catch{}
}
function captureAcquired(){
  if(!hasMouseLock())return;
  if(!captureWanted||document.hidden||mode==='dead'){releaseMouse();return;}
  finishCaptureRequest();if(pointer&&mode==='playing')return;pointer=true;mode='playing';clearPlayInput();
  canvas.classList.add('mouse-locked');$('pause').classList.add('hidden');$('captureHelp').classList.add('hidden');
  $('resume').textContent=resumeLabel();
}
function captureFailed(attempt,error){
  if(attempt!==captureAttempt||!capturePending)return;
  if(hasMouseLock()){captureAcquired();return;}
  captureWanted=false;captureAttempt++;finishCaptureRequest();pointer=false;mode='paused';clearPlayInput();
  canvas.classList.remove('mouse-locked');
  $('pauseTitle').textContent='Let’s lock your mouse.';
  $('pauseText').textContent=error?.name==='NotAllowedError'?'Your browser did not allow mouse control. Click Retry and allow mouse control if asked.':'The game is paused until your mouse is locked inside it.';
  $('captureHelp').classList.remove('hidden');$('resume').classList.remove('hidden');
  $('resume').textContent='TRY MOUSE LOCK AGAIN →';showPauseMenu();
}
function requestPointer(){
  if(capturePending||mode==='dead'||mode==='menu')return;
  if(directControls()){startDirectPlay();return;}
  captureWanted=true;
  if(hasMouseLock()){captureAcquired();return;}
  clearPlayInput();pointer=false;mode='capturing';capturePending=true;
  const attempt=++captureAttempt;
  $('pauseTitle').textContent='Locking your mouse…';
  $('pauseText').textContent='Allow mouse control if your browser asks. Esc releases the mouse and pauses survival.';
  $('captureHelp').classList.add('hidden');$('resume').classList.remove('hidden');
  $('resume').textContent='WAITING FOR MOUSE LOCK…';$('resume').disabled=true;$('restart').disabled=true;
  showPauseMenu();
  // Keep this call in the original click/keypress, without awaiting other work.
  try{canvas.focus({preventScroll:true});}catch{try{canvas.focus();}catch{}}
  if(typeof canvas.requestPointerLock!=='function'){captureFailed(attempt);return;}
  captureTimer=setTimeout(()=>captureFailed(attempt),15000);
  try{
    const result=canvas.requestPointerLock();
    // Firefox/older implementations can return void and signal via events.
    if(result?.then)result.then(()=>{if(attempt===captureAttempt&&hasMouseLock())captureAcquired();},error=>captureFailed(attempt,error));
    initAudio();
  }catch(error){captureFailed(attempt,error);}
}
// Touch and controller play need no mouse capture. For touch, fullscreen and
// landscape lock are requested inside the Resume tap, where phones permit them.
function startDirectPlay(){
  captureWanted=false;captureAttempt++;finishCaptureRequest();pointer=false;
  mode='playing';clearPlayInput();canvas.classList.remove('mouse-locked');
  $('pause').classList.add('hidden');$('captureHelp').classList.add('hidden');
  touchControls.setActive(touchControls.enabled);initAudio();
  const root=document.documentElement;
  if(touchControls.enabled&&!document.fullscreenElement&&typeof root?.requestFullscreen==='function')try{root.requestFullscreen({navigationUI:'hide'}).then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{});}catch{}
}
function resumeLabel(){return directControls()?'RESUME →':'LOCK MOUSE & RESUME →';}
function resumeHint(){return padPlay()?'Press Menu, or A on Resume, to keep fighting.':touchControls?.enabled?'Tap Resume to keep fighting.':'Click Resume to lock the mouse again.';}
function pauseGame(){
  if(mode!=='playing'&&mode!=='capturing'&&mode!=='curse')return;
  touchControls?.setActive(false);
  curseUI.update();
  mode='paused';clearPlayInput();releaseMouse();
  $('pauseTitle').textContent='Catch your breath.';
  $('pauseText').textContent=`Wave ${Math.max(wave,1)} · ${kills} kills · ${points.toLocaleString()} essence. ${resumeHint()}`;
  $('captureHelp').classList.add('hidden');$('resume').classList.remove('hidden');
  $('resume').textContent=resumeLabel();showPauseMenu();
}
function showPauseMenu(){curseUI.updatePauseStats();$('pause').classList.remove('hidden');}
function resumeGame(){if(mode==='paused')requestPointer();}
function gameOver(){if(mode==='dead')return;curseUI.update();worldEvents.endWave();eventVisuals.reset();grenadeThrow.cancel();grenadeCooldown=0;mode='dead';clearPlayInput();releaseMouse();$('captureHelp').classList.add('hidden');if(wave>bestWave||wave===bestWave&&kills>bestKills){bestWave=wave;bestKills=kills;try{localStorage.setItem('blackthorn-best',JSON.stringify({wave,kills}));}catch{}}$('pauseTitle').textContent='The house claims another.';$('pauseText').textContent=`Survived to wave ${wave} · ${kills} kills · ${totalScore.toLocaleString()} essence earned · Curse ${curse.rank} / ${curse.title}. Personal best: wave ${bestWave}.`;$('resume').classList.add('hidden');showPauseMenu();tone(90,2,.12,'sawtooth',25);leaderboard.endRun({score:totalScore,wave,kills,duration:runTime,curseRank:curse.rank});}
let guideReturnFocus=null;
function openFieldGuide(trigger){
  pauseGame();guideReturnFocus=trigger;$('guide').classList.remove('hidden');
  $('guideBody').scrollTop=0;$('guideBody').focus({preventScroll:true});
}
function closeFieldGuide(){
  $('guide').classList.add('hidden');guideReturnFocus?.focus({preventScroll:true});guideReturnFocus=null;
}
function fieldGuideKeydown(e){
  if(e.code==='Escape'){e.preventDefault?.();closeFieldGuide();return;}
  if(e.code==='Tab'){
    const items=[...$('guide').querySelectorAll('button,a[href],[tabindex="0"]')];
    const current=items.indexOf(document.activeElement);
    const next=e.shiftKey?(current<=0?items.length-1:current-1):(current+1)%items.length;
    e.preventDefault();items[next]?.focus();
  }
  // Leave native scrolling and link/button activation to the browser.
}
if(!window.Blackthorn)$('start').onclick=resetRun;$('resume').onclick=resumeGame;$('restart').onclick=resetRun;
$('howBtn').onclick=()=>openFieldGuide($('howBtn'));$('guidePause').onclick=()=>openFieldGuide($('guidePause'));
$('closeGuide').onclick=closeFieldGuide;$('guideDone').onclick=closeFieldGuide;
$('sound').onchange=()=>{if(ambience)ambience.gain.value=soundOn()?.018:0;};
configureMinimap({radar:$('radar'),navigation:$('hudNavigation'),vitals:$('hudVitals'),toggle:$('minimapToggle')});
const WEAPON_CYCLE=['glock','shotgun','smg','lmg','bushmaster','rifle'];
function toggleFlashlight(){flashlightOn=!flashlightOn;flashlight.intensity=flashlightOn?FLASHLIGHT_INTENSITY:0;}
function cycleWeapon(step=1){const owned=WEAPON_CYCLE.filter(k=>inventory[k]?.owned);if(owned.length<2)return;selectWeapon(owned[(owned.indexOf(weapon)+step+owned.length)%owned.length]);}
function touchLook(dx,dy){if(mode!=='playing')return;const sens=Number($('sensitivity').value)*TOUCH.lookSpeed*(aiming?.62/(weapons[weapon].zoom||1):1);lookYaw-=dx*sens;lookPitch=clamp(lookPitch-dy*sens,-1.3,1.3);}
// Phones start on touch controls and computers on mouse and keyboard; a pause-
// menu change is remembered per kind of device. Controllers are detected, but
// take over only once gamepad play exists (controllerSupported).
const controlScheme=createControlScheme({win:window,controllerSupported:true,onChange:schemeChanged});
// Phone layout (v142): a compact HUD for phone screens, checked at load, on
// every resize or rotation, and again on entering the mansion.
function applyFormFactor(){controlScheme.refresh('device');document.body.classList.toggle('phone-ui',controlScheme.phone);}
function directControls(){return controlScheme.scheme==='touch'||controlScheme.scheme==='controller';}
function padPlay(){return controlScheme.scheme==='controller';}
// The last device used takes over: a controller button, or a real key, click
// or tap. Mouse movement alone never switches, so a nudged desk can't steal play.
for(const type of ['keydown','mousedown','pointerdown'])window.addEventListener(type,e=>{
  if(e.isTrusted===false)return;
  if(type==='pointerdown'&&e.pointerType==='mouse')return;
  controlScheme.noteInput(type==='pointerdown'?'touch':'keyboard');
},true);
touchControls=createTouchControls({document,toggle:$('touchToggle'),enabled:controlScheme.scheme==='touch',onToggle:on=>controlScheme.choose(on?'touch':'standard'),actions:{
  look:touchLook,
  fireStart(){if(mode!=='playing')return;if(!mouseDown){mouseDown=true;shoot();}},
  fireEnd(){mouseDown=false;},
  aimToggle(){if(mode==='playing')aiming=!aiming;},
  jump(){if(mode==='playing'&&grounded){jumpV=4.2;grounded=false;}},
  reload(){if(mode==='playing')reload();},grenade(){if(mode==='playing')grenade();},interact(){if(mode==='playing')interact();},
  nextWeapon(){if(mode==='playing')cycleWeapon();},flashlight(){if(mode==='playing')toggleFlashlight();},
  map(){openEstateMap();},pause(){pauseGame();}
}});
function schemeChanged(scheme){
  touchControls?.setEnabled(scheme==='touch');
  document.body.classList.toggle('pad-controls',scheme==='controller');
  if(scheme!=='controller')gamepad?.reset();
  updateControllerStatus();
  // Switching schemes while paused swaps the mouse-capture wording.
  if(mode!=='paused')return;
  if(!$('captureHelp').classList.contains('hidden')){$('captureHelp').classList.add('hidden');$('pauseTitle').textContent='Catch your breath.';}
  $('pauseText').textContent=scheme==='controller'?'Controller connected. Press Menu, or A on Resume, to keep fighting.':scheme==='touch'?'Touch controls are on. Tap Resume to keep fighting.':'Click Resume to lock the mouse again.';
  $('resume').textContent=resumeLabel();
}
// ---- Controller ------------------------------------------------------------
const RUMBLE_KEY='blackthorn-controller-rumble';
let rumbleOn=true;try{rumbleOn=localStorage.getItem(RUMBLE_KEY)!=='off';}catch{}
function applyRumbleSetting(){$('rumbleToggle').setAttribute('aria-checked',String(rumbleOn));$('rumbleToggle').querySelector('[data-rumble-setting]').textContent=rumbleOn?'VIBRATION ON':'VIBRATION OFF';}
$('rumbleToggle').onclick=()=>{rumbleOn=!rumbleOn;try{localStorage.setItem(RUMBLE_KEY,rumbleOn?'on':'off');}catch{}applyRumbleSetting();if(rumbleOn)padRumble(.5,.3,140);};
applyRumbleSetting();
function padRumble(strong,weak,ms){if(rumbleOn&&padPlay())gamepad.rumble(strong,weak,ms);}
const SHOT_RUMBLE={glock:[.08,.32,55],shotgun:[.75,.5,120],smg:[.05,.22,40],lmg:[.2,.35,55],bushmaster:[.45,.4,80],rifle:[.12,.3,50]};
let shownController='';
function updateControllerStatus(){
  const status=$('controllerStatus'),pad=gamepad?.connected?gamepad.name.replace(/\s*\((?:STANDARD GAMEPAD|Vendor:)[^)]*\)/gi,'').replace(/\s*\(.*\)\s*$/,'').trim()||'Controller':'';
  const text=!pad?'No controller detected. Connect one and press any button to play with it.':padPlay()?`${pad} · in use. A key, click or tap switches back.`:`${pad} connected. Press any button on it to play with it.`;
  if(text!==shownController){shownController=text;status.textContent=text;status.classList.toggle('inUse',padPlay());}
}
// Which menu the controller is driving, topmost first.
function padLayer(){
  for(const id of ['leaderboard','changelog','guide','estateMap','pause'])if(!$(id).classList.contains('hidden'))return $(id);
  if(mode==='menu'&&!$('menu').classList.contains('hidden'))return $('menu');
  return null;
}
function padBack(){
  if(leaderboard.visible){leaderboard.close();return;}
  if(changelog.visible){changelog.keydown({code:'Escape',preventDefault(){}});return;}
  if(!$('guide').classList.contains('hidden')){closeFieldGuide();return;}
  if(!$('estateMap').classList.contains('hidden')){closeEstateMap();return;}
  if(mode==='paused')resumeGame();
}
function padStart(){
  if(mode==='playing'){pauseGame();return;}
  if(leaderboard.visible||changelog.visible||!$('guide').classList.contains('hidden')){padBack();return;}
  if(!$('estateMap').classList.contains('hidden')){closeEstateMap();return;}
  if(mode==='paused'){resumeGame();return;}
  if(mode==='menu'&&!$('start').disabled)$('start').click();
}
// Light aim assist: look speed eases while the sights sit over an enemy body.
const padForward=new T.Vector3(),padTo=new T.Vector3();
function padOnTarget(){
  if(!padPlay())return false;
  camera.getWorldDirection(padForward);
  for(const e of zombies){
    if(e.dead)continue;const p=e.group.position,height=(e.bodyHeight||1.7)*.62;
    padTo.set(p.x-camera.position.x,p.y+height-camera.position.y,p.z-camera.position.z);
    const d=padTo.length();if(d<1||d>35)continue;
    const along=padTo.dot(padForward);if(along<=0)continue;
    if(Math.sqrt(Math.max(0,d*d-along*along))<(e.brute?.7:e.dog?.4:.45))return true;
  }
  return false;
}
const gamepad=createGamepadControls({win:window,document,actions:{
  used(){return controlScheme.noteInput('controller')==='controller';},
  look(dx,dy){if(mode!=='playing')return;lookYaw-=dx;lookPitch=clamp(lookPitch-dy,-1.3,1.3);},
  fireStart(){if(mode!=='playing')return;if(!mouseDown){mouseDown=true;shoot();}},
  fireEnd(){mouseDown=false;},
  aim(on){if(mode==='playing'||!on)aiming=on;},
  jump(){if(mode==='playing'&&grounded){jumpV=4.2;grounded=false;}},
  reload(){if(mode==='playing')reload();},interact(){if(mode==='playing')interact();},grenade(){if(mode==='playing')grenade();},
  nextWeapon(){if(mode==='playing')cycleWeapon();},previousWeapon(){if(mode==='playing')cycleWeapon(-1);},
  flashlight(){if(mode==='playing')toggleFlashlight();},
  map(){openEstateMap();},start:padStart,back:padBack
}});
schemeChanged(controlScheme.scheme);
let rendererPrepared=false;const QUALITY_KEY='blackthorn-quality',renderScale=createRenderScale($('quality').value);
$('quality').onchange=()=>{const q=$('quality').value;try{localStorage.setItem(QUALITY_KEY,q);}catch{}renderScale.reset(q);renderer.setPixelRatio(q==='ultra'?Math.min(devicePixelRatio,2):q==='low'?1:Math.min(devicePixelRatio,1.5));lighting.setQuality(q);if(rendererPrepared)Promise.all([renderer.compileAsync?.(scene,camera),renderer.compileAsync?.(scene,viewCamera)]).catch(()=>{});rt.samples=Math.min(q==='low'?2:4,renderer.capabilities?.maxSamples??4);rt.dispose();estateDetail.dust.visible=q!=='low';resize();};
document.addEventListener('pointerlockchange',()=>{
  if(hasMouseLock()){captureAcquired();return;}
  const wasLocked=pointer;pointer=false;canvas.classList.remove('mouse-locked');
  if(wasLocked&&mode==='playing')pauseGame();
});
document.addEventListener('pointerlockerror',()=>captureFailed(captureAttempt));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
document.addEventListener('mousemove',e=>{if(mode==='playing'&&pointer&&hasMouseLock()&&$('guide').classList.contains('hidden')){const sens=Number($('sensitivity').value)*.002*(aiming?.62/(weapons[weapon].zoom||1):1);lookYaw-=e.movementX*sens;lookPitch=clamp(lookPitch-e.movementY*sens,-1.3,1.3);}});
canvas.addEventListener('mousedown',e=>{if(mode!=='playing'||directControls())return;if(!hasMouseLock()){pauseGame();requestPointer();return;}e.preventDefault?.();if(e.button===0&&!mouseDown){mouseDown=true;shoot();}if(e.button===2)aiming=true;});document.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)aiming=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{if(changelog.visible){changelog.keydown(e);return;}if(leaderboard.visible){if(e.code==='Escape'){e.preventDefault();leaderboard.close();}return;}if(!$('guide').classList.contains('hidden')){fieldGuideKeydown(e);return;}if(['INPUT','TEXTAREA'].includes(e.target?.tagName))return;if(e.code==='KeyM'){e.preventDefault();if(e.repeat)return;if($('estateMap').classList.contains('hidden'))openEstateMap();else closeEstateMap();return;}if(e.code==='Escape'&&!$('estateMap').classList.contains('hidden')){closeEstateMap(false);return;}if(e.code==='Escape'){pauseGame();return;}if(mode!=='playing'||!(hasMouseLock()||directControls()))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyR')reload();if(e.code==='KeyE')interact();if(e.code==='KeyF')toggleFlashlight();if(e.code==='KeyG')grenade();if(e.code==='Digit1')selectWeapon('glock');if(e.code==='Digit2')selectWeapon('shotgun');if(e.code==='Digit3')selectWeapon('smg');if(e.code==='Digit4')selectWeapon('lmg');if(e.code==='Digit5')selectWeapon('bushmaster');if(e.code==='Digit6')selectWeapon('rifle');if(e.code==='Space'&&grounded){jumpV=4.2;grounded=false;}});document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if((mode==='playing'||mode==='curse')&&!capturePending)pauseGame();});
let mapWasPlaying=false;
function closeEstateMap(restorePlay=true){if($('estateMap').classList.contains('hidden'))return;const resume=mapWasPlaying&&restorePlay;mapWasPlaying=false;$('estateMap').classList.add('hidden');if(resume)resumeGame();}
function openEstateMap(){if(!['playing','paused'].includes(mode))return;mapWasPlaying=mode==='playing';if(mapWasPlaying)pauseGame();(player.y<-.3?drawCellarMap:player.y>2.15?drawUpperMap:drawEstateMap)($('estateMapCanvas'),player,interactables,lookYaw);$('estateMap').classList.remove('hidden');$('closeEstateMap').focus();}
$('closeEstateMap').onclick=()=>closeEstateMap();$('mapPause').onclick=openEstateMap;
function moveWithCollision(pos,dx,dz,r,enemy=null){return moveActor(pos,dx,dz,colliders,{radius:r,height:enemy?.bodyHeight||1.8,grounded:pos===player?grounded:true,allowFall:pos===player,canOccupy:enemy?enemy.canOccupy:pos===player?playerCanOccupy:null});}
function hasClearPath(x,z,tx,tz,y=0,ty=y,radius=.35,height=1.8){if(Math.abs(ty-y)>.55)return false;const dist=Math.hypot(tx-x,tz-z);for(let t=.25;t<dist;t+=.25){const f=t/dist,xx=x+(tx-x)*f,zz=z+(tz-z)*f;const ramp=cellarStairHeight(xx,zz)??stairHeight(xx,zz);if((ramp!==null&&ramp>y+.30&&y+height>ramp-.20)||isBlocked(xx,zz,radius,colliders,undefined,y,height)||Math.abs(supportBelow(xx,zz,y,.3)-y)>.31)return false;}return true;}
function enemyFloorHeight(x,z){
  if(Math.abs(x)<4&&z>=12&&z<=14.5)return .155;
  if(Math.abs(x)<3&&Math.abs(z)<11)return .135;
  if(Math.abs(x)<=42&&z>=-84&&z<=12)return .095;
  for(const {apron} of EXTERIOR_STAIRS)if(Math.abs(x-apron.x)<=apron.w/2&&Math.abs(z-apron.z)<=apron.d/2)return apron.topY;
  for(const path of ESTATE_PATHS)if(Math.abs(x-path.x)<=path.w/2&&Math.abs(z-path.z)<=path.d/2)return path.y+.05;
  return -.07;
}
function corpseBlocked(x,z,r,y){return isBlocked(x,z,r,colliders,undefined,y-r,2*r);}
function corpseFloor(x,z,y){const h=supportBelow(x,z,y+.2);return Math.abs(h)>.1?h+.008:enemyFloorHeight(x,z)+.008;}
// A blocked enemy shoulders the neighbour in its way a little to the side.
// Only on flat floors, never mid-attack, and only into genuinely free space.
function shoulderNeighbour(e,dx,dz,dt){
  const p=e.walkPos;if(stairHeight(p.x,p.z)!==null||cellarStairHeight(p.x,p.z)!==null)return;
  let blocker=null,best=Infinity;
  for(const o of zombies){
    if(o===e||o.dead||o.emergeLeft>0||Math.abs(o.walkPos.y-p.y)>.5)continue;
    const ox=o.walkPos.x-p.x,oz=o.walkPos.z-p.z,d=Math.hypot(ox,oz);
    if(d>e.radius+o.radius+.14||(ox*dx+oz*dz)/Math.max(d,1e-6)<.5||d>=best)continue;best=d;blocker=o;
  }
  if(!blocker||blocker.attackTime>=0)return;
  const q=blocker.walkPos;if(stairHeight(q.x,q.z)!==null||cellarStairHeight(q.x,q.z)!==null)return;
  const side=Math.sign((q.x-p.x)*(-dz)+(q.z-p.z)*dx)||e.routeSide||1,force=SPREAD.shove*dt*(e.brute?1.4:1)/(blocker.brute?3:1);
  moveWithCollision(q,-dz*side*force,dx*side*force,blocker.radius,blocker);
}
function updateEnemies(dt){crowd.plan(player.y);for(let i=zombies.length-1;i>=0;i--){const e=zombies[i];
if(e.dead){if(updateZombieDeath(e,dt,corpseBlocked,corpseFloor)){world.remove(e.group);disposeEnemy(e);zombies.splice(i,1);}continue;}
if(e.waking){animateZombie(e,dt,99,0);continue;}
if(e.warCry>0){e.warCry-=dt;if(e.warCry<=0)endWarCry(e);}
if(e.emergeLeft>0){
  e.emergeLeft=Math.max(0,e.emergeLeft-dt);
  const floor=enemyFloorHeight(e.walkPos.x,e.walkPos.z)-.02;e.group.position.y=floor-(e.emergeDepth||1.65)*(e.emergeLeft/(e.emergeTime||1.05))**2;
  animateZombie(e,dt,99,0);continue;
}
advanceStagger(e,dt);
const routes=e.brute?nav.brutes:nav,p=e.walkPos,dist=Math.hypot(player.x-p.x,player.z-p.z),oldX=p.x,oldZ=p.z,sameFloor=Math.abs(player.y-p.y)<.55;
if(e.brute){
  // Duck ahead of the upper landing and mausoleum, before their lower headers.
  const crouch=bruteCrouchAt(p.x,p.z,p.y)?1:0;e.crouch=T.MathUtils.damp(e.crouch||0,crouch,12,dt);if(e.boss)e.crouch=Math.min(e.crouch,.3);/* Sir Blackthorn only stoops; his walker rig clears the tomb door. */
  e.bodyHeight=crouch||e.crouch>.02?BRUTE.crouchHeight:BRUTE.height;
}
e.pathTimer-=dt;
if(e.pathTimer<=0){
  e.clearPath=sameFloor&&dist<12&&hasClearPath(p.x,p.z,player.x,player.z,p.y,player.y,e.brute?e.radius:.35,e.brute?e.bodyHeight:1.8);
  e.flankClear=false;
  if(e.clearPath&&dist>2.5){const flank=e.flank*Math.min(1,(dist-2.5)/4);e.flankClear=hasClearPath(p.x,p.z,player.x-(player.z-p.z)/dist*flank,player.z+(player.x-p.x)/dist*flank,p.y,player.y,e.brute?e.radius:.35,e.brute?e.bodyHeight:1.8);}
  e.waypoint=routes.direction(p.x,p.z,p.y,e.navigation);
  // Keep a shared-out slot only if it is open floor with a clear walk to it.
  e.slotScale=0;
  if(e.clearPath&&e.engaged)for(const scale of [1,.5]){
    const t=crowd.slotTarget(e,scale),r=e.brute?e.radius:.35;
    if(!isBlocked(t.x,t.z,r,colliders,undefined,p.y,e.bodyHeight)&&hasClearPath(p.x,p.z,t.x,t.z,p.y,p.y,r,e.brute?e.bodyHeight:1.8)){e.slotScale=scale;break;}
  }
  e.pathTimer=.22+(e.phase%1)*.10;
}
const casting=e.boss&&updateBlackthorn(e,dt,dist,sameFloor);
let tx=player.x,tz=player.z;const climbTo=!e.brute&&isAtticOpen()?atticRoute(p.x,p.z,p.y,playerInAttic()):null;
if((dist>1.3||!sameFloor)&&(!sameFloor||!e.clearPath)){
  if(!e.waypoint||Math.hypot(e.waypoint.x-p.x,e.waypoint.z-p.z)<.18)e.waypoint=routes.direction(p.x,p.z,p.y,e.navigation);
  if(e.waypoint){tx=e.waypoint.x;tz=e.waypoint.z;}
}else if(e.engaged&&e.slotScale>0){
  const t=crowd.slotTarget(e,e.slotScale);tx=t.x;tz=t.z;
}else if(dist>2.5&&e.flankClear){
  const flank=e.flank*Math.min(1,(dist-2.5)/4);
  const fx=tx-(player.z-p.z)/dist*flank,fz=tz+(player.x-p.x)/dist*flank;
  tx=fx;tz=fz;
}
if(climbTo){tx=climbTo.x;tz=climbTo.z;}
let dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz),heading=Math.atan2(player.x-p.x,player.z-p.z);
if(len>.1&&(dist>1.03||!sameFloor)&&!casting){
  dx/=len;dz/=len;crowd.steer(e,dx,dz,elapsed);dx=e.steerX;dz=e.steerZ;
  // v139: ease the walking direction (~0.14s) so grid-cell routes curve
  // instead of zig-zagging the body from cell to cell. Sharp turns (over ~70°)
  // are taken at once so nobody grinds into a wall turning round.
  {const k=(e.walkDirX??dx)*dx+(e.walkDirZ??dz)*dz<.3?1:1-Math.exp(-dt*7);let sx=(e.walkDirX??dx)+(dx-(e.walkDirX??dx))*k,sz=(e.walkDirZ??dz)+(dz-(e.walkDirZ??dz))*k;const n=Math.hypot(sx,sz);if(n>.2){sx/=n;sz/=n;}else{sx=dx;sz=dz;}e.walkDirX=sx;e.walkDirZ=sz;dx=sx;dz=sz;}
  const pace=(e.staggerLeft>0?0:1)*(e.crawling?(e.crawlDrop>0?0:CRAWL.speed):1)*(frenzyWave===wave&&wave?1.4:1)*(e.attackTime>=0?(e.dog?.65:.4):1)*(e.legHit>0?.55:1)*(e.warCry>0?BOSS.cry.speed:1),step=e.speed*worldEvents.speedMultiplier(e)*dt*pace;
  moveWithCollision(p,dx*step,dz*step,e.radius,e);
  const moved=Math.hypot(p.x-oldX,p.z-oldZ);
  e.stuck=moved<step*.15?e.stuck+dt:0;
  if(e.stuck>.35&&dist>1.8){
    // Slide around a neighbour when there is room; solid walls and bodies still
    // decide whether that step is possible. Never push or teleport the crowd.
    const side=e.routeSide*(Math.floor(e.stuck/1.2)%2?-1:1),remaining=Math.max(0,step-moved);
    moveWithCollision(p,-dz*side*remaining,dx*side*remaining,e.radius,e);
  }
  if(e.stuck>.12)shoulderNeighbour(e,dx,dz,dt);
  // v139: face a smoothed walking direction (~0.35s), not each frame's raw
  // step, so crowd steering and wall slides do not swing the body side to side.
  {const k=1-Math.exp(-dt*2.4),vx=(p.x-oldX)/Math.max(dt,1e-4),vz=(p.z-oldZ)/Math.max(dt,1e-4);e.faceX=(e.faceX??vx)+(vx-(e.faceX??vx))*k;e.faceZ=(e.faceZ??vz)+(vz-(e.faceZ??vz))*k;
   if(Math.hypot(e.faceX,e.faceZ)>.25)heading=Math.atan2(e.faceX,e.faceZ);}
}

// Turn at a limited, eased rate (v136): bodies swing round with weight rather
// than snapping to every steering wobble; the head leads, tracking the player.
const turn=Math.atan2(Math.sin(heading-e.group.rotation.y),Math.cos(heading-e.group.rotation.y)),maxTurn=(e.dog?6:e.feral?5:e.brute?2.4:3.2)*dt,yawStep=clamp(turn*(1-Math.exp(-dt*6)),-maxTurn,maxTurn);e.group.rotation.y+=yawStep;e.turnRate=T.MathUtils.lerp(e.turnRate||0,yawStep/Math.max(dt,1e-4),1-Math.exp(-dt*10));
e.floorY=p.y;e.group.position.set(p.x,Math.abs(p.y)>.1?p.y-.02:enemyFloorHeight(p.x,p.z)-.02,p.z);e.attack-=dt*worldEvents.attackRate(e);const contact=(e.dog?animateZombieDog:animateZombie)(e,dt,sameFloor?dist:99,Math.hypot(p.x-oldX,p.z-oldZ),camera.position);if(casting)poseBlackthorn(e);
if(contact&&!casting&&!(e.staggerLeft>0)&&dist<1.7&&Math.abs(player.y-p.y)<.7&&hasClearPath(p.x,p.z,player.x,player.z,p.y,player.y)){
hurtPlayer(waveConfig(wave).damage*(e.boss?BOSS.meleeMultiplier:e.warden?1.4*WARDEN.damageMultiplier:e.feral?FERAL.damageMultiplier:e.dog?.85:e.brute?1.4:1)*(e.enraged&&!e.elite?ENRAGE.damageMultiplier:1)*(e.warCry>0?BOSS.cry.damage:1),p);noise(.15,.08,600);tone(70,.14,.06,'sine');if(health<=0)gameOver();}
e.groan-=dt;if(e.groan<=0){if(dist<12)tone(e.feral?210:e.rareDog?155:e.dog?105:e.brute?45:rand(60,100),e.dog?.22:.6,.035*(1-dist/14),'sawtooth',35);e.groan=rand(6,15);}}}
function bellaBite(enemy,damage,direction){damageEnemy(enemy,damage,false,{direction:direction.clone(),part:enemy.dog?'head':'leg',force:.45,source:'Bella'});tone(460,.08,.018,'triangle',620);}
const effectNext=new T.Vector3();
function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const e=effects[i],step=e.firstStep??dt;delete e.firstStep;e.life-=step;if(e.type==='particle'||e.type==='grenade'){e.vel.y-=9*step;const previousY=e.mesh.position.y,next=effectNext.copy(e.mesh.position).addScaledVector(e.vel,step);if(e.type==='grenade'&&isBlocked(next.x,next.z,.1,colliders,undefined,next.y-.1,.2)){e.vel.x*=-.5;e.vel.z*=-.5;}else{e.mesh.position.x=next.x;e.mesh.position.z=next.z;}e.mesh.position.y=next.y;const floor=supportBelow(next.x,next.z,previousY+.05)+.12;if(next.y<floor){e.mesh.position.y=floor;e.vel.y=Math.abs(e.vel.y)*.3;e.vel.x*=.9;e.vel.z*=.9;}e.mesh.rotation.x+=step*4;}if(e.type==='blast'){e.mesh.scale.setScalar(1+(1-e.life/e.max)*12);e.mesh.material.opacity=e.life/e.max*.75;}if(e.type==='light')e.mesh.intensity=25*e.life/e.max;if(e.life<=0){if(e.type==='grenade')explode(e.mesh.position.clone());if(e.pool)e.pool.release(e);else world.remove(e.mesh);if(e.type==='blast')e.mesh.material.dispose();effects.splice(i,1);}}}
function grantPowerup(type){if(type==='ammo'){refillAmmo();notify('MAX AMMO · RESERVES RESTOCKED');}else if(type==='double'){doubleTime=POWERUPS.double.duration;notify('×2 · DOUBLE DAMAGE FOR 20s');}else if(type==='grenades'){grenadeTime=POWERUPS.grenades.duration;notify('INFINITE GRENADES · 12s · PRESS G');}}
function updatePickups(dt){for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;if(p.mesh.userData.model)p.mesh.userData.model.rotation.y+=dt*.65;p.mesh.position.y=(p.y||0)+.8+Math.sin(elapsed*2+p.phase)*.15;if(p.eventPool)p.mesh.rotation.y+=dt*1.4;if(mode==='playing'&&p.life>0&&Math.abs((p.y||0)-player.y)<1.2&&Math.hypot(p.mesh.position.x-player.x,p.mesh.position.z-player.z)<1.2){if(p.type==='essence'){const reward=addPoints(p.value);notify(`GRAVE ESSENCE +${reward}`);}else if(p.type==='bone')collectBoneChip();else grantPowerup(p.type);tone(660,.4,.1,'triangle',1200);p.life=0;}if(p.life<=0){if(p.eventPool)eventVisuals.release(p);else world.remove(p.mesh);pickups.splice(i,1);}}}
const radar=$('radar'),rx=radar.getContext('2d');function drawRadar(){rx.clearRect(0,0,radar.width,radar.height);rx.save();rx.scale(radar.width/150,radar.height/150);rx.save();rx.translate(75,75);rx.strokeStyle='#a8b49c35';rx.lineWidth=1;rx.beginPath();rx.arc(0,0,47,0,Math.PI*2);rx.stroke();rx.rotate(-lookYaw);const sc=3;rx.strokeStyle='#a1ada354';for(const c of colliders){if(c.disabled)continue;if(player.y+.06>=(c.maxY??3.8)||player.y+1.8<=(c.minY??0))continue;if(c.w<1&&c.d<1)continue;const x=(c.x-player.x)*sc,z=(c.z-player.z)*sc;if(Math.hypot(x,z)<95)rx.strokeRect(x-c.w*sc/2,z-c.d*sc/2,c.w*sc,c.d*sc);}for(const e of zombies){if(e.dead||Math.abs(e.floorY-player.y)>1.8)continue;const x=(e.group.position.x-player.x)*sc,z=(e.group.position.z-player.z)*sc;if(Math.hypot(x,z)<68){rx.fillStyle=e.enraged?'#ff3925':e.feral?'#b6ff4e':e.rareDog?'#82edf3':e.dog?'#bd9ddc':e.brute?'#e4a85b':'#ca6b52';rx.beginPath();rx.arc(x,z,e.brute?3:2,0,7);rx.fill();}}for(const s of interactables){if(s.used||s.locked||s.secret)continue;if(Math.abs((s.y||0)-player.y)>1.8)continue;const x=(s.x-player.x)*sc,z=(s.z-player.z)*sc;if(Math.hypot(x,z)<68){rx.fillStyle=s.hex||'#baaa76';rx.fillRect(x-2,z-2,4,4);}}if(bella.unlocked&&Math.abs(bella.pos.y-player.y)<1.8){const x=(bella.pos.x-player.x)*sc,z=(bella.pos.z-player.z)*sc;if(Math.hypot(x,z)<68){rx.fillStyle='#9af0d6';rx.beginPath();rx.arc(x,z,3,0,7);rx.fill();rx.font='bold 8px Arial';rx.fillText('B',x+4,z+3);}}rx.restore();rx.fillStyle='#d8d9bf';rx.beginPath();rx.moveTo(75,69);rx.lineTo(71,80);rx.lineTo(79,80);rx.closePath();rx.fill();rx.fillStyle='#8b9f95';rx.font='8px Arial';rx.fillText('N',72,13);rx.restore();}
let hudTick=0,frameCount=0,fpsTime=0,footstepTime=0;
function tick(now){requestAnimationFrame(tick);gamepad.poll(Math.min(Math.max(0,(now-lastTime)/1000),.05),{enabled:padPlay(),playing:mode==='playing'&&$('guide').classList.contains('hidden'),layer:padLayer(),sensitivity:Number($('sensitivity').value),aiming:aiming&&!grenadeThrow.active,zoom:weapons[weapon].zoom||1,onTarget:mode==='playing'&&padOnTarget()});updateControllerStatus();document.body.classList.toggle('pad-playing',padPlay()&&mode==='playing');if(mode==='playing'&&!directControls()&&!hasMouseLock())pauseGame();touchControls?.setActive(mode==='playing'&&$('guide').classList.contains('hidden'));const frameSeconds=Math.max(0,(now-lastTime)/1000),dt=Math.min(frameSeconds,.05);lastTime=now;elapsed+=dt;fpsTime+=frameSeconds;frameCount++;if(mode==='playing'&&!document.hidden){const before=renderScale.scale;renderScale.sample(frameSeconds);if(renderScale.scale!==before)resize();}else renderScale.interrupt();if(fpsTime>1){$('fps').textContent=`${Math.round(frameCount/fpsTime)} FPS · ${$('quality').value.toUpperCase()}${renderScale.scale<1?` · ${Math.round(renderScale.scale*100)}% RES`:''}`;fpsTime=0;frameCount=0;}
if(mode==='curse')runTime+=dt;
if(mode==='playing'){weaponRecoil.update(dt);cellar.update(dt);graveyard.update(dt);shed.update(dt);runTime+=dt;shotTimer=Math.max(0,shotTimer-dt);grenadeCooldown=Math.max(0,grenadeCooldown-dt);if(mouseDown&&!weapons[weapon].semiAuto)shoot();if(reloadLeft>0){reloadLeft-=dt;if(reloadLeft<=0){reloadLeft=0;finishReload();}}
const stick=touchControls?.active?touchControls.move:padPlay()&&gamepad.connected?gamepad.move:null,moving=keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')||!!(stick&&(stick.x||stick.z));const aimingWeapon=aiming&&!grenadeThrow.active&&reloadLeft===0;const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight')||!!touchControls?.sprint||(padPlay()&&gamepad.sprint))&&!aimingWeapon&&!mouseDown;let x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);if(stick&&!x&&!z){x=stick.x;z=stick.z;}const len=Math.hypot(x,z);if(len){const norm=sprint?len:Math.max(1,len);x/=norm;z/=norm;const speed=(sprint?5.6:aimingWeapon?2.1:3.6)*(perkOwned.has('stride')?1.3:1);moveWithCollision(player,(x*Math.cos(lookYaw)+z*Math.sin(lookYaw))*speed*dt,(-x*Math.sin(lookYaw)+z*Math.cos(lookYaw))*speed*dt,.32);walkPhase+=dt*(sprint?13:9);footstepTime+=dt;if(footstepTime>(sprint?.27:.43)&&feetY===0){tone(70,.065,.032,'sine',45);noise(.035,.015,350);footstepTime=0;}}
const vertical=updateActorHeight(player,jumpV,dt,grounded,1.8,PLAYER_RADIUS,colliders);jumpV=vertical.velocity;grounded=vertical.grounded;feetY=grounded?0:Math.max(0,player.y-supportBelow(player.x,player.z,player.y));camera.position.set(player.x,1.68+player.y+(moving&&grounded?Math.sin(walkPhase)*.025:0),player.z);camera.rotation.set(clamp(lookPitch+weaponRecoil.pitch,-1.3,1.3),lookYaw+weaponRecoil.yaw,0);camera.fov=T.MathUtils.lerp(camera.fov,aimingWeapon?weaponAimFov(weapon):sprint?81:75,dt*9);camera.updateProjectionMatrix();weaponViewFov=weapons[weapon].zoom?T.MathUtils.lerp(weaponViewFov,aimingWeapon?(gunGroups[weapon].userData.optic.viewFov??16):sprint?81:75,dt*9):camera.fov;navTimer-=dt;if(navTimer<=0){nav.rebuild(player.x,player.z,player.y);navTimer=.6;}worldEvents.update(dt);eventVisuals.update(worldEvents);if(atticState.opening)updateAtticOpening(dt);oliviaCheer=Math.max(0,oliviaCheer-dt);attic.update(dt,{player,celebrate:oliviaCheer>0});if(boss.stage==='waking')updateWaking(dt);updateEnemies(dt);bossFx.update(dt,{hit:lanceHit,blocked:lanceBlocked});updateBossHud();if(mode==='playing'){bella.update(dt,{player,yaw:lookYaw,enemies:zombies,onBite:bellaBite,onBreath:bellaBreath,climb:(pos,goal)=>atticRoute(pos.x,pos.z,pos.y,goal.y>OLIVIA_ATTIC.y-.3&&inAttic(goal.x,goal.z)),visualFloor:enemyFloorHeight});grenadeThrow.update(dt,releaseGrenade);}updateEffects(dt);updatePickups(dt);
if(mode==='playing'&&armorTier>=2&&armor<armorMax){const rank=armorRank(armorTier),regenSeconds=rank.regenDelay===0?dt:Math.min(dt,Math.max(0,runTime-lastHurt-rank.regenDelay));armor=Math.min(armorMax,armor+regenSeconds*rank.regenRate);}
if(runTime-lastHurt>6&&health<maxHealth)health=Math.min(maxHealth,health+dt*11);doubleTime=Math.max(0,doubleTime-dt);grenadeTime=Math.max(0,grenadeTime-dt);
if(mode==='playing'){if(waveDelay>0){waveDelay-=dt;if(waveDelay<=1e-9)startWave();}else{spawnTimer-=dt;if(toSpawn>0&&spawnTimer<=0&&!blackthornHoldsSpawns()&&zombies.filter(e=>!e.dead).length<CURSE_RULES.aliveLimit){spawnEnemy();spawnTimer=waveConfig(wave).interval*(frenzyWave===wave?.4:1);}if(toSpawn===0&&worldEvents.pendingSpawns===0&&boss.stage!=='waking'&&!zombies.some(e=>!e.dead)){if(wave===5&&!waveFiveFinale){beginWaveFiveFinale();}else{completeWave();}}}}
const s=closestStation(),interaction=s?`<strong>${padPlay()?'B':touchControls?.enabled?'USE':'E'}</strong> ${s.name} <span style="color:#d4b77a">${s.type==='olivia'?(bella.dragon?'RAT DRAGON':`${Math.min(boneChips,EASTER_EGG.chips)}/${EASTER_EGG.chips} BONE CHIPS`):s.type==='bell'?'DORMANT':s.type==='mausoleumDoor'?(graveyard.open?'OPEN':'CLEAR WAVE 20'):s.type==='cellarDoor'?(isCellarOpen()?'OPEN':'WAVE 10'):s.type==='shedDoor'?(shed.open?'OPEN':'WAVE 7'):s.shedWeapon&&s.purchased?'OWNED':s.type==='upgrade'&&s.forgeMaximum?'MAX RANK':(s.type==='perk'&&perkOwned.has(s.id))||(s.type==='armor'&&s.used)?'ACTIVE':s.price===0?'FREE':s.price.toLocaleString()+' ESSENCE'}</span><small>${stationDescription(s)}</small>`:'';setMarkup('interaction',interaction);touchControls?.update({playing:true,aiming,canInteract:!!s,flashlight:flashlightOn,canSwap:WEAPON_CYCLE.filter(k=>inventory[k]?.owned).length>1});
const indoors=player.y<-.3||inMausoleum(player.x,player.z)||inShed(player.x,player.z)||!!roomAt(player.x,player.z);const flight=stairAt(player.x,player.z);const location=inShed(player.x,player.z)&&player.y>-.3?'GROUNDSKEEPER’S SHED':player.y<-.3?'STORM CELLAR / UNDERGROUND ARMORY':flight?.side?upperLocation(player.x,player.z):player.y>2.15?'2ND FLOOR / '+upperLocation(player.x,player.z):flight?'GRAND STAIRCASE':estateLocation(player.x,player.z);const locationMarkup=`BLACKTHORN ESTATE <span> / ${location}</span>`;setMarkup('location',locationMarkup);rain.visible=!indoors;gunRoot.visible=true;
scene.fog.density=baseFogDensity+(indoors?0:worldEvents.fogStrength()*(inGraveyard(player.x,player.z)?.049:.038));setOpacity('eventPulse',worldEvents.active('surge')?Math.max(0,1-worldEvents.age/1.4)*.24:0);
updatePistolSlide(gunGroups.glock,dt,inventory.glock.ammo);
const ads=aiming&&!grenadeThrow.active&&reloadLeft===0?1:0;gunRoot.position.x=T.MathUtils.lerp(gunRoot.position.x,ads?0:.28,dt*14);gunRoot.position.y=T.MathUtils.lerp(gunRoot.position.y,(ads?-gunGroups[weapon].userData.sightHeight:-.26)-grenadeThrow.lower*.43,dt*14);gunRoot.position.z=T.MathUtils.lerp(gunRoot.position.z,(ads?(weapon==='glock'?-.39:-.34):-.48)+weaponRecoil.back*(ads?.6:1),dt*14)+recoil*dt*4;gunRoot.rotation.set((ads?0:weaponRecoil.lift+recoil*1.2)+grenadeThrow.lower*.25,0,weapons[weapon].zoom&&ads?0:Math.sin(walkPhase*.5)*(moving?(ads?.001:.012):.001));if(reloadLeft>0){const f=reloadLeft/reloadDuration;gunRoot.rotation.z=-Math.sin(f*Math.PI)*.6;gunRoot.position.y-=Math.sin(f*Math.PI)*.2;}if(sprint&&moving)gunRoot.rotation.z=-.25;for(const {type,sight} of scopedGuns){sight.mask.visible=weapon===type&&ads>0&&weaponViewFov<(sight.viewFov??16)+1;}setOpacity('crosshair',ads?0:1);
hudTick-=dt;if(hudTick<=0){updateHud();drawRadar();hudTick=.1;}}
else if(mode==='menu'){camera.position.set(11.8,2.1,24);camera.lookAt(-1,3.3,0);camera.position.x+=Math.sin(elapsed*.12)*.3;gunRoot.visible=false;rain.visible=true;}
updateReloadHud();combatHud.update(dt,player,lookYaw+weaponRecoil.yaw);recoil=Math.max(0,recoil-dt*.4);flashTime=Math.max(0,flashTime-dt);flash.visible=flashTime>0;muzzleLight.position.copy(gunGroups[weapon].userData.muzzle);muzzleLight.intensity=flashTime>0?15:0;hitTime=Math.max(0,hitTime-dt);setOpacity('hit',hitTime>0?1:0);damageFlash=Math.max(0,damageFlash-dt*.8);setOpacity('damage',Math.max(damageFlash,mode==='playing'&&health<30?.16:0));nukeFlashTime=Math.max(0,nukeFlashTime-dt*1.5);setOpacity('nukeFlash',nukeFlashTime);toastTime=Math.max(0,toastTime-dt);setOpacity('toast',toastTime>0?1:0);bannerTime=Math.max(0,bannerTime-dt);setOpacity('banner',bannerTime>0?1:0);
for(const l of lamps)l.light.intensity=l.base*(.95+Math.sin(elapsed*4+l.phase)*.04+Math.sin(elapsed*7.1+l.phase)*.015);fire.scale.y=.55+Math.sin(elapsed*8)*.08;stationBuilder.update(elapsed);for(const m of mist){m.position.x+=dt*.025;if(m.position.x>43)m.position.x=-43;}
for(let i=0;i<rainPos.length;i+=3){rainPos[i+1]-=dt*9;if(rainPos[i+1]<0)rainPos[i+1]=18;if(rainPos[i]<player.x-22)rainPos[i]+=44;if(rainPos[i]>player.x+22)rainPos[i]-=44;if(rainPos[i+2]<player.z-22)rainPos[i+2]+=44;if(rainPos[i+2]>player.z+22)rainPos[i+2]-=44;}rainGeo.attributes.position.needsUpdate=true;
lighting.setBlockerState((cellar.progress===1?'open':'closed')+':'+(graveyard.progress===1?'open':'closed')+(shed.progress===1?':shed-open':''));bloodPool.sync();markPool.sync();combatLights.update(effects,pickups,player);estateDetail.update(elapsed,dt);blackout.apply(worldEvents.darkness());environmentLights.update(camera.position,elapsed,player.y);sky.position.copy(camera.position);skyMat.uniforms.time.value=elapsed;lighting.prepare(elapsed);renderCleanFrame(renderer,scene,camera,viewCamera,rt,postScene,postCamera,gunRoot.visible||grenadeThrow.root.visible,world,weaponViewFov);}
function resize(){applyFormFactor();const pr=renderer.getPixelRatio();renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const scale=renderScale.scale;rt.setSize(Math.max(1,Math.round(innerWidth*pr*scale)),Math.max(1,Math.round(innerHeight*pr*scale)));}window.addEventListener('resize',resize);resize();
async function prepareRendering(){
  if(!renderer.compileAsync)return;
  const finishEventWarmup=eventVisuals.warm();
  const savedVisibility=Object.values(gunGroups).map(g=>g.visible),savedGun=gunRoot.visible;
  const scopeMasks=scopedGuns.map(({sight})=>sight.mask),savedMasks=scopeMasks.map(mask=>mask.visible);scopeMasks.forEach(mask=>mask.visible=true);
  const warmPickups=Object.keys(POWERUPS).map(type=>powerupAssets.create(type));
  for(const group of warmPickups)prepareLightingMaterials(group);
  prepareLightingMaterials(bloodPool.instances);
  camera.position.set(0,1.68,20);camera.rotation.set(0,0,0);gunRoot.visible=true;
  Object.values(gunGroups).forEach(g=>g.visible=true);grenadeThrow.warm();
  environmentLights.update(camera.position,0,0);lighting.prepare(0,{warm:true});
  const warmRage=enemyAssets.templates.map(r=>{const group=r.group.clone(true);enemyAssets.enrage({group});return group;});
  const warmNuke=graveyard.nuke.group.clone(true);warmNuke.visible=true;
  const warmNano=armorStations.flatMap(s=>s.nanoModels.map(source=>{const model=source.clone(true);model.visible=true;return model;}));
  const warmBella=bella.rig.group.clone(true);
  const warm=[warmBella,warmNuke,...warmNano,...enemyAssets.templates.map(r=>r.group),...warmRage,...warmPickups,grenadeAssets.create()];
  warm.forEach((g,i)=>{g.userData.lightingTransient=true;g.position.set((i%5-2)*.8,0,15-Math.floor(i/5));world.add(g);});
  try{
    renderer.setRenderTarget(rt);
    await renderer.compileAsync(scene,camera);
    viewCamera.copy(camera,false);viewCamera.layers.set(1);await renderer.compileAsync(scene,viewCamera);
    for(const s of forgeStations)for(const m of s.forgeMaterials)renderer.initTexture?.(m.map);
    for(const texture of weaponSurfaces().textures)renderer.initTexture?.(texture);
    renderer.initTexture?.(enemyAssets.surfaces.map);renderer.initTexture?.(enemyAssets.surfaces.bumpMap);renderer.initTexture?.(enemyAssets.surfaces.detail);
    // Upload the shared enemy buffers while the loading screen is still up.
    renderCleanFrame(renderer,scene,camera,viewCamera,rt,postScene,postCamera,true,world);
  }finally{
    renderer.setRenderTarget(null);finishEventWarmup();
    warm.forEach(g=>{g.removeFromParent();g.position.set(0,0,0);});
    Object.values(gunGroups).forEach((g,i)=>g.visible=savedVisibility[i]);scopeMasks.forEach((mask,i)=>mask.visible=savedMasks[i]);gunRoot.visible=savedGun;grenadeThrow.cancel();
  }
}
try{const saved=localStorage.getItem(QUALITY_KEY);if(saved&&saved!==$('quality').value&&[...$('quality').options].some(o=>o.value===saved)){$('quality').value=saved;$('quality').onchange();}}catch{}
await prepareRendering();rendererPrepared=true;lastTime=performance.now();$('loading').classList.add('hidden');window.Blackthorn?.ready(resetRun);requestAnimationFrame(tick);
// Batch static geometry and each articulated body section to limit draw calls.
function combineMeshes(list,parent){if(list.length<2)return;const inverse=new T.Matrix4().copy(parent.matrixWorld).invert(),positions=[],normals=[],uvs=[],colors=[],rageColors=[],finishes=[],hasColors=list.some(m=>m.geometry.hasAttribute('color')),hasRageColors=list.some(m=>m.geometry.hasAttribute('rageColor')),hasFinishes=list.some(m=>m.geometry.hasAttribute('surfaceFinish'));for(const m of list){const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld));positions.push(geo.attributes.position.array);normals.push(geo.attributes.normal.array);uvs.push(geo.attributes.uv.array);if(hasColors)colors.push(geo.attributes.color?.array||new Float32Array(geo.attributes.position.count*3).fill(1));if(hasRageColors)rageColors.push(geo.attributes.rageColor?.array||geo.attributes.color?.array||new Float32Array(geo.attributes.position.count*3).fill(1));if(hasFinishes)finishes.push(geo.attributes.surfaceFinish.array);geo.dispose();}function concat(arrays){const dst=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const a of arrays){dst.set(a,at);at+=a.length;}return dst;}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(concat(positions),3));geo.setAttribute('normal',new T.BufferAttribute(concat(normals),3));geo.setAttribute('uv',new T.BufferAttribute(concat(uvs),2));if(hasColors)geo.setAttribute('color',new T.BufferAttribute(concat(colors),3));if(hasRageColors)geo.setAttribute('rageColor',new T.BufferAttribute(concat(rageColors),3));if(hasFinishes)geo.setAttribute('surfaceFinish',new T.BufferAttribute(concat(finishes),2));geo.computeBoundingSphere();const merged=new T.Mesh(geo,list[0].material);merged.castShadow=list.some(m=>m.castShadow);merged.receiveShadow=true;parent.add(merged);for(const m of list)m.parent.remove(m);}
function batchStaticWorld(){scene.updateMatrixWorld(true);const buckets=new Map();world.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||m.userData.dynamic||m===fire)return;const p=m.getWorldPosition(new T.Vector3());let k=m.material.uuid+":"+Math.floor(p.x/24)+":"+Math.floor(p.z/24)+":"+m.castShadow;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(m);});for(const list of buckets.values())combineMeshes(list,world);}
function batchArticulated(group){group.updateMatrixWorld(true);const groups=[];group.traverse(o=>{if(o.isGroup)groups.push(o);});for(const g of groups){const buckets=new Map();for(const m of [...g.children]){if(!m.isMesh)continue;const k=m.material.uuid;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(m);}for(const list of buckets.values())combineMeshes(list,g);}}

function disposeEnemy(e){if(e.sharedAssets)return;const sharedGeo=new Set([boxGeo,sphereGeo,cylGeo]),sharedMat=new Set([...Object.values(M),...bookMats]),geometries=new Set(),materials=new Set();e.group.traverse(o=>{if(o.isMesh){if(!sharedGeo.has(o.geometry))geometries.add(o.geometry);if(!sharedMat.has(o.material))materials.add(o.material);}});for(const g of e.resources?.geometries||[])geometries.add(g);for(const m of e.resources?.materials||[])materials.add(m);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
