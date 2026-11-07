import React from 'react';
import Inventory from '../screens/Inventory.jsx';
import Review from '../screens/Review.jsx';
import { api, sourceTrace } from './api.js';

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
  componentDidMount() { super.componentDidMount(); this.load(); }
  componentDidUpdate() { super.componentDidUpdate(); this.load(); }
  componentWillUnmount() { this._dead = true; super.componentWillUnmount(); }
  async load() {
    const key = `${this.state.yr}|${this.state.rest}`;
    if (key === this._apiKey) return;
    this._apiKey = key;
    this.setState({ apiError:'' });
    try {
      const data = await api.inventory(this.state.yr, this.state.rest);
      if (!this._dead && this._apiKey === key) this.setState({ remote:data, remoteKey:key });
    } catch(e) { if (!this._dead && this._apiKey === key) this.setState({ apiError:e.message }); }
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
    const v = super.viewModel(), data = this.state.remote;
    if (!data) return v;
    const selected = data.selected;
    const scopes = ['scope1','scope2_market','scope3'];
    v.scopes = v.scopes.map((item,i) => ({ ...item, v:fmt(selected.scopes?.[scopes[i]]) + ' t', pcls:selected.status === 'blocked' ? 'p-risk' : 'p-info', ptxt:selected.status === 'blocked' ? 'Blocked' : 'Published source', sub:selected.status === 'blocked' ? 'Preliminary · inspect source units and boundary.' : item.sub,
      trace:() => this.props.onTrace?.({ title:item.label + ' · ' + selected.year, value:fmt(selected.scopes?.[scopes[i]]), unit:'tCO₂e', status:selected.status === 'blocked' ? 'blocked' : 'draft', note:data.limitations.join('\n'), steps:(selected.sources || [selected.source]).filter(Boolean).map(source => sourceTrace({source}).steps[0]) }) }));
    v.hist = data.history.map(r => ({ y:String(r.year),k:Math.round(r.total_tco2e / 1000)+'k',h:r.total_tco2e / 330000 * 100,col:r.year === this.state.yr ? 'var(--pea)' : '#C9D3D1',ink:'var(--muted)',outline:'0',aria:`${r.year}: ${fmt(r.total_tco2e)} tCO₂e`,pick:() => this.setState({yr:r.year}) }));
    v.feeds = data.feeds.map((f,i) => ({i,name:f.table,rows:fmt(f.row_count)+' rows',scope:'Source feed',dash:'0 113',col:'#5AA9F0',cls:'p-info',st:'Imported · needs review'}));
    v.issues = data.quality_findings.map(f => ({ type:f.id,what:f.message,key:f.source_refs.map(s => s.table + ':' + s.row_number).join(' · '),conf:0,confidenceLabel:'Rule check',open:f.resolution === 'open',closed:f.resolution !== 'open',ctxt:f.resolution,ccls:'p-info',bg:'#fff',op:1,accept:() => this.disposition(f,'confirm'),dismiss:() => this.disposition(f,'dismiss') }));
    v.openCount = String(data.quality_findings.filter(f => f.resolution === 'open').length);
    v.n.pcf = data.suppliers.provides_pcf ?? '—';
    v.pcfDash = `${(data.suppliers.provides_pcf || 0) / Math.max(1,data.suppliers.total || 0) * 2*Math.PI*48} ${2*Math.PI*48}`;
    v.sbti = Object.entries(data.suppliers.sbti_status_counts || {}).map(([l,count]) => ({l:l.replaceAll('_',' '),v:String(count),w:count/Math.max(1,data.suppliers.total)*100,c:'#5AA9F0'}));
    return v;
  }
  render() { return !this.state.remote || this.state.remoteKey !== this._apiKey || this.state.apiError ? pending(this) : super.render(); }
}

export class ConnectedReview extends Review {
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
    const item = this.state.remote?.items.find(i => i.id === this.state.sel);
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
    const matches = (item,filter) => filter === 'all' || (filter === 'waiting' ? ['draft','changes_requested'].includes(item.status) : filter === 'approved' ? ['approved_for_demo','published_source_context'].includes(item.status) : item.status === filter);
    const selected = items.find(i => i.id === this.state.sel) || items[0];
    v.filters = v.filters.map((f,i) => ({...f,n:String(items.filter(item => matches(item,['all','waiting','blocked','approved'][i])).length)}));
    v.queue = items.filter(item => matches(item,this.state.filter)).map(item => ({title:item.title,kind:item.target_type.replaceAll('_',' '),owner:item.owner,cls:status(item.status)[0],st:status(item.status)[1],sel:String(item.id === selected?.id),bg:item.id === selected?.id ? '#F6FBF8' : '#fff',bd:'var(--line)',dx:item.id === selected?.id ? 4 : 0,pick:() => this.setState({sel:item.id,note:'',noteErr:false}) }));
    v.empty = !v.queue.length;
    if (selected) v.d = {id:selected.id,ver:String(selected.version),title:selected.title,sum:selected.blocking_reasons.join(' ') || 'Source-linked assessment. Local demo review uses a declared, unverified analyst identity.',value:selected.status === 'blocked' ? 'Blocked' : 'Review',unit:selected.source_status || '',cls:status(selected.status)[0],st:status(selected.status)[1],approved:selected.status === 'approved_for_demo',nodes:selected.lineage.map((l,i) => ({k:l.kind,t:l.source?.file || l.method_version || 'Saved calculation',id:l.source ? `${l.source.table}:${l.source.row_number}` : l.run_id || '',i,bg:'var(--glacier-50)',ink:'var(--glacier-ink)',bd:'transparent',arrow:i < selected.lineage.length-1,delay:`${i*.1}s`})),assume:selected.assumptions,ai:'Source evidence and deterministic checks require human judgment. No owner notification is sent.',aiBg:'var(--glacier-50)',aiInk:'var(--glacier-ink)'};
    v.log = (this.state.remoteAudit?.events || []).map(e => ({when:new Date(e.created_at).toLocaleDateString(),what:e.event || e.outcome || 'Review event',who:e.actor || 'Declared local analyst',col:'#5AA9F0',anim:''}));
    return v;
  }
  render() {
    if (!this.state.remote || this.state.apiError) return pending(this);
    if (!this.state.remote.items.length) return <section className="card" style={{padding:24}}>No review items in this snapshot.</section>;
    return super.render();
  }
}
