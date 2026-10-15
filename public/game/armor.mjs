export const ARMOR=Object.freeze({bodyPrice:2500,nanoRanks:Object.freeze([
  Object.freeze({rank:1,name:'NANO SHIELD RANK 1',price:5000,regenDelay:5,regenRate:5,hex:'#85f4d3'}),
  Object.freeze({rank:2,name:'NANO SHIELD RANK 2',price:7500,regenDelay:3,regenRate:10,hex:'#ffd17a'}),
  Object.freeze({rank:3,name:'NANO SHIELD RANK 3',price:20000,regenDelay:0,regenRate:15,hex:'#ffe5a0'})
])});

// Player tiers: 0 = no armor, 1 = Aegis, 2–4 = Nano Shield Ranks 1–3.
export function armorRank(tier){return ARMOR.nanoRanks[tier-2]||null;}

// Both locations sell the player's next tier. Prebuilt labels and models are
// reused across purchases and restarts, so upgrading creates no render assets.
export function configureArmorStation(station,{nanoModel,nanoRank2Model,nanoRank3Model,plates,label}){
  const base={name:station.name,hex:station.hex};
  const baseMaterials=plates.map(p=>p.material);
  const rankMaterials=ARMOR.nanoRanks.map(rank=>{
    const detail=`${rank.price.toLocaleString()} ESSENCE\n${rank.regenRate} SHIELD/S · ${rank.regenDelay?rank.regenDelay+'S DELAY':'NO DELAY'}`;
    const captions=plates.length===1?[`${rank.name}\n${detail}`]:[rank.name,detail];
    return captions.map((text,i)=>{const p=plates[i],{width,height}=p.geometry.parameters;return label(text,rank.hex,768,{width,height,maxPixelWidth:plates.length===1?640:2048,kind:plates.length===1?'placard':i===0?'title':'detail',maxLines:plates.length===1?3:i===0?1:3});});
  });
  plates.forEach(p=>{p.userData.dynamic=true;});
  const nanoModels=[nanoModel,nanoRank2Model,nanoRank3Model];
  for(const model of nanoModels)model.traverse(o=>{o.userData.dynamic=true;o.userData.collectible=true;});
  station.nanoModel=nanoModel;station.nanoRank2Model=nanoRank2Model;station.nanoRank3Model=nanoRank3Model;station.nanoModels=nanoModels;
  station.setArmorTier=tier=>{
    const next=ARMOR.nanoRanks[tier-1],rank=next||armorRank(tier);
    station.armorTier=tier;station.used=tier===ARMOR.nanoRanks.length+1;
    station.name=tier===0?base.name:rank.name;
    station.price=tier===0?ARMOR.bodyPrice:rank.price;
    station.hex=tier===0?base.hex:rank.hex;
    station.model.visible=tier===0;nanoModels.forEach((model,i)=>{model.visible=tier===i+1;});
    plates.forEach((p,i)=>{p.material=tier===0?baseMaterials[i]:rankMaterials[rank.rank-1][i];});
  };
  station.setArmorTier(0);
  return station;
}
