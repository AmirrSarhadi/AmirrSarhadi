let pending=0;
const listeners=new Set<()=>void>();
const publish=()=>listeners.forEach(listener=>listener());

export const operationProgress={
 subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}},
 snapshot:()=>pending,
 serverSnapshot:()=>0,
};

export function beginOperation(){
 pending++;publish();
 let ended=false;
 return()=>{if(ended)return;ended=true;pending--;publish()};
}
