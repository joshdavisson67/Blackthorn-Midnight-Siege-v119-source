import * as T from './three.module.js';

// Procedural sculpting kit for the horde (v133). Every part gets its own
// irregular geometry: gaunt, knotted, torn and asymmetric rather than the
// smooth unit spheres every enemy used to share. All of it runs once, while
// the ten cached enemy templates are prepared, never during play.

const clamp=T.MathUtils.clamp;

// Seeded smooth noise: a few sine waves along random directions.
export function makeNoise(rng){
  const waves=[];let total=0;
  for(let i=0;i<5;i++){
    const f=1.4+i*1.9+rng()*1.3,d=new T.Vector3(rng()-.5,rng()-.5,rng()-.5).normalize(),amp=1/(1+i*.7);
    waves.push([d.x*f,d.y*f,d.z*f,rng()*Math.PI*2,amp]);total+=amp;
  }
  return (x,y,z)=>{let v=0;for(const [a,b,c,p,amp] of waves)v+=Math.sin(x*a+y*b+z*c+p)*amp;return v/total*1.6;};
}

// Average normals of coincident vertices so UV seams don't show as creases.
export function weldNormals(g){
  g.computeVertexNormals();
  // Integer keys (quantised to 1e-3 of the part's own units) keep this cheap.
  const p=g.attributes.position,n=g.attributes.normal,groups=new Map(),q=v=>Math.round(v*1e3)+5000,key=i=>(q(p.getX(i))*10007+q(p.getY(i)))*10007+q(p.getZ(i));
  for(let i=0;i<p.count;i++){const k=key(i);let list=groups.get(k);if(!list)groups.set(k,list=[]);list.push(i);}
  const v=new T.Vector3();
  for(const list of groups.values()){
    if(list.length<2)continue;v.set(0,0,0);
    for(const i of list)v.x+=n.getX(i),v.y+=n.getY(i),v.z+=n.getZ(i);
    v.normalize();for(const i of list)n.setXYZ(i,v.x,v.y,v.z);
  }
  return g;
}

// Vertex paint: blotchy mottling, grime that collects low on a part, and
// darkened undersides and creases (a cheap baked occlusion).
export function paint(g,{amount=.14,grime=0,top=1,bottom=-1,ao=.22,warm=0,seed=0}={}){
  const p=g.attributes.position,nrm=g.attributes.normal,c=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const m=.5+.5*Math.sin(x*13+y*7+seed)*Math.cos(z*11-y*9+seed*1.7),m2=.5+.5*Math.sin(x*37-z*29+y*23+seed*3.1);
    let v=1-amount*(m*.7+m2*.3);
    if(grime){const t=clamp((top-y)/(top-bottom||1),0,1);v*=1-grime*t*t;}
    if(ao&&nrm)v*=1-ao*Math.max(0,-nrm.getY(i))*.8;
    c[i*3]=v*(1+warm*.04);c[i*3+1]=v*.982;c[i*3+2]=v*(.95-warm*.03);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(c,3));return g;
}

// A knotted, uneven lump in unit space; scale it like the old ellipsoids.
// `flat` squashes everything below that height into a sole or base.
export function lump(rng,{w=12,h=9,rough=.14,freq=1,flat=null,pull=null}={}){
  const g=new T.SphereGeometry(1,w,h),p=g.attributes.position,n=makeNoise(rng);
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const k=1+rough*n(x*freq,y*freq,z*freq);x*=k;y*=k;z*=k;
    if(flat!==null&&y<flat)y=flat+(y-flat)*.2;
    if(pull){const f=Math.max(0,x*pull[0]+y*pull[1]+z*pull[2]);x+=pull[0]*f*f*.5;y+=pull[1]*f*f*.5;z+=pull[2]*f*f*.5;}
    p.setXYZ(i,x,y,z);
  }
  return weldNormals(g);
}

// Rings swept up the Y axis: limbs, torsos and clothing. Each ring is
// [y, halfWidth, halfDepth, {x,z,twist}]. Options shape the cross-section:
//   rough/freq  lumpy flesh       folds/foldFreq  cloth creases
//   ridge       a bony front edge (shins, forearms) ribs  rib ridges
//   ragged      a torn bottom hem cut(u,v)          drop faces (holes, open fronts)
//   inner       also build a reversed lining shell, (1-inner) times the radius
//   relief(y,a) extra relative radius at height y and angle a (v140 muscles:
//               a=0 is +X, a=PI/2 is +Z, the front of the body)
export function tube(rng,rings,{sides=12,rough=0,freq=7,folds=0,foldFreq=5,ridge=0,ridgeAngle=Math.PI/2,ribs=0,ribRange=[0,1],ribFreq=26,back=0,ragged=0,raggedTop=0,cut=null,inner=0,belly=0,relief=null}={}){
  const n=makeNoise(rng),jag=[],jagTop=[];
  for(let i=0;i<=sides;i++){
    if(i===sides){jag.push(jag[0]);jagTop.push(jagTop[0]);continue;}
    jag.push(ragged*(.35+.65*Math.abs(Math.sin(i*2.3+rng()*3)))*(rng()<.28?1.6+rng():1));
    jagTop.push(raggedTop*(.3+.7*rng()));
  }
  const build=(scale,reverse)=>{
    const v=[],uv=[],idx=[];
    for(let j=0;j<rings.length;j++){
      const [y,w,d,o={}]=rings[j],t=j/(rings.length-1);
      for(let i=0;i<=sides;i++){
        const a=i/sides*Math.PI*2+(o.twist||0),ca=Math.cos(a),sa=Math.sin(a);
        let r=1+rough*n(ca*freq*.3,y*freq,sa*freq*.3);
        if(folds)r+=folds*n(ca*foldFreq,y*3.2,sa*foldFreq);
        if(ridge){const da=Math.atan2(Math.sin(a-ridgeAngle),Math.cos(a-ridgeAngle));r+=ridge*Math.exp(-da*da/.18);}
        if(back&&sa<0)r-=back*sa*sa;
        if(belly&&sa>0)r+=belly*sa*sa*Math.sin(Math.PI*t);
        if(relief)r+=relief(y,i/sides*Math.PI*2);
        if(ribs&&t>=ribRange[0]&&t<=ribRange[1]&&Math.abs(ca)>.08){const side=Math.max(0,sa+.35);r+=ribs*side*(Math.pow(Math.max(0,Math.sin(y*ribFreq)),3)-.25);}
        r*=scale;
        let yy=y;if(j===0)yy-=jag[i];if(j===rings.length-1)yy+=jagTop[i];
        v.push((o.x||0)+ca*w*r,yy,(o.z||0)+sa*d*r);uv.push(i/sides,t);
      }
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){
      if(cut&&cut((i+.5)/sides,(j+.5)/(rings.length-1)))continue;
      const a=j*(sides+1)+i,b=a+sides+1;
      if(reverse)idx.push(a,a+1,b,b,a+1,b+1);else idx.push(a,b,a+1,b,b+1,a+1);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return weldNormals(g);
  };
  const outer=build(1,false);if(inner)outer.userData.inner=build(1-inner,true);return outer;
}

// A tapered sweep along a curve: fingers, ribs, hair, bones, sinew, chains.
export function sweep(rng,points,radius,{sides=6,segments=0,rough=0,flat=1,taper=null}={}){
  const curve=new T.CatmullRomCurve3(points.map(p=>p.isVector3?p:new T.Vector3(...p))),seg=segments||Math.max(4,points.length*3);
  curve.arcLengthDivisions=seg*3;
  const frames=curve.computeFrenetFrames(seg,false),n=rough?makeNoise(rng):null,v=[],uv=[],idx=[];
  for(let j=0;j<=seg;j++){
    const t=j/seg,P=curve.getPointAt(t),N=frames.normals[j],B=frames.binormals[j];
    const r=(typeof radius==='function'?radius(t):radius*(taper?1-taper*t:1));
    for(let i=0;i<=sides;i++){
      const a=i/sides*Math.PI*2,rr=r*(1+(n?rough*n(Math.cos(a),t*4,Math.sin(a)):0)),cx=Math.cos(a)*rr,cy=Math.sin(a)*rr*flat;
      v.push(P.x+N.x*cx+B.x*cy,P.y+N.y*cx+B.y*cy,P.z+N.z*cx+B.z*cy);uv.push(i/sides,t);
    }
  }
  // Frenet sweeps wind the other way round from tube(): keep normals outward.
  for(let j=0;j<seg;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+sides+1;idx.push(a,a+1,b,b,a+1,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return weldNormals(g);
}

// A pointed shard (teeth, claws, nails, bone spurs): a short bent cone.
// Squeeze a small part's UVs into one random window of its atlas tile, so a
// nose or knuckle carries a little texture rather than the whole tile.
export function uvWindow(g,rng,size=.22){
  const uv=g.attributes.uv;if(!uv)return g;const u0=rng()*(1-size),v0=rng()*(1-size);
  for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*size,v0+uv.getY(i)*size);return g;
}

// Lumps are pooled: a few windowed, painted variants per shape recipe are
// shared by every template, which keeps building the horde quick on phones.
// Per-use scale and rotation still make each one read differently.
const lumpPool=new Map();
export function pooledLump(rng,opts={},uv=.3,paintOpts={amount:.16,ao:.3}){
  const key=JSON.stringify([opts,uv]);let list=lumpPool.get(key);if(!list)lumpPool.set(key,list=[]);
  if(list.length<4){const g=paint(uvWindow(lump(rng,opts),rng,uv),paintOpts);g.userData.pooled=true;list.push(g);return g;}
  return list[Math.floor(rng()*list.length)];
}

export function shard(rng,{bend=.2,sides=5,rough=.12}={}){
  return sweep(rng,[[0,0,0],[0,.45,bend*.25],[0,1,bend]],t=>.5*(1-t)**1.15+.02,{sides,rough,segments:5});
}
