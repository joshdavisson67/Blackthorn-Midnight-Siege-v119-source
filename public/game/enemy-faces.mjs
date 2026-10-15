import * as T from './three.module.js';

// Self-lit eyes stay visible in dark rooms without adding lights per enemy.
export function makeRedEyeMaterial(resources){
  const material=new T.MeshStandardMaterial({color:0xcb0b19,emissive:0xff0716,emissiveIntensity:3,roughness:.34,vertexColors:true});
  // A hot iris core and darker outer lens give the red glow depth rather than
  // a uniformly luminous sticker. UVs work after articulation and batching.
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vEyeUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEyeUv=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vEyeUv;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nvec2 irisOffset=(vEyeUv-vec2(0.25,0.5))*vec2(10.0,5.0);\nfloat irisCore=exp(-dot(irisOffset,irisOffset));\ntotalEmissiveRadiance*=0.18+0.82*irisCore;');
  };
  material.userData.enemyEyes=true;resources.materials.add(material);return material;
}

export function makeEyeGeometry(){
  const geometry=new T.SphereGeometry(1,16,10),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)*(.6+.4*(1-Math.abs(p.getX(i)))));
  geometry.computeVertexNormals();return geometry;
}
