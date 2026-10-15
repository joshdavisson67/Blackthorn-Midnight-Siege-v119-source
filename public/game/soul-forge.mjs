export const FORGE=Object.freeze({prices:Object.freeze([5000,10000,15000]),maxRank:3,damageMultipliers:Object.freeze([1,2,4,6]),reloadMultiplier:.75,ammoMultiplier:1.25});
const bonuses=Object.freeze(Array.from({length:FORGE.maxRank+1},(_,rank)=>Object.freeze({
  damageMultiplier:FORGE.damageMultipliers[rank],
  reloadMultiplier:FORGE.reloadMultiplier**rank,
  ammoMultiplier:FORGE.ammoMultiplier**rank
})));
export const forgeBonuses=rank=>bonuses[rank];

// The active weapon owns the rank. Both forges display its next purchase.
// Build every finish during loading; switching weapons only swaps materials.
export function configureForgeStation(station,{plates,label}){
  const materials=Array.from({length:FORGE.maxRank+1},(_,rank)=>{
    const maximum=rank===FORGE.maxRank,next=Math.min(rank+1,FORGE.maxRank);
    const color=rank===0?'#c1a1ff':rank===1?'#a9ccff':'#ffd17a';
    const title=`SOUL FORGE · RANK ${next}`;
    const damage=forgeBonuses(next).damageMultiplier;
    const detail=maximum?`MAXIMUM RANK\n${damage}× BASE DAMAGE\nSWITCH WEAPONS TO FORGE`:`${FORGE.prices[rank].toLocaleString()} ESSENCE\n${damage}× BASE DAMAGE · +25% AMMO\n25% FASTER RELOAD`;
    const text=plates.length===1?[`${title}\n${detail}`]:[title,detail];
    return text.map((value,i)=>{
      const {width,height}=plates[i].geometry.parameters;
      return label(value,color,1024,{width,height,kind:plates.length===1?'placard':i===0?'title':'detail',maxLines:plates.length===1?4:i===0?1:3});
    });
  });
  plates.forEach(p=>{p.userData.dynamic=true;});
  station.forgeMaterials=materials.flat();
  station.setForgeRank=rank=>{
    station.forgeRank=rank;station.price=FORGE.prices[rank]??0;
    station.forgeMaximum=rank===FORGE.maxRank;
    plates.forEach((p,i)=>{p.material=materials[rank][i];});
  };
  station.setForgeRank(0);return station;
}
