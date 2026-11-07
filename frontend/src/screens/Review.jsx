import React from 'react';

const ITEMS = [
  { id: 'RV-101', status: 'blocked', kind: 'Inventory line', owner: 'Sustainability team', title: '2025 inventory · Scope 3 draft', value: '71 534 593', unit: 'tCO₂e as drafted', ver: 2,
    sum: 'The preliminary 2025 Scope 3 line is 300× the 2024 value. Scope 1 and Scope 2 drafts are also far off trend.',
    nodes: [['Source file', 'draft_report_summary_2025.csv', 'report:2025:scope3'], ['Check', 'Trend vs published 2024', '238 410 → 71 534 593'], ['Rule', 'Issue type unit_error', 'TASKS_AND_SCORING.md'], ['Result', 'Blocked from the inventory', 'until source rows are fixed'], ['Review', 'Sustainability team', 'pending']],
    assume: ['Compared with published_inventory_history.csv, year 2024.', 'Draft status is preliminary.', 'No structural change explains a 300× jump.'],
    ai: 'High confidence (97 %) of a unit error, for example kilograms booked as tonnes. Fix the source rows, then recalculate the inventory.' },
  { id: 'RV-102', status: 'review', kind: 'Base year', owner: 'Sustainability team', title: 'Base-year recalculation after the Foodhills acquisition', value: '~300', unit: 'Swedish pea growers enter Scope 3', ver: 1,
    sum: 'Foodhills AB (Bjuv, frozen peas) joined the group on 27 Nov 2025. The SBTi base year must include it.',
    nodes: [['Source file', 'structural_events.csv', '2025-11-27 · acquisition'], ['Rule', 'Base-year recalculation', 'framework_digest.md · GHG Protocol'], ['Linked data', 'foodhills_odlingsdata_se.csv', '2 683 rows'], ['Result', 'Recalculated base year', 'draft'], ['Review', 'Sustainability team', 'pending']],
    assume: ['2025 is the SBTi base year.', 'Swedish grower data maps to the same crop categories as Finland.', 'Bjuv site data from 2025 onwards (sites.csv).'],
    ai: 'The Swedish grower file uses its own column names and units. Confirm the field mapping before the base year is recalculated.' },
  { id: 'RV-103', status: 'draft', kind: 'Calculation', owner: 'Logistics', title: 'Freight 2025 · 2 339 legs recalculated', value: '9 437', unit: 'tCO₂e', ver: 1,
    sum: 'Every 2025 shipment leg recalculated as tonnes × kilometres × mode factor, with the source row and factor version kept per leg.',
    nodes: [['Source file', 'shipments.csv', 'year = 2025 · 2 339 legs'], ['Emission factor', 'emission_factor_library.csv', 'EF-TKM-* · v2025'], ['Calculation', 'Σ t × km × factor', '7 434 road + 2 003 sea'], ['Check', 'Missing legs and mode labels', 'missing_leg · mode_mislabel'], ['Review', 'Logistics', 'pending']],
    assume: ['Recorded distances are used as given.', 'Well-to-wheel factors per GLEC-style framework.', 'New shipments without distances go through the route lookup and are flagged as estimates.'],
    ai: 'Totals reconcile with tonne-km per mode. Road carries 79 % of freight emissions.' },
  { id: 'RV-104', status: 'review', kind: 'Lever', owner: 'Logistics', title: 'Lever L20 · HVO100 abatement recomputed', value: '3 139', unit: 'tCO₂e vs 3 200 design', ver: 2,
    sum: 'The lever catalogue gives a design estimate. Navigator recomputed it from 2025 dry-truck tonne-km.',
    nodes: [['Source file', 'decarbonisation_levers.csv', 'L20 · 3 200 t design'], ['Linked data', 'shipments.csv', '43.6 M tkm dry truck'], ['Calculation', '(0.092 − 0.020) kg/tkm', '= 3 139 t'], ['Check', 'Within 2 % of design', 'consistent'], ['Review', 'Logistics', 'pending']],
    assume: ['Applies to dry trucking only; no HVO factor for temperature-controlled trucks in the library.', 'HVO100 factor EF-TKM-TRUCK-HVO, version 2025.'],
    ai: 'Consistent with the design value. The trade-off is HVO feedstock sustainability; ask carriers for feedstock evidence.' },
  { id: 'RV-105', status: 'draft', kind: 'Nature', owner: 'Farm advisors', title: 'Catchment priority 2025 · SBTN step 2', value: '42', unit: 'catchments ranked', ver: 1,
    sum: 'Pressure × state ranking of catchments with Apetit contract parcels, using the D1 formula.',
    nodes: [['Source file', 'catchments.csv', '42 catchments'], ['Linked data', 'parcels.geojson · parcels.csv', '14 213 parcels'], ['Calculation', 'D1 priority formula', '× state weight × p_sensitivity'], ['Check', 'Calibrated to monitored loads', '15 outlets · 2019–2025'], ['Review', 'Farm advisors', 'pending']],
    assume: ['State weights: good 1.0, moderate 1.2, poor 1.5, bad 1.8.', 'Monitored loads include non-contract farmland and natural background.'],
    ai: 'CA18 (lake, bad status) ranks highest in south-west Finland. Field-level loads carry ±10–15 % sampling uncertainty.' },
  { id: 'RV-106', status: 'approved', kind: 'Inventory', owner: 'Sustainability team', title: '2024 inventory published', value: '244 724', unit: 'tCO₂e', ver: 4,
    sum: 'Scope 1: 6 251, Scope 2 (market): 63, Scope 3: 238 410 tCO₂e.',
    nodes: [['Source file', 'published_inventory_history.csv', 'year = 2024'], ['Calculation', 'Scope 1 + 2 + 3', '= 244 724'], ['Review', 'Sustainability team', 'approved']],
    assume: ['Market-based Scope 2.', 'GHG Protocol Corporate and Scope 3 standards.'],
    ai: 'No open issues.' }
];
const STC = { blocked: ['p-risk', 'Blocked'], review: ['p-rev', 'In review'], draft: ['p-draft', 'AI draft'], approved: ['p-ok', 'Approved'], changes: ['p-risk', 'Changes requested'] };
const NODEC = { 'Source file': ['#E3F0FC', '#1B5E96'], 'Linked data': ['#E3F0FC', '#1B5E96'], 'Emission factor': ['#FCF1CC', '#6B4A00'], 'Calculation': ['#DFF6EA', '#0D6A3C'], 'Check': ['#FCE5DB', '#A43A14'], 'Rule': ['#EBEFEE', '#253642'], 'Result': ['#EBEFEE', '#253642'], 'Review': ['#fff', '#253642'] };
const LOG0 = [
  { when: 'Earlier', what: 'Freight 2025 recalculated by Navigator', who: 'Navigator · RV-103 · AI draft', col: '#56666F' },
  { when: 'Earlier', what: '2025 draft Scope 3 blocked by data-quality check', who: 'Navigator · RV-101 · unit_error', col: '#EF6A3A' },
  { when: 'Earlier', what: 'Emission factor library loaded, version 2025', who: 'Data pipeline · emission_factor_library.csv', col: '#5AA9F0' },
  { when: 'Earlier', what: '2024 inventory approved and published', who: 'Sustainability team · RV-106', col: '#3CCB7F' }
];

export default class Review extends React.Component {
  constructor(...a) { super(...a); const s = {}; ITEMS.forEach((i) => { s[i.id] = i.status; }); this.state = { st: s, sel: 'RV-101', filter: 'all', note: '', noteErr: false, log: LOG0, flip: 0, stamp: '' }; }
  componentDidUpdate() { if (this.state.sel !== this._sel) { const first = this._sel == null; this._sel = this.state.sel; if (!first) this.setState({ flip: this.state.flip + 1 }); } }
  act(kind) {
    const st = this.state; const it = ITEMS.find((i) => i.id === st.sel);
    if (kind === 'changes' && !st.note.trim()) { this.setState({ noteErr: true }); return; }
    const s = Object.assign({}, st.st); s[it.id] = kind;
    const entry = { when: 'Just now', what: (kind === 'approved' ? 'Approved: ' : 'Change requested: ') + it.title, who: 'Sustainability team · ' + it.id + (st.note.trim() ? ' · “' + st.note.trim() + '”' : ''), col: kind === 'approved' ? '#3CCB7F' : '#EF6A3A', fresh: true };
    this.setState({ st: s, note: '', noteErr: false, log: [entry].concat(st.log.map((l) => Object.assign({}, l, { fresh: false }))) });
    if (this.props.onToast) this.props.onToast(kind === 'approved' ? 'Approved and logged to the audit trail' : 'Change requested · ' + it.owner + ' notified');
  }
  viewModel() {
    const st = this.state; const sel = ITEMS.find((i) => i.id === st.sel) || ITEMS[0]; const sStat = st.st[sel.id];
    const match = (i) => st.filter === 'all' || (st.filter === 'waiting' ? (st.st[i.id] === 'review' || st.st[i.id] === 'draft' || st.st[i.id] === 'changes') : st.st[i.id] === st.filter);
    const list = ITEMS.filter(match);
    const cnt = (f) => ITEMS.filter((i) => f === 'all' || (f === 'waiting' ? ['review', 'draft', 'changes'].indexOf(st.st[i.id]) > -1 : st.st[i.id] === f)).length;
    return {
      filters: [['all', 'All'], ['waiting', 'Waiting'], ['blocked', 'Blocked'], ['approved', 'Approved']].map((f) => ({ label: f[1], n: String(cnt(f[0])), on: st.filter === f[0] ? 'true' : 'false', pick: () => this.setState({ filter: f[0] }) })),
      queue: list.map((i) => ({ title: i.title, kind: i.kind, owner: i.owner, cls: STC[st.st[i.id]][0], st: STC[st.st[i.id]][1], sel: i.id === sel.id ? 'true' : 'false', bg: i.id === sel.id ? '#F6FBF8' : '#fff', bd: i.id === sel.id ? 'var(--spruce)' : 'var(--line)', dx: i.id === sel.id ? 4 : 0, pick: () => this.setState({ sel: i.id, note: '', noteErr: false }) })),
      empty: list.length === 0, flipCls: st.flip % 2 ? 'swap-a' : 'swap-b',
      d: {
        id: sel.id, ver: String(sel.ver), title: sel.title, sum: sel.sum, value: sel.value, unit: sel.unit, cls: STC[sStat][0], st: STC[sStat][1], approved: sStat === 'approved' && sel.status !== 'approved',
        nodes: sel.nodes.map((n, k) => ({ k: n[0], t: n[1], id: n[2], i: k, bg: (NODEC[n[0]] || NODEC.Rule)[0], ink: (NODEC[n[0]] || NODEC.Rule)[1], bd: n[0] === 'Review' ? 'var(--ink-2)' : 'transparent', arrow: k < sel.nodes.length - 1, delay: (k * 0.32).toFixed(2) + 's' })),
        assume: sel.assume, ai: sel.ai, aiBg: sel.status === 'blocked' ? 'var(--clay-50)' : 'var(--spruce-50)', aiInk: sel.status === 'blocked' ? 'var(--clay-ink)' : 'var(--spruce-ink)'
      },
      note: st.note, noteErr: st.noteErr, setNote: (e) => this.setState({ note: e.target.value, noteErr: false }),
      submit: (e) => { e.preventDefault(); }, approve: () => this.act('approved'), reqChange: () => this.act('changes'),
      log: st.log.map((l) => Object.assign({}, l, { anim: l.fresh ? 'rise' : '' }))
    };
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "20px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <div role={"group"} aria-label={"Filter the queue"} style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
          {(v.filters || []).map((f, index0) => <React.Fragment key={index0}>
            <button type={"button"} className={"chipbtn"} aria-pressed={f.on} onClick={f.pick}>
              {String(f.label) + " · " + String(f.n)}
            </button>
          </React.Fragment>)}
        </div>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "20px", "alignItems": "flex-start"}}>
          <section className={"card rise"} aria-label={"Review queue"} style={{"flex": "1 1 340px", "minWidth": "0", "padding": "10px", "display": "flex", "flexDirection": "column", "gap": "6px"}}>
            {(v.queue || []).map((q, index0) => <React.Fragment key={index0}>
              <button type={"button"} onClick={q.pick} aria-pressed={q.sel} style={{"display": "flex", "flexDirection": "column", "alignItems": "flex-start", "gap": "6px", "width": "100%", "padding": "14px", "borderRadius": "14px", "border": "1px solid " + String(q.bd), "background": q.bg, "textAlign": "left", "transition": "background .25s, border-color .25s, transform .25s var(--spring)", "transform": "translateX(" + String(q.dx) + "px)"}}>
                <span style={{"display": "flex", "width": "100%", "justifyContent": "space-between", "gap": "8px", "alignItems": "center"}}>
                  <span className={"pill " + String(q.cls)}>
                    {q.st}
                  </span>
                  <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
                    {q.kind}
                  </span>
                </span>
                <span style={{"fontSize": "14px", "fontWeight": "600", "lineHeight": "1.35"}}>
                  {q.title}
                </span>
                <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
                  {q.owner}
                </span>
              </button>
            </React.Fragment>)}
            {v.empty ? <>
              <div style={{"padding": "24px", "textAlign": "center", "fontSize": "14px", "color": "var(--muted)"}}>
                {"Nothing here. Pick another filter."}
              </div>
            </> : null}
          </section>
          <section className={"card rise"} aria-label={"Item detail"} style={{"--i": "1", "flex": "2 1 560px", "minWidth": "0", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "position": "relative", "overflow": "hidden"}}>
            <div className={v.flipCls} style={{"display": "flex", "flexDirection": "column", "gap": "18px"}}>
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "12px", "alignItems": "flex-start", "justifyContent": "space-between"}}>
                <div style={{"flex": "1 1 300px"}}>
                  <div style={{"display": "flex", "gap": "8px", "alignItems": "center"}}>
                    <span className={"pill " + String(v.d.cls)}>
                      {v.d.st}
                    </span>
                    <span className={"mono"} style={{"fontSize": "12px", "color": "var(--muted)"}}>
                      {String(v.d.id) + " · version " + String(v.d.ver)}
                    </span>
                  </div>
                  <h2 className={"h-d"} style={{"fontSize": "24px", "fontWeight": "600", "marginTop": "10px", "lineHeight": "1.2"}}>
                    {v.d.title}
                  </h2>
                  <p style={{"margin": "6px 0 0", "fontSize": "14px", "color": "var(--muted)", "lineHeight": "1.5"}}>
                    {v.d.sum}
                  </p>
                </div>
                <div style={{"textAlign": "right"}}>
                  <div className={"num"} style={{"fontSize": "34px", "fontWeight": "600"}}>
                    {v.d.value}
                  </div>
                  <div style={{"fontSize": "13px", "color": "var(--muted)"}}>
                    {v.d.unit}
                  </div>
                </div>
              </div>
              <div>
                <div className={"eyebrow"} style={{"fontSize": "11px", "marginBottom": "10px"}}>
                  {"Where it comes from"}
                </div>
                <div style={{"overflowX": "auto", "paddingBottom": "6px"}}>
                  <div style={{"display": "flex", "alignItems": "stretch", "minWidth": "640px"}}>
                    {(v.d.nodes || []).map((nd, index0) => <React.Fragment key={index0}>
                      <div style={{"flex": "1", "display": "flex", "alignItems": "center"}}>
                        <div className={"rise"} style={{"--i": nd.i, "flex": "1", "minWidth": "0", "padding": "12px", "borderRadius": "14px", "border": "1px solid " + String(nd.bd), "background": nd.bg, "display": "flex", "flexDirection": "column", "gap": "4px"}}>
                          <span className={"eyebrow"} style={{"fontSize": "10.5px", "color": nd.ink}}>
                            {nd.k}
                          </span>
                          <span style={{"fontSize": "13px", "fontWeight": "600", "lineHeight": "1.3"}}>
                            {nd.t}
                          </span>
                          <span className={"mono"} style={{"fontSize": "11px", "color": "var(--baltic-ink)", "wordBreak": "break-word"}}>
                            {nd.id}
                          </span>
                        </div>
                        {nd.arrow ? <>
                          <div aria-hidden={"true"} style={{"flex": "0 0 28px", "position": "relative", "height": "2px", "background": "var(--line-2)", "overflow": "visible"}}>
                            <span style={{"position": "absolute", "top": "-3px", "width": "8px", "height": "8px", "marginLeft": "-4px", "borderRadius": "50%", "background": "var(--spruce)", "animation": "travel 1.6s linear infinite", "animationDelay": nd.delay}}>
                            </span>
                          </div>
                        </> : null}
                      </div>
                    </React.Fragment>)}
                  </div>
                </div>
              </div>
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", "gap": "14px"}}>
                <div style={{"padding": "14px", "borderRadius": "14px", "background": "var(--sunk)", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                  <span className={"eyebrow"} style={{"fontSize": "11px"}}>
                    {"Assumptions"}
                  </span>
                  {(v.d.assume || []).map((a, index0) => <React.Fragment key={index0}>
                    <span style={{"display": "flex", "gap": "8px", "fontSize": "13px", "lineHeight": "1.45"}}>
                      <span aria-hidden={"true"} style={{"flex": "none", "width": "6px", "height": "6px", "marginTop": "7px", "borderRadius": "50%", "background": "var(--ink-2)"}}>
                      </span>
                      {a}
                    </span>
                  </React.Fragment>)}
                </div>
                <div style={{"padding": "14px", "borderRadius": "14px", "background": v.d.aiBg, "color": v.d.aiInk, "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                  <span className={"eyebrow"} style={{"fontSize": "11px", "color": "inherit"}}>
                    {"Automatic check"}
                  </span>
                  <span style={{"fontSize": "13px", "lineHeight": "1.5"}}>
                    {v.d.ai}
                  </span>
                </div>
              </div>
              <form onSubmit={v.submit} style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                <label className={"lbl"} htmlFor={"rv-c"} style={{"margin": "0"}}>
                  {"Reviewer note"}
                </label>
                <textarea id={"rv-c"} className={"field"} rows={"3"} value={v.note} onChange={v.setNote} placeholder={"Add a note"} style={{"padding": "10px 12px", "resize": "vertical", "minHeight": "84px", "lineHeight": "1.5"}}>
                </textarea>
                {v.noteErr ? <>
                  <div role={"alert"} style={{"fontSize": "12.5px", "color": "var(--clay-ink)"}}>
                    {"Add a short note so the change request is clear to the owner."}
                  </div>
                </> : null}
                <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
                  <button type={"button"} className={"btn btn-p"} onClick={v.approve} disabled={v.d.st === 'Blocked' || v.d.st === 'Published source'}>
                    {"Approve"}
                  </button>
                  <button type={"button"} className={"btn"} onClick={v.reqChange}>
                    {"Request change"}
                  </button>
                </div>
              </form>
            </div>
            {v.d.approved ? <>
              <div aria-hidden={"true"} style={{"position": "absolute", "right": "26px", "top": "86px", "padding": "8px 18px", "border": "4px solid var(--spruce)", "borderRadius": "12px", "color": "var(--spruce)", "fontFamily": "var(--f-d)", "fontSize": "24px", "fontWeight": "700", "letterSpacing": ".1em", "background": "rgba(255,255,255,.85)", "animation": "stamp .6s var(--spring) both"}}>
                {"APPROVED"}
              </div>
            </> : null}
          </section>
        </div>
        <section className={"card rise"} aria-label={"Audit trail"} style={{"--i": "2", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "baseline"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"Audit trail"}
            </h2>
          </div>
          <ol style={{"listStyle": "none", "margin": "0", "padding": "0", "display": "flex", "flexDirection": "column"}}>
            {(v.log || []).map((l, index0) => <React.Fragment key={index0}>
              <li className={l.anim} style={{"display": "grid", "gridTemplateColumns": "96px 18px 1fr", "gap": "12px", "alignItems": "start", "padding": "10px 0", "borderBottom": "1px solid var(--line)"}}>
                <span className={"mono"} style={{"fontSize": "12px", "color": "var(--muted)", "paddingTop": "1px"}}>
                  {l.when}
                </span>
                <span aria-hidden={"true"} style={{"width": "10px", "height": "10px", "marginTop": "4px", "borderRadius": "50%", "background": l.col}}>
                </span>
                <span style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
                  <span style={{"fontSize": "13.5px", "fontWeight": "600"}}>
                    {l.what}
                  </span>
                  <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
                    {l.who}
                  </span>
                </span>
              </li>
            </React.Fragment>)}
          </ol>
        </section>
      </div>
    </>;
  }
}
