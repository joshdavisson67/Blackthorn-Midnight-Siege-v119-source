import * as T from './three.module.js';

// Cached, code-native geometry. The slide's chamber opening and serrations
// are actual surfaces; fine grip detail adds no textures or animated effects.
const cache=new Map();
export const GLOCK_GRIP=Object.freeze([
  [.035,.172,.069,.105],[.053,.175,.072,.110],[.073,.184,.076,.113],[.110,.200,.082,.115],
  [.152,.217,.082,.115],[.185,.229,.079,.109],[.196,.231,.074,.100],
].map(Object.freeze));
function geometry(build){
  const positions=[],uvs=[];
  function triangle(a,b,c,normal){
    const n=new T.Vector3().subVectors(new T.Vector3(...b),new T.Vector3(...a)).cross(new T.Vector3().subVectors(new T.Vector3(...c),new T.Vector3(...a)));
    if(n.dot(new T.Vector3(...normal))<0)[b,c]=[c,b];
    const axis=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
    for(const p of [a,b,c]){positions.push(...p);uvs.push((axis===0?p[2]:axis===1?p[2]:p[0])/.12,(axis===0?p[1]:axis===1?p[0]:p[1])/.12);}
  }
  const quad=(a,b,c,d,n)=>{triangle(a,b,c,n);triangle(a,c,d,n);};
  build(quad,triangle);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
export function glockSlideGeometry(){
  if(cache.has('slide'))return cache.get('slide');
  const grooves=[...Array.from({length:8},(_,i)=>-.039+i*.0092),...Array.from({length:8},(_,i)=>.144+i*.0088)];
  const zs=[...new Set([-.054,-.048,.033,.106,.130,.185,.236,.244,...grooves.flatMap(z=>[z-.0032,z-.0017,z+.0017,z+.0032])])].sort((a,b)=>a-b);
  function taper(z){return z<-.048?1-( -.048-z)/.006*.11:z>.236?1-(z-.236)/.008*.12:1;}
  function x(y,z){
    const bevel=y<.017?(.017-y)/.008*.005:y>.065?(y-.065)/.013*.008:0;
    const groove=grooves.reduce((v,c)=>Math.max(v,Math.max(0,Math.min(1,(.0032-Math.abs(z-c))/.0015))),0);
    const fade=Math.max(0,Math.min(1,(y-.017)/.003,(.065-y)/.003));
    return (.040-bevel-groove*fade*.0015)*taper(z);
  }
  const g=geometry((quad,triangle)=>{
    const ys=[.009,.017,.020,.044,.062,.065,.078];
    for(const side of [-1,1])for(let k=0;k<zs.length-1;k++)for(let j=0;j<ys.length-1;j++){
      const z=zs[k],zz=zs[k+1],y=ys[j],yy=ys[j+1],middle=(z+zz)/2;
      if(side===1&&middle>.033&&middle<.106&&y>=.044)continue;
      quad([side*x(y,z),y,z],[side*x(yy,z),yy,z],[side*x(yy,zz),yy,zz],[side*x(y,zz),y,zz],[side,0,0]);
    }
    const xs=[-.032,-.029,-.021,.021,.029,.032];
    for(let k=0;k<zs.length-1;k++)for(let j=0;j<xs.length-1;j++){
      const z=zs[k],zz=zs[k+1],left=xs[j],right=xs[j+1],middle=(z+zz)/2;
      if(middle>.033&&middle<.106&&left>=-.021)continue;
      const floor=middle>.130&&middle<.185&&left>=-.029&&right<=.029,y=floor?.0725:.078;
      quad([left*taper(z),y,z],[right*taper(z),y,z],[right*taper(zz),y,zz],[left*taper(zz),y,zz],[0,1,0]);
    }
    // A recessed optic cover pocket behind the chamber.
    for(const side of [-1,1])quad([side*.029,.0725,.130],[side*.029,.078,.130],[side*.029,.078,.185],[side*.029,.0725,.185],[-side,0,0]);
    for(const [z,n] of [[.130,1],[.185,-1]])quad([-.029,.0725,z],[.029,.0725,z],[.029,.078,z],[-.029,.078,z],[0,0,n]);
    // Inner chamber walls and lower lip keep the opening visibly hollow.
    quad([-.021,.044,.033],[-.021,.078,.033],[-.021,.078,.106],[-.021,.044,.106],[1,0,0]);
    quad([-.021,.044,.033],[.040,.044,.033],[.040,.044,.106],[-.021,.044,.106],[0,1,0]);
    for(const [z,n] of [[.033,1],[.106,-1]])quad([-.021,.044,z],[.040,.044,z],[.032,.078,z],[-.021,.078,z],[0,0,n]);
    for(let k=0;k<zs.length-1;k++){
      const z=zs[k],zz=zs[k+1];quad([-.035*taper(z),.009,z],[.035*taper(z),.009,z],[.035*taper(zz),.009,zz],[-.035*taper(zz),.009,zz],[0,-1,0]);
    }
    // End caps: two real muzzle recesses, with a sealed slide back.
    for(const z of [-.054,.244]){
      const shape=new T.Shape(),outline=[[-.032,.078],[.032,.078],[.040,.065],[.040,.017],[.035,.009],[-.035,.009],[-.040,.017],[-.040,.065]];
      outline.forEach(([xx,y],i)=>i?shape.lineTo(xx*taper(z),y):shape.moveTo(xx*taper(z),y));shape.closePath();
      if(z<0)for(const [y,r] of [[.035,.0155],[.015,.0045]]){const hole=new T.Path();hole.absarc(0,y,r,0,Math.PI*2,true);shape.holes.push(hole);}
      const cap=new T.ShapeGeometry(shape,12),p=cap.index?cap.toNonIndexed():cap;
      for(let i=0;i<p.attributes.position.count;i+=3){const points=[];for(let j=0;j<3;j++)points.push([p.attributes.position.getX(i+j),p.attributes.position.getY(i+j),z]);triangle(...points,[0,0,z<0?-1:1]);}
      if(p!==cap)p.dispose();cap.dispose();
    }
  });
  g.userData.glock={frontSerrations:8,rearSerrations:8,chamber:[.033,.106],opticPocket:[.130,.185]};cache.set('slide',g);return g;
}
export function glockGripPoint(y,angle,offset=0){
  const depth=-y;let a=GLOCK_GRIP[0],b=GLOCK_GRIP.at(-1);
  for(let i=1;i<GLOCK_GRIP.length;i++)if(depth<=GLOCK_GRIP[i][0]){a=GLOCK_GRIP[i-1];b=GLOCK_GRIP[i];break;}
  const t=T.MathUtils.clamp((depth-a[0])/(b[0]-a[0]),0,1),values=a.map((v,i)=>T.MathUtils.lerp(v,b[i],t)),c=Math.cos(angle),s=Math.sin(angle);
  return [Math.sign(c)*Math.abs(c)**.7*values[2]/2+c*offset,y,values[1]+Math.sign(s)*Math.abs(s)**.7*values[3]/2+s*offset];
}
export function glockStippleGeometry(center){
  const key='stipple:'+center;if(cache.has(key))return cache.get(key);
  const side=Math.abs(Math.sin(center))<.5,columns=side?12:6,span=side?1.50:.90;
  const g=geometry(quad=>{
    for(let row=0;row<15;row++)for(let col=0;col<columns;col++){
      const y=-.083-row*.0068,angle=center+(col-(columns-1)/2)*span/columns;
      if(center===Math.PI/2&&y<-.177&&Math.abs(angle-center)<.10)continue;
      const aa=angle-.036,bb=angle+.036,lo=y-.0015,hi=y+.0015;
      quad(glockGripPoint(lo,aa,.00035),glockGripPoint(hi,aa,.00035),glockGripPoint(hi,bb,.00035),glockGripPoint(lo,bb,.00035),[Math.cos(angle),0,Math.sin(angle)]);
    }
  });cache.set(key,g);return g;
}
export function glockRearPlateGeometry(){
  if(cache.has('backplate'))return cache.get('backplate');
  const s=new T.Shape();s.moveTo(-.023,.020);s.lineTo(.023,.020);s.lineTo(.023,.052);s.quadraticCurveTo(.023,.063,0,.063);s.quadraticCurveTo(-.023,.063,-.023,.052);s.closePath();
  const g=new T.ShapeGeometry(s,8);cache.set('backplate',g);return g;
}
