import * as T from './three.module.js';

export const LIGHT_BUDGET=Object.freeze({environment:6,combat:2,cachedFixtures:12});
const POINT_SIZE={low:192,high:256,ultra:384};

// Four spatial samples, no history buffer. Reconstruct a light's world ray
// from the existing view position instead of eight additional shadow varyings.
// Compare against the receiving plane at the actual nearest texel center.
// Comparing every sample against the center ray's depth creates shadow acne
// on sloping walls/floors, even with an otherwise correct shadow map.
const pointFilter=`vec3 estateCubeDirection(vec2 uv) {
  vec2 tile=floor(uv*vec2(4.0,2.0));
  vec2 p=(uv-vec2(0.375,0.75))*vec2(8.0,4.0);
  vec3 ray;
  if(tile.y>0.5){
    if(tile.x<0.5)ray=vec3(-1.0,p.y,-p.x-2.0);
    else if(tile.x<1.5)ray=vec3(p.x,p.y,-1.0);
    else if(tile.x<2.5)ray=vec3(1.0,p.y,p.x-2.0);
    else ray=vec3(4.0-p.x,p.y,1.0);
  }else if(tile.x>2.5)ray=vec3(p.x-4.0,1.0,p.y+2.0);
  else ray=vec3(p.x,-1.0,-p.y-2.0);
  return normalize(ray);
}
float estatePointCompare(sampler2D shadowMap,vec2 shadowMapSize,vec3 sampleDirection,float texel,vec3 ray,vec3 receiverNormal,float nearPlane,float farPlane,float bias){
  vec2 uv=cubeToUV(sampleDirection,texel);
  vec2 atlasSize=shadowMapSize*vec2(4.0,2.0);
  vec2 center=(floor(uv*atlasSize)+0.5)/atlasSize;
  float denominator=dot(estateCubeDirection(center),receiverNormal);
  float distanceToPlane=abs(denominator)>0.00001?dot(ray,receiverNormal)/denominator:length(ray);
  float depth=(max(0.0,distanceToPlane)-nearPlane)/(farPlane-nearPlane)+bias;
  return texture2DCompare(shadowMap,uv,depth);
}
float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar, vec3 receiverNormal ) {
  vec3 ray=shadowCoord.xyz;
  float distanceToLight=length(ray);
  if(distanceToLight<shadowCameraNear || distanceToLight>shadowCameraFar)return 1.0;
  vec3 direction=ray/distanceToLight;
  float texel=1.0/(shadowMapSize.y*2.0),offset=shadowRadius*texel;
  float visibility=(
    estatePointCompare(shadowMap,shadowMapSize,direction+vec3(-offset,-offset,offset),texel,ray,receiverNormal,shadowCameraNear,shadowCameraFar,shadowBias)+
    estatePointCompare(shadowMap,shadowMapSize,direction+vec3(offset,-offset,-offset),texel,ray,receiverNormal,shadowCameraNear,shadowCameraFar,shadowBias)+
    estatePointCompare(shadowMap,shadowMapSize,direction+vec3(-offset,offset,-offset),texel,ray,receiverNormal,shadowCameraNear,shadowCameraFar,shadowBias)+
    estatePointCompare(shadowMap,shadowMapSize,direction+vec3(offset,offset,offset),texel,ray,receiverNormal,shadowCameraNear,shadowCameraFar,shadowBias)
  )*0.25;
  return mix(1.0,visibility,shadowIntensity);
}`;
const planeHelpers=`vec2 estateDepthGradient(vec3 receiver){
  vec3 dx=dFdx(receiver),dy=dFdy(receiver);
  float determinant=dx.x*dy.y-dx.y*dy.x;
  return abs(determinant)>0.000000000001?vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/determinant:vec2(0.0);
}
float estatePlaneCompare(sampler2D shadowMap,vec2 uv,vec4 receiver,vec2 shadowMapSize,vec2 gradient){
  vec2 center=(floor(uv*shadowMapSize)+0.5)/shadowMapSize;
  return texture2DCompare(shadowMap,uv,receiver.z+dot(center-receiver.xy,gradient));
}
`;

function filterSpan(source,name){
  const start=source.indexOf('float '+name+'(');
  let end=source.indexOf('{',start)+1,depth=1;
  while(depth&&end<source.length){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;end++;}
  if(start<0||depth)throw new Error('Shadow shader changed: '+name);
  return {start,end};
}
function shadowFilters(source){
  let {start,end}=filterSpan(source,'getPointShadow');
  source=source.slice(0,start)+pointFilter+source.slice(end);
  ({start,end}=filterSpan(source,'getShadow'));
  const filter=source.slice(start,end)
    .replace('shadowCoord.xyz /= shadowCoord.w;','shadowCoord.xyz /= shadowCoord.w;\n vec2 depthGradient=estateDepthGradient(shadowCoord.xyz);')
    .replace(/texture2DCompare\( shadowMap, ([^\n]+?), shadowCoord.z \)/g,'estatePlaneCompare( shadowMap, $1, shadowCoord, shadowMapSize, depthGradient )');
  return source.slice(0,start)+planeHelpers+filter+source.slice(end);
}
export function patchLightingMaterial(material){
  if(!material.isMeshStandardMaterial||material.userData.estateLighting)return;
  const before=material.onBeforeCompile,key=material.customProgramCacheKey.call(material);
  material.onBeforeCompile=function(shader,renderer){
    before.call(this,shader,renderer);
    shader.vertexShader=shader.vertexShader
      .replace('#include <shadowmap_pars_vertex>',T.ShaderChunk.shadowmap_pars_vertex.replace(/\t#if NUM_POINT_LIGHT_SHADOWS > 0[\s\S]*?\t#endif\n/,''))
      .replace('#include <shadowmap_vertex>',T.ShaderChunk.shadowmap_vertex.replace(/\t#if NUM_POINT_LIGHT_SHADOWS > 0[\s\S]*?\t#endif\n/,''));
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <shadowmap_pars_fragment>',shadowFilters(T.ShaderChunk.shadowmap_pars_fragment).replace(/\s*varying vec4 vPointShadowCoord\[ NUM_POINT_LIGHT_SHADOWS \];/,''))
      .replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin
        .replace('vec3 geometryPosition = - vViewPosition;','vec3 geometryPosition = - vViewPosition;\n vec3 estatePlaneNormal=cross(dFdx(geometryPosition),dFdy(geometryPosition));\n vec3 estateShadowNormal=inverseTransformDirection(estatePlaneNormal/max(length(estatePlaneNormal),0.00000001),viewMatrix);')
        .replace('vPointShadowCoord[ i ]','vec4( ( vec4( geometryPosition - pointLight.position + nonPerturbedNormal * pointLightShadow.shadowNormalBias, 0.0 ) * viewMatrix ).xyz, 1.0 )')
        .replace('pointLightShadow.shadowCameraFar )','pointLightShadow.shadowCameraFar, estateShadowNormal )'));
  };
  material.customProgramCacheKey=()=>key+'|estate-lighting-75';
  material.userData.estateLighting=true;material.needsUpdate=true;
}

export function prepareLightingMaterials(root){
  root.traverse(object=>{
    if(!object.isMesh)return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      patchLightingMaterial(material);
      // Glass transmits light; opaque walls, thin slabs and ceiling panels cast
      // from both faces, without the back-face-only gap at room boundaries.
      if(material.transparent)object.castShadow=false;
      else if(material.isMeshStandardMaterial)material.shadowSide=T.DoubleSide;
    }
  });
}

// Architecture shadows belong to the authored source, not its reusable light
// slot. A bounded LRU retains nearby fixtures. Only one new cube is rendered
// in a live frame; flicker and floor changes don't redraw a stationary source.
export function createLighting({renderer,scene,world,camera,moonlight,flashlight}){
  const fixtures=new Map(),bindings=new Map(),omitted=[],queued=[];
  const metrics={bakes:0,fixtureHits:0,lastBakes:0,maxLiveBakes:0,invalidations:0};
  let quality='high',serial=0,blockers='closed:closed',nextMoon=0,warming=false;
  moonlight.shadow.autoUpdate=false;moonlight.shadow.needsUpdate=true;
  flashlight.castShadow=true;flashlight.shadow.camera.near=.08;
  flashlight.shadow.bias=-.00004;flashlight.shadow.normalBias=.004;
  flashlight.shadow.mapSize.set(512,512);

  function configure(shadow){
    shadow.autoUpdate=false;shadow.needsUpdate=false;
    shadow.camera.near=.06;shadow.bias=-.00004;shadow.normalBias=.004;
    shadow.radius=.35;shadow.mapSize.set(POINT_SIZE[quality],POINT_SIZE[quality]);
  }
  function register(light,kind='fixture'){
    light.castShadow=true;configure(light.shadow);
    bindings.set(light,{kind,key:null,record:null,intensity:0,empty:light.shadow});
  }
  function bind(light,key,intensity){
    const binding=bindings.get(light);
    if(!binding)throw new Error('Unregistered lighting slot');
    binding.intensity=intensity;binding.key=key;
    if(!key||intensity<=0){light.intensity=0;binding.record=null;light.shadow=binding.empty;return;}
    let record;
    if(binding.kind==='combat'){
      record=binding.transient??={shadow:binding.empty,ready:false};
      if(record.key!==key){record.key=key;record.ready=false;record.shadow.needsUpdate=false;}
    }else{
      record=fixtures.get(key);
      if(!record){const shadow=binding.empty.clone();configure(shadow);record={key,shadow,ready:false};fixtures.set(key,record);}
      else metrics.fixtureHits++;
    }
    record.used=++serial;binding.record=record;light.shadow=record.shadow;
    light.intensity=record.ready?intensity:0;
    // Point shadow coordinates are translation only. Cached maps keep their
    // source's far plane and transform when reassigned to a different slot.

  }
  function trim(){
    const active=new Set([...bindings.values()].map(b=>b.record));
    while(fixtures.size>LIGHT_BUDGET.cachedFixtures){
      let oldestKey,oldest=Infinity;
      for(const [key,record] of fixtures)if(!active.has(record)&&record.used<oldest){oldest=record.used;oldestKey=key;}
      if(oldestKey===undefined)break;
      fixtures.get(oldestKey).shadow.dispose();fixtures.delete(oldestKey);
    }
  }
  // Three initializes currentRenderState inside renderer.render and clears it
  // at the end of every frame. Prepare only schedules work; split the normal
  // shadow phase here, while that frame's renderer state is valid. Restoring
  // actor casts before the live shadow pass also preserves moving silhouettes.
  const renderShadows=renderer.shadowMap.render.bind(renderer.shadowMap);
  renderer.shadowMap.render=function(lights,renderScene,renderCamera){
    if(renderScene!==scene||renderCamera!==camera||queued.length===0)return renderShadows(lights,renderScene,renderCamera);
    const selected=queued.filter(({light,record})=>lights.includes(light)&&bindings.get(light).record===record);
    for(const entry of queued)if(!selected.includes(entry))entry.record.shadow.needsUpdate=false;
    queued.length=0;
    if(selected.length===0)return renderShadows(lights,renderScene,renderCamera);
    // Animated enemies and hovering rewards must never become frozen shadows
    // in a fixture cache. Opening doors remain architectural blockers.
    function visit(object,transient=false,blocker=false){
      blocker=blocker||!!object.userData.lightingBlocker;
      transient=transient||!!object.userData.enemy||!!object.userData.lightingTransient||!!object.userData.collectible||(!blocker&&!!object.userData.dynamic);
      if(transient&&object.isMesh&&object.castShadow){omitted.push(object);object.castShadow=false;}
      for(const child of object.children)visit(child,transient,blocker);
    }
    visit(world);
    const cachedLights=new Set(selected.map(entry=>entry.light));
    try{renderShadows([...cachedLights],renderScene,renderCamera);}
    finally{for(const object of omitted)object.castShadow=true;omitted.length=0;}
    for(const {light,record} of selected){
      if(!record.shadow.map||record.shadow.needsUpdate)throw new Error('Architecture shadow did not render');
      record.ready=true;light.intensity=bindings.get(light).intensity;
      metrics.bakes++;metrics.lastBakes++;
    }
    if(!warming)metrics.maxLiveBakes=Math.max(metrics.maxLiveBakes,metrics.lastBakes);
    return renderShadows(lights.filter(light=>!cachedLights.has(light)),renderScene,renderCamera);
  };
  function cancelQueued(){
    for(const {record} of queued)record.shadow.needsUpdate=false;
    queued.length=0;
  }
  function prepare(time,{warm=false}={}){
    cancelQueued();metrics.lastBakes=0;warming=warm;
    let budget=warm?LIGHT_BUDGET.environment+LIGHT_BUDGET.combat:1;
    // A brief explosion takes priority over a newly encountered room lamp.
    for(const kind of ['combat','fixture'])for(const [light,binding] of bindings){
      if(budget&&binding.kind===kind&&binding.record&&!binding.record.ready&&binding.intensity>0){
        binding.record.shadow.needsUpdate=true;queued.push({light,record:binding.record});budget--;
      }
      if(binding.record?.ready)light.intensity=binding.intensity;
    }
    trim();
    // Walls are static; nearby actors still cast live moon/flashlight shadows.
    // Avoid re-rendering the estate's moon shadow more often than necessary.
    if(time>=nextMoon){moonlight.shadow.needsUpdate=true;nextMoon=time+(quality==='ultra'?1/60:quality==='low'?1/20:1/30);}
    flashlight.shadow.autoUpdate=flashlight.intensity>0;
  }
  function invalidate(){
    cancelQueued();
    for(const record of fixtures.values())record.shadow.dispose();fixtures.clear();
    for(const [light,binding] of bindings){binding.record=null;binding.key=null;light.shadow=binding.empty;light.intensity=0;if(binding.transient){binding.transient.ready=false;binding.transient.key=null;}}
    moonlight.shadow.needsUpdate=true;nextMoon=0;metrics.invalidations++;
  }
  function setBlockerState(state,force=false){if(force||state!==blockers){blockers=state;invalidate();}}
  function setQuality(value){
    if(value===quality)return;quality=value;invalidate();
    renderer.shadowMap.enabled=true;
    for(const binding of bindings.values()){
      binding.empty.dispose();binding.empty.map=null;configure(binding.empty);
    }
    for(const [light,size] of [[moonlight,value==='ultra'?4096:value==='low'?1024:2048],[flashlight,value==='ultra'?768:value==='low'?384:512]]){
      light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(size,size);light.shadow.needsUpdate=true;
    }
  }
  return {register,bind,prepare,invalidate,setQuality,setBlockerState,metrics,fixtures,bindings,get quality(){return quality;}};
}
