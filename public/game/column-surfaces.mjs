// Columns use the same limestone tile size as square stonework. Three's default
// UVs fit one image over an entire shaft, regardless of its physical dimensions.
// Cache the corrected UVs at construction time; keep the mesh and triangle count.
const variants=new WeakMap();
export function columnSurfaceGeometry(base,material,scale=[1,1,1]){
  const map=material.map,tile=map?.userData.tileMeters,p=base.parameters;
  if(!tile||!p||!['CylinderGeometry','ConeGeometry','LatheGeometry','TorusGeometry'].includes(base.type))return base;
  const [sx,sy,sz]=scale,uMeters=tile*map.repeat.x,vMeters=tile*map.repeat.y;
  const key=[sx,sy,sz,uMeters,vMeters].join(':');
  let cache=variants.get(base);if(!cache){cache=new Map();variants.set(base,cache);}
  if(cache.has(key))return cache.get(key);
  const geo=base.clone(),uv=geo.attributes.uv,pos=geo.attributes.position;
  if(base.type==='LatheGeometry'){
    // V follows the actual carved profile, including the base and capital,
    // rather than assigning equal texture height to unequal profile sections.
    const distance=[0];
    for(let i=1;i<p.points.length;i++)distance[i]=distance[i-1]+Math.hypot((p.points[i].x-p.points[i-1].x)*sx,(p.points[i].y-p.points[i-1].y)*sy);
    for(let i=0;i<uv.count;i++){
      const row=i%p.points.length;
      uv.setXY(i,uv.getX(i)*p.phiLength*p.points[row].x*sx/uMeters,distance[row]/vMeters);
    }
  }else if(base.type==='TorusGeometry'){
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*p.arc*p.radius*sx/uMeters,uv.getY(i)*Math.PI*2*p.tube*sz/vMeters);
  }else{
    const radiusTop=base.type==='ConeGeometry'?0:p.radiusTop,radiusBottom=base.type==='ConeGeometry'?p.radius:p.radiusBottom;
    const sides=(Math.floor(p.radialSegments)+1)*(Math.floor(p.heightSegments)+1);
    const length=Math.hypot((radiusBottom-radiusTop)*sx,p.height*sy);
    for(let i=0;i<uv.count;i++){
      if(i<sides){
        const radius=radiusBottom+(radiusTop-radiusBottom)*uv.getY(i);
        uv.setXY(i,uv.getX(i)*p.thetaLength*radius*sx/uMeters,uv.getY(i)*length/vMeters);
      }else{
        // Top/bottom faces get planar stone rather than a stretched disc.
        uv.setXY(i,pos.getX(i)*sx/uMeters,pos.getZ(i)*sz/vMeters);
      }
    }
  }
  cache.set(key,geo);return geo;
}
