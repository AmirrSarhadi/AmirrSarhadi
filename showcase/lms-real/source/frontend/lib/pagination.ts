export function withPageSize(path:string,pageSize:number){
 const index=path.indexOf("?");if(index<0)return path;
 const params=new URLSearchParams(path.slice(index+1));if(!params.has("page"))return path;
 params.set("page_size",String(pageSize));return path.slice(0,index)+"?"+params;
}
