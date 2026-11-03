let locks=0;
let previousOverflow='';

export function lockDocumentScroll(){
 if(locks++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}
 let released=false;
 return()=>{if(released)return;released=true;if(--locks===0)document.body.style.overflow=previousOverflow};
}

export function focusableElements(root:HTMLElement){
 return Array.from(root.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')).filter(element=>element.tabIndex>=0&&!element.matches(':disabled,[hidden],[aria-hidden="true"]')&&element.getClientRects().length>0);
}
