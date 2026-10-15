import * as T from './three.module.js';

export const RUG_SCALE=Object.freeze({field:1,borderWidth:.14,borderRepeat:.56});
function canvasTexture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;t.minFilter=T.LinearMipmapLinearFilter;return t;}
export function rugTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const p=c.getContext('2d');
  p.fillStyle='#624238';p.fillRect(0,0,512,512);
  for(let y=-128;y<640;y+=128)for(let x=-128;x<640;x+=128){
    const xx=x+(Math.round(y/128)%2)*64;p.save();p.translate(xx,y);p.rotate(Math.PI/4);
    p.fillStyle='#ae9568';p.fillRect(-29,-29,58,58);p.fillStyle='#344d49';p.fillRect(-22,-22,44,44);p.fillStyle='#7c5140';p.fillRect(-11,-11,22,22);p.restore();
    for(const side of [-1,1]){p.strokeStyle='#ab8c63';p.lineWidth=3;p.beginPath();p.ellipse(xx+side*42,y+45,12,25,side*.5,0,Math.PI*2);p.stroke();}
  }
  // Fine, deterministic warp/weft variation, with no baked stretched frame.
  for(let i=0;i<512;i+=2){p.fillStyle=i%6?'#eadbb309':'#201b1812';p.fillRect(0,i,512,1);p.fillRect(i,0,1,512);}
  const t=canvasTexture(c);t.name='Persian rug repeating field';t.userData.tileMeters=RUG_SCALE.field;return t;
}
export function rugBorderTexture(){
  const c=document.createElement('canvas');c.width=512;c.height=128;const p=c.getContext('2d');
  p.fillStyle='#314844';p.fillRect(0,0,512,128);
  for(const y of [5,15,111,121]){p.fillStyle=y%2?'#b49b70':'#79503c';p.fillRect(0,y,512,3);}
  for(let x=-32;x<544;x+=64){
    p.save();p.translate(x,64);p.rotate(Math.PI/4);p.fillStyle='#bba071';p.fillRect(-19,-19,38,38);p.fillStyle='#74503f';p.fillRect(-12,-12,24,24);p.restore();
    p.strokeStyle='#baa172';p.lineWidth=3;p.beginPath();p.moveTo(x+17,64);p.lineTo(x+32,47);p.lineTo(x+47,64);p.stroke();
  }
  for(let y=0;y<128;y+=3){p.fillStyle='#d8c29a0b';p.fillRect(0,y,512,1);}
  return canvasTexture(c);
}
export function createRugBuilder({world}){
  const records=[],field=rugTexture(),border=rugBorderTexture();
  const material=new T.MeshStandardMaterial({map:field,bumpMap:field,bumpScale:.00065,roughness:1,color:0xd7ccba});
  const borderMaterial=new T.MeshStandardMaterial({map:border,bumpMap:border,bumpScale:.00065,roughness:1,color:0xd7ccba});
  const threadMaterial=new T.MeshStandardMaterial({color:0xa59b85,roughness:1});
  const cache=new Map();
  function geometries(w,d){
    const key=w+'/'+d;if(cache.has(key))return cache.get(key);
    const b=RUG_SCALE.borderWidth,innerW=w-b*2,innerD=d-b*2;
    const body=new T.PlaneGeometry(innerW,innerD);body.rotateX(-Math.PI/2);
    const uv=body.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*innerW/RUG_SCALE.field,uv.getY(i)*innerD/RUG_SCALE.field);
    const positions=[],uvs=[],outer=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],inner=[[-innerW/2,-innerD/2],[innerW/2,-innerD/2],[innerW/2,innerD/2],[-innerW/2,innerD/2]];
    for(let side=0;side<4;side++){
      const next=(side+1)%4,a=outer[side],c=outer[next],ia=inner[side],ic=inner[next],length=side%2?d:w,u=length/RUG_SCALE.borderRepeat;
      const pts=[a,ia,c,c,ia,ic],coords=[[0,0],[b/RUG_SCALE.borderRepeat,1],[u,0],[u,0],[b/RUG_SCALE.borderRepeat,1],[u-b/RUG_SCALE.borderRepeat,1]];
      for(let i=0;i<6;i++){positions.push(pts[i][0],0,pts[i][1]);uvs.push(...coords[i]);}
    }
    const trim=new T.BufferGeometry();trim.setAttribute('position',new T.Float32BufferAttribute(positions,3));trim.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));trim.computeVertexNormals();
    const fringePos=[],fringeUv=[],alongX=d>=w,span=alongX?w:d,end=alongX?d:w;
    for(const sign of [-1,1])for(let t=-span/2+.02;t<span/2;t+=.035){
      const pts=alongX?[[t,end/2*sign],[t+.012,end/2*sign],[t+.009,(end/2+.032)*sign]]:[[end/2*sign,t],[end/2*sign,t+.012],[(end/2+.032)*sign,t+.009]];
      if((alongX?sign:-sign)>0)pts.reverse();
      for(const [x,z] of pts){fringePos.push(x,0,z);fringeUv.push(0,0);}
    }
    const fringe=new T.BufferGeometry();fringe.setAttribute('position',new T.Float32BufferAttribute(fringePos,3));fringe.setAttribute('uv',new T.Float32BufferAttribute(fringeUv,2));fringe.computeVertexNormals();
    const result={body,trim,fringe};cache.set(key,result);return result;
  }
  function add(x,z,w,d,y=0){
    const g=new T.Group(),geo=geometries(w,d);g.name='Woven Persian rug';g.userData.rug=true;g.position.set(x,(y===0?.095:y)+.008,z);
    const parts=[new T.Mesh(geo.body,material),new T.Mesh(geo.trim,borderMaterial),new T.Mesh(geo.fringe,threadMaterial)];
    for(const p of parts){p.receiveShadow=true;p.castShadow=false;g.add(p);}
    world.add(g);records.push({x,z,w,d,y,group:g,body:parts[0],border:parts[1],fringe:parts[2]});return g;
  }
  return {add,records,field,border,material,borderMaterial,cache};
}
