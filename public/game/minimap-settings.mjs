const STORAGE_KEY='blackthorn-minimap-position';

export function configureMinimap({radar,navigation,vitals,toggle}){
  let position='top-right';
  try{if(localStorage.getItem(STORAGE_KEY)==='bottom-left')position='bottom-left';}catch{}

  function apply(){
    const bottomLeft=position==='bottom-left';
    // Move the existing canvas so its drawing context and radar data stay intact.
    // The vitals stack keeps the map above health, shield and regen status.
    (bottomLeft?vitals:navigation).prepend(radar);
    toggle.setAttribute('aria-checked',String(bottomLeft));
    toggle.querySelector('[data-minimap-position]').textContent=bottomLeft?'BOTTOM LEFT':'TOP RIGHT';
    navigation.setAttribute('aria-label',bottomLeft?'Essence':'Compass and essence');
  }

  toggle.onclick=()=>{
    position=position==='top-right'?'bottom-left':'top-right';
    apply();
    try{localStorage.setItem(STORAGE_KEY,position);}catch{}
  };
  apply();
}
