import React,{useState} from 'react';
import {api} from './api.js';
import {useResult,ResultState,Evidence,SaveAssessment,fmt,signed,scenarioName} from '../components/Analysis.jsx';

const modes={warming:{label:'Summer warming',key:'summer_warming_c',unit:'°C',note:'June–August temperature relative to 1991–2020'},heat:{label:'Hot days',key:'seasonal_hot_days',unit:'days',note:'Growing-season days with maximum temperature ≥27 °C'},water:{label:'Water deficit',key:'water_deficit_mm',unit:'mm',note:'Growing-season PET minus precipitation; exposure, not measured water availability'}};
const colors={ssp126:'#3CCB7F',ssp245:'#D9A400',ssp585:'#EF6A3A'};
const scenarios=['ssp126','ssp245','ssp585'];
export default function Climate(props){
  const [crop,setCrop]=useState('pea_fi');
  const result=useResult(`climate:${crop}`,async signal=>(await api.preview('climate',{crop_id:crop,physical_scenario:'ssp245',year:2040},{signal})).output);
  const catalog=useResult('catalog',signal=>api.datasetRequest('catalog',{signal}));
  return <div className="climate-screen"><section className="card climate-crops"><div role="group" aria-label="Crop">{Object.entries(catalog.data?.crops||{}).map(([id,definition])=><button className="chipbtn" key={id} aria-pressed={id===crop} onClick={()=>setCrop(id)}>{definition.label}</button>)}</div></section><ResultState result={result}>{data=><ClimateData {...props} data={data} pending={result.pending} crop={crop}/>}</ResultState></div>;
}
function ClimateData({data,scenario='ssp245',year=2040,crop,pending,onTrace,onNav,onToast}){
  const [metric,setMetric]=useState('warming'),[hover,setHover]=useState(null),[visible,setVisible]=useState(scenarios);
  const spec=modes[metric],selected=data.timeline.find(point=>point.scenario===scenario&&point.year===year)?.values;
  const years=[...new Set(data.timeline.map(point=>point.year))].sort((a,b)=>a-b),start=years[0],end=years.at(-1);
  const points=scenarios.map(id=>({id,values:data.timeline.filter(point=>point.scenario===id).map(point=>({year:point.year,value:point.values?.[spec.key]??null}))}));
  const known=points.filter(line=>visible.includes(line.id)).flatMap(line=>line.values.map(p=>p.value).filter(Number.isFinite));
  const low=Math.min(0,...known),high=Math.max(metric==='warming'?1:10,...known),padding=(high-low)*.12||1,yMin=low-padding*.2,yMax=high+padding;
  const X=value=>64+(value-start)/(end-start)*810,Y=value=>270-(value-yMin)/(yMax-yMin)*242;
  const path=values=>{let previous=null;return values.map(point=>{if(!Number.isFinite(point.value)){previous=null;return '';}const x=X(point.year),y=Y(point.value);const segment=previous?`C${previous.x+(x-previous.x)*.45} ${previous.y} ${x-(x-previous.x)*.45} ${y} ${x} ${y}`:`M${x} ${y}`;previous={x,y};return segment;}).join(' ');};
  const active=hover??year,activeRows=scenarios.map(id=>({id,value:data.timeline.find(point=>point.scenario===id&&point.year===active)?.values?.[spec.key]}));
  const selectedPoints=points.find(line=>line.id===scenario)?.values||[];
  const area=selectedPoints.some(point=>Number.isFinite(point.value))?path(selectedPoints)+` L${X(end)} ${Y(yMin)} L${X(start)} ${Y(yMin)} Z`:'';
  const move=event=>{const box=event.currentTarget.getBoundingClientRect();setHover(Math.max(start,Math.min(end,Math.round(start+((event.clientX-box.left)/box.width*900-64)/810*(end-start)))));};
  const price=data.price_context;
  const sourceData={...data,year,physical_scenario:scenario,selected,sources:data.sources.map(source=>({...source,filters:source.filters?{...source.filters,selected_year:year}:undefined}))};
  return <>
    <div className="climate-kpis">{[
      ['Summer warming',`${signed(selected?.summer_warming_c)} °C`,'vs the 1991–2020 baseline','warming'],
      ['Hot days',fmt(selected?.seasonal_hot_days,1),'growing-season days ≥27 °C','heat'],
      ['Water deficit',`${fmt(selected?.water_deficit_mm)} mm`,'seasonal PET minus precipitation','water'],
      ['Contract price',price?`€${fmt(Number(price.values.contract_price_eur_t))}/t`:'Unavailable',`supplied ${price?.values.year||''} price · not a forecast`,null]
    ].map(([label,value,note,key],index)=><button key={label} className={`card lift rise climate-kpi ${metric===key?'selected':''}`} style={{'--i':index}} onClick={()=>key&&setMetric(key)} aria-pressed={key?metric===key:undefined} disabled={!key}><span>{label} · {key?year:'source context'}</span><strong className="num">{value}</strong><small>{note}</small></button>)}</div>
    <section className="card climate-chart rise" aria-label="Climate exposure comparison" style={{'--i':4}}>
      <div className="climate-chart-heading"><div><h2 className="h-d">{spec.label} · {data.crop.label}</h2><p>{spec.note}</p></div><div className="seg climate-metric" role="group" aria-label="Exposure metric">{Object.entries(modes).map(([id,value])=><button key={id} aria-pressed={metric===id} onClick={()=>setMetric(id)}>{value.label}</button>)}</div></div>
      <div className="climate-legend" role="group" aria-label="Visible climate scenarios">{scenarios.map(id=><button key={id} aria-pressed={visible.includes(id)} onClick={()=>setVisible(list=>list.includes(id)?list.length>1?list.filter(value=>value!==id):list:[...list,id])}><i style={{background:colors[id]}}/>{scenarioName[id]}<span>{id===scenario?'Selected scenario':''}</span></button>)}</div>
      <div className="climate-plot" tabIndex="0" role="group" aria-label={`${spec.label} chart. Use left and right arrows to inspect years.`} onPointerMove={move} onPointerLeave={()=>setHover(null)} onKeyDown={event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();setHover(Math.max(start,Math.min(end,active+(event.key==='ArrowRight'?1:-1))));}if(event.key==='Escape')setHover(null);}}>
        <svg viewBox="0 0 900 300" preserveAspectRatio="none" role="img" aria-label={`${spec.label} under three supplied climate scenarios`}><defs><linearGradient id="climate-exposure-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colors[scenario]} stopOpacity=".18"/><stop offset="100%" stopColor={colors[scenario]} stopOpacity=".015"/></linearGradient></defs>{[0,.25,.5,.75,1].map(f=><path key={f} d={`M64 ${Y(yMin+(yMax-yMin)*f)}H874`} stroke="var(--line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke"/>)}<path d={area} fill="url(#climate-exposure-fill)"/>{points.filter(line=>visible.includes(line.id)).map(line=><path key={line.id} d={path(line.values)} fill="none" stroke={colors[line.id]} strokeWidth={line.id===scenario?3.5:2.25} opacity={line.id===scenario?1:.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}<path d={`M${X(active)} 14V270`} stroke="var(--ink-2)" strokeWidth="1.25" strokeDasharray={hover==null?'5 4':''} vectorEffect="non-scaling-stroke"/>{activeRows.filter(row=>visible.includes(row.id)&&Number.isFinite(row.value)).map(row=><circle key={row.id} cx={X(active)} cy={Y(row.value)} r="4.5" fill={colors[row.id]} stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}</svg>
        {[0,.25,.5,.75,1].map(f=><span className="climate-y mono" key={f} style={{top:`${Y(yMin+(yMax-yMin)*f)/3}%`}}>{fmt(yMin+(yMax-yMin)*f,metric==='warming'?1:0)}</span>)}
        {[start,2035,2045,end].map(value=><span className="climate-x mono" key={value} style={{left:`${X(value)/9}%`}}>{value}</span>)}
        <span className="climate-axis-unit">{spec.unit}</span>
        <div className="climate-readout" style={{left:active>2044?'10%':undefined,right:active>2044?'auto':'3%'}}><strong className="num">{active}</strong>{activeRows.filter(row=>visible.includes(row.id)).map(row=><div key={row.id}><span><i style={{background:colors[row.id]}}/>{scenarioName[row.id]}</span><b className="num">{fmt(row.value,metric==='warming'?2:1)} {spec.unit}</b></div>)}</div>
      </div>
      <div className="climate-chart-footer"><span>Point, tap or use arrow keys to inspect a year. Click a legend item to hide a scenario.</span><span>{data.coverage.expected_region_cells} regional cells · annual exposure</span></div>
    </section>
    <p className="context-note">{data.coverage.expected_region_cells} source grid cells · {selected?.baseline_cell_years_included||0} historical baseline cell-years. These are weather exposure indicators, not yield-loss predictions or confidence intervals.</p>
    <details className="source-footer"><summary>Sources, coverage and review</summary><Evidence data={sourceData} onTrace={onTrace} extraSources={[price?.source]}/><SaveAssessment screen="climate" inputs={{physical_scenario:scenario,year,crop_id:crop}} onNav={onNav} onToast={onToast} disabled={pending}/></details>
  </>;
}
