import * as T from './three.module.js';

// Sub-pixel blood and bullet marks use warmed instances, with bounded storage.
// Grenades, explosions and their gameplay physics remain separate.
export function createEffectPool(world,material,type,capacity){
  const geometry=new T.IcosahedronGeometry(1,1),instances=new T.InstancedMesh(geometry,material,capacity);
  instances.name=type==='particle'?'Blood particles':'Bullet impact marks';
  instances.instanceMatrix.setUsage(T.DynamicDrawUsage);instances.castShadow=false;instances.receiveShadow=true;instances.frustumCulled=false;
  const zero=new T.Matrix4().makeScale(0,0,0),free=[],active=new Uint8Array(capacity),slots=[];
  for(let i=0;i<capacity;i++){
    instances.setMatrixAt(i,zero);free.push(capacity-1-i);
    slots.push({mesh:new T.Object3D(),vel:new T.Vector3(),life:0,max:0,type,slot:i,pool:null});
  }
  instances.count=0;world.add(instances);
  let dirty=true;
  const pool={instances,slots,capacity,
    acquire(){if(!free.length)return null;const index=free.pop(),effect=slots[index];active[index]=1;effect.pool=pool;effect.mesh.rotation.set(0,0,0);instances.count=Math.max(instances.count,index+1);dirty=true;return effect;},
    release(effect){const index=effect.slot;if(!active[index])return;active[index]=0;instances.setMatrixAt(index,zero);free.push(index);dirty=true;},
    sync(){
      for(let i=0;i<instances.count;i++)if(active[i]){slots[i].mesh.updateMatrix();instances.setMatrixAt(i,slots[i].mesh.matrix);dirty=true;}
      while(instances.count&&!active[instances.count-1])instances.count--;
      if(dirty){instances.instanceMatrix.needsUpdate=true;dirty=false;}
    },
    reset(){free.length=0;for(let i=0;i<capacity;i++){active[i]=0;instances.setMatrixAt(i,zero);free.push(capacity-1-i);}instances.count=0;dirty=true;pool.sync();},
  };
  return pool;
}
