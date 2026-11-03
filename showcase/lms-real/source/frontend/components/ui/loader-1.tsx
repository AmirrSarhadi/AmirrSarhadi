"use client";
import {useId} from "react";

export function PencilLoader({label="در حال بارگذاری…"}:{label?:string}){
 const eraser=useId();
 return <div className="pencil-loader" role="status"><svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 200 200" className="pencil" aria-hidden="true">
  <defs><clipPath id={eraser}><rect width="30" height="30" rx="5"/></clipPath></defs>
  <circle className="pencil__stroke" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="439.82 439.82" r="70"/>
  <g className="pencil__rotate">
   <g fill="none"><circle className="pencil__body1" stroke="#315dba" strokeWidth="30" strokeDasharray="402.12 402.12" r="64"/><circle className="pencil__body2" stroke="#6b92e0" strokeWidth="10" strokeDasharray="464.96 464.96" r="74"/><circle className="pencil__body3" stroke="#26488f" strokeWidth="10" strokeDasharray="339.29 339.29" r="54"/></g>
   <g className="pencil__eraser"><g className="pencil__eraser-skew"><rect width="30" height="30" rx="5" fill="#9db9ee"/><rect width="5" height="30" clipPath={`url(#${eraser})`} fill="#6b92e0"/><rect width="30" height="20" fill="#e3e5e8"/><rect width="15" height="20" fill="#aeb3bd"/><rect width="5" height="20" fill="#cbd0d8"/><rect width="30" height="2" y="6" fill="#32384433"/><rect width="30" height="2" y="13" fill="#32384433"/></g></g>
   <g className="pencil__point"><polygon points="15 0,30 30,0 30" fill="#f7c776"/><polygon points="15 0,6 30,0 30" fill="#e7a53d"/><polygon points="15 0,20 10,10 10" fill="#29313d"/></g>
  </g>
 </svg><span>{label}</span></div>;
}
export {PencilLoader as Component};
