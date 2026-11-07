import React, {useState} from 'react';
import {api} from './api.js';
import {useResult,ResultState,Metrics,Evidence,LineChart,DatasetMap,fmt,signed,scenarioName,SaveAssessment} from '../components/Analysis.jsx';

export function Overview({scenario='ssp245',year=2040,onTrace,onNav,onToast}) {
  const inputs={physical_scenario:scenario,year};
  const result=useResult(JSON.stringify(inputs),async signal=>{
    const [response,geography,inventory]=await Promise.all([api.preview('overview',inputs,{signal}),api.geography({signal}),api.inventory(2024,false,{signal})]);
    return {...response.output,geography,history:inventory.history,issues:[...(response.output.issues||[]),...geography.issues],limitations:[...response.output.limitations,...geography.limitations]};
  });
  return <ResultState result={result}>{data=>{
    const row=data.pathway.selected_year, baseline=data.inventory, selected=data.climate.selected;
    const points=[...data.geography.farm_registry,...data.geography.sites.map(p=>({...p,color:'#5AA9F0'}))];
    return <div className="analysis-screen">
      <Metrics items={[
        {label:`Reported emissions · ${baseline?.year||'unavailable'}`,value:`${fmt(baseline?.total_tco2e)} t`,note:'Published source context · not a reconstructed inventory'},
        {label:`Pathway gap · ${year}`,value:`${fmt(row?.gap_tco2e)} t`,note:'Default catalogue portfolio versus illustrative target'},
        {label:`Summer warming · ${year}`,value:`${fmt(selected?.summer_warming_c,1)} °C`,note:'Finnish source grid · relative to the historical baseline'},
        {label:`Contract nature context · ${data.nature.source_year||'unavailable'}`,value:`${fmt(data.nature.contract_area_ha)} ha`,note:`${fmt(data.nature.poor_or_bad_catchments)} catchments in poor/bad ecological state`}
      ]}/>
      <DatasetMap points={points} title="Registered farms and sites" onTrace={onTrace}/>
      <LineChart title="Reported history and modelled pathway" gap series={[
        {id:'history',name:'Published history',color:'var(--ink)',points:data.history.map(r=>({year:r.year,value:r.total_tco2e}))},
        {id:'target',name:'Illustrative target',color:'var(--ink-2)',dash:'5 4',points:(data.pathway.series||[]).map(r=>({year:r.year,value:r.target_tco2e}))},
        {id:'actions',name:'Default catalogue actions',color:'var(--pea)',points:(data.pathway.series||[]).map(r=>({year:r.year,value:r.emissions_tco2e}))}
      ]}/>
      <section className="card analysis-panel"><h2 className="h-d">Needs attention</h2><p>{fmt(data.attention.unresolved_findings)} unresolved source findings · {fmt(data.attention.numerical_blockers)} numerical blockers</p><div className="analysis-actions"><button className="btn" onClick={()=>onNav('inventory')}>Inspect emissions</button><button className="btn" onClick={()=>onNav('pathways')}>Explore actions</button><button className="btn" onClick={()=>onNav('review')}>Open review queue</button></div></section>
      <Evidence data={data} onTrace={onTrace} extraSources={[baseline?.source,...data.geography.sources,...data.climate.sources,...data.nature.sources]}/>
      <Evidence data={data.pathway} onTrace={onTrace} extraSources={[data.pathway.baseline?.source]}/>
      <SaveAssessment screen="overview" inputs={inputs} onNav={onNav} onToast={onToast}/>
    </div>;
  }}</ResultState>;
}

export function Pathways({scenario='ssp245',year=2040,onTrace,onNav,onToast}) {
  const [ids,setIds]=useState(null),[mode,setMode]=useState('manual'),[starts,setStarts]=useState({});
  const inputs={physical_scenario:scenario,year,selection_mode:mode,start_years:starts,...(mode==='manual'&&ids!==null?{action_ids:ids}:{})};
  const result=useResult(JSON.stringify(inputs),async signal=>(await api.preview('pathways',inputs,{signal})).output);
  return <div className="analysis-screen"><ResultState result={result}>{data=>{
    const row=data.selected_year,at2030=data.series?.find(r=>r.year===2030),base=data.baseline?.total_tco2e;
    const selected=data.selection?.action_ids||[];
    const toggle=id=>{setIds(selected.includes(id)?selected.filter(i=>i!==id):[...selected,id]);setMode('manual');};
    const adjusted=row?.adjusted_abatement_tco2e, gross=row?.gross_catalogue_abatement_tco2e;
    return <>
      <Metrics items={[
        {label:'Annual cut by 2030',value:`${fmt(at2030?.adjusted_abatement_tco2e)} t`,note:`Required by illustrative target: ${fmt(data.selection?.minimum_2030_reduction_tco2e)} t`},
        {label:`Remaining gap · ${year}`,value:`${fmt(row?.gap_tco2e)} t`,note:'Negative means below the illustrative target'},
        {label:'Upfront capital',value:`€${fmt(data.costs?.upfront_capex_eur)}`,note:'Catalogue programme cost · not a project quote'},
        {label:`Annual operating change · ${year}`,value:`€${signed(data.costs?.annual_opex_delta_eur,0)}`,note:'Negative is an annual saving'}
      ]}/>
      <LineChart title="Emissions 2025–2050" gap series={[
        {id:'baseline',name:'Fixed-activity baseline',color:'var(--muted)',dash:'2 4',points:(data.series||[]).map(r=>({year:r.year,value:base}))},
        {id:'target',name:'Illustrative target',color:'var(--ink)',dash:'5 4',points:(data.series||[]).map(r=>({year:r.year,value:r.target_tco2e}))},
        {id:'actions',name:'With selected actions',color:'var(--pea)',points:(data.series||[]).map(r=>({year:r.year,value:r.emissions_tco2e}))}
      ]}/>
      <section className="card analysis-panel" aria-label="Pathway model explanation"><h2 className="h-d">Why the line can level off</h2><p>Each action reaches a fixed annual effect after its implementation ramp. With fixed activity and no new measures, annual emissions then stay level. A continuing decline requires more supported physical actions or a different evidenced activity model.</p><p>At {year}: catalogue sum {fmt(gross)} t; adjusted annual reduction {fmt(adjusted)} t. Known overlaps are counted conservatively, data-only/structural actions do not create physical cuts, and reductions cannot exceed the relevant scope.</p><p>Continued operation and recurring measures are assumed after ramp-up; the catalogue does not establish a verified replacement or lifetime schedule. The target curve is a model assumption, not validated SBTi compliance.</p></section>
      <section className="card analysis-panel" aria-label="Action catalogue"><div className="analysis-chart-heading"><h2 className="h-d">Action catalogue · {data.macc?.length||0} supplied actions</h2><div className="analysis-actions"><button className="btn" onClick={()=>{setIds(null);setMode('cheapest');}}>Select cheapest for 2030</button><button className="btn" onClick={()=>{setIds(null);setMode('all');}}>Select all available</button><button className="btn" onClick={()=>{setIds([]);setMode('manual');}}>Clear actions</button></div></div>
        <div className="analysis-table-wrap"><table className="analysis-table"><thead><tr><th>Action</th><th>Scope / effect</th><th>Catalogue reduction</th><th>Cost per tonne</th><th>Start / ramp</th><th>Evidence</th></tr></thead><tbody>{(data.macc||[]).map(action=><tr key={action.lever_id}><td><label className="analysis-check"><input type="checkbox" checked={action.selected} disabled={!action.selectable} onChange={()=>toggle(action.lever_id)}/><span>{action.name}<small>{action.lever_id}{!action.selectable?` · unavailable: ${action.missing_fields.join(', ')}`:''}</small></span></label></td><td>{action.scope}<small>{action.physical_abatement?'Physical measure':'Data / structural context; no physical cut'}</small></td><td>{fmt(action.abatement_tco2e_2030_design)} t<small>Supplied design estimate</small></td><td>€{fmt(action.indicative_cost_eur_per_tco2e)}</td><td><label className="lbl">Start year<input className="field" type="number" min={action.earliest_start??2025} max="2050" value={starts[action.lever_id]??action.planned_start??''} disabled={!action.selectable} onChange={e=>{const value=Number(e.target.value);if(Number.isInteger(value)&&value>=action.earliest_start&&value<=2050)setStarts({...starts,[action.lever_id]:value});}}/></label><small>{fmt(action.ramp_years)} years to full effect</small></td><td><button className="ev" onClick={()=>onTrace?.({title:action.name,value:fmt(action.abatement_tco2e_2030_design),unit:'t CO₂e catalogue estimate',status:'source_context',note:action.value_status,steps:[{k:'Source',t:action.source.file,id:`${action.lever_id} · row ${action.source.row_number}`,d:action.source.file_sha256},{k:'Catalogue',t:'Trade-offs / co-benefits',id:action.trade_offs||'Not supplied',d:action.co_benefits||''}]})}>Source row {action.source.row_number}</button></td></tr>)}</tbody></table></div>
      </section>
      <Evidence data={data} onTrace={onTrace} extraSources={[data.baseline?.source,...(data.scenario?.sources||[])]}/>
      <SaveAssessment screen="pathways" inputs={inputs} onNav={onNav} onToast={onToast} disabled={!row}/>
    </>;
  }}</ResultState></div>;
}

export function Climate({scenario='ssp245',year=2040,onTrace,onNav,onToast}) {
  const [crop,setCrop]=useState('pea_fi');
  const inputs={physical_scenario:scenario,year,crop_id:crop};
  const result=useResult(JSON.stringify(inputs),async signal=>(await api.preview('climate',inputs,{signal})).output);
  const catalog=useResult('climate-catalog',signal=>api.datasetRequest('catalog',{signal}));
  return <div className="analysis-screen"><section className="card analysis-controls"><div role="group" aria-label="Crop">{Object.entries(catalog.data?.crops||{}).map(([id,definition])=><button key={id} className="chipbtn" aria-pressed={id===crop} onClick={()=>setCrop(id)}>{definition.label}</button>)}</div>{catalog.error&&<p role="alert">{catalog.error}<button className="btn" onClick={catalog.retry}>Retry crop catalogue</button></p>}</section><ResultState result={result}>{data=>{
    const selected=data.selected, price=data.price_context;
    return <>
      <Metrics items={[
        {label:'Summer warming',value:`${signed(selected?.summer_warming_c)} °C`,note:'Compared with the supplied historical baseline'},
        {label:'Seasonal hot days',value:fmt(selected?.seasonal_hot_days,1),note:'Source-defined growing-season days ≥27 °C'},
        {label:'Water deficit exposure',value:`${fmt(selected?.water_deficit_mm)} mm`,note:'PET minus precipitation; not measured water availability'},
        {label:'Supplied contract price',value:price?`€${fmt(Number(price.values.contract_price_eur_t))}/t`:'Unavailable',note:`Source year ${price?.values?.year||'unavailable'} · not a future-price forecast`}
      ]}/>
      <LineChart title="Summer warming across supplied climate scenarios" unit="°C" series={['ssp126','ssp245','ssp585'].map((id,index)=>({id,name:scenarioName[id],color:['var(--pea)','var(--rape)','var(--ember)'][index],points:data.timeline.filter(point=>point.scenario===id).map(point=>({year:point.year,value:point.values?.summer_warming_c??null}))}))}/>
      <DatasetMap points={data.grid_cells.map(point=>({id:point.cell_id,lon:point.lon,lat:point.lat,source:point.source,values:{...point.climate_filter,summer_warming_c:point.summer_warming_c,yield_change_pct_estimate:point.yield_change_pct_estimate},color:point.summer_warming_c>2?'#EF6A3A':'#5AA9F0'}))} title="Source climate grid cells" onTrace={onTrace}/>
      <section className="card analysis-panel"><h2 className="h-d">Coverage and interpretation</h2><p>{fmt(data.coverage.included_region_cells)} of {fmt(data.coverage.expected_region_cells)} regional cells · {fmt(data.coverage.included_baseline_cell_years)} of {fmt(data.coverage.expected_baseline_cell_years)} historical baseline cell-years.</p><p>This backend computes exposure from supplied monthly weather. Yield forecasts, replacement-loss estimates, model accuracy, confidence bands and irrigation benefits are unavailable until a supported crop model is fitted and validated; design-reference coefficients are no longer used.</p><p>Finnish summer warming: {signed(data.sourcing_hedge.FI_SW?.summer_warming_c)} C; Swedish summer warming: {signed(data.sourcing_hedge.SE_SKANE?.summer_warming_c)} C.</p></section>
      <Evidence data={data} onTrace={onTrace} extraSources={[price?.source]}/>
      <SaveAssessment screen="climate" inputs={inputs} onNav={onNav} onToast={onToast} disabled={!selected}/>
    </>;
  }}</ResultState></div>;
}

export function Nature({onTrace,onNav,onToast}) {
  const [year,setYear]=useState(2025),[region,setRegion]=useState('all'),[selection,setSelection]=useState(null);
  const inputs={year};
  const geography=useResult(`nature-geography-${year}`,signal=>api.geography({signal,year,includeParcels:true}));
  const result=useResult(JSON.stringify(inputs),async signal=>(await api.preview('nature',inputs,{signal})).output);
  return <div className="analysis-screen"><section className="card analysis-controls"><label className="lbl">Contract parcel-plan year<select aria-label="Contract parcel-plan year" className="field" value={year} onChange={e=>setYear(Number(e.target.value))}>{(geography.data?.parcel_plan_years||[year]).map(value=><option key={value}>{value}</option>)}</select></label></section><ResultState result={result}>{data=>{
    const rows=data.catchments.filter(row=>region==='all'||row.region===region);
    const allById=new Map(data.catchments.map(row=>[row.catchment_id,row]));
    const points=(geography.data?.parcels||[]).filter(p=>allById.has(p.values.catchment_id)&&(region==='all'||allById.get(p.values.catchment_id).region===region)).map(p=>({...p,color:({good:'#3CCB7F',moderate:'#F2C230',poor:'#EF6A3A',bad:'#B3261E'})[allById.get(p.values.catchment_id).ecological_status]||'#9DB2C1'}));
    const chosen=rows.find(row=>row.catchment_id===selection);
    return <>
      <Metrics items={[
        {label:`Contract parcel area · ${year}`,value:`${fmt(data.contract_area_ha)} ha`,note:`${fmt(data.coverage.matched_parcels)} matched parcels of ${fmt(data.coverage.selected_parcels)} selected`},
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
