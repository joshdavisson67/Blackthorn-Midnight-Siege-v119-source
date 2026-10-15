import * as T from './three.module.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function textWidth(ctx,text,font,tracking){
  const metrics=ctx.measureText(text);
  if(!tracking)return metrics?.width??text.length*font*.57;
  return [...text].reduce((n,c)=>n+(ctx.measureText(c)?.width??font*.57),0)+Math.max(0,[...text].length-1)*tracking;
}
function wrap(ctx,text,font,tracking,width){
  const rows=[];
  for(const paragraph of text.split('\n')){
    let line='';
    for(const word of paragraph.trim().split(/\s+/)){
      const next=line?line+' '+word:word;
      if(line&&textWidth(ctx,next,font,tracking)>width){rows.push(line);line=word;}
      else line=next;
    }
    if(line)rows.push(line);
  }
  return rows.length?rows:[''];
}

// Fit real glyph measurements to the panel. No fillText maxWidth scaling:
// lettering retains its proportions on wide plaques and narrow captions.
export function layoutSign(ctx,text,width,height,{kind='room',maxLines=4}={}){
  const serif=['room','crest','inscription','memorial'].includes(kind);
  const family=serif?'Georgia, serif':'Arial, sans-serif',weight=kind==='detail'?600:700;
  const padX=Math.max(height*.12,width*(kind==='crest'?.16:.065)),padY=height*.18;
  const availableWidth=width-padX*2,availableHeight=height-padY*2;
  let font=height*.64,rows,tracking,lineHeight,ascent,descent,inkHeight;
  for(let attempt=0;attempt<140;attempt++){
    ctx.font=`${weight} ${font}px ${family}`;
    tracking=kind==='room'?font*.035:0;
    rows=wrap(ctx,text,font,tracking,availableWidth);
    const metrics=rows.map(row=>ctx.measureText(row));
    ascent=Math.max(...metrics.map(m=>m?.actualBoundingBoxAscent||font*.76));
    descent=Math.max(...metrics.map(m=>m?.actualBoundingBoxDescent||font*.18));
    lineHeight=Math.max(font*1.26,ascent+descent+font*.22);
    inkHeight=ascent+descent+(rows.length-1)*lineHeight;
    if(rows.length<=maxLines&&inkHeight<=availableHeight&&rows.every(row=>textWidth(ctx,row,font,tracking)<=availableWidth))break;
    font*=.955;
  }
  const baseline=(height-inkHeight)/2+ascent;
  return {font,family,weight,tracking,padX,padY,availableWidth,availableHeight,lineHeight,inkHeight,
    rows:rows.map((text,i)=>({text,x:(width-textWidth(ctx,text,font,tracking))/2,y:baseline+i*lineHeight,width:textWidth(ctx,text,font,tracking),ascent,descent}))};
}

export function drawSign(ctx,text,width,height,color,options={}){
  const kind=options.kind||'room',layout=layoutSign(ctx,text,width,height,options);
  ctx.fillStyle=kind==='inscription'?'#202a29':'#0c1719';ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,height*.012);
  if(kind==='crest'){
    ctx.beginPath();ctx.arc(width/2,height/2,Math.min(width,height)*.45,0,Math.PI*2);ctx.stroke();
  }else{
    const inset=Math.max(3,height*.067);ctx.strokeRect(inset,inset,width-inset*2,height-inset*2);
  }
  ctx.font=`${layout.weight} ${layout.font}px ${layout.family}`;
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=kind==='detail'?'#d2ddd5':'#f1e8d2';
  for(const row of layout.rows){
    if(!layout.tracking){ctx.fillText(row.text,row.x,row.y);continue;}
    let x=row.x;for(const c of row.text){ctx.fillText(c,x,row.y);x+=(ctx.measureText(c)?.width??layout.font*.57)+layout.tracking;}
  }
  return layout;
}

export function createSignage({anisotropy=16,makeCanvas=()=>document.createElement('canvas')}={}){
  const materials=new Map(),records=[];
  function label(text,color='#d4b77a',size=512,options={}){
    const {width=2,height=1,kind='room',maxLines=4,maxPixelWidth=2048}=options;
    const key=JSON.stringify([text,color,size,width,height,kind,maxLines,maxPixelWidth]);if(materials.has(key))return materials.get(key);
    const aspect=width/height;
    // Match texel density to the physical plaque instead of allocating a
    // full 1024px sheet for every tiny cabinet caption. WebGL2 supports
    // mipmaps for these aspect-correct, non-power-of-two canvas textures.
    let pixels=clamp(Math.ceil(Math.max(Math.min(size,width*512),width*384)/128)*128,512,2048);
    // Small upgrade variants can share a tighter allocation ceiling, while
    // retaining physical aspect and the minimum 128px height used below.
    pixels=Math.min(pixels,clamp(Math.round(maxPixelWidth),512,2048));
    pixels=Math.min(2048,Math.max(pixels,Math.ceil(aspect*128)));
    const canvas=makeCanvas();canvas.width=pixels;canvas.height=Math.max(1,Math.round(pixels/aspect));
    const layout=drawSign(canvas.getContext('2d'),text,canvas.width,canvas.height,color,{kind,maxLines});
    const texture=new T.CanvasTexture(canvas);texture.name='Sign / '+text.replaceAll('\n',' · ');texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=anisotropy;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;
    const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});material.name=texture.name;
    material.userData.sign={text,color,width,height,kind,maxLines,layout,explicitDimensions:!!options.width&&!!options.height};
    materials.set(key,material);return material;
  }
  // Save individual mounted panels before static batching merges their meshes.
  // Their original ancestors also retain the visibility of doors/armor/nuke.
  function capture(world){
    records.length=0;world.updateMatrixWorld(true);
    world.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.material?.userData?.sign)return;
      mesh.castShadow=mesh.receiveShadow=false;mesh.geometry.computeBoundingBox();
      const local=mesh.geometry.boundingBox,ancestry=[];for(let p=mesh;p;p=p.parent)ancestry.push(p);
      records.push({mesh,ancestry,material:mesh.material,matrix:mesh.matrixWorld.clone(),
        center:local.getCenter(new T.Vector3()).applyMatrix4(mesh.matrixWorld),
        normal:new T.Vector3(0,0,1).transformDirection(mesh.matrixWorld),
        bounds:local.clone().applyMatrix4(mesh.matrixWorld),local:local.clone()});
    });
    return records;
  }
  return {label,capture,materials,records};
}
