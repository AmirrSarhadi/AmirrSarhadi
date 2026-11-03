export type ClassContext={id:number;title:string;year:string;year_id?:number};
export function classYearMatches(period:{year?:number;year_title?:string},context?:ClassContext){
  return !context||(context.year_id!==undefined&&period.year!==undefined?period.year===context.year_id:period.year_title===context.year);
}
