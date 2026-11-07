import snapshot from '../data/initial-snapshot.json';

export function stable(value) {
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const decode=value=>{
  if(Array.isArray(value))return value.map(decode);
  if(value&&typeof value==='object'){
    if(value.$parcel){const [id,lon,lat,catchment_id,farm_id,area_ha,source]=value.$parcel;return {id,lon,lat,values:{parcel_id:id,catchment_id,farm_id,area_ha},source:decode(source)};}
    if(value.$source){const [index,row,id]=value.$source;return {...snapshot.source_metadata[index],...(row!=null?{row_number:row,record_id:id}:{})};}
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item)]));
  }
  return value;
};
let dataset=snapshot.dataset_id, model=snapshot.model_hash, revision=0;
const memory=new Map(),listeners=new Set();
const storageKey=()=>`navigator-results-v2:${snapshot.generated_at}:${dataset}:${model}`;
let persisted={};
try{const context=JSON.parse(localStorage.getItem('navigator-cache-context')||'null');if(context?.dataset&&context?.model){dataset=context.dataset;model=context.model;}persisted=JSON.parse(localStorage.getItem(storageKey())||'{}');}catch{}
export const cacheInfo=()=>({dataset_id:dataset,model_hash:model,generated_at:snapshot.generated_at,revision});
export function cachedResult(key){
  if(memory.has(key))return memory.get(key);
  const entry=persisted[key];
  if(entry){memory.set(key,entry.data);return entry.data;}
  if(dataset===snapshot.dataset_id&&model===snapshot.model_hash&&Object.hasOwn(snapshot.resources,key)){
    const data=decode(snapshot.resources[key]);memory.set(key,data);return data;
  }
}
export function storeResult(key,data){
  if(data==null)return;
  memory.set(key,data);
  // Default snapshot results are already shipped with the application. Persist
  // recent custom calculations only, bounded to avoid browser quota failures.
  if(dataset===snapshot.dataset_id&&model===snapshot.model_hash&&Object.hasOwn(snapshot.resources,key))return;
  try{
    const encoded=JSON.stringify(data);if(encoded.length>300000)return;
    persisted[key]={data,at:Date.now()};
    for(const stale of Object.keys(persisted).sort((a,b)=>persisted[a].at-persisted[b].at).slice(0,-12))delete persisted[stale];
    localStorage.setItem(storageKey(),JSON.stringify(persisted));
  }catch{}
}
export function setCacheContext(nextDataset,nextModel){
  if(nextDataset===dataset&&nextModel===model)return;
  dataset=nextDataset;model=nextModel;memory.clear();revision++;persisted={};
  try{localStorage.setItem('navigator-cache-context',JSON.stringify({dataset,model}));persisted=JSON.parse(localStorage.getItem(storageKey())||'{}');}catch{}
  listeners.forEach(listener=>listener());
  window.dispatchEvent(new CustomEvent('navigator:dataset',{detail:cacheInfo()}));
}
export function subscribeCache(listener){listeners.add(listener);return()=>listeners.delete(listener);}
