import {mkdirSync,writeFileSync} from 'node:fs';
import * as T from '../public/game/three.module.js';
import {patchLightingMaterial} from '../public/game/lighting.mjs';

// A native shader unit test, independent of the browser and fake game renderer.
// Compare real GPU filter output against exact planar depth maps, including a
// blocker only two centimeters in front of the receiving wall/floor.
// SHADOW_TYPE=BASIC checks the single-sample filter used by Performance quality.
const filterType=process.env.SHADOW_TYPE==='BASIC'?'BASIC':'PCF_SOFT';
const material=new T.MeshStandardMaterial();patchLightingMaterial(material);
const shader={vertexShader:'',fragmentShader:'#include <shadowmap_pars_fragment>'};material.onBeforeCompile(shader);
const pars=shader.fragmentShader,planeAware=pars.includes('vec3 receiverNormal');
const root=new URL('../.qa/shadow-filter/',import.meta.url);mkdirSync(root,{recursive:true});
writeFileSync(new URL('filter.vert',root),`#version 300 es
out vec2 testUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);testUv=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}
`);
writeFileSync(new URL('filter.frag',root),`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
#define varying in
#define texture2D texture
#define USE_SHADOWMAP
#define SHADOWMAP_TYPE_${filterType}
#define NUM_SPOT_LIGHT_COORDS 0
#define NUM_SPOT_LIGHT_MAPS 0
#define NUM_SPOT_LIGHT_SHADOWS 0
#define NUM_DIR_LIGHT_SHADOWS 0
#define NUM_POINT_LIGHT_SHADOWS 1
float unpackRGBAToDepth(vec4 value){return value.r;}
vec2 unpackRGBATo2Half(vec4 value){return value.xy;}
${pars}
in vec2 testUv;
out vec4 result;
uniform sampler2D depthMap;
uniform float resolution;
uniform int mode;
uniform vec3 origin;
uniform vec3 axisU;
uniform vec3 axisV;
void main(){
  float visibility;
  if(mode==0){
    vec3 ray=origin+axisU*(testUv.x-.5)+axisV*(testUv.y-.5);
    vec3 surfaceNormal=normalize(cross(axisU,axisV));
    ray+=surfaceNormal*.004;
    visibility=getPointShadow(depthMap,vec2(resolution),1.0,-.00004,.35,vec4(ray,1.0),.06,18.0${planeAware?',surfaceNormal':''});
  }else{
    vec2 uv=mix(vec2(.08),vec2(.92),testUv);
    float depth=.55+.28*uv.x-.21*uv.y;
    visibility=getShadow(depthMap,vec2(resolution),1.0,-.00003,1.0,vec4(uv,depth,1.0));
  }
  result=vec4(vec3(visibility),1.0);
}
`);
console.log(`Prepared native shadow-filter pixel regression from the actual game shader hook (${filterType==='BASIC'?'Performance single-sample':'High/Ultra soft'} moon/flashlight filter).`);
