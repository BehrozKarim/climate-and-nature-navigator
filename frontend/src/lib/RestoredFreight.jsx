import React,{useMemo,useState} from 'react';
import {api} from './api.js';
import {stable} from './result-cache.js';
import {useResult,ResultState,Evidence,fmt} from '../components/Analysis.jsx';
import {useScene,useTween,inspectRecord} from './ui-data.js';
import FreightView from '../components/design/FreightView.jsx';

const icons={road:'M2.5 6.5h11v9h-11ZM13.5 9.5h4l3 3v3h-7',sea:'M3 15c3 2 6 2 9 0s6-2 9 0M5 12l1-5h12l1 5M12 4v3'};
export default function Freight(props){
  const [origin,setOrigin]=useState('turku'),[destination,setDestination]=useState('helsinki'),[request,setRequest]=useState({origin:'turku',destination:'helsinki'}),[mass,setMass]=useState('24'),[edited,setEdited]=useState(null),[hvo,setHvo]=useState(false),[year,setYear]=useState(2025),[leg,setLeg]=useState(-1),[saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const catalog=useResult('freight-catalog',signal=>api.freightCatalog({signal}));
  const route=useResult(`route:${request.origin}:${request.destination}`,signal=>api.lookup(request.origin,request.destination,{signal}));
  const legs=edited||route.data?.legs||[],mass_t=Number(mass),valid=mass_t>0&&Number.isFinite(mass_t)&&legs.length>0;
  const tripInputs={mass_t,legs};
  const trip=useResult(`trip:${stable(tripInputs)}`,async signal=>{
    if(!valid)throw new Error('Enter a positive cargo mass.');
    const [current,alternative]=await Promise.all([api.trip(tripInputs,false,{signal}),api.trip({mass_t,legs:legs.map(value=>({...value,mode:value.mode==='truck'?'truck-hvo':value.mode}))},false,{signal})]);
    return {current:current.output,hvo:alternative.output};
  },180);
  const annualInputs={year,...(hvo?{alternative_factor_id:'EF-TKM-TRUCK-HVO',adoption:1}:{})};
  const annual=useResult(`freight-annual:${stable(annualInputs)}`,async signal=>(await api.freightBatch(annualInputs,{signal})).output);
  async function save(kind){setSaving(true);setSaveError('');try{if(kind==='annual')await api.calculate('freight/batch',annualInputs);else await api.trip(tripInputs,true);props.onToast?.('Assessment saved with its source evidence.');props.onNav?.('review');}catch(e){setSaveError(e.message);}finally{setSaving(false);}}
  return <ResultState result={catalog}>{catalogue=><ResultState result={annual}>{batch=><FreightData {...props} {...{catalogue,batch,route,trip,legs,mass,mass_t,valid,origin,setOrigin,destination,setDestination,request,setRequest,setMass,edited,setEdited,hvo,setHvo,year,setYear,leg,setLeg,saving,saveError,save,annual,catalog}}/>}</ResultState>}</ResultState>;
}
function FreightData({catalogue,batch,route,trip,legs,mass,mass_t,valid,origin,setOrigin,destination,setDestination,request,setRequest,setMass,setEdited,hvo,setHvo,year,setYear,leg,setLeg,saving,saveError,save,annual,catalog,onTrace,onToast}){
  const scene=useMemo(()=>({bounds:[10,54.5,31.5,66.8],view:{lon:22,lat:58.8,dist:90,pol:.8},routes:legs.map((value,index)=>({id:`leg${index}`,kind:['ship-bulk','ship-reefer','ropax'].includes(value.mode)?'sea':'road',pts:value.points.map(([lat,lon])=>[lon,lat]),i:index}))}),[legs]);
  const {canvasRef,map,failed}=useScene(scene,hit=>setLeg(hit?.kind==='route'?hit.item.i:-1));
  const total=trip.data?.current,alternative=trip.data?.hvo;
  const numbers=useTween({total:total?.total_kgco2e,batch:batch.scenario_tco2e,saved:batch.difference_tco2e});
  const maximum=Math.max(1,total?.total_kgco2e||0,alternative?.total_kgco2e||0),groupMax=Math.max(1,...Object.values(batch.groups).map(value=>value.baseline_tco2e));
  const selected=legs[leg],selectedLine=total?.lines[leg],mode=catalogue.modes.find(mode=>mode.id===selected?.mode);
  const dirty=origin!==request.origin||destination!==request.destination;
  const model={
    presets:[{label:'Your route',on:'true',pick:()=>{}}],isCustom:true,cO:origin,cD:destination,setO:event=>setOrigin(event.target.value),setD:event=>setDestination(event.target.value),
    placeGroups:[['FI','Finland'],['BAL','Baltic region and Poland'],['SE','Sweden']].map(([id,label])=>({id,label,places:catalogue.places.filter(place=>place.group===id).sort((a,b)=>a.name.localeCompare(b.name))})),
    findRoute:event=>{event.preventDefault();if(origin===destination)return;setEdited(null);setLeg(-1);setRequest({origin,destination});},hasErr:!!route.error||!!trip.error||dirty,err:route.error||trip.error||(dirty?'Press Go to calculate the newly selected route.':''),looking:false,
    catalogLoading:false,catalogError:catalog.error||'',places:catalogue.places,retryCatalog:catalog.retry,saving,saveError,trip:total,tripError:trip.error||trip.pending||dirty||route.pending,saveAssessment:()=>save('route'),massErr:!valid,material:'User-defined cargo · estimated route',massStr:mass,setMass:event=>setMass(event.target.value),
    legs:legs.map((value,index)=>{const kind=['ship-bulk','ship-reefer','ropax'].includes(value.mode)?'sea':'road',line=total?.lines[index];return {n:String(index+1),sid:`leg-${index}`,from:value.origin,to:value.destination,road:kind==='road',sea:kind==='sea',mode:value.mode,km:fmt(value.distance_km,1),kg:fmt(line?.kgco2e),formula:line?`${fmt(line.mass_t,3)} t × ${fmt(line.distance_km,3)} km × ${line.factor_kgco2e_per_tkm} kg CO₂e/tkm = ${fmt(line.kgco2e,4)} kg CO₂e`:'Calculation unavailable',icon:icons[kind],col:kind==='sea'?'var(--glacier)':'var(--pea)',bd:leg===index?'var(--ink)':'var(--line)',bg:leg===index?'var(--sunk)':'#fff',setMode:event=>setEdited(legs.map((row,i)=>i===index?{...row,mode:event.target.value}:row)),focus:()=>{setLeg(index);map.current?.fitTo(value.points.map(([lat,lon])=>[lon,lat]),2.6);}};}),
    n:{total:valid?fmt(numbers.total):'Unavailable',batch:fmt(numbers.batch),saved:fmt(numbers.saved)},compare:total?[['Now',total.total_kgco2e,'#EAF2F7'],['HVO100',alternative?.total_kgco2e,'#3CCB7F']].map(([label,value,col])=>({label,v:fmt(value),w:(value||0)/maximum*100,col})):[],canvasRef,
    stops:legs.length?[{t:legs[0].origin,lat:legs[0].points[0][0],lon:legs[0].points[0][1],h:.5},...legs.map(value=>({t:value.destination,lat:value.points.at(-1)[0],lon:value.points.at(-1)[1],h:.5}))]:[],flipCls:'swap-a',routeName:legs.length?`${legs[0].origin} → ${legs.at(-1).destination}`:'Your route',routeSub:`${fmt(legs.reduce((sum,row)=>sum+row.distance_km,0),1)} km · ${legs.length} legs · illustrative distance`,
    zin:()=>map.current?.zoomIn(),zout:()=>map.current?.zoomOut(),zfit:()=>map.current?.fitTo(legs.flatMap(value=>value.points.map(([lat,lon])=>[lon,lat])),2.1),hasLeg:!!selected,clearLeg:()=>setLeg(-1),
    leg:selected?{n:String(leg+1),from:selected.origin,to:selected.destination,rows:[{k:'Distance',v:`${fmt(selected.distance_km,1)} km · estimate`},{k:'Transport',v:mode?.name||selected.mode},{k:'Emissions',v:`${fmt(selectedLine?.kgco2e)} kg`}],trace:()=>onTrace?.({title:`${selected.origin} → ${selected.destination}`,value:fmt(selectedLine?.kgco2e,4),unit:'kg CO₂e',status:'source_context',note:'Coordinate-based route estimate; no verified road, rail or maritime service is established.',steps:[{k:'Distance',t:selected.distance_basis,id:`${selected.distance_km} km`,d:'Unverified route input'},{k:'Factor',t:selectedLine?.factor_id||'',id:`${selectedLine?.factor_kgco2e_per_tkm} kg/tkm`,d:selectedLine?.factor_source.file||''},{k:'Calculation',t:'mass × km × factor',id:`${selectedLine?.kgco2e} kg CO₂e`,d:total?.method_version||''}]})}:{rows:[]},
    hvo,hvoStr:String(hvo),toggleHvo:()=>setHvo(!hvo),batchTitle:`All shipments ${batch.year}`,batchCount:fmt(batch.included_rows),batch:Object.entries(batch.groups).map(([key,value])=>({mode:key.replace('category_4:','Inbound · ').replace('category_9:','Outbound · '),t:fmt(value.scenario_tco2e),w:value.scenario_tco2e/groupMax*100,col:key.includes('truck')?(hvo?'var(--pea)':'var(--ink-2)'):'var(--glacier)',trace:()=>{const line=batch.lines.find(line=>`category_${line.scope3_category}:${line.mode}`===key);if(line)inspectRecord(line.source,onTrace,onToast);}}))
  };
  return <><div className="result-status" role="status">{trip.pending||route.pending?'Updating route calculations · previous result remains visible.':null}</div><FreightView model={model}/>{failed&&<p className="context-note">Map unavailable. Source calculations remain available.</p>}<div className="freight-secondary-controls"><label className="lbl">Shipment year<select className="field" aria-label="Shipment year" value={year} onChange={event=>setYear(Number(event.target.value))}>{batch.available_years.map(value=><option key={value}>{value}</option>)}</select></label><button className="btn" disabled={saving||annual.pending} onClick={()=>save('annual')}>Save annual freight for review</button></div><p className="context-note">Annual totals use supplied shipment rows. The user-defined route is separate; no shipment origins or destinations are inferred. HVO sensitivity applies only to eligible dry trucks.</p><details className="source-footer"><summary>Sources and assumptions</summary><Evidence data={batch} onTrace={onTrace}/>{total&&<Evidence data={{...total,sources:total.lines.map(line=>line.factor_source)}} onTrace={onTrace}/>}</details></>;
}
