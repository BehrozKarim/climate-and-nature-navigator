import React from 'react';

const INV = {
  2019: { s1: 1247, s2: 21860, s3: 294108 }, 2021: { s1: 1680, s2: 8336, s3: 272424 }, 2022: { s1: 1602, s2: 5129, s3: 201016, r3: 186430 },
  2023: { s1: 4229, s2: 3174, s3: 260931, r3: 237886 }, 2024: { s1: 6251, s2: 63, s3: 238410 }, 2025: { s1: 132163, s2: 1117417, s3: 71534593, draft: true }
};
const NOTE = { 2019: 'Base year of the 2021–2025 programme; includes grain trade.', 2021: 'Includes grain trade.', 2022: 'Grain trade divested 31 May 2022.', 2023: 'LPG used as back-up fuel at Säkylä.', 2024: 'Latest published inventory.', 2025: 'Preliminary draft · blocked.' };
const FEEDS = [
  ['Purchases (ERP)', 7427, 'Scope 3 cat 1', 96, 'rev', '3 issues'], ['Shipments', 11617, 'Scope 3 cat 4 and 9', 99, 'rev', '1 issue'],
  ['Energy meters', 610, 'Scope 1 and 2', 100, 'ok', 'Validated'], ['Fuel deliveries', 263, 'Scope 1', 100, 'ok', 'Validated'],
  ['Refrigerant log', 84, 'Scope 1', 97, 'rev', '1 issue'], ['Waste notes', 1008, 'Scope 3 cat 5', 100, 'ok', 'Validated'],
  ['Business travel', 3532, 'Scope 3 cat 6', 100, 'ok', 'Validated'], ['Sales volumes', 1440, 'Scope 3 cat 9–12', 100, 'ok', 'Validated'],
  ['Supplier footprints', 44, 'Scope 3 cat 1', 92, 'rev', '2 issues'], ['Farm survey · FI', 3437, 'Scope 3 FLAG', 95, 'rev', '2 issues'],
  ['Grower data · SE', 2683, 'Scope 3 FLAG', 60, 'info', 'Needs mapping'], ['Commuting survey', 208, 'Scope 3 cat 7', 100, 'ok', 'Validated']
];
const ISSUES = [
  { type: 'unit_error', what: '2025 Scope 3 is 300× the 2024 value', key: 'report:2025:scope3', conf: 97 },
  { type: 'total_mismatch', what: 'Draft total ≠ sum of scopes', key: 'report:2025:total_market_based', conf: 94 },
  { type: 'outlier_implausible', what: 'Potato yields of 86 t/ha in 2013 and 2016', key: 'farm_survey_fi · potato', conf: 90 },
  { type: 'decimal_shift', what: 'Meter reading 10× its neighbours', key: 'energy_meter_readings', conf: 82 },
  { type: 'pcf_stale_period', what: 'Supplier footprint is out of date', key: 'supplier_pcfs', conf: 71 },
  { type: 'missing_leg', what: 'Sea leg without the road leg to the plant', key: 'shipments', conf: 68 }
];
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const C = 2 * Math.PI * 18, C2 = 2 * Math.PI * 48;

export default class Inventory extends React.Component {
  constructor(...a) { super(...a); this.state = { yr: 2024, rest: false, res: {}, tv: {}, mounted: false }; }
  vals() { const r = INV[this.state.yr]; const s3 = this.state.rest && r.r3 ? r.r3 : r.s3; return { s1: r.s1, s2: r.s2, s3, pcf: 24 }; }
  tween(to) {
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = Object.assign({}, this.state.tv); const t0 = performance.now(); const D = rm ? 1 : 1000;
    cancelAnimationFrame(this._twr);
    const step = (t) => { const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3); const tv = {}; for (const k in to) { const a = from[k] != null ? from[k] : 0; tv[k] = a + (to[k] - a) * e; } this.setState({ tv }); if (p < 1) this._twr = requestAnimationFrame(step); };
    this._twr = requestAnimationFrame(step);
  }
  componentDidMount() { this._k = this.state.yr + '|' + this.state.rest; this.tween(this.vals()); this._mt = setTimeout(() => this.setState({ mounted: true }), 60); }
  componentDidUpdate() { const k = this.state.yr + '|' + this.state.rest; if (k !== this._k) { this._k = k; this.tween(this.vals()); } }
  componentWillUnmount() { cancelAnimationFrame(this._twr); clearTimeout(this._mt); }
  viewModel() {
    const st = this.state; const tv = st.tv || {}; const r = INV[st.yr]; const draft = !!r.draft; const m = st.mounted;
    const trace = (o) => () => { if (this.props.onTrace) this.props.onTrace(o); };
    const prev = INV[2024];
    const sc = [['Scope 1', 's1', 'Own fuel and cooling'], ['Scope 2', 's2', 'Bought energy'], ['Scope 3', 's3', 'Value chain, mostly farming']].map((x) => {
      const v = tv[x[1]] || 0; const ratio = draft ? r[x[1]] / Math.max(1, prev[x[1]]) : 0;
      return { label: x[0], v: fmt(v) + ' t', sub: draft ? Math.round(ratio) + '× the 2024 value. Likely a unit error.' : x[2],
        pcls: draft ? 'p-risk' : (st.yr === 2024 ? 'p-ok' : 'p-draft'), ptxt: draft ? 'Blocked' : (st.yr === 2024 ? 'Published' : 'Historic'),
        ink: draft ? 'var(--clay-ink)' : 'var(--ink)', bd: draft ? '#F3B49B' : 'var(--line)', src: draft ? 'draft_report_summary_2025.csv' : 'published_inventory_history.csv',
        trace: trace({ title: x[0] + ' · ' + st.yr, value: fmt(st.rest && x[1] === 's3' && r.r3 ? r.r3 : r[x[1]]), unit: 'tCO₂e', status: draft ? 'blocked' : (st.yr === 2024 ? 'approved' : 'approved'), steps: [
          { k: 'Source file', t: draft ? 'draft_report_summary_2025.csv' : 'published_inventory_history.csv', id: draft ? 'report:2025:' + (x[1] === 's1' ? 'scope1' : x[1] === 's2' ? 'scope2_market' : 'scope3') : 'year = ' + st.yr, d: NOTE[st.yr] + (st.rest && x[1] === 's3' && r.r3 ? ' Restated Scope 3 shown.' : '') },
          draft ? { k: 'AI check', t: 'Trend comparison with 2024', id: fmt(r[x[1]]) + ' vs ' + fmt(prev[x[1]]), d: 'Off by a factor of ' + Math.round(ratio) + '. Issue type: unit_error.' } : { k: 'Expert review', t: 'Published in the sustainability report', id: 'status: approved', d: 'GHG Protocol Corporate Standard.' } ] }) };
    });
    const ys = [2019, 2021, 2022, 2023, 2024];
    const tot = (y) => { const q = INV[y]; return q.s1 + q.s2 + (st.rest && q.r3 ? q.r3 : q.s3); };
    const hist = ys.map((y) => ({ y: String(y), k: Math.round(tot(y) / 1000) + 'k', h: m ? (tot(y) / 330000 * 100).toFixed(1) : '0', col: y === st.yr ? 'var(--spruce)' : '#C9D3D1', ink: y === st.yr ? 'var(--spruce-ink)' : 'var(--muted)', outline: y === st.yr ? '2px solid var(--spruce)' : '0 solid transparent', aria: y + ': ' + fmt(tot(y)) + ' tCO₂e', pick: () => this.setState({ yr: y }) }));
    const s12 = ys.map((y) => ({ y: String(y), a: m ? (INV[y].s1 / 22000 * 100).toFixed(1) : '0', b: m ? (INV[y].s2 / 22000 * 100).toFixed(1) : '0', t1: 'Scope 1 ' + y + ': ' + fmt(INV[y].s1) + ' t', t2: 'Scope 2 ' + y + ': ' + fmt(INV[y].s2) + ' t' }));
    const feeds = FEEDS.map((f, i) => ({ i: 6 + i % 6, name: f[0], rows: fmt(f[1]) + (f[0] === 'Supplier footprints' ? ' files' : ' rows'), scope: f[2], dash: (m ? f[3] / 100 * C : 0).toFixed(1) + ' ' + C.toFixed(1), col: f[4] === 'ok' ? '#3CCB7F' : (f[4] === 'rev' ? '#F2C230' : '#5AA9F0'), cls: 'p-' + f[4], st: f[5] }));
    const issues = ISSUES.map((q) => { const res = st.res[q.type]; return Object.assign({}, q, { conf: m ? String(q.conf) : '0', open: !res, closed: !!res, ctxt: res === 'ok' ? 'Confirmed · sent to owner' : 'Dismissed', ccls: res === 'ok' ? 'p-ok' : 'p-draft', bg: res ? '#FAFBF8' : '#fff', op: res === 'no' ? '0.6' : '1',
      accept: () => { const o = Object.assign({}, st.res); o[q.type] = 'ok'; this.setState({ res: o }); }, dismiss: () => { const o = Object.assign({}, st.res); o[q.type] = 'no'; this.setState({ res: o }); } }); });
    return {
      years: [2021, 2022, 2023, 2024, 2025].map((y) => ({ label: y === 2025 ? '2025 draft' : String(y), on: st.yr === y ? 'true' : 'false', pick: () => this.setState({ yr: y }) })),
      restStr: st.rest ? 'true' : 'false', toggleRest: () => this.setState({ rest: !st.rest }), isDraft: draft,
      goReview: () => { if (this.props.onNav) this.props.onNav('review'); },
      scopes: sc, hist, s12, feeds, issues, openCount: String(ISSUES.filter((q) => !st.res[q.type]).length),
      n: { pcf: Math.round(tv.pcf || 0) }, pcfDash: (m ? 24 / 86 * C2 : 0).toFixed(1) + ' ' + C2.toFixed(1),
      sbti: [['Targets set', 22, '#3CCB7F'], ['Committed', 10, '#5AA9F0'], ['None', 54, '#C9D3D1']].map((b) => ({ l: b[0], v: String(b[1]), w: m ? (b[1] / 86 * 100).toFixed(1) : '0', c: b[2] })),
      trSup: trace({ title: 'Supplier climate data', value: '24 of 86', unit: 'provide a product footprint', status: 'approved', steps: [
        { k: 'Source file', t: 'suppliers.csv', id: 'provides_pcf · sbti_status · cdp_score', d: 'SBTi: 22 targets set, 10 committed, 54 none. 17 countries.' },
        { k: 'Linked data', t: 'supplier_pcfs/', id: '44 files', d: 'Methods differ between suppliers and change over time; check the period and units of each file.' } ] })
    };
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "20px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <section className={"card rise"} style={{"padding": "16px 20px", "display": "flex", "flexWrap": "wrap", "gap": "14px", "alignItems": "center", "justifyContent": "space-between"}}>
          <div role={"group"} aria-label={"Inventory year"} style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
            {(v.years || []).map((y, index0) => <React.Fragment key={index0}>
              <button type={"button"} className={"chipbtn"} aria-pressed={y.on} onClick={y.pick}>
                {y.label}
              </button>
            </React.Fragment>)}
          </div>
          <div style={{"display": "flex", "alignItems": "center", "gap": "12px"}}>
            <button type={"button"} className={"sw"} aria-pressed={v.restStr} aria-label={v.restLabel || "Show restated values after the 2022 grain trade divestment"} onClick={v.toggleRest}>
            </button>
            <span style={{"fontSize": "13px", "fontWeight": "600"}}>
              {"Show restated"}
            </span>
          </div>
        </section>
        {v.isDraft ? <>
          <div className={"swap-a"} role={"alert"} style={{"display": "flex", "flexWrap": "wrap", "gap": "12px", "alignItems": "center", "padding": "14px 18px", "borderRadius": "16px", "background": "var(--clay-50)", "color": "var(--clay-ink)", "border": "1px solid #F3B49B"}}>
            <svg width={"20"} height={"20"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
              <path d={"M12 3l9.5 17h-19L12 3Z"}>
              </path>
              <path d={"M12 10v4M12 17.5v.01"}>
              </path>
            </svg>
            <span style={{"flex": "1 1 300px", "fontSize": "14px", "fontWeight": "500"}}>
              {v.draftMessage || "2025 draft blocked: values are 20× to 17 000× too high. Likely unit errors."}
            </span>
            <button type={"button"} className={"btn"} onClick={v.goReview} style={{"minHeight": "38px", "fontSize": "13px"}}>
              {"Open in review"}
            </button>
          </div>
        </> : null}
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", "gap": "16px"}}>
          {(v.scopes || []).map((s, index0) => <React.Fragment key={index0}>
            <article className={"card lift rise"} style={{"--i": index0, "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "8px", "borderColor": s.bd}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "8px"}}>
                <span style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--muted)"}}>
                  {s.label}
                </span>
                <span className={"pill " + String(s.pcls)}>
                  {s.ptxt}
                </span>
              </div>
              <span className={"num"} style={{"fontSize": "36px", "fontWeight": "600", "color": s.ink}}>
                {s.v}
              </span>
              <span style={{"fontSize": "13px", "color": "var(--muted)", "lineHeight": "1.45"}}>
                {s.sub}
              </span>
              <button type={"button"} className={"ev"} onClick={s.trace} style={{"alignSelf": "flex-start"}}>
                {s.src}
              </button>
            </article>
          </React.Fragment>)}
        </div>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "20px", "alignItems": "stretch"}}>
          <section className={"card rise"} aria-label={"Total emissions by year"} style={{"--i": "3", "flex": "1 1 420px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"Total by year"}
            </h2>
            <div style={{"position": "relative", "height": "240px", "display": "flex", "alignItems": "flex-end", "gap": "14px", "padding": "0 4px", "borderBottom": "1px solid var(--line-2)"}}>
              {(v.hist || []).map((h, index0) => <React.Fragment key={index0}>
                <button type={"button"} onClick={h.pick} aria-label={h.aria} style={{"flex": "1", "height": "100%", "display": "flex", "flexDirection": "column", "justifyContent": "flex-end", "alignItems": "stretch", "gap": "6px", "padding": "0", "border": "0", "background": "transparent"}}>
                  <span className={"num"} style={{"fontSize": "12px", "fontWeight": "600", "textAlign": "center", "color": h.ink}}>
                    {h.k}
                  </span>
                  <span className={"h-a"} style={{"display": "block", "height": String(h.h) + "%", "borderRadius": "10px 10px 2px 2px", "background": h.col, "outline": h.outline, "outlineOffset": "3px"}}>
                  </span>
                </button>
              </React.Fragment>)}
            </div>
            <div style={{"display": "flex", "gap": "14px", "padding": "0 4px"}}>
              {(v.hist || []).map((h, index0) => <React.Fragment key={index0}>
                <span className={"mono"} style={{"flex": "1", "textAlign": "center", "fontSize": "11.5px", "color": "var(--muted)"}}>
                  {h.y}
                </span>
              </React.Fragment>)}
            </div>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
              {v.historyNote || "t CO₂e · click a year"}
            </span>
          </section>
          <section className={"card rise"} aria-label={"Scope 1 and 2 shift"} style={{"--i": "4", "flex": "1 1 420px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
            <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "baseline"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {"Scope 1 and 2"}
              </h2>
              <div style={{"display": "flex", "gap": "12px", "fontSize": "12px", "color": "var(--muted)"}}>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "10px", "height": "10px", "borderRadius": "3px", "background": "var(--clay)"}}>
                  </span>
                  {"Scope 1"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "10px", "height": "10px", "borderRadius": "3px", "background": "var(--baltic)"}}>
                  </span>
                  {"Scope 2"}
                </span>
              </div>
            </div>
            <div style={{"position": "relative", "height": "240px", "display": "flex", "alignItems": "flex-end", "gap": "14px", "padding": "0 4px", "borderBottom": "1px solid var(--line-2)"}}>
              {(v.s12 || []).map((h, index0) => <React.Fragment key={index0}>
                <div style={{"flex": "1", "height": "100%", "display": "flex", "alignItems": "flex-end", "justifyContent": "center", "gap": "4px"}}>
                  <span className={"h-a"} title={h.t1} style={{"display": "block", "width": "42%", "height": String(h.a) + "%", "borderRadius": "6px 6px 2px 2px", "background": "var(--clay)"}}>
                  </span>
                  <span className={"h-a"} title={h.t2} style={{"display": "block", "width": "42%", "height": String(h.b) + "%", "borderRadius": "6px 6px 2px 2px", "background": "var(--baltic)"}}>
                  </span>
                </div>
              </React.Fragment>)}
            </div>
            <div style={{"display": "flex", "gap": "14px", "padding": "0 4px"}}>
              {(v.s12 || []).map((h, index0) => <React.Fragment key={index0}>
                <span className={"mono"} style={{"flex": "1", "textAlign": "center", "fontSize": "11.5px", "color": "var(--muted)"}}>
                  {h.y}
                </span>
              </React.Fragment>)}
            </div>
            <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
              {v.scopeHistoryNote || "Plants switched from bought energy to own boilers (2021, 2023)."}
            </span>
          </section>
        </div>
        <section className={"card rise"} aria-label={"Data feeds"} style={{"--i": "5", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "baseline"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"Data sources"}
            </h2>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
              {this.state.remote ? 'Source feeds · review required' : 'Checks simulated'}
            </span>
          </div>
          <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", "gap": "12px"}}>
            {(v.feeds || []).map((f, index0) => <React.Fragment key={index0}>
              <div className={"lift rise"} style={{"--i": f.i, "display": "flex", "gap": "12px", "alignItems": "center", "padding": "14px", "borderRadius": "14px", "border": "1px solid var(--line)", "background": "#fff"}}>
                <svg width={"44"} height={"44"} viewBox={"0 0 44 44"} aria-hidden={"true"} style={{"flex": "none", "transform": "rotate(-90deg)"}}>
                  <circle cx={"22"} cy={"22"} r={"18"} fill={"none"} stroke={"#EBEFEE"} strokeWidth={"5"}>
                  </circle>
                  <circle cx={"22"} cy={"22"} r={"18"} fill={"none"} stroke={f.col} strokeWidth={"5"} strokeLinecap={"round"} strokeDasharray={f.dash} className={"dash-a"}>
                  </circle>
                </svg>
                <div style={{"flex": "1", "minWidth": "0", "display": "flex", "flexDirection": "column", "gap": "3px"}}>
                  <span style={{"fontSize": "13.5px", "fontWeight": "600", "overflow": "hidden", "textOverflow": "ellipsis", "whiteSpace": "nowrap"}}>
                    {f.name}
                  </span>
                  <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
                    {f.rows}
                  </span>
                </div>
                <span className={"pill " + String(f.cls)}>
                  {f.st}
                </span>
              </div>
            </React.Fragment>)}
          </div>
        </section>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "20px", "alignItems": "flex-start"}}>
          <section className={"card rise"} aria-label={"Data-quality findings"} style={{"--i": "6", "flex": "2 1 560px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "10px"}}>
            <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "baseline"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {"Data checks"}
              </h2>
              <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
                {String(v.openCount) + " open"}
              </span>
            </div>
            {(v.issues || []).map((q, index0) => <React.Fragment key={index0}>
              <div className={"rise"} style={{"display": "flex", "flexWrap": "wrap", "gap": "12px", "alignItems": "center", "padding": "12px", "borderRadius": "14px", "border": "1px solid var(--line)", "background": q.bg, "opacity": q.op, "transition": "opacity .4s, background .4s"}}>
                <span className={"mono"} style={{"flex": "0 0 150px", "fontSize": "12.5px", "fontWeight": "500", "color": "var(--clay-ink)"}}>
                  {q.type}
                </span>
                <span style={{"flex": "1 1 220px", "minWidth": "0", "display": "flex", "flexDirection": "column", "gap": "2px"}}>
                  <span style={{"fontSize": "13.5px", "fontWeight": "600"}}>
                    {q.what}
                  </span>
                  <span className={"mono"} style={{"fontSize": "11.5px", "color": "var(--muted)"}}>
                    {q.key}
                  </span>
                </span>
                <span style={{"flex": "0 0 110px", "display": "flex", "flexDirection": "column", "gap": "4px"}}>
                  <span style={{"fontSize": "11px", "color": "var(--muted)"}}>
                    {q.confidenceLabel || ("Confidence " + String(q.conf) + " %")}
                  </span>
                  <span style={{"display": "block", "height": "6px", "borderRadius": "999px", "background": "var(--sunk)", "overflow": "hidden"}}>
                    <span className={"w-a"} style={{"display": "block", "height": "100%", "width": String(q.conf) + "%", "background": "var(--clay)", "borderRadius": "999px"}}>
                    </span>
                  </span>
                </span>
                {q.open ? <>
                  <span style={{"display": "flex", "gap": "6px"}}>
                    <button type={"button"} className={"btn"} onClick={q.accept} style={{"minHeight": "36px", "padding": "0 12px", "fontSize": "13px"}}>
                      {"Confirm"}
                    </button>
                    <button type={"button"} className={"btn"} onClick={q.dismiss} style={{"minHeight": "36px", "padding": "0 12px", "fontSize": "13px"}}>
                      {"Dismiss"}
                    </button>
                  </span>
                </> : null}
                {q.closed ? <>
                  <span className={"pill " + String(q.ccls) + " swap-a"}>
                    {q.ctxt}
                  </span>
                </> : null}
              </div>
            </React.Fragment>)}
            <div style={{"padding": "10px 14px", "borderRadius": "12px", "background": "var(--sunk)", "fontSize": "12.5px", "color": "var(--ink-2)"}}>
              {this.state.remote ? 'Deterministic draft checks. A disposition does not correct source values or remove numerical blockers.' : 'Not flagged on purpose: credit notes, vessel lots in tonnes, seasonal meter peaks.'}
            </div>
          </section>
          <section className={"card rise"} aria-label={"Supplier data coverage"} style={{"--i": "7", "flex": "1 1 320px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"Supplier data"}
            </h2>
            <div style={{"display": "flex", "gap": "16px", "alignItems": "center"}}>
              <svg width={"120"} height={"120"} viewBox={"0 0 120 120"} role={"img"} aria-label={v.supplierAria || "24 of 86 suppliers provide product carbon footprints"} style={{"flex": "none", "transform": "rotate(-90deg)"}}>
                <circle cx={"60"} cy={"60"} r={"48"} fill={"none"} stroke={"#EBEFEE"} strokeWidth={"16"}>
                </circle>
                <circle cx={"60"} cy={"60"} r={"48"} fill={"none"} stroke={"#5AA9F0"} strokeWidth={"16"} strokeDasharray={v.pcfDash} className={"dash-a"}>
                </circle>
              </svg>
              <div style={{"display": "flex", "flexDirection": "column", "gap": "4px"}}>
                <span className={"num"} style={{"fontSize": "32px", "fontWeight": "600"}}>
                  {String(v.n.pcf) + " "}
                  <span style={{"fontSize": "16px", "color": "var(--muted)"}}>
                    {v.supplierTotal ?? "of 86"}
                  </span>
                </span>
                <span style={{"fontSize": "13px", "color": "var(--muted)"}}>
                  {"suppliers share a product footprint"}
                </span>
              </div>
            </div>
            {v.supplierNote && <p style={{fontSize:12.5,color:'var(--muted)',margin:0}}>{v.supplierNote}</p>}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
              {(v.sbti || []).map((b, index0) => <React.Fragment key={index0}>
                <div style={{"display": "grid", "gridTemplateColumns": "110px 1fr 36px", "gap": "10px", "alignItems": "center", "fontSize": "13px"}}>
                  <span>
                    {b.l}
                  </span>
                  <span style={{"display": "block", "height": "10px", "borderRadius": "999px", "background": "var(--sunk)", "overflow": "hidden"}}>
                    <span className={"w-a"} style={{"display": "block", "height": "100%", "width": String(b.w) + "%", "background": b.c, "borderRadius": "999px"}}>
                    </span>
                  </span>
                  <span className={"num r"} style={{"fontWeight": "600"}}>
                    {b.v}
                  </span>
                </div>
              </React.Fragment>)}
            </div>
            <button type={"button"} className={"ev"} onClick={v.trSup} style={{"alignSelf": "flex-start"}}>
              {v.supplierSourceLabel || "suppliers.csv · SBTi status"}
            </button>
          </section>
        </div>
      </div>
    </>;
  }
}
