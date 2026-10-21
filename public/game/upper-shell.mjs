import * as T from './three.module.js';
import {UPPER_Y} from './vertical.mjs?v=131';

export const UPPER_SLAB_THICKNESS=.24;
export const UPPER_SLAB_BOTTOM=UPPER_Y-UPPER_SLAB_THICKNESS;

// Clip inherited ground-floor ornament at the underside of the new slab.
// Interpolate existing normals/UVs so cut columns and arches retain their finish.
function clipBelow(mesh,height){
  const source=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),attrs=source.attributes,out={};
  for(const key of ['position','normal','uv','color'])if(attrs[key])out[key]=[];
  const vertex=i=>{const v={};for(const k of Object.keys(out)){const a=attrs[k];v[k]=Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j]);}v.y=new T.Vector3(...v.position).applyMatrix4(mesh.matrixWorld).y;return v;};
  for(let i=0;i<attrs.position.count;i+=3){const input=[vertex(i),vertex(i+1),vertex(i+2)],poly=[];
    for(let j=0;j<3;j++){const a=input[j],b=input[(j+1)%3],inside=a.y<=height,nextInside=b.y<=height;if(inside)poly.push(a);if(inside!==nextInside){const f=(height-a.y)/(b.y-a.y),v={y:height};for(const key of Object.keys(out))v[key]=a[key].map((n,k)=>n+(b[key][k]-n)*f);poly.push(v);}}
    for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]])for(const key of Object.keys(out))out[key].push(...v[key]);
  }
  source.dispose();const geo=new T.BufferGeometry();for(const key of Object.keys(out))geo.setAttribute(key,new T.Float32BufferAttribute(out[key],attrs[key].itemSize));geo.normalizeNormals();geo.computeBoundingSphere();mesh.geometry=geo;
}

export function prepareUpperShell(world,colliders,solidMeshes){
  world.updateMatrixWorld(true);const legacy=[];world.traverse(o=>{if(o.isMesh||o.isLineSegments)legacy.push(o);});
  const removed=new Set(),report={clipped:0,removed:0,roofRaised:0};
  for(const o of legacy){
    if(o.isInstancedMesh||o.userData.dynamic)continue;
    if(o.userData.groundCeilingDetail){o.removeFromParent();removed.add(o);report.removed++;continue;}
    o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());
    if(center.x<-43||center.x>43||center.z<-12.65||center.z>13.6||b.max.y<=UPPER_SLAB_BOTTOM||size.x>90||size.z>30)continue;
    const atrium=Math.abs(center.x)<2.5&&center.z>-.7&&center.z<2.7&&size.x<3&&size.z<3&&b.min.y<6.5;
    if(atrium)continue;
    const obsoleteCeiling=b.min.y>=6.2&&b.max.y<=7.4&&(size.x>4||size.z>4);
    if(!obsoleteCeiling&&(b.min.y>=6.7||(b.min.y>=6&&b.max.y>8))){o.position.y+=.7;report.roofRaised++;continue;}
    if(obsoleteCeiling||b.min.y>=UPPER_SLAB_BOTTOM||o.isLineSegments){o.removeFromParent();removed.add(o);report.removed++;}
    else if(o.isMesh){clipBelow(o,UPPER_SLAB_BOTTOM);report.clipped++;}
  }
  for(let i=solidMeshes.length-1;i>=0;i--)if(removed.has(solidMeshes[i]))solidMeshes.splice(i,1);
  for(const c of colliders)if(Math.abs(c.x)<=43&&c.z>=-12.65&&c.z<=13.6)c.maxY=Math.min(c.maxY??3.8,UPPER_SLAB_BOTTOM);
  return report;
}
