import * as T from './three.module.js';

// One definition supplies the HUD and the fitted optic. Coordinates are in
// an upright aiming plane, centered on the weapon's actual firing ray.
const segment=(x1,y1,x2,y2)=>[x1,y1,x2,y2];
const precision=[];
for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){
  precision.push(segment(x*4,y*4,x*24,y*24));
  for(const d of [8,14,20])precision.push(segment(x*d-y*1.1,y*d+x*1.1,x*d+y*1.1,y*d-x*1.1));
}
export const RETICLES=Object.freeze({
  glock:{name:'Compact pistol mark',size:34,color:'#e9efe9',dot:1.15,stroke:1.5,segments:[segment(-9,0,-15,0),segment(9,0,15,0),segment(0,-9,0,-15)],arcs:[]},
  rifle:{name:'Carbine chevron',size:42,color:'#e9efe9',opticColor:'#ff5941',opticScale:.001,dot:.85,stroke:1.3,segments:[segment(-5,-5,0,0),segment(0,0,5,-5),segment(-13,0,-20,0),segment(13,0,20,0),segment(0,-12,0,-20)],arcs:[]},
  smg:{name:'Close-quarters circle dot',size:40,color:'#c6eee2',opticColor:'#ff4933',opticScale:.0012,dot:1.15,stroke:1.3,segments:[segment(0,-15,0,-20)],arcs:[[11,0,Math.PI*2]]},
  shotgun:{name:'Pellet ring',size:54,color:'#ffe0a7',opticColor:'#ffb25c',opticScale:.0011,dot:.85,stroke:1.6,segments:[],arcs:Array.from({length:4},(_,i)=>[22,i*Math.PI/2+Math.PI/12,(i+1)*Math.PI/2-Math.PI/12])},
  lmg:{name:'Support brackets',size:56,color:'#f0d1b3',opticColor:'#ff6d37',opticScale:.001,opticDot:.22,opticStroke:.30,dot:1,stroke:1.4,segments:[segment(-16,8,-20,8),segment(-20,8,-20,-8),segment(-20,-8,-16,-8),segment(16,8,20,8),segment(20,8,20,-8),segment(20,-8,16,-8),segment(-5,-12,5,-12),segment(-3.5,-18,3.5,-18),segment(-2,-24,2,-24),segment(0,13,0,20)],arcs:[]},
  bushmaster:{name:'Precision crosshair',size:50,color:'#e3ecec',opticColor:'#ff6953',opticScale:.0009,opticDot:.13,opticStroke:.14,dot:.60,stroke:.70,segments:precision,arcs:[]}
});
for(const p of Object.values(RETICLES)){for(const s of p.segments)Object.freeze(s);for(const a of p.arcs)Object.freeze(a);Object.freeze(p.segments);Object.freeze(p.arcs);Object.freeze(p);}

export function reticleSvg(type){
  const p=RETICLES[type];if(!p)throw new Error('Unknown reticle: '+type);
  const lines=p.segments.map(([x,y,xx,yy])=>`<path d="M ${x} ${-y} L ${xx} ${-yy}"/>`).join('');
  const arcs=p.arcs.map(([r,a,b])=>{
    if(b-a>=Math.PI*2-.0001)return `<circle cx="0" cy="0" r="${r}"/>`;
    return `<path d="M ${r*Math.cos(a)} ${-r*Math.sin(a)} A ${r} ${r} 0 ${b-a>Math.PI?1:0} 0 ${r*Math.cos(b)} ${-r*Math.sin(b)}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 -28 56 56" aria-hidden="true" focusable="false" data-reticle-weapon="${type}"><g fill="none" stroke="currentColor" stroke-width="${p.stroke}" stroke-linecap="round">${lines}${arcs}</g><circle class="reticle-center" cx="0" cy="0" r="${p.dot}" fill="currentColor"/></svg>`;
}

export function createReticleHud(element){
  element.innerHTML=Object.keys(RETICLES).map(reticleSvg).join('');element.setAttribute('aria-hidden','true');
  const icons=new Map([...element.querySelectorAll('svg')].map(svg=>[svg.getAttribute('data-reticle-weapon'),svg]));let selected=null;
  function select(type){
    const p=RETICLES[type];if(!p)throw new Error('Unknown reticle: '+type);if(selected===type)return;
    selected=type;for(const [key,svg] of icons)svg.classList.toggle('hidden',key!==type);
    element.dataset.weapon=type;element.dataset.reticle=p.name;element.style.width=p.size+'px';element.style.height=p.size+'px';element.style.color=p.color;
  }
  select('glock');return {select,get weapon(){return selected;}};
}

const geometryCache=new Map(),materialCache=new Map();
function reticleOutline(type){
  const p=RETICLES[type],positions=[],uv=[];
  function triangle(a,b,c){for(const v of [a,b,c]){positions.push(...v,0);uv.push(0,0);}}
  function line([x,y,xx,yy]){
    const length=Math.hypot(xx-x,yy-y),h=(p.opticStroke??p.stroke)/2,dx=-(yy-y)/length*h,dy=(xx-x)/length*h,s=p.opticScale;
    const a=[(x+dx)*s,(y+dy)*s],b=[(x-dx)*s,(y-dy)*s],c=[(xx-dx)*s,(yy-dy)*s],d=[(xx+dx)*s,(yy+dy)*s];triangle(a,b,c);triangle(a,c,d);
  }
  p.segments.forEach(line);
  for(const [r,a,b] of p.arcs){const count=Math.ceil((b-a)*12);for(let i=0;i<count;i++){const aa=a+(b-a)*i/count,bb=a+(b-a)*(i+1)/count;line([r*Math.cos(aa),r*Math.sin(aa),r*Math.cos(bb),r*Math.sin(bb)]);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}

export function createOpticReticle(type,z){
  const p=RETICLES[type];if(!p?.opticScale)throw new Error('This weapon uses iron sights: '+type);
  if(!materialCache.has(type))materialCache.set(type,new T.MeshBasicMaterial({color:p.opticColor,toneMapped:false,depthTest:true,depthWrite:false}));
  if(!geometryCache.has(type))geometryCache.set(type,{dot:new T.CircleGeometry((p.opticDot??p.dot)*p.opticScale,16),outline:reticleOutline(type)});
  const material=materialCache.get(type),geometry=geometryCache.get(type);
  const dot=new T.Mesh(geometry.dot,material),outline=new T.Mesh(geometry.outline,material);
  dot.name=type+' aiming dot';outline.name=p.name;
  for(const o of [dot,outline]){o.position.z=z;o.userData.reticle=true;o.userData.reticleType=type;o.castShadow=o.receiveShadow=false;}
  return {dot,outline,marks:[dot,outline],name:p.name};
}
