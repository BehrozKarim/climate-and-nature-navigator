import React from 'react';
import {sourceTrace} from '../lib/api.js';

const modeNames = {'truck':'Dry truck','truck-reefer':'Refrigerated truck','truck-hvo':'Truck · HVO100','rail':'Rail','ship-bulk':'Bulk ship','ship-reefer':'Refrigerated ship','ropax':'Ferry'};
const kinds = {run:'Saved assessment',quality_finding:'Data quality check',structural_event:'Boundary change',published_inventory:'Published inventory'};
const fieldNames = {scope1:'Scope 1',scope2_market:'Scope 2 · market-based',scope3:'Scope 3',scope3_restated:'Scope 3 · restated',tco2e:'Reported emissions (t CO₂e)',ef_id:'Factor ID'};
export const fieldLabel = key => fieldNames[key] || key.replaceAll('_',' ').replace(/^./,letter => letter.toUpperCase());
export const reviewKind = review => kinds[review.target_type] || fieldLabel(review.target_type);
const numeric = value => !['number','string'].includes(typeof value) || typeof value === 'string' && !value.trim() ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const fmt = (value,digits=4) => numeric(value) == null ? 'Unavailable' : Number(value).toLocaleString('en-GB',{maximumFractionDigits:digits});
const inputsOf = (review,bundle) => bundle?.run?.inputs || review.lineage?.find(node => node.kind === 'calculation')?.inputs || {};
const routeOf = (review,bundle) => bundle?.run?.output?.lines?.filter(line => line.origin && line.destination) || inputsOf(review,bundle).legs || [];

export function reviewTitle(review,bundle) {
  const legs = routeOf(review,bundle);
  if (legs.length && legs[0].origin && legs.at(-1).destination) return `${legs[0].origin} → ${legs.at(-1).destination} · freight assessment`;
  return {'navigator_trip calculation':'Freight assessment','navigator_freight calculation':'Freight inventory assessment','navigator_climate calculation':'Climate risk assessment','navigator_nature calculation':'Nature impact assessment','navigator_pathways calculation':'Decarbonisation pathway assessment','navigator_overview calculation':'Scenario assessment'}[review.title] || review.title;
}
export function reviewQueueLabel(review) {
  const inputs = inputsOf(review);
  return numeric(inputs.mass_t) != null ? `${fmt(inputs.mass_t)} t · ${reviewKind(review)}` : reviewKind(review);
}
export function reviewPresentation(review,bundle,records=[]) {
  const output = bundle?.run?.output, inputs = inputsOf(review,bundle), legs = routeOf(review,bundle);
  let summary = review.blocking_reasons.join(' ') || 'Inspect the source evidence below before recording your decision.';
  let value = review.status === 'blocked' ? 'Blocked' : bundle ? 'Source review' : '…', unit = reviewKind(review);
  let check = review.blocking_reasons.length ? `${review.blocking_reasons.join(' ')} Correct the source and create a new assessment before approval.` : 'Inspect the source values, assumptions and review history before deciding.';
  let nodes = review.lineage.map(node => ({k:fieldLabel(node.kind),t:node.source ? fieldLabel(node.source.table) : 'Saved calculation',id:node.source ? `Source row ${node.source.row_number}` : 'See calculation details below'}));
  if (output && legs.length && Object.hasOwn(output,'total_kgco2e')) {
    value = fmt(output.total_kgco2e,2); unit = 'kg CO₂e · saved result';
    summary = `${fmt(output.mass_t ?? inputs.mass_t)} tonnes · ${legs.length} ${legs.length === 1 ? 'leg' : 'legs'} · ${[...new Set(legs.map(leg => modeNames[leg.mode] || fieldLabel(leg.mode || 'unspecified')))].join(' + ')}. Review the distances, factors and per-leg calculations below.`;
    const distance = legs.every(leg => numeric(leg.distance_km) != null) ? legs.reduce((sum,leg) => sum + Number(leg.distance_km),0) : null;
    const factors = [...new Set(legs.map(leg => leg.factor_id).filter(Boolean))];
    nodes = [{k:'Activity',t:`${fmt(output.mass_t ?? inputs.mass_t)} t cargo`,id:`${legs[0].origin} → ${legs.at(-1).destination}`},{k:'Distance',t:`${fmt(distance)} km`,id:output.externally_verified_route === true ? 'Verified route source' : 'Illustrative / unverified'},{k:'Factors',t:`${factors.length} referenced ${factors.length === 1 ? 'factor' : 'factors'}`,id:factors.join(' · ') || 'Inspect factor sources below'},{k:'Result',t:`${fmt(output.total_kgco2e)} kg CO₂e`,id:'Saved calculation result'}];
    check = `${Array.isArray(output.issues) ? output.issues.length ? `${output.issues.length} calculation issues are recorded below.` : 'No calculation issues were reported.' : 'Calculation checks were not supplied.'} ${output.externally_verified_route === true ? 'The saved route is marked externally verified.' : 'Distances are illustrative or unverified and need analyst confirmation.'}`;
  } else if (review.target_type === 'published_inventory') {
    const values = records[0]?.values;
    const scopes = ['scope1','scope2_market','scope3'].map(key => numeric(values?.[key]));
    value = scopes.every(number => number != null) ? fmt(scopes.reduce((sum,number) => sum+number,0),2) : bundle ? 'Unavailable' : '…';
    unit = 't CO₂e · Scope 1 + 2 + 3';
    summary = 'Published inventory context. Inspect the original scope values and source record; this is not a local approval request.';
    check = 'Source-reported values are shown below. Published context is kept separate from local demo approval.';
  } else if (review.target_type === 'structural_event') {
    const values = records[0]?.values;
    value = values?.date || (bundle ? 'Date unavailable' : '…'); unit = values?.type ? fieldLabel(values.type) : 'Boundary change';
    summary = values?.relevance || 'Review how this organisational change affects the inventory boundary and base year.';
    check = 'Registering this event does not recalculate the inventory. Confirm its boundary and base-year implications against the original record.';
  } else if (output) {
    const total = output.total_tco2e ?? output.scenario_tco2e;
    value = total == null ? 'Saved result' : fmt(total,2); unit = total == null ? 'Inspect inputs and results below' : 't CO₂e';
  }
  if (output && review.blocking_reasons.length) {
    summary = review.blocking_reasons.join(' ') + ' ' + summary;
    check = review.blocking_reasons.join(' ') + ' ' + check;
  }
  return {title:reviewTitle(review,bundle),summary,value,unit,check,nodes};
}

function Metrics({items}) {
  return <dl className="review-metrics">{items.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
function Table({values}) {
  return <dl className="review-source-values">{Object.entries(values).map(([key,value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{value == null || value === '' ? 'Not supplied' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>;
}

export default function ReviewEvidence({review,bundle,records=[],sourceErrors=[],loading,error,onRetry,onTrace}) {
  if (error) return <section className="review-evidence" aria-label="Assessment evidence"><p role="alert">Couldn’t load the evidence for this review. {error}</p><button type="button" className="btn" onClick={onRetry}>Retry evidence</button></section>;
  if (loading || !bundle) return <section className="review-evidence" aria-label="Assessment evidence"><p role="status">Loading the saved result and source evidence…</p></section>;
  const run = bundle.run, output = run?.output, legs = output?.lines?.filter(line => line.origin && line.destination) || [];
  const trip = legs.length && Object.hasOwn(output,'total_kgco2e');
  const reviewRecord = bundle.review_item.review;
  const openFactor = source => {
    const record = records.find(record => record.source.table === source.table && record.source.row_number === source.row_number) || {source};
    onTrace(sourceTrace(record));
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href=url; link.download=`current-review-${review.id}-v${review.version}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  return <section className="review-evidence" aria-label="Assessment evidence">
    {trip ? <>
      <h3 className="h-d">Shipment to review</h3>
      <Metrics items={[
        ['Route',`${legs[0].origin} → ${legs.at(-1).destination}`],['Cargo mass',`${fmt(output.mass_t ?? run.inputs.mass_t)} t`],
        ['Total distance',legs.every(leg => numeric(leg.distance_km) != null) ? `${fmt(legs.reduce((sum,leg) => sum+Number(leg.distance_km),0))} km` : 'Unavailable'],
        ['Emissions',`${fmt(output.total_kgco2e)} kg CO₂e`],['Cargo type',output.material || run.inputs.material || 'Not supplied'],
        ['Distance evidence',output.externally_verified_route === true ? 'Externally verified' : 'Illustrative / unverified']
      ]}/>
      <h3 className="h-d">Per-leg calculation</h3>
      <ol className="review-legs">{legs.slice(0,25).map((leg,index) => <li key={index}>
        <div className="review-leg-heading"><strong>{index+1}. {leg.origin} → {leg.destination}</strong><span className="pill p-info">{modeNames[leg.mode] || fieldLabel(leg.mode || 'unspecified')}</span></div>
        <p className="review-formula">{fmt(leg.mass_t)} t × {fmt(leg.distance_km)} km × {fmt(leg.factor_kgco2e_per_tkm,8)} kg CO₂e/tkm = <strong>{fmt(leg.kgco2e)} kg CO₂e</strong></p>
        <p className="review-detail-note">Factor: {leg.factor_id || 'Unavailable'} · version {leg.factor_version || 'not supplied'}. Distance: {leg.distance_basis ? fieldLabel(leg.distance_basis) : 'Basis not supplied'}.</p>
        {leg.factor_source && <button type="button" className="ev" onClick={() => openFactor(leg.factor_source)}>{leg.factor_source.file} · row {leg.factor_source.row_number}</button>}
      </li>)}</ol>
      {legs.length > 25 && <p className="review-detail-note">Showing 25 of {legs.length} legs. Download current review data for the full calculation.</p>}
    </> : run ? <>
      <h3 className="h-d">Saved calculation</h3><h4>Inputs</h4><Table values={run.inputs}/>
      <h4>Result summary</h4><Table values={Object.fromEntries(Object.entries(output).filter(([key,value]) => !['dataset_id','method_version','model'].includes(key) && (value == null || typeof value !== 'object')))}/>
    </> : null}
    {Array.isArray(output?.issues) && output.issues.length > 0 && <div role="note"><h3 className="h-d">Calculation issues</h3><ul>{output.issues.slice(0,25).map((issue,index) => <li key={index}>{typeof issue === 'string' ? issue : issue.message || JSON.stringify(issue)}</li>)}</ul></div>}
    {records.length > 0 && <div><h3 className="h-d">{trip ? 'Referenced source records' : 'Original source values'}</h3><div className="review-records">{records.map(record => <details key={`${record.source.table}:${record.source.row_number}`} open={!run}>
      <summary>{fieldLabel(record.source.table)} · row {record.source.row_number}</summary>
      <Table values={record.values}/>
      <button type="button" className="ev" onClick={() => onTrace(sourceTrace(record))}>Inspect original source and hash</button>
    </details>)}</div></div>}
    {sourceErrors.length > 0 && <div role="alert"><p>Some original source records could not be loaded: {sourceErrors.join('; ')}</p><button type="button" className="btn" onClick={onRetry}>Retry evidence</button></div>}
    {reviewRecord && <div className="review-last-decision"><h3 className="h-d">Last recorded review</h3><p><strong>{reviewRecord.outcome === 'approve' ? 'Demo approval' : 'Changes requested'}</strong> · {reviewRecord.reviewer} · assessed version {reviewRecord.reviewed_version}</p><p>{reviewRecord.notes}</p></div>}
    <div><button type="button" className="btn" onClick={download}>Download current review data</button><p className="review-detail-note">Signed receipts have their own frozen bundle download below.</p></div>
    <details><summary>Snapshot and technical references</summary><Table values={{review_id:review.id,review_version:review.version,dataset_id:review.dataset_id,...(run ? {run_id:run.id,created_at:run.created_at,method_version:output.method_version} : {})}}/></details>
    {bundle.audit_truncated && <p className="review-detail-note">This export contains the first 500 audit events; the audit history is longer.</p>}
  </section>;
}
