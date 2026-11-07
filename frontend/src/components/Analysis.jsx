import React, {useEffect, useRef, useState} from 'react';
import {api} from '../lib/api.js';
import {cachedResult,storeResult,subscribeCache,cacheInfo} from '../lib/result-cache.js';

export const fmt = (value, digits=0) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-GB',{maximumFractionDigits:digits}) : 'Unavailable';
export const signed = (value, digits=1) => typeof value === 'number' && Number.isFinite(value) ? `${value>0?'+':''}${fmt(value,digits)}` : 'Unavailable';
export const scenarioName = {ssp126:'SSP1-2.6',ssp245:'SSP2-4.5',ssp585:'SSP5-8.5'};
const EMPTY=[];
export function useResult(key, fetcher, delay=120) {
  const [revision,setRevision]=useState(cacheInfo().revision);
  useEffect(()=>subscribeCache(()=>setRevision(cacheInfo().revision)),[]);
  const scope=`${revision}:${key}`;
  const cached=cachedResult(key);
  const [state,setState] = useState(()=>({data:cached,scope}));
  const [retry,setRetry] = useState(0);
  useEffect(() => {
    const value=cachedResult(key);
    if(value&&retry===0){setState({data:value,scope});return;}
    const controller = new AbortController();
    setState(previous=>({...previous,loading:true,error:''}));
    const timer = setTimeout(() => {
      Promise.resolve().then(() => fetcher(controller.signal)).then(data => {
        if (!controller.signal.aborted && cacheInfo().revision===revision) {storeResult(key,data);setState({data,scope});}
      }).catch(error => {if (!controller.signal.aborted) setState(previous=>({...previous,error:error.message,loading:false}));});
    },delay);
    return () => {clearTimeout(timer);controller.abort();};
  },[key,retry,revision]);
  return {...state,data:cached||state.data,pending:!cached&&(state.scope!==scope||state.loading),retry:() => setRetry(n=>n+1)};
}
export function ResultState({result,children}) {
  if (!result.data) return <section className="card analysis-loading" aria-live="polite"><h2 className="h-d">{result.error?'Couldn’t load source data':'Calculating from the supplied dataset…'}</h2>{result.error&&<><p role="alert">{result.error}</p><button className="btn" onClick={result.retry}>Retry</button></>}</section>;
  return <div className="result-shell"><div className="result-status" role="status" aria-live="polite">{result.error?<>{result.error} · previous result remains available. <button className="ev" onClick={result.retry}>Retry</button></>:result.pending?'Updating the selected inputs · previous result remains visible.':null}</div>{children(result.data)}</div>;
}
export function Metrics({items}) {
  return <div className="analysis-metrics">{items.map((item,index)=><article className="card" key={index}><span>{item.label}</span><strong className="num">{item.value}</strong><small>{item.note}</small></article>)}</div>;
}
export function SaveAssessment({screen,inputs,onNav,onToast,disabled=false}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <div className="analysis-save"><button className="btn btn-p" disabled={busy||disabled} onClick={async()=>{setBusy(true);setError('');try{await api.save(screen,inputs);onToast?.('Assessment saved with its inputs and evidence.');onNav?.('review');}catch(e){setError(e.message);}finally{setBusy(false);}}}>{busy?'Saving…':'Save assessment for review'}</button>{error&&<span role="alert">{error}</span>}</div>;
}
export function Evidence({data,onTrace,extraSources=[]}) {
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const controller=useRef(null);
  useEffect(()=>{setBusy('');setError('');return()=>controller.current?.abort();},[data]);
  const sources=new Map();
  for(const source of [...(data.sources||[]),...extraSources]) if(source?.table) sources.set(`${source.dataset_id}|${source.table}|${source.row_number||''}`,source);
  const model=data.model;
  async function inspect(source){
    controller.current?.abort(); const abort=controller.current=new AbortController(); setBusy(source.table);setError('');
    try{
      const record=source.row_number!=null?await api.sourceRow(source,{signal:abort.signal}):null;
      if(abort.signal.aborted)return;
      if(record&&(record.source?.dataset_id!==source.dataset_id||record.source?.table!==source.table||record.source?.row_number!==source.row_number||record.source?.file_sha256!==source.file_sha256))throw new Error('Source does not match this snapshot.');
      onTrace?.({title:source.file?.split('/').at(-1)||source.table,value:source.row_number?`Row ${source.row_number}`:'Snapshot source',unit:'',status:'source_context',note:'Provided synthetic challenge data. Provenance is distinct from independent validation.',steps:[{k:'Source file',t:source.file||source.table,id:source.dataset_id,d:`SHA-256: ${source.file_sha256||'Unavailable'}`},...(source.filters?[{k:'Selection',t:'Source filters',id:JSON.stringify(source.filters),d:''}]:[]),...Object.entries(record?.values||{}).map(([key,value])=>({k:'Source value',t:key.replaceAll('_',' '),id:String(value??'Unavailable'),d:''}))]});
    }catch(e){if(!abort.signal.aborted)setError(e.message);}finally{if(!abort.signal.aborted)setBusy('');}
  }
  return <section className="card analysis-evidence" aria-label="Sources and assumptions"><h2 className="h-d">Sources and assumptions</h2><p>Supplied synthetic data · {data.method_version||'snapshot context'} · {String(data.status||'source context').replaceAll('_',' ')}</p><div className="analysis-source-buttons">{[...sources.values()].map((source,index)=><button className="ev" key={index} disabled={busy===source.table} onClick={()=>inspect(source)}>{source.file?.split('/').at(-1)||source.table}{source.row_number?` · row ${source.row_number}`:''}</button>)}</div>{model&&<details><summary>Model assumptions · {model.version}</summary><p className="mono">Configuration SHA-256: {model.config_sha256}</p><pre>{JSON.stringify(model.parameters,null,2)}</pre></details>}{(data.limitations||[]).length>0&&<ul>{data.limitations.map((text,index)=><li key={index}>{text}</li>)}</ul>}{(data.issues||[]).length>0&&<details><summary>{data.issues.length} data-quality observations</summary><ul>{data.issues.map((issue,index)=><li key={index}>{issue.code}: {issue.message||'Inspect the referenced source.'}{issue.source?.row_number&&<button className="ev" onClick={()=>inspect(issue.source)}>Row {issue.source.row_number}</button>}</li>)}</ul></details>}{error&&<p role="alert">Couldn’t inspect source: {error}. Select the source to retry.</p>}</section>;
}
export function LineChart({title,series,unit='t CO₂e',gap=false}) {
  const [hover,setHover]=useState(null);
  const points=series.flatMap(line=>line.points).filter(point=>Number.isFinite(point.value));
  if(!points.length)return <section className="card analysis-chart"><h2 className="h-d">{title}</h2><p>No supported values are available.</p></section>;
  const years=points.map(p=>p.year), x0=Math.min(...years),x1=Math.max(...years);
  const low=Math.min(0,...points.map(p=>p.value)), high=Math.max(1,...points.map(p=>p.value)), span=high-low||1;
  const X=y=>60+(y-x0)/(x1-x0||1)*800,Y=v=>280-(v-low)/span*250;
  const path=values=>{let pen=false;return values.map(p=>{if(!Number.isFinite(p.value)){pen=false;return '';}const d=`${pen?'L':'M'}${X(p.year)} ${Y(p.value)}`;pen=true;return d;}).join(' ');};
  const action=series.find(l=>l.id==='actions'),target=series.find(l=>l.id==='target');
  const gapPoints=action?.points.filter(p=>Number.isFinite(p.value)&&target?.points.some(t=>t.year===p.year&&Number.isFinite(t.value)))||[];
  const area=gap&&gapPoints.length?path(gapPoints)+' '+gapPoints.slice().reverse().map(p=>`L${X(p.year)} ${Y(Math.min(p.value,target.points.find(t=>t.year===p.year).value))}`).join(' ')+' Z':'';
  return <section className="card analysis-chart" aria-label={title}><div className="analysis-chart-heading"><h2 className="h-d">{title}</h2><div>{series.map(line=><span key={line.id}><i style={{background:line.color}}/>{line.name}</span>)}</div></div><div className="analysis-chart-body" onPointerLeave={()=>setHover(null)} onPointerMove={event=>{const r=event.currentTarget.getBoundingClientRect();setHover(Math.max(x0,Math.min(x1,Math.round(x0+((event.clientX-r.left)/r.width*900-60)/800*(x1-x0)))));}}><svg role="img" aria-label={`${title}, ${unit}`} viewBox="0 0 900 320" preserveAspectRatio="none">{[0,.25,.5,.75,1].map(f=><g key={f}><path d={`M60 ${Y(low+span*f)}H860`} stroke="var(--line)"/><text x="2" y={Y(low+span*f)+4}>{fmt(low+span*f,unit==='t CO₂e'?0:2)}</text></g>)}{area&&<path d={area} fill="var(--ember-50)"/>}{series.map(line=><path key={line.id} d={path(line.points)} fill="none" stroke={line.color} strokeWidth="2.5" strokeDasharray={line.dash||''}/>)}{[x0,Math.round((x0+x1)/2),x1].map((year,index)=><text key={index} x={X(year)} y="308" textAnchor="middle">{year}</text>)}{hover!=null&&<path d={`M${X(hover)} 20V280`} stroke="var(--muted)"/>}</svg>{hover!=null&&<div className="analysis-chart-tip"><strong>{hover}</strong>{series.map(line=><span key={line.id}>{line.name}: {fmt(line.points.find(point=>point.year===hover)?.value,unit==='t CO₂e'?0:2)} {unit}</span>)}</div>}</div><p>{unit} · point to a year for values</p></section>;
}
export function DatasetMap({points=EMPTY,title='Registered locations',onTrace,routes=EMPTY}) {
  const canvas=useRef(null), map=useRef(null),[failed,setFailed]=useState(false);
  useEffect(()=>()=>{map.current?.dispose();map.current=null;},[]);
  useEffect(()=>{
    let dead=false,timer; const create=()=>{
      if(dead)return;if(!window.NavMap||!window.THREE){timer=setTimeout(create,100);return;}
      window.NavMap.ready.then(()=>{if(dead)return;try{
        const coords=[...points,...routes.flatMap(route=>route.points||[])];
        const lons=coords.map(p=>p.lon),lats=coords.map(p=>p.lat);
        if(!coords.length)return;
        const bounds=[Math.min(...lons)-.4,Math.min(...lats)-.3,Math.max(...lons)+.4,Math.max(...lats)+.3];
        const m=map.current=window.NavMap.create(canvas.current,{bounds,view:{lon:(bounds[0]+bounds[2])/2,lat:(bounds[1]+bounds[3])/2,dist:Math.max(4,(bounds[3]-bounds[1])*12*.9),pol:.8},minDist:3,onPick:h=>{const point=h?.item?.record;if(point)onTrace?.({title:point.id,value:point.values?.name||point.values?.catchment_id||'',unit:'',status:'source_context',steps:[{k:'Source',t:point.source?.file||'Registered location',id:`${point.source?.record_id||point.id} · row ${point.source?.row_number||'—'}`,d:point.source?.file_sha256||''},...Object.entries(point.values||{}).map(([k,v])=>({k:'Source value',t:k,id:String(v),d:''}))]});}});
        m.setDots('records',points.map(point=>({id:point.id,lon:point.lon,lat:point.lat,r:.1,color:point.color||'#3CCB7F',record:point})));
        if(routes.length)m.setRoute(routes.map((route,index)=>({id:`leg${index}`,kind:route.kind,pts:route.points.map(p=>[p.lon,p.lat]),i:index})));
      }catch(e){if(!dead)setFailed(true);}});
    };setFailed(false);create();return()=>{dead=true;clearTimeout(timer);map.current?.dispose(true);map.current=null;};
  },[points,routes]);
  return <section className="dark analysis-map" aria-label={title}><canvas ref={canvas} className="canvas3d" aria-hidden="true" style={{visibility:failed?'hidden':'visible'}}/><div className="analysis-map-title"><h2 className="h-d">{title}</h2><span>{points.length?`${points.length} registered locations · select a point to inspect`:routes.length?'Illustrative route geometry':'No source coordinates available'} · stylized basemap</span></div><div className="analysis-map-controls"><button className="mapbtn" aria-label="Zoom in" onClick={()=>map.current?.zoomIn()}>+</button><button className="mapbtn" aria-label="Zoom out" onClick={()=>map.current?.zoomOut()}>−</button><button className="mapchip" onClick={()=>map.current?.reset()}>Reset view</button></div>{failed&&<p className="analysis-map-error" role="status">Map rendering unavailable. Source values remain available below.</p>}</section>;
}
