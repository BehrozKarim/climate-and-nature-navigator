import React,{useCallback,useEffect,useRef,useState} from 'react';
import {api,sourceTrace} from './api.js';

export function inspectRecord(record,onTrace,onToast){
  const source=record?.source||record;
  if(!source?.row_number){onTrace?.({title:source?.file||'Snapshot source',value:'Source context',unit:'',status:'source_context',steps:[{k:'Source',t:source?.file||source?.table||'',id:source?.dataset_id||'',d:source?.file_sha256||''}]});return;}
  api.sourceRow(source).then(value=>onTrace?.(sourceTrace(value))).catch(e=>onToast?.(e.message));
}
export function useTween(target,duration=650){
  const [value,setValue]=useState(target),current=useRef(target),first=useRef(true);
  const key=JSON.stringify(target);
  useEffect(()=>{
    if(first.current){first.current=false;return;}
    const from=current.current,start=performance.now(),reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame;const step=time=>{const p=reduce?1:Math.min(1,(time-start)/duration),ease=1-(1-p)**3;const next={};for(const field in target)next[field]=Number.isFinite(target[field])?(Number.isFinite(from[field])?from[field]:target[field])+(target[field]-(Number.isFinite(from[field])?from[field]:target[field]))*ease:target[field];current.current=next;setValue(next);if(p<1)frame=requestAnimationFrame(step);};
    frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);
  },[key]);
  return value;
}
export function useScene(scene,onPick){
  const [node,setNode]=useState(null),map=useRef(null),pick=useRef(onPick),[failed,setFailed]=useState(false);
  pick.current=onPick;
  const canvasRef=useCallback(node=>setNode(node),[]);
  useEffect(()=>()=>{map.current?.dispose();map.current=null;},[]);
  useEffect(()=>{
    if(!node||!scene)return;
    let dead=false,timer;
    const create=()=>{if(dead)return;if(!window.NavMap||!window.THREE){timer=setTimeout(create,50);return;}
      window.NavMap.ready.then(()=>{if(dead)return;try{
        const instance=map.current=window.NavMap.create(node,{bounds:scene.bounds||[10,54.5,31.5,66.8],view:scene.view||{lon:20.5,lat:59.8,dist:118,pol:.72,az:0},minDist:4,onPick:hit=>pick.current?.(hit)});
        if(scene.farms)instance.setDots('farms',scene.farms);
        if(scene.sites)instance.setSites(scene.sites);
        if(scene.arcs)instance.setArcs(scene.arcs);
        if(scene.routes)instance.setRoute(scene.routes);
        setFailed(false);
      }catch{setFailed(true);}});};create();return()=>{dead=true;clearTimeout(timer);map.current?.dispose(true);map.current=null;};
  },[node,scene]);
  return {canvasRef,map,failed};
}
export function chartModel(series,{width=900,height=300,left=50,right=890,top=10,bottom=270,start=2025,end=2050,max=260000}={}){
  const X=year=>left+(year-start)/(end-start)*(right-left),Y=value=>bottom-value/max*(bottom-top);
  const line=points=>points.filter(p=>Number.isFinite(p.value)).map((p,i)=>`${i?'L':'M'}${X(p.year).toFixed(1)} ${Y(p.value).toFixed(1)}`).join(' ');
  const rows=series||[];
  return {X,Y,line,grid:[0,.25,.5,.75,1].map(f=>`M${left} ${Y(f*max)}H${right}`).join(' '),
    selected:line(rows.map(r=>({year:r.year,value:r.emissions_tco2e}))),target:line(rows.map(r=>({year:r.year,value:r.target_tco2e}))),
    area:rows.length?line(rows.map(r=>({year:r.year,value:r.emissions_tco2e})))+` L${X(end)} ${Y(0)} L${X(start)} ${Y(0)} Z`:'',
    gap:rows.length?line(rows.map(r=>({year:r.year,value:r.emissions_tco2e})))+' '+rows.slice().reverse().map(r=>`L${X(r.year)} ${Y(Math.min(r.emissions_tco2e,r.target_tco2e))}`).join(' ')+' Z':'',
    yTicks:[0,.25,.5,.75,1].map(f=>({l:f===0?'0':`${Math.round(f*max/1000)}k`,label:f===0?'0':`${Math.round(f*max/1000)}k`,top:Y(f*max)/height*100})),
    xTicks:[start,...[2030,2035,2040,2045].filter(y=>y>start&&y<end),end].map(year=>({l:String(year),label:String(year),left:X(year)/width*100}))};
}
