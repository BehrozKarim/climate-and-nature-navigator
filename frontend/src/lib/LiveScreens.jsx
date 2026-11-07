import React,{useState} from 'react';
import {api} from './api.js';
import {useResult,ResultState,Metrics,Evidence,DatasetMap,fmt,SaveAssessment} from '../components/Analysis.jsx';

export function Nature({onTrace,onNav,onToast}) {
  const [year,setYear]=useState(2025),[region,setRegion]=useState('all'),[selection,setSelection]=useState(null);
  const inputs={year};
  const geography=useResult(`nature-geography-${year}`,signal=>api.geography({signal,year,includeParcels:true}));
  const result=useResult(`nature:${year}`,async signal=>(await api.preview('nature',inputs,{signal})).output);
  return <div className="analysis-screen"><section className="card analysis-controls"><label className="lbl">Contract parcel-plan year<select aria-label="Contract parcel-plan year" className="field" value={year} onChange={e=>setYear(Number(e.target.value))}>{(geography.data?.parcel_plan_years||[year]).map(value=><option key={value}>{value}</option>)}</select></label></section><ResultState result={result}>{data=>{
    const rows=data.catchments.filter(row=>region==='all'||row.region===region);
    const allById=new Map(data.catchments.map(row=>[row.catchment_id,row]));
    const points=(geography.data?.parcels||[]).filter(p=>allById.has(p.values.catchment_id)&&(region==='all'||allById.get(p.values.catchment_id).region===region)).map(p=>({...p,color:({good:'#3CCB7F',moderate:'#F2C230',poor:'#EF6A3A',bad:'#B3261E'})[allById.get(p.values.catchment_id).ecological_status]||'#9DB2C1'}));
    const chosen=rows.find(row=>row.catchment_id===selection);
    return <>
      <Metrics items={[
        {label:`Contract parcel area · ${data.year}`,value:`${fmt(data.contract_area_ha)} ha`,note:`${fmt(data.coverage.matched_parcels)} matched parcels of ${fmt(data.coverage.selected_parcels)} selected`},
        {label:'Catchments with registered parcels',value:fmt(data.catchments.filter(row=>row.contract_area_ha>0).length),note:'Selected-year contract sourcing context'},
        {label:'Poor / bad ecological state',value:fmt(data.catchments.filter(row=>['poor','bad'].includes(row.ecological_status)).length),note:'Source-reported ecological classes; not attributed company impact'}
      ]}/>
      <section className="card analysis-controls"><label className="lbl">Catchment region<select aria-label="Catchment region" className="field" value={region} onChange={e=>{setRegion(e.target.value);setSelection(null);}}><option value="all">All supplied regions</option>{[...new Set(data.catchments.map(row=>row.region))].map(value=><option key={value}>{value}</option>)}</select></label><span>Totals cover all supplied regions; the map and table follow the region filter.</span></section>
      {geography.error?<section className="card analysis-panel"><p role="alert">Map source unavailable: {geography.error}</p><button className="btn" onClick={geography.retry}>Retry map data</button></section>:<DatasetMap points={points} title="Registered parcel locations · ecological context" onTrace={onTrace}/>}
      <section className="card analysis-panel"><h2 className="h-d">Catchment source context</h2><p>Parcel points show registered locations, not catchment boundaries. Attributed nutrient loads, mitigation effects and priority scores are unavailable without a calibrated model. Monitored outlet loads remain inspectable context and include other land and natural background.</p><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Catchment</th><th>Ecological state</th><th>Contract area</th><th>Contract parcels</th><th>Source P sensitivity</th></tr></thead><tbody>{rows.map(row=><tr key={row.catchment_id}><td><button className="ev" onClick={()=>setSelection(row.catchment_id)}>{row.catchment_id}</button></td><td>{row.ecological_status}</td><td>{fmt(row.contract_area_ha)} ha</td><td>{fmt(row.parcel_count)}</td><td>{row.p_sensitivity||'Unavailable'}</td></tr>)}</tbody></table></div></section>
      {chosen&&<section className="card analysis-panel" aria-label="Catchment evidence"><h2 className="h-d">{chosen.catchment_id} · source context</h2><p>{chosen.parcel_count} selected parcels · {chosen.parcels_missing_soil_p_test} without a soil P test</p><p>Monitored context: {chosen.monitoring_context.length} supplied records. These are not company-attributed loads.</p><Evidence data={{sources:[chosen.source,...chosen.monitoring_context.map(record=>record.source)]}} onTrace={onTrace}/></section>}
      <section className="card analysis-panel"><h2 className="h-d">Indicative import-origin context</h2><p>Supplied country/commodity indicators, not supplier-level impact or a validated sourcing recommendation.</p><div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Country / commodity</th><th>Water stress</th><th>Conversion risk</th><th>Biodiversity sensitivity</th><th>Freshwater state</th></tr></thead><tbody>{(data.origins||[]).map((record,index)=><tr key={index}><td>{record.values.origin_country} · {record.values.commodity}</td><td>{record.values.baseline_water_stress_cat_indicative||'Unavailable'}</td><td>{record.values.deforestation_conversion_risk_indicative||'Unavailable'}</td><td>{record.values.biodiversity_sensitivity_indicative||'Unavailable'}</td><td>{record.values.freshwater_nutrient_status_indicative||'Unavailable'}</td></tr>)}</tbody></table></div></section>
      <Evidence data={data} onTrace={onTrace}/>
      <SaveAssessment screen="nature" inputs={inputs} onNav={onNav} onToast={onToast} disabled={data.contract_area_ha==null}/>
    </>;
  }}</ResultState></div>;
}
