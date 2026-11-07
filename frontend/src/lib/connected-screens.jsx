import React from 'react';
import Inventory from '../screens/Inventory.jsx';
import Review from '../screens/Review.jsx';
import { api, sourceTrace } from './api.js';
import ReceiptPanel from '../components/ReceiptPanel.jsx';

const fmt = n => n == null ? 'Unavailable' : Math.round(n).toLocaleString('fi-FI');
const status = s => ({ blocked:['p-risk','Blocked'], draft:['p-draft','Draft'], approved_for_demo:['p-ok','Approved · demo'], published_source_context:['p-info','Published source'], changes_requested:['p-risk','Changes requested'] })[s] || ['p-rev','In review'];

function pending(component, body) {
  return <section className="card" style={{ padding:24 }} aria-live="polite">
    <h2 className="h-d">{component.state.apiError ? 'Couldn’t load this screen' : 'Loading source data…'}</h2>
    {component.state.apiError && <><p role="alert">{component.state.apiError}</p><button className="btn" onClick={() => { component._apiKey = null; component.load(); }}>Retry</button></>}
    {body}
  </section>;
}

export class ConnectedInventory extends Inventory {
  componentDidMount() { this.load(); }
  componentDidUpdate() { this.load(); }
  componentWillUnmount() { this._dead = true; }
  async load() {
    const key = `${this.state.yr}|${this.state.rest}`;
    if (key === this._apiKey) return;
    this._apiKey = key;
    const requestId = this._inventoryRequest = (this._inventoryRequest || 0) + 1;
    this.setState({ apiError:'' });
    try {
      const data = await api.inventory(this.state.yr, this.state.rest);
      if (!this._dead && this._inventoryRequest === requestId) this.setState({ remote:data, remoteKey:key });
    } catch(e) { if (!this._dead && this._inventoryRequest === requestId) this.setState({ apiError:e.message }); }
  }
  async disposition(finding, outcome) {
    if (this._writing) return;
    this._writing = true;
    try {
      await api.disposition(finding, outcome, `${outcome === 'confirm' ? 'Confirmed' : 'Dismissed'} by local demo analyst after source review.`);
      this._apiKey = null; await this.load();
      this.props.onToast?.('Disposition saved. Source values and numerical blockers are unchanged.');
    } catch(e) { this.props.onToast?.(e.message); this._apiKey = null; this.load(); }
    finally { this._writing = false; }
  }
  viewModel() {
    const data = this.state.remote;
    const selected = data.selected, history = data.history || [], suppliers = data.suppliers || {};
    const findings = data.quality_findings || [];
    const known = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
    const percent = (n, max) => known(n) ? n / max * 85 : 0;
    const totalMax = Math.max(1, ...history.map(r => known(r.total_tco2e) ? r.total_tco2e : 0));
    const scopeMax = Math.max(1, ...history.flatMap(r => [r.scopes?.scope1, r.scopes?.scope2_market].filter(known)));
    const blocked = selected.status === 'blocked';
    const published = selected.status === 'published_source_context';
    const unavailable = selected.status === 'unavailable';
    const [pcls, ptxt] = blocked ? ['p-risk','Blocked'] : published ? ['p-info','Published source'] : unavailable ? ['p-info','Unavailable'] : ['p-draft','Preliminary'];
    const supplierKnown = suppliers.status !== 'unavailable' && known(suppliers.total) && known(suppliers.provides_pcf);
    const supplierValue = supplierKnown ? `${fmt(suppliers.provides_pcf)} of ${fmt(suppliers.total)}` : 'Unavailable';
    const supplierNote = suppliers.status === 'partial_coverage' ? 'Partial source coverage; supplier records have data-quality issues. Counts reflect the usable records.' : supplierKnown ? 'Supplier master availability; product footprints have not been independently validated.' : 'Supplier source data is unavailable in this snapshot.';
    const sourceStep = source => ({ k:'Source', t:source.file || source.table || 'Dataset snapshot', id:[source.dataset_id, source.record_id, source.row_number == null ? null : `row ${source.row_number}`].filter(Boolean).join(' · '), d:source.file_sha256 || 'Source hash unavailable' });
    const notes = [...(data.limitations || []), ...(data.issues || []).map(issue => issue.message).filter(Boolean)];
    return {
      years:(data.available_years || []).map(year => ({label:year === selected.year && !published && !unavailable ? `${year} draft` : String(year),on:String(year === this.state.yr),pick:() => this.setState({yr:year})})),
      restStr:String(this.state.rest), toggleRest:() => this.setState({rest:!this.state.rest}),
      restLabel:'Show source-provided restated values',
      isDraft:!published && !unavailable,
      draftMessage:blocked ? `${selected.year} draft blocked by source checks. Inspect the findings before using these values.` : `${selected.year} preliminary values; source review required.`,
      goReview:() => this.props.onNav?.('review'),
      scopes:[['Scope 1','scope1','Own fuel and cooling'],['Scope 2','scope2_market','Bought energy · market-based'],['Scope 3','scope3','Value chain']].map(([label,key,description]) => {
        const value = selected.scopes?.[key];
        return {label,v:known(value) ? `${fmt(value)} t` : 'Unavailable',pcls:known(value) ? pcls : 'p-info',ptxt:known(value) ? ptxt : 'Unavailable',sub:blocked ? 'Preliminary · inspect source units and boundary.' : `${description}${selected.restatement_applied && key === 'scope3' ? ' · restated' : ''}`,ink:blocked ? 'var(--clay-ink)' : 'var(--ink)',bd:blocked ? '#F3B49B' : 'var(--line)',src:'Inspect snapshot evidence',
          trace:() => this.props.onTrace?.({title:`${label} · ${selected.year}`,value:known(value) ? fmt(value) : 'Unavailable',unit:'tCO₂e',status:known(value) ? selected.status : 'unavailable',note:[selected.note,...notes].filter(Boolean).join('\n'),steps:(selected.sources || [selected.source]).filter(Boolean).map(sourceStep)})};
      }),
      hist:history.map(r => ({y:String(r.year),k:known(r.total_tco2e) ? `${Math.round(r.total_tco2e / 1000)}k` : 'Unavailable',h:percent(r.total_tco2e,totalMax),col:r.year === this.state.yr ? 'var(--spruce)' : '#C9D3D1',ink:'var(--muted)',outline:r.year === this.state.yr ? '2px solid var(--spruce)' : '0',aria:`${r.year}: ${fmt(r.total_tco2e)} tCO₂e${r.restatement_applied ? ', restated' : ''}`,pick:() => this.setState({yr:r.year})})),
      s12:history.map(r => ({y:String(r.year),a:percent(r.scopes?.scope1,scopeMax),b:percent(r.scopes?.scope2_market,scopeMax),t1:`Scope 1 ${r.year}: ${fmt(r.scopes?.scope1)} tCO₂e`,t2:`Scope 2 ${r.year}: ${fmt(r.scopes?.scope2_market)} tCO₂e`})),
      historyNote:history.length ? `t CO₂e · click a year${this.state.rest ? ' · source-provided restatements where available' : ''}` : 'Published history unavailable in this snapshot.',
      scopeHistoryNote:history.length ? 'Source-reported Scope 1 and market-based Scope 2. Missing values are unavailable.' : 'Scope history unavailable in this snapshot.',
      feeds:(data.feeds || []).map((f,i) => ({i,name:f.table,rows:fmt(f.row_count)+' rows',scope:'Source feed',dash:'0 113',col:'#5AA9F0',cls:'p-info',st:'Imported · needs review'})),
      issues:findings.map(f => ({type:f.id,what:f.message,key:f.source_refs.map(s => s.table + ':' + s.row_number).join(' · '),conf:0,confidenceLabel:'Rule check',open:f.resolution === 'open',closed:f.resolution !== 'open',ctxt:f.resolution,ccls:'p-info',bg:'#fff',op:1,accept:() => this.disposition(f,'confirm'),dismiss:() => this.disposition(f,'dismiss')})),
      openCount:String(findings.filter(f => f.resolution === 'open').length),
      n:{pcf:supplierKnown ? fmt(suppliers.provides_pcf) : 'Unavailable'},supplierTotal:supplierKnown ? `of ${fmt(suppliers.total)}` : '',
      supplierAria:supplierKnown ? `${supplierValue} suppliers provide product carbon footprints. ${supplierNote}` : supplierNote,
      supplierNote,supplierSourceLabel:suppliers.source?.file || suppliers.source?.table || 'Supplier source unavailable',
      pcfDash:`${supplierKnown && suppliers.total > 0 ? suppliers.provides_pcf / suppliers.total * 2*Math.PI*48 : 0} ${2*Math.PI*48}`,
      sbti:supplierKnown ? Object.entries(suppliers.sbti_status_counts || {}).map(([l,count]) => ({l:l.replaceAll('_',' '),v:String(count),w:suppliers.total > 0 ? count / suppliers.total * 100 : 0,c:'#5AA9F0'})) : [],
      trSup:() => this.props.onTrace?.({title:'Supplier climate data',value:supplierValue,unit:supplierKnown ? 'provide a product footprint' : '',status:supplierKnown ? 'source_context' : 'unavailable',note:[supplierNote,...notes].join('\n'),steps:[...(suppliers.source ? [sourceStep(suppliers.source)] : []),...(supplierKnown ? [{k:'Source',t:'Supplier master summary',id:`${supplierValue} · ${fmt(suppliers.country_count)} countries`,d:Object.entries(suppliers.sbti_status_counts || {}).map(([label,count]) => `${label}: ${count}`).join(' · ')}] : [])]})
    };
  }
  render() { return !this.state.remote || this.state.remoteKey !== `${this.state.yr}|${this.state.rest}` || this.state.apiError ? pending(this) : super.render(); }
}

export class ConnectedReview extends Review {
  matches(item, filter = this.state.filter) {
    return filter === 'all' || (filter === 'waiting' ? ['draft','changes_requested'].includes(item.status) : filter === 'approved' ? ['approved_for_demo','published_source_context'].includes(item.status) : item.status === filter);
  }
  selectedItem() {
    const items = (this.state.remote?.items || []).filter(item => this.matches(item));
    return items.find(item => item.id === this.state.sel) || items[0];
  }
  receiptPanel() {
    const selected = this.selectedItem();
    return selected ? <ReceiptPanel key={`${selected.id}|${selected.version}`} review={selected} /> : null;
  }
  componentDidMount() { this.load(); }
  componentWillUnmount() { this._dead = true; }
  async load() {
    this.setState({ apiError:'' });
    try {
      const [queue,audit] = await Promise.all([api.reviews(),api.audit()]);
      if (!this._dead) this.setState(st => ({ remote:queue, remoteAudit:audit, sel:queue.items.some(i => i.id === st.sel) ? st.sel : queue.items[0]?.id }));
    } catch(e) { if (!this._dead) this.setState({ apiError:e.message }); }
  }
  async act(kind) {
    const item = this.selectedItem();
    if (!item || this._writing) return;
    if (!this.state.note.trim()) { this.setState({noteErr:true}); return; }
    this._writing = true;
    try {
      await api.review(item.id, {expected_version:item.version,reviewer:'Local demo analyst',outcome:kind === 'approved' ? 'approve' : 'request_changes',notes:this.state.note});
      this.setState({note:'',noteErr:false});
      await this.load();
      this.props.onToast?.('Review saved to the audit trail · declared demo identity');
    } catch(e) { this.props.onToast?.(e.message); await this.load(); }
    finally { this._writing = false; }
  }
  viewModel() {
    const v = super.viewModel(), remote = this.state.remote;
    if (!remote) return v;
    const items = remote.items;
    const selected = this.selectedItem();
    v.filters = v.filters.map((f,i) => { const filter = ['all','waiting','blocked','approved'][i]; return {...f,n:String(items.filter(item => this.matches(item,filter)).length),pick:() => this.setState({filter,sel:null,note:'',noteErr:false})}; });
    v.queue = items.filter(item => this.matches(item)).map(item => ({title:item.title,kind:item.target_type.replaceAll('_',' '),owner:item.owner,cls:status(item.status)[0],st:status(item.status)[1],sel:String(item.id === selected?.id),bg:item.id === selected?.id ? '#F6FBF8' : '#fff',bd:'var(--line)',dx:item.id === selected?.id ? 4 : 0,pick:() => this.setState({sel:item.id,note:'',noteErr:false}) }));
    v.empty = !v.queue.length;
    if (selected) v.d = {id:selected.id,ver:String(selected.version),title:selected.title,sum:selected.blocking_reasons.join(' ') || 'Source-linked assessment. Local demo review uses a declared, unverified analyst identity.',value:selected.status === 'blocked' ? 'Blocked' : 'Review',unit:selected.source_status || '',cls:status(selected.status)[0],st:status(selected.status)[1],approved:selected.status === 'approved_for_demo',nodes:selected.lineage.map((l,i) => ({k:l.kind,t:l.source?.file || l.method_version || 'Saved calculation',id:l.source ? `${l.source.table}:${l.source.row_number}` : l.run_id || '',i,bg:'var(--glacier-50)',ink:'var(--glacier-ink)',bd:'transparent',arrow:i < selected.lineage.length-1,delay:`${i*.1}s`})),assume:selected.assumptions,ai:'Source evidence and deterministic checks require human judgment. No owner notification is sent.',aiBg:'var(--glacier-50)',aiInk:'var(--glacier-ink)'};
    v.log = (this.state.remoteAudit?.events || []).map(e => ({when:new Date(e.created_at).toLocaleDateString(),what:e.event || e.outcome || 'Review event',who:e.actor || 'Declared local analyst',col:'#5AA9F0',anim:''}));
    return v;
  }
  render() {
    if (!this.state.remote || this.state.apiError) return pending(this);
    if (!this.state.remote.items.length) return <section className="card" style={{padding:24}}>No review items in this snapshot.</section>;
    if (!this.selectedItem()) return <section className="card" style={{padding:24,display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{this.viewModel().filters.map((filter,index) => <button type="button" key={index} className="chipbtn" aria-pressed={filter.on} onClick={filter.pick}>{filter.label} · {filter.n}</button>)}</div>
      <p role="status">No review items match this filter.</p>
    </section>;
    return super.render();
  }
}
