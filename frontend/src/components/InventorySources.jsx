import React, {useEffect, useMemo, useRef, useState} from 'react';
import {api} from '../lib/api.js';

const label = value => String(value || 'Source').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
const count = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('fi-FI') : 'Unavailable';

function sourcesFor(data) {
  const sources = new Map();
  const add = (source, name, use) => {
    if (!source?.table) return;
    let entry = sources.get(source.table);
    if (!entry) {
      const feed = (data.feeds || []).find(feed => feed.table === source.table);
      entry = {source, feed, name, uses:new Set(), refs:new Map()};
      sources.set(source.table, entry);
    }
    entry.uses.add(use);
    if (source.row_number != null) entry.refs.set(source.row_number, source);
  };
  for (const source of data.selected.sources || [data.selected.source]) add(source, data.selected.status === 'published_source_context' ? 'Published inventory' : 'Draft inventory', `Selected ${data.selected.year} scope values`);
  // The full published history supplies both charts, not the operational activity tables.
  const history = data.history || [];
  if (history.length) add((history.find(row => row.year === data.selected.year) || history.at(-1)).source, 'Published inventory', 'Historical charts and published comparisons');
  for (const finding of data.quality_findings || []) for (const source of finding.source_refs || []) add(source, label(source.table), `${finding.detail?.year || 'Draft'} data-quality checks`);
  add(data.suppliers?.source, 'Supplier master', 'Supplier coverage and SBTi counts · snapshot-wide');
  for (const event of data.structural_events || []) add(event.source, 'Boundary events', 'Organisational changes · context for comparability');
  return [...sources.values()];
}

export default function InventorySources({data, onTrace}) {
  const sources = useMemo(() => sourcesFor(data), [data]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const request = useRef(null);
  useEffect(() => {
    request.current?.abort(); setBusy(''); setError('');
    return () => request.current?.abort();
  }, [data]);
  const inspect = async entry => {
    request.current?.abort();
    const controller = request.current = new AbortController();
    setBusy(entry.source.table); setError('');
    try {
      const refs = [...entry.refs.values()];
      const records = await Promise.all(refs.map(ref => api.sourceRow(ref, {signal:controller.signal})));
      if (controller.signal.aborted) return;
      records.forEach((record, index) => {
        const expected = refs[index], actual = record.source;
        if (actual?.dataset_id !== data.dataset_id || actual.table !== expected.table || actual.row_number !== expected.row_number || actual.file_sha256 !== expected.file_sha256) throw new Error('Source evidence does not match this snapshot.');
      });
      const source = entry.source, feed = entry.feed;
      onTrace?.({title:entry.name, value:count(feed?.row_count), unit:'rows in the full source file', status:'source_context',
        note:`${[...entry.uses].join('. ')}. Imported snapshot evidence has not been independently validated. Row counts cover the whole file, not only the selected year. Published totals are reported source values, not a reconstruction from activity records.`,
        steps:[
          {k:'Source file',t:feed?.file || source.file || source.table,id:data.dataset_id,d:`SHA-256: ${feed?.file_sha256 || source.file_sha256 || 'Unavailable'}`},
          ...records.flatMap(record => [
            {k:'Original row',t:`${record.source.table} · row ${record.source.row_number}`,id:record.source.record_id || '',d:''},
            ...Object.entries(record.values || {}).map(([key,value]) => ({k:'Source value',t:label(key),id:typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? 'Unavailable'),d:''}))
          ])
        ]});
    } catch(e) { if (!controller.signal.aborted) setError(`Couldn’t inspect ${entry.name}: ${e.message}`); }
    finally { if (!controller.signal.aborted) setBusy(''); }
  };
  return <section className="card rise inventory-sources" aria-label="Data feeds" style={{'--i':5}}>
    <div className="inventory-source-heading"><h2 className="h-d">Data sources</h2><span>{sources.length} files used on this page</span></div>
    <p className="inventory-source-note">Scope totals come from the published inventory or draft report. Activity files are not used to reconstruct these totals. Counts below cover each full snapshot file.</p>
    <div className="inventory-source-grid">
      {sources.map(entry => <article className="inventory-source-card" key={entry.source.table}>
        <div className="inventory-source-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>
          <h3>{entry.name}</h3>
        </div>
        <span className="mono inventory-source-file">{(entry.feed?.file || entry.source.file || entry.source.table).split('/').at(-1)}</span>
        <p className="inventory-source-use">{[...entry.uses].join(' · ')}</p>
        <div className="inventory-source-meta"><span>{count(entry.feed?.row_count)} rows</span><span className="pill p-info">{entry.feed?.validation_status === 'imported_not_domain_validated' ? 'Imported · not validated' : 'Validation unavailable'}</span></div>
        <button className="ev" type="button" disabled={busy === entry.source.table} onClick={() => inspect(entry)} aria-label={`Inspect ${entry.name.toLowerCase()} source`}>{busy === entry.source.table ? 'Loading evidence…' : 'Inspect source'}</button>
      </article>)}
    </div>
    {!sources.length && <p className="inventory-source-note">Source references are unavailable in this response.</p>}
    <p className="inventory-source-note">Other imported files are outside this page’s calculations. Import status does not mean analyst approval.</p>
    {error && <p className="inventory-source-error" role="alert">{error} Select Inspect source to retry.</p>}
  </section>;
}
