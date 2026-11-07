import React,{useMemo,useRef,useState} from 'react';
import {api} from './api.js';
import {stable} from './result-cache.js';
import {useResult,ResultState,Evidence,SaveAssessment,fmt} from '../components/Analysis.jsx';
import {useScene,useTween,chartModel,inspectRecord} from './ui-data.js';
import OverviewView from '../components/design/OverviewView.jsx';
import PathwaysView from '../components/design/PathwaysView.jsx';

function SourceFooter({children}){return <details className="source-footer"><summary>Sources, assumptions and review</summary>{children}</details>;}
export function Overview(props){
  const {scenario='ssp245',year=2040,onTrace,onNav,onToast}=props;
  const inputs={physical_scenario:scenario,year};
  const result=useResult(`overview:${scenario}:${year}`,async signal=>(await api.preview('overview',inputs,{signal})).output);
  const geography=useResult('geography',signal=>api.geography({signal}));
  const inventory=useResult('inventory:2024:false',signal=>api.inventory(2024,false,{signal}));
  return <ResultState result={result}>{data=><OverviewData data={data} geography={geography.data} history={inventory.data?.history||[]} {...props} pending={result.pending}/>}</ResultState>;
}
function OverviewData({data,geography,history,year=2040,onTrace,onNav,onToast,pending}){
  const [layers,setLayers]=useState({farms:true,sites:true,arcs:true}),[selection,setSelection]=useState(null),[hover,setHover]=useState(null);
  const scene=useMemo(()=>{
    if(!geography)return null;
    const farms=geography.farm_registry.map(point=>({id:point.id,lon:point.lon,lat:point.lat,r:.15,color:point.values.country==='SE'?'#5AA9F0':'#3CCB7F',record:point}));
    const sites=geography.sites.map(point=>({id:point.id,name:point.values.name,lon:point.lon,lat:point.lat,h:3,color:'#3CCB7F',record:point}));
    const arcs=geography.farm_registry.filter((_,index)=>index%Math.max(1,Math.floor(geography.farm_registry.length/12))===0).map((farm,index)=>{
      const candidates=geography.sites.filter(site=>site.values.country===farm.values.country);
      const site=candidates.sort((a,b)=>Math.hypot(a.lon-farm.lon,a.lat-farm.lat)-Math.hypot(b.lon-farm.lon,b.lat-farm.lat))[0];
      return site?{id:`link${index}`,a:[farm.lon,farm.lat],b:[site.lon,site.lat],color:'#5AA9F0',t:'Illustrative registered-location connection',r:`${farm.id} → ${site.values.name}`,farm,site}:null;
    }).filter(Boolean);
    const anchor=geography.sites.find(site=>site.id==='S-SAK')||geography.sites[0];
    const siteLinks=anchor?geography.sites.filter(site=>site.id!==anchor.id).map((site,index)=>({id:`site-link${index}`,a:[anchor.lon,anchor.lat],b:[site.lon,site.lat],color:'#5AA9F0',t:'Schematic site connection, not a recorded shipment',r:`${anchor.values.name} → ${site.values.name}`,farm:anchor,site})):[];
    return {farms,sites,arcs:[...siteLinks,...arcs]};
  },[geography]);
  const {canvasRef,map,failed}=useScene(scene,hit=>setSelection(hit));
  const point=selection?.item?.record;
  const selected=selection?{kind:selection.kind==='arcs'?'Illustrative connection':'Registered source record',title:point?.values.name||point?.id||selection.item?.r||'Location',hasBig:false,rows:point?Object.entries(point.values).filter(([key])=>['country','contract_crops','activity','joined_year','in_group_from','in_group_to'].includes(key)).map(([key,value])=>({k:key.replaceAll('_',' '),v:value||'Not supplied'})):[{k:'Connection',v:'Visual link only; not a shipment record'}],hasGo:true,goLbl:point?'Inspect original source':'Inspect farm source',go:()=>inspectRecord(point||selection.item?.farm,onTrace,onToast)}:null;
  const row=data.pathway.selected_year,base=data.inventory?.total_tco2e;
  const values=useTween({total:base,gap:row?.gap_tco2e,cut:base?100*(base-row?.target_tco2e)/base:null,warming:data.climate.selected?.summer_warming_c});
  const chart=chartModel(data.pathway.series,{width:600,height:240,left:46,right:590,bottom:214,start:2019,max:340000});
  const published=history.filter(row=>Number.isFinite(row.total_tco2e)).map(row=>({year:row.year,value:row.total_tco2e})).sort((a,b)=>a.year-b.year);
  const planned=data.pathway.series.map(row=>({year:row.year,value:row.emissions_tco2e}));
  // Anchor the projected line to the last published year so the two series meet.
  const anchor=published.filter(point=>point.year<planned[0]?.year).at(-1);
  const X=chart.X,Y=chart.Y;
  const model={
    kpis:[{label:`Emissions ${data.inventory?.year||''}`,v:`${fmt(values.total)} t`,w:100,bar:'var(--night)',ink:'var(--ink)',sub:'Published source · tCO₂e',go:()=>onNav('inventory')},{label:`Cut needed by ${year}`,v:`−${fmt(values.cut)} %`,w:values.cut||0,bar:'var(--glacier)',ink:'var(--ink)',sub:'Illustrative target',go:()=>onNav('pathways')},{label:`Gap in ${year}`,v:`${fmt(values.gap)} t`,w:Math.min(100,Math.abs(values.gap||0)/2000),bar:'var(--ember)',ink:'var(--ember-ink)',sub:'After default catalogue actions',go:()=>onNav('pathways')},{label:`Summer warming · ${year}`,v:`${fmt(values.warming,1)} °C`,w:Math.min(100,(values.warming||0)*20),bar:'var(--rape)',ink:'var(--ink)',sub:'Finland · supplied weather exposure',go:()=>onNav('climate')}],
    canvasRef,year,loading:false,labels:(scene?.sites||[]).map(site=>({t:site.name,lon:site.lon,lat:site.lat,h:3.5,op:1,md:0,hs:'site',bg:'rgba(11,26,36,.86)',bd:'var(--night-line)',fw:600,fs:12})),
    layers:[['farms','Farms','#3CCB7F'],['sites','Plants','#3CCB7F'],['arcs','Connections','#5AA9F0']].map(([id,t,c])=>({t,c,on:String(layers[id]),toggle:()=>{map.current?.setLayerVisible(id,!layers[id]);setLayers({...layers,[id]:!layers[id]});}})),
    zin:()=>map.current?.zoomIn(),zout:()=>map.current?.zoomOut(),zreset:()=>{map.current?.reset();setSelection(null);},hasSel:!!selected,sel:selected||{rows:[]},clearSel:()=>setSelection(null),
    gridD:chart.grid,histD:chart.line(published),tgtD:chart.target,planD:chart.line(anchor?[anchor,...planned]:planned),gapD:chart.gap,yTicks:chart.yTicks,xTicks:[2020,2030,2040,2050].map(y=>({label:String(y),left:X(y)/6})),markL:X(year)/6,
    chMove:event=>{const rect=event.currentTarget.getBoundingClientRect();setHover(Math.max(2019,Math.min(2050,Math.round(2019+((event.clientX-rect.left)/rect.width*600-46)/(590-46)*31))));},chLeave:()=>setHover(null),hasHover:hover!=null,
    hov:{y:String(hover),left:X(hover)/6,tipL:Math.min(72,Math.max(2,X(hover)/6+2)),rows:hover<2025?[{k:'Published',v:`${fmt(history.find(r=>r.year===hover)?.total_tco2e)} t`}]:[{k:'With actions',v:`${fmt(data.pathway.series.find(r=>r.year===hover)?.emissions_tco2e)} t`},{k:'Target',v:`${fmt(data.pathway.series.find(r=>r.year===hover)?.target_tco2e)} t`}]},
    todo:[{tag:'Sources',cls:'p-info',title:'Inspect inventory source checks',open:()=>onNav('inventory')},{tag:'Pathway',cls:'p-rev',title:'Explore the supplied action catalogue',open:()=>onNav('pathways')},{tag:'Review',cls:'p-draft',title:'Open assessments and review history',open:()=>onNav('review')}]
  };
  return <><OverviewView model={model}/>{failed&&<p role="status">Map unavailable; source evidence remains accessible.</p>}<p className="context-note">Connections link registered locations for orientation. They are schematic, not recorded shipment routes.</p><SourceFooter><Evidence data={data} onTrace={onTrace} extraSources={[data.inventory?.source,...(geography?.sources||[]),...data.climate.sources,...data.nature.sources]}/><SaveAssessment screen="overview" inputs={{physical_scenario:data.context.physical_scenario,year}} onNav={onNav} onToast={onToast} disabled={pending}/></SourceFooter></>;
}

export function Pathways(props){
  const {scenario='ssp245'}=props;
  const [ids,setIds]=useState(null),[mode,setMode]=useState('manual'),[starts,setStarts]=useState({});
  const canonical={physical_scenario:scenario,year:2040,selection_mode:mode,start_years:starts,...(mode==='manual'&&ids!==null?{action_ids:ids}:{})};
  const result=useResult(`pathways:${stable(canonical)}`,async signal=>(await api.preview('pathways',canonical,{signal})).output);
  return <ResultState result={result}>{data=><PathwayData {...props} data={data} ids={ids} setIds={setIds} setMode={setMode} starts={starts} setStarts={setStarts} mode={mode} canonical={canonical} pending={result.pending}/>}</ResultState>;
}
function PathwayData({data,year=2040,onTrace,onNav,onToast,setIds,setMode,starts,setStarts,mode,canonical,pending}){
  const [hover,setHover]=useState(null),tracks=useRef({}),drag=useRef(null);
  const series=data.series||[],row=series.find(row=>row.year===year),at2030=series.find(row=>row.year===2030),base=data.baseline?.total_tco2e||0;
  const vals=useTween({ab:at2030?.adjusted_abatement_tco2e,gap:row?.gap_tco2e,capex:data.costs?.upfront_capex_eur/1e6,opex:(row?.annual_opex_delta_eur??data.costs?.annual_opex_delta_eur)/1e6});
  const chart=chartModel(series),selected=data.selection?.action_ids||[];
  const toggle=id=>{setIds(selected.includes(id)?selected.filter(v=>v!==id):[...selected,id]);setMode('manual');};
  const setStart=(action,year)=>setStarts(previous=>({...previous,[action.lever_id]:Math.max(action.earliest_start,Math.min(2039,Math.round(year)))}));
  const groups=['Plants','Farms and sourcing','Products and logistics'].map((name,index)=>({name,items:(data.macc||[]).filter(action=>(['scope1','scope2'].includes(action.scope)?0:action.scope?.includes('cat1')||action.flag===true||action.flag==='True'?1:2)===index).sort((a,b)=>a.lever_id.localeCompare(b.lever_id)).map(action=>{
    const id=action.lever_id,on=action.selected,start=starts[id]??action.planned_start??action.earliest_start;
    return {id,name:action.name,conf:`${action.confidence||'unrated'} · catalogue`,on:String(on),aria:`${on?'Turn off':'Turn on'} ${action.name}`,disabled:!action.selectable||pending,toggle:()=>toggle(id),bg:on?'#F3FBF6':'transparent',ink:on?'var(--ink)':'var(--muted)',a:fmt(action.abatement_tco2e_2030_design),cost:fmt(action.indicative_cost_eur_per_tco2e),costInk:action.indicative_cost_eur_per_tco2e<0?'var(--pea-ink)':'var(--muted)',x:(start-2025)/15*100,start:String(start),rampPct:Math.min(100,action.ramp_years/(2040-start)*100),c0:on?'rgba(60,203,127,.25)':'rgba(86,102,111,.12)',c1:on?'#3CCB7F':'#C9D3D1',barInk:on?'#052A18':'var(--muted)',
      dragLbl:`${action.name} starts ${start}. Drag or use arrow keys.`,trackRef:node=>{if(node)tracks.current[id]=node;},down:event=>{drag.current={id,x:event.clientX,start,width:tracks.current[id].getBoundingClientRect().width};event.currentTarget.setPointerCapture(event.pointerId);},move:event=>{const d=drag.current;if(d?.id===id)setStart(action,d.start+(event.clientX-d.x)/d.width*15);},up:()=>{drag.current=null;},key:event=>{if(['ArrowRight','ArrowLeft'].includes(event.key)){event.preventDefault();setStart(action,start+(event.key==='ArrowRight'?1:-1));}},info:()=>inspectRecord(action.source,onTrace,onToast)};
  })}));
  const model={n:{ab:fmt(vals.ab),gap:fmt(Number.isFinite(vals.gap)?Math.abs(vals.gap):null),capex:fmt(vals.capex,1),opex:fmt(vals.opex,2)},abW:Math.min(100,(vals.ab||0)/50000*100),needW:(data.selection?.minimum_2030_reduction_tco2e||0)/50000*100,needLabel:fmt(data.selection?.minimum_2030_reduction_tco2e),abCol:(vals.ab||0)>=(data.selection?.minimum_2030_reduction_tco2e??Infinity)?'var(--pea)':'var(--rape)',gapLbl:`${(vals.gap||0)>0?'Gap':'Ahead'} in ${year}`,gapInk:(vals.gap||0)>0?'var(--ember-ink)':'var(--pea-ink)',gridD:chart.grid,lineD:chart.selected,areaD:chart.area,gapD:chart.gap,tgtD:chart.target,bauD:chart.line([{year:2025,value:base},{year:2050,value:base}]),yT:chart.yTicks,xT:chart.xTicks,markL:chart.X(year)/9,chartAria:'Emissions with selected actions against the target, 2025 to 2050',chMove:event=>{const r=event.currentTarget.getBoundingClientRect();setHover(Math.max(2025,Math.min(2050,Math.round(2025+((event.clientX-r.left)/r.width*900-50)/840*25))));},chLeave:()=>setHover(null),hasHover:hover!=null,hov:{y:String(hover),left:chart.X(hover)/9,tipL:Math.min(76,Math.max(2,chart.X(hover)/9+1.5)),rows:[{k:'With actions',v:`${fmt(series.find(r=>r.year===hover)?.emissions_tco2e)} t`},{k:'Target',v:`${fmt(series.find(r=>r.year===hover)?.target_tco2e)} t`}]},groups,actionCount:data.macc?.length||0,onCount:String(selected.length),cheapest:()=>{setIds(null);setMode('cheapest');},allOn:()=>{setIds(null);setMode('all');},allOff:()=>{setIds([]);setMode('manual');},trLev:()=>inspectRecord(data.macc?.[0]?.source,onTrace,onToast)};
  return <><PathwaysView model={model}/><p className="context-note">Annual savings level off after implementation. Known overlaps and scope limits are applied by the backend; adding the same annual savings again would double-count reductions.</p><SourceFooter><Evidence data={data} onTrace={onTrace} extraSources={[data.baseline?.source,...(data.macc?.[0]?.source?[Object.fromEntries(Object.entries(data.macc[0].source).filter(([key])=>!['row_number','record_id'].includes(key)))]:[])]}/><SaveAssessment screen="pathways" inputs={{...canonical,year}} onNav={onNav} onToast={onToast} disabled={pending}/></SourceFooter></>;
}
