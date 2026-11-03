'use strict';
// Geometry editing uses full-image coordinates; never the scrolled viewport.
window.planEditor=(()=>{
  let undo=[],redo=[],drawing=false,gesture=null;
  const stage=$('planStage');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function syncButtons(){
    $('drawSpace').disabled=busy||!state?.plan||editorDirty;
    $('undoPlan').disabled=busy||editorDirty||!undo.length;
    $('redoPlan').disabled=busy||editorDirty||!redo.length;
  }
  function mode(value){drawing=value;stage.classList.toggle('drawing',value);$('drawSpace').setAttribute('aria-pressed',String(value));}
  function reset(){undo=[];redo=[];gesture=null;mode(false);syncButtons();}
  function capture(){undo.push(clone(state.plan));if(undo.length>30)undo.shift();redo=[];}
  function restore(from,to){
    if(busy||editorDirty||!from.length)return;
    to.push(clone(state.plan));state.plan=from.pop();selected=null;invalidate();render();mode(false);
    msg('تغییر بازگردانی شد؛ پیش از پیشنهاد، پلان را دوباره تأیید کن.');
  }
  function point(event){
    const rect=stage.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return null;
    return {x:clamp((event.clientX-rect.left)/rect.width,0,1),
            y:clamp((event.clientY-rect.top)/rect.height,0,1)};
  }
  function preview(box,node){Object.assign(node.style,{left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.width*100}%`,height:`${box.height*100}%`});}
  $('drawSpace').onclick=()=>{mode(!drawing);msg(drawing?'روی پلان بکش تا محدوده فضای جدید ساخته شود.':'رسم متوقف شد.');};
  $('undoPlan').onclick=()=>restore(undo,redo);$('redoPlan').onclick=()=>restore(redo,undo);
  stage.addEventListener('pointerdown',event=>{
    if(busy||editorDirty||!state?.plan||event.button!==0)return;
    const start=point(event);if(!start)return;
    if(drawing){
      const node=el('div',undefined,'drawPreview');$('overlay').append(node);
      gesture={type:'draw',start,node,pointerId:event.pointerId};
    }else{
      const box=event.target.closest?.('.roomBox');if(!box)return;
      const space=state.plan.spaces.find(s=>s.id===box.dataset.spaceId);if(!space)return;
      const resize=event.target.classList.contains('resizeHandle');selectSpace(space);
      const node=[...$('overlay').children].find(n=>n.dataset.spaceId===space.id);
      gesture={type:resize?'resize':'move',start,node,space,box:clone(space.box),pointerId:event.pointerId};
    }
    event.preventDefault();try{stage.setPointerCapture(event.pointerId);}catch{}
  });
  stage.addEventListener('pointermove',event=>{
    if(!gesture||event.pointerId!==gesture.pointerId)return;
    const p=point(event);if(!p)return;const g=gesture,dx=p.x-g.start.x,dy=p.y-g.start.y;
    let box;
    if(g.type==='draw')box={x:Math.min(p.x,g.start.x),y:Math.min(p.y,g.start.y),width:Math.abs(dx),height:Math.abs(dy)};
    else if(g.type==='resize')box={...g.box,width:clamp(g.box.width+dx,.005,1-g.box.x),height:clamp(g.box.height+dy,.005,1-g.box.y)};
    else box={...g.box,x:clamp(g.box.x+dx,0,1-g.box.width),y:clamp(g.box.y+dy,0,1-g.box.height)};
    gesture.result=box;preview(box,g.node);
  });
  function finish(event,cancel=false){
    if(!gesture||event.pointerId!==gesture.pointerId)return;
    const g=gesture;gesture=null;try{stage.releasePointerCapture(event.pointerId);}catch{}
    if(cancel||!g.result||(g.type==='draw'&&(g.result.width<.005||g.result.height<.005))){renderSpaces();return;}
    if(g.box&&JSON.stringify(g.box)===JSON.stringify(g.result)){renderSpaces();return;}
    capture();
    if(g.type==='draw'){
      const space={id:'user-'+crypto.randomUUID(),unit_id:$('unit').value,name:'فضای رسم‌شده',kind:'other',
        evidence:'محدوده رسم‌شده توسط کاربر؛ نیازمند تأیید.',certainty:'uncertain',box:g.result};
      state.plan.spaces.push(space);mode(false);invalidate();selectSpace(space);
    }else{g.space.box=g.result;invalidate();selectSpace(g.space);}
    msg('محدوده تغییر کرد؛ نام و نوع فضا را بررسی و پلان را دوباره تأیید کن.');
  }
  stage.addEventListener('pointerup',e=>finish(e));stage.addEventListener('pointercancel',e=>finish(e,true));
  stage.addEventListener('keydown',event=>{
    if(event.key==='Escape'){mode(false);if(gesture)finish({pointerId:gesture.pointerId},true);return;}
    const node=event.target.closest?.('.roomBox');
    if(!node||busy||editorDirty||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    const space=state.plan.spaces.find(s=>s.id===node.dataset.spaceId);if(!space)return;
    event.preventDefault();const delta=event.shiftKey?.02:.005;capture();
    const box=space.box;
    if(event.key==='ArrowLeft')box.x=clamp(box.x-delta,0,1-box.width);
    if(event.key==='ArrowRight')box.x=clamp(box.x+delta,0,1-box.width);
    if(event.key==='ArrowUp')box.y=clamp(box.y-delta,0,1-box.height);
    if(event.key==='ArrowDown')box.y=clamp(box.y+delta,0,1-box.height);
    invalidate();selectSpace(space);
    [...$('overlay').children].find(n=>n.dataset.spaceId===space.id)?.focus();
  });
  syncButtons();return {syncButtons,capture,reset};
})();
