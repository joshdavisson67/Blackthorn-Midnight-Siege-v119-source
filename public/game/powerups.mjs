import * as T from './three.module.js';
import {createModelKit} from './station-models.mjs?v=129';
export const POWERUPS={
  ammo:{name:'MAX AMMO',color:0x67efbb,hex:'#67efbb',duration:0},
  double:{name:'DOUBLE DAMAGE',color:0xffd47a,hex:'#ffd47a',duration:20},
  grenades:{name:'INFINITE GRENADES',color:0xc1a1ff,hex:'#c1a1ff',duration:12,cooldown:.5},
};
export function choosePowerup(roll){return roll<.60?'ammo':roll<.80?'double':'grenades';}
// One vector recipe drives the floating icon and its HUD badge.
const glyphs={
  ammo:[['rect',11,27,42,25,3],['rect',8,23,48,8,2],['path',[[23,23],[23,17],[41,17],[41,23]]],['line',18,34,18,47],['line',46,34,46,47],['path',[[29,47],[29,38],[32,33],[35,38],[35,47],[29,47]]]],
  grenades:[['ellipse',32,39,14,18],['rect',26,17,13,8,2],['path',[[37,18],[45,25],[49,46]]],['circle',22,16,6],['line',20,34,44,34],['line',19,43,45,43],['line',27,24,27,54],['line',37,24,37,54]],
};
function drawGlyph(ctx,type,color){
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.8;ctx.lineJoin='round';ctx.lineCap='round';
  if(type==='double'){ctx.font='900 40px Arial';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText('×2',32,46);return;}
  for(const [kind,...v] of glyphs[type]){
    ctx.beginPath();
    if(kind==='rect')ctx.roundRect(...v);
    if(kind==='ellipse')ctx.ellipse(...v,0,0,Math.PI*2);
    if(kind==='circle')ctx.arc(...v,0,Math.PI*2);
    if(kind==='line'){ctx.moveTo(v[0],v[1]);ctx.lineTo(v[2],v[3]);}
    if(kind==='path')v[0].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.stroke();
  }
}
export function powerupIcon(type){
  let shapes='';
  if(type==='double')shapes='<text x="32" y="46" fill="currentColor" stroke="none" font-family="Arial,sans-serif" font-weight="900" font-size="40" text-anchor="middle">×2</text>';
  else shapes=glyphs[type].map(([k,...v])=>{
    if(k==='rect')return `<rect x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}" rx="${v[4]}"/>`;
    if(k==='ellipse')return `<ellipse cx="${v[0]}" cy="${v[1]}" rx="${v[2]}" ry="${v[3]}"/>`;
    if(k==='circle')return `<circle cx="${v[0]}" cy="${v[1]}" r="${v[2]}"/>`;
    if(k==='line')return `<path d="M${v[0]} ${v[1]}L${v[2]} ${v[3]}"/>`;
    return `<path d="${v[0].map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join('')}"/>`;
  }).join('');
  return `<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">${shapes}</svg>`;
}
export function createPowerupAssets(){
  const materials={},kit=createModelKit(),models={ammo:kit.ammo(),double:kit.double(),grenades:kit.grenade()};
  for(const [type,def] of Object.entries(POWERUPS)){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.scale(8,8);
    ctx.fillStyle='#09151dea';ctx.beginPath();ctx.roundRect(3,3,58,58,12);ctx.fill();ctx.strokeStyle=def.hex;ctx.lineWidth=1.3;ctx.stroke();
    ctx.save();ctx.translate(5,1);ctx.scale(.84,.84);drawGlyph(ctx,type,def.hex);ctx.restore();
    ctx.fillStyle=def.hex;ctx.font='bold 4.3px Arial';ctx.textAlign='center';ctx.fillText(type==='grenades'?'GRENADES ∞':def.name,32,56);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    materials[type]=new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true,toneMapped:false});
  }
  return {materials,models,create(type){const group=new T.Group(),model=models[type].clone(true),icon=new T.Sprite(materials[type]);group.name=POWERUPS[type].name;group.userData.powerup=type;group.userData.model=model;group.add(model,icon);icon.scale.set(.56,.56,.56);icon.position.y=.64;icon.name='Pickup icon';group.userData.icon=icon;return group;}};
}
