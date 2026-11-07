import React,{useState} from 'react';
import {api} from './api.js';
import {useResult,ResultState,Metrics,Evidence,DatasetMap,fmt} from '../components/Analysis.jsx';

export default function Freight({onTrace,onNav,onToast}) {
  const [year,setYear]=useState(2025),[hvo,setHvo]=useState(false),[origin,setOrigin]=useState(''),[destination,setDestination]=useState(''),[mass,setMass]=useState(24),[request,setRequest]=useState(null),[edited,setEdited]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const catalog=useResult('freight-catalog',signal=>api.freightCatalog({signal}));
  const annualInputs={year,...(hvo?{alternative_factor_id:'EF-TKM-TRUCK-HVO',adoption:1}:{})};
  const annual=useResult(JSON.stringify(annualInputs),async signal=>(await api.freightBatch(annualInputs,{signal})).output);
  const lookup=useResult(JSON.stringify(request),signal=>request?api.lookup(request.origin,request.destination,{signal}):null);
  const legs=edited||lookup.data?.legs||[];
  const valid=mass>0&&Number.isFinite(mass)&&legs.length>0&&legs.every(leg=>leg.distance_km>0);
  const trip=useResult(JSON.stringify([mass,legs]),async signal=>{
    if(!valid)return null;
    const alternative=legs.map(leg=>({...leg,mode:leg.mode==='truck'?'truck-hvo':leg.mode}));
    const [current,hvo]=await Promise.all([api.trip({mass_t:mass,legs},false,{signal}),api.trip({mass_t:mass,legs:alternative},false,{signal})]);
    return {current:current.output,hvo:hvo.output};
  });
  async function save(kind){
    setSaving(true);setError('');
    try{if(kind==='annual')await api.calculate('freight/batch',annualInputs);else await api.trip({mass_t:mass,legs},true);onToast?.('Freight assessment saved with source evidence.');onNav('review');}catch(e){setError(e.message);}finally{setSaving(false);}
  }
  return <div className="analysis-screen">
    <section className="card analysis-panel"><h2 className="h-d">Recorded shipment emissions</h2><p>Calculated from supplied shipment rows and the factor library. Shipment records have no From/To locations or route geometry; the route calculator below is a separate user-defined estimate.</p><div className="analysis-controls"><label className="lbl">Shipment year<select aria-label="Shipment year" className="field" value={year} onChange={e=>setYear(Number(e.target.value))}>{(annual.data?.available_years||[year]).map(value=><option key={value}>{value}</option>)}</select></label><label className="analysis-check"><input type="checkbox" checked={hvo} onChange={e=>setHvo(e.target.checked)}/>HVO sensitivity on eligible ambient-truck legs</label></div></section>
    <ResultState result={annual}>{data=>{
      const maximum=Math.max(1,...Object.values(data.groups).map(group=>group.baseline_tco2e));
      return <>
        <Metrics items={[
          {label:`Recorded freight · ${year}`,value:`${fmt(data.baseline_tco2e,2)} t`,note:`${fmt(data.included_rows)} included rows of ${fmt(data.input_rows)}`},
          {label:'With selected fuel sensitivity',value:`${fmt(data.scenario_tco2e,2)} t`,note:hvo?'Fixed activity; eligible ambient-truck factor substituted':'No fuel substitution selected'},
          {label:'Estimated annual difference',value:`${fmt(data.difference_tco2e,2)} t`,note:`${fmt(data.excluded_rows)} excluded rows · ${fmt(data.unassignable_rows)} unassignable records`}
        ]}/>
        <section className="card analysis-panel" aria-label="Annual shipment comparison"><h2 className="h-d">All recorded shipments · {year}</h2><p>Baseline and selected sensitivity, in t CO₂e. Category 4 is inbound; category 9 is outbound.</p><div className="analysis-freight-bars">{Object.entries(data.groups).map(([key,group])=><div key={key}><strong>{key.replaceAll('_',' ').replace(':',' · ')}</strong><span>{fmt(group.legs)} legs · {fmt(group.scenario_tco2e,2)} t</span><div className="analysis-bar"><i style={{width:`${group.baseline_tco2e/maximum*100}%`,background:'var(--line-2)'}}/><b style={{width:`${group.scenario_tco2e/maximum*100}%`,background:'var(--pea)'}}/></div></div>)}</div><details><summary>Inspect included shipment rows</summary><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Shipment</th><th>Mode</th><th>Mass × km</th><th>Factor</th><th>Baseline / selected</th></tr></thead><tbody>{data.lines.slice(0,100).map((line,index)=><tr key={index}><td><button className="ev" onClick={async()=>{try{const record=await api.sourceRow(line.source);onTrace?.({title:line.shipment_id,value:fmt(line.scenario_tco2e,4),unit:'t CO₂e',status:'source_context',steps:[{k:'Source',t:line.source.file,id:`row ${line.source.row_number}`,d:line.source.file_sha256},...Object.entries(record.values).map(([k,v])=>({k:'Original value',t:k,id:String(v),d:''})),{k:'Factor',t:line.factor_id,id:`${line.factor_kgco2e_per_tkm} kg/tkm · ${line.factor_version}`,d:`${line.factor_source.file} · row ${line.factor_source.row_number}`} ]});}catch(e){setError(e.message);}}}>{line.shipment_id}</button></td><td>{line.mode}</td><td>{fmt(line.tonnes,3)} t × {fmt(line.kilometres,2)} km</td><td>{line.factor_id}</td><td>{fmt(line.baseline_tco2e,4)} / {fmt(line.scenario_tco2e,4)} t</td></tr>)}</tbody></table></div><p>Showing the first {Math.min(100,data.lines.length)} included rows. Save the assessment to inspect/download its full evidence in Review.</p></details></section>
        <Evidence data={data} onTrace={onTrace}/>
        <button className="btn btn-p" disabled={saving||data.status==='insufficient_data'} onClick={()=>save('annual')}>Save annual freight assessment for review</button>
      </>;
    }}</ResultState>
    <section className="card analysis-panel"><h2 className="h-d">Your route · user-defined estimate</h2><p>Choose locations, enter cargo mass, and inspect the distance assumptions. No prefilled design journeys or verified rail services are assumed.</p><ResultState result={catalog}>{data=><form className="analysis-controls" onSubmit={e=>{e.preventDefault();setEdited(null);setRequest({origin,destination});}}>
      {[['From',origin,setOrigin],['To',destination,setDestination]].map(([label,value,setter])=><label className="lbl" key={label}>{label}<select aria-label={label} required className="field" value={value} onChange={e=>{setter(e.target.value);setRequest(null);setEdited(null);}}><option value="">Choose location</option>{data.places.map(place=><option key={place.id} value={place.id}>{place.name}</option>)}</select></label>)}<label className="lbl">Cargo mass (tonnes)<input className="field" type="number" min="0.001" max="1000000" step="any" value={mass} onChange={e=>setMass(Number(e.target.value))}/></label><button className="btn btn-n" disabled={!origin||!destination||origin===destination||!(mass>0)}>Calculate route</button>
    </form>}</ResultState></section>
    {request&&<ResultState result={lookup}>{route=><>
      <DatasetMap title="Illustrative route · not operational routing" routes={legs.map(leg=>({kind:['ship-bulk','ship-reefer','ropax'].includes(leg.mode)?'sea':'road',points:leg.points.map(([lat,lon])=>({lat,lon}))}))}/>
      <section className="card analysis-panel" aria-label="Route legs"><h2 className="h-d">Route legs</h2><p>Distances use coordinate-based estimates until you replace them with reviewed distances. Rail means freight by train; selecting it here is a user assumption, not confirmation of a railway connection.</p>{legs.map((leg,index)=><div className="analysis-route-leg" key={index}><strong>{leg.origin} → {leg.destination}</strong><label className="lbl">Transport mode<select className="field" value={leg.mode} onChange={e=>setEdited(legs.map((l,i)=>i===index?{...l,mode:e.target.value}:l))}>{catalog.data.modes.map(mode=><option key={mode.id} value={mode.id}>{mode.id.replaceAll('-',' ')} · {mode.factor_kgco2e_per_tkm} kg/tkm</option>)}</select></label><label className="lbl">Distance (km)<input className="field" type="number" min="0.001" max="100000" step="any" value={leg.distance_km} onChange={e=>setEdited(legs.map((l,i)=>i===index?{...l,distance_km:Number(e.target.value),distance_basis:'user_entered_unverified'}:l))}/></label><span>{trip.data?.current.lines[index]?`${fmt(mass,3)} t × ${fmt(leg.distance_km,3)} km × ${trip.data.current.lines[index].factor_kgco2e_per_tkm} = ${fmt(trip.data.current.lines[index].kgco2e,4)} kg CO₂e`:'Enter valid mass and distances to calculate.'}</span></div>)}</section>
      {valid&&<ResultState result={trip}>{output=><><Metrics items={[{label:'Selected route',value:`${fmt(output.current.total_kgco2e,2)} kg CO₂e`,note:'Backend mass × distance × source factor calculation'},{label:'HVO on eligible dry-truck legs',value:`${fmt(output.hvo.total_kgco2e,2)} kg CO₂e`,note:'Other modes, including refrigerated trucks, retain their factors'}]}/><Evidence data={{...output.current,sources:output.current.lines.map(line=>line.factor_source),limitations:[...route.limitations,...output.current.limitations]}} onTrace={onTrace}/><button className="btn btn-p" disabled={saving} onClick={()=>save('route')}>Save assessment for review</button></>}</ResultState>}
    </>}</ResultState>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
