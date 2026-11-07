import React from 'react';

const W = { good: 1.0, moderate: 1.2, poor: 1.5, bad: 1.8 };
const COL = { good: '#3CCB7F', moderate: '#F2C230', poor: '#EF6A3A', bad: '#B3261E' };
const REG = { FI: { t: 'South-west Finland', places: [['Säkylä', 22.2538, 61.0787], ['Rauma', 21.51, 61.13], ['Pori', 21.8, 61.48], ['Turku', 22.27, 60.45]] }, SE: { t: 'Skåne', places: [['Bjuv', 12.92, 56.084], ['Malmö', 13.0, 55.6], ['Lund', 13.19, 55.7]] } };
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const med = (a) => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export default class Nature extends React.Component {
  constructor(...a) { super(...a); this.state = { data: null, reg: 'FI', catch: 10, nred: 0, buf: false, sel: null, par: true, tv: {}, loading: true };
    this.canvasRef = (el) => { if (el && el !== this._cv) { this._cv = el; this.boot(); } }; }
  componentDidMount() { fetch('/demo/nature.json').then((r) => r.json()).then((d) => { if (this._dead) return; const C = d.catchments; this.medP = med(C.map((c) => c.ha * 0.85)); this.medN = med(C.map((c) => c.ha * 14)); this.setState({ data: d, loading: false }); this.boot(); }).catch(() => this.setState({ loading: false })); }
  componentDidUpdate() { this.boot(); this.sync(); }
  componentWillUnmount() { this._dead = true; cancelAnimationFrame(this._twr); clearTimeout(this._retry); if (this.map) this.map.dispose(); }
  calc() {
    const st = this.state, D = st.data; if (!D) return null; const c = st.catch / 100, nr = st.nred / 100;
    const fp = Math.max(0.2, 1 - c * 0.3 - (st.buf ? 0.15 : 0)), fn = Math.max(0.2, 1 - c * 0.45 - nr * 0.5);
    const rows = D.catchments.map((k) => { const p = k.ha * 0.85 * (1 - (k.buf || 0) * 0.15) * fp, n = k.ha * 14 * fn; return Object.assign({}, k, { p, n, pr: (p / this.medP + 0.5 * n / this.medN) * W[k.status] * k.psens }); });
    const reg = rows.filter((r) => r.reg === st.reg).sort((a, b) => b.pr - a.pr); reg.forEach((r, i) => { r.rank = i + 1; });
    const P0 = D.catchments.reduce((s, k) => s + k.ha * 0.85 * (1 - (k.buf || 0) * 0.15), 0), N0 = D.catchments.reduce((s, k) => s + k.ha * 14, 0);
    return { rows, reg, P: rows.reduce((s, r) => s + r.p, 0), N: rows.reduce((s, r) => s + r.n, 0), P0, N0 };
  }
  sync() {
    const st = this.state; if (!st.data) return; const k = [st.catch, st.nred, st.buf].join('|');
    if (k !== this._k) { this._k = k; const c = this.calc(); this.tween({ p: c.P / 1000, nn: c.N / 1000, pd: (c.P / c.P0 - 1) * 100, nd: (c.N / c.N0 - 1) * 100 }); if (this.map) { const by = {}; c.rows.forEach((r) => { by[r.id] = r; }); this.map.updateCatchments((it) => (by[it.id] ? { h: 0.12 + by[it.id].pr * 0.38 } : null)); } }
    const k2 = st.reg; if (k2 !== this._k2 && this.map && this._ready) { this._k2 = k2; this.rebuild(); }
  }
  tween(to) { const from = Object.assign({}, this.state.tv), t0 = performance.now(); cancelAnimationFrame(this._twr); const step = (t) => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3), tv = {}; for (const k in to) { const a = from[k] != null ? from[k] : to[k]; tv[k] = a + (to[k] - a) * e; } this.setState({ tv }); if (p < 1) this._twr = requestAnimationFrame(step); }; this._twr = requestAnimationFrame(step); }
  boot() {
    if (this._booted || !this._cv || !this.state.data) return;
    if (!window.THREE || !window.NavMap) { this._retry = setTimeout(() => this.boot(), 150); return; }
    this._booted = true; window.NavMap.ready.then(() => { if (this._dead) return; this.rebuild(); this._k2 = this.state.reg; this._k = null; this._ready = true; this.sync(); });
  }
  rebuild() {
    const st = this.state, D = st.data; if (this.map) { this.map.dispose(true); this.map = null; }
    const cs = D.catchments.filter((c) => c.reg === st.reg); let a = 1e9, b = -1e9, c = 1e9, d = -1e9; cs.forEach((k) => k.ring.forEach((p) => { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); }));
    const pad = 0.35; const bounds = [a - pad * 2, c - pad, b + pad * 2, d + pad];
    try {
      const m = this.map = window.NavMap.create(this._cv, { bounds, scale: 60, relief: 0.12, view: { lon: (a + b) / 2, lat: (c + d) / 2 - 0.05, dist: (d - c) * 60 * 1.5, pol: 0.82, az: 0.15 }, minDist: 4, onPick: (h) => this.pick(h) });
      const calc = this.calc(); const by = {}; calc.rows.forEach((r) => { by[r.id] = r; });
      m.setCatchments(cs.map((k) => ({ id: k.id, ring: k.ring, color: COL[k.status], h: 0.12 + by[k.id].pr * 0.38, k })));
      const idx = {}; D.catchments.forEach((k, i) => { idx[i] = k.reg; });
      const pc = (pt) => (pt < 0 ? '#9DB2C1' : pt < 6 ? '#5AA9F0' : pt < 12 ? '#F2C230' : '#EF6A3A');
      m.setPoints('parcels', D.parcels.filter((p) => idx[p[3]] === st.reg).map((p) => ({ id: 'p', lon: p[0], lat: p[1], color: pc(p[4]) })), 2.5);
      m.setLayerVisible('parcels', st.par);
    } catch (e) { console.warn('map', e); }
  }
  pick(h) { if (h && h.kind === 'catch') { this.setState({ sel: h.id }); this.highlight(h.id); } else if (!h) { this.setState({ sel: null }); this.highlight(null); } }
  highlight(id) { if (!this.map) return; this.map.updateCatchments((it) => ({ opacity: !id || it.id === id ? 0.8 : 0.35, edge: it.id === id ? 1 : 0.35 })); }
  focus(r) { this.setState({ sel: r.id }); this.highlight(r.id); if (this.map) { const xs = r.ring.map((p) => p[0]), ys = r.ring.map((p) => p[1]); this.map.flyTo((Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2, 60, 0.8); } }
  viewModel() {
    const st = this.state, tv = st.tv || {}; const c = this.calc(); const tr = (o) => () => { if (this.props.onTrace) this.props.onTrace(o); };
    const base = { canvasRef: this.canvasRef, loading: st.loading, regions: ['FI', 'SE'].map((k) => ({ t: REG[k].t, on: st.reg === k ? 'true' : 'false', pick: () => this.setState({ reg: k, sel: null }) })),
      par: st.par, parStr: st.par ? 'true' : 'false', togglePar: () => { this.setState({ par: !st.par }); if (this.map) this.map.setLayerVisible('parcels', !st.par); },
      labels: REG[st.reg].places.map((p) => ({ t: p[0], lon: p[1], lat: p[2], h: 0.3 })),
      zin: () => this.map && this.map.zoomIn(), zout: () => this.map && this.map.zoomOut(), zreset: () => { if (this.map) this.map.reset(); },
      catchPct: String(st.catch), nPct: String(st.nred), bufStr: st.buf ? 'true' : 'false', setCatch: (e) => this.setState({ catch: Number(e.target.value) }), setN: (e) => this.setState({ nred: Number(e.target.value) }), toggleBuf: () => this.setState({ buf: !st.buf }),
      n: { p: (tv.p || 0).toFixed(1), nn: fmt(tv.nn || 0), pd: ((tv.pd || 0) > 0.05 ? '+' : '−') + Math.abs(tv.pd || 0).toFixed(1), nd: ((tv.nd || 0) > 0.05 ? '+' : '−') + Math.abs(tv.nd || 0).toFixed(1) },
      pInk: (tv.pd || 0) < -0.05 ? 'var(--pea-ink)' : 'var(--muted)', nInk: (tv.nd || 0) < -0.05 ? 'var(--pea-ink)' : 'var(--muted)', clearSel: () => this.pick(null) };
    if (!c) return Object.assign(base, { top: [], hasSel: false, sel: { rows: [] } });
    const mx = c.reg[0].pr; const S = st.sel ? c.reg.find((r) => r.id === st.sel) : null;
    return Object.assign(base, {
      top: c.reg.slice(0, 5).map((r) => ({ rank: String(r.rank), id: r.id, w: (r.pr / mx * 100).toFixed(1), col: COL[r.status], score: r.pr.toFixed(1), sel: r.id === st.sel ? 'true' : 'false', bd: r.id === st.sel ? 'var(--ink)' : 'var(--line)', bg: r.id === st.sel ? 'var(--sunk)' : '#fff', pick: () => this.focus(r) })),
      hasSel: !!S,
      sel: S ? { id: S.id, sub: cap(S.type) + ' · ' + REG[S.reg].t, status: cap(S.status), col: COL[S.status], rank: S.rank + ' of ' + c.reg.length,
        rows: [{ k: 'Our fields', v: fmt(S.ha) + ' ha · ' + S.farms + ' farms' }, { k: 'Phosphorus test', v: S.pt != null ? S.pt + ' mg/l' : 'No data' }, { k: 'Buffer strips', v: Math.round(S.buf * 100) + ' % of fields' }, { k: 'Phosphorus to water', v: fmt(S.p) + ' kg' }, { k: 'Nitrogen to water', v: fmt(S.n) + ' kg' }],
        trace: tr({ title: 'Catchment ' + S.id, value: S.pr.toFixed(2), unit: 'priority · rank ' + S.rank, status: 'draft', steps: [
          { k: 'Source', t: 'catchments.csv · catchments.geojson', id: S.id, d: S.km2 + ' km² · ' + S.status + ' · phosphorus sensitivity ' + S.psens },
          { k: 'Source', t: 'parcels.csv', id: S.n + ' parcels · ' + fmt(S.ha) + ' ha', d: 'Contract fields inside this catchment.' },
          { k: 'Calculation', t: '(P/median + 0.5 × N/median) × status weight × sensitivity', id: 'weight ' + W[S.status], d: 'SBTN-style pressure × state. Load coefficients are simulated.' } ] }) } : { rows: [] }
    });
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "18px", "alignItems": "stretch"}}>
          <section className={"dark rise"} aria-label={"Catchment map"} style={{"flex": "2 1 600px", "minWidth": "0", "position": "relative", "minHeight": "620px", "overflow": "hidden"}}>
            <canvas ref={v.canvasRef} className={"canvas3d"} aria-hidden={"true"} style={{"position": "absolute", "inset": "0"}}>
            </canvas>
            {(v.labels || []).map((l, index0) => <React.Fragment key={index0}>
              <div className={"anchor"} data-anchor={"1"} data-lon={l.lon} data-lat={l.lat} data-h={l.h}>
                <span>
                  {l.t}
                </span>
              </div>
            </React.Fragment>)}
            <div style={{"position": "absolute", "left": "18px", "top": "18px", "display": "flex", "flexDirection": "column", "gap": "10px"}}>
              <div role={"group"} aria-label={"Region"} style={{"display": "flex", "gap": "6px"}}>
                {(v.regions || []).map((r, index0) => <React.Fragment key={index0}>
                  <button type={"button"} className={"mapchip"} aria-pressed={r.on} onClick={r.pick}>
                    {r.t}
                  </button>
                </React.Fragment>)}
              </div>
              <button type={"button"} className={"mapchip"} aria-pressed={v.parStr} onClick={v.togglePar} style={{"alignSelf": "flex-start"}}>
                <span className={"dot"} style={{"background": "#9DB2C1"}}>
                </span>
                {"Fields"}
              </button>
            </div>
            <div className={"mapcard"} style={{"position": "absolute", "left": "18px", "bottom": "18px", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
              <span style={{"fontSize": "12px", "fontWeight": "600", "color": "var(--night-muted)"}}>
                {"Water status · height = priority"}
              </span>
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "fontSize": "12px"}}>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "10px", "height": "10px", "borderRadius": "3px", "background": "#3CCB7F"}}>
                  </span>
                  {"Good"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "10px", "height": "10px", "borderRadius": "3px", "background": "#F2C230"}}>
                  </span>
                  {"Moderate"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "10px", "height": "10px", "borderRadius": "3px", "background": "#EF6A3A"}}>
                  </span>
                  {"Poor"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "10px", "height": "10px", "borderRadius": "3px", "background": "#B3261E"}}>
                  </span>
                  {"Bad"}
                </span>
              </div>
              {v.par ? <>
                <span style={{"fontSize": "12px", "color": "var(--night-muted)"}}>
                  {"Field dots: phosphorus test "}
                  <span style={{"color": "#5AA9F0"}}>
                    {"low"}
                  </span>
                  {" · "}
                  <span style={{"color": "#F2C230"}}>
                    {"mid"}
                  </span>
                  {" · "}
                  <span style={{"color": "#EF6A3A"}}>
                    {"high"}
                  </span>
                </span>
              </> : null}
            </div>
            <div style={{"position": "absolute", "right": "18px", "bottom": "18px", "display": "flex", "flexDirection": "column", "gap": "6px"}}>
              <button type={"button"} className={"mapbtn"} aria-label={"Zoom in"} onClick={v.zin}>
                <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                  <path d={"M12 5v14M5 12h14"}>
                  </path>
                </svg>
              </button>
              <button type={"button"} className={"mapbtn"} aria-label={"Zoom out"} onClick={v.zout}>
                <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                  <path d={"M5 12h14"}>
                  </path>
                </svg>
              </button>
              <button type={"button"} className={"mapbtn"} aria-label={"Reset view"} onClick={v.zreset}>
                <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                  <path d={"M4 12a8 8 0 1 0 2.4-5.7"}>
                  </path>
                  <path d={"M4 4v4h4"}>
                  </path>
                </svg>
              </button>
            </div>
            {v.loading ? <>
              <div style={{"position": "absolute", "inset": "0", "display": "flex", "alignItems": "center", "justifyContent": "center", "color": "var(--night-muted)"}}>
                {"Loading map…"}
              </div>
            </> : null}
            {v.hasSel ? <>
              <div className={"mapcard card-in"} style={{"position": "absolute", "right": "18px", "top": "18px", "width": "min(290px, calc(100% - 36px))", "padding": "16px", "display": "flex", "flexDirection": "column", "gap": "10px"}}>
                <div style={{"display": "flex", "gap": "10px", "alignItems": "flex-start"}}>
                  <div style={{"flex": "1"}}>
                    <div style={{"fontSize": "12px", "color": "var(--night-muted)", "fontWeight": "600"}}>
                      {v.sel.sub}
                    </div>
                    <div className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600", "marginTop": "2px"}}>
                      {v.sel.id}
                    </div>
                  </div>
                  <button type={"button"} className={"mapbtn"} aria-label={"Close details"} onClick={v.clearSel} style={{"width": "34px", "height": "34px"}}>
                    <svg width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                      <path d={"M6 6l12 12M18 6 6 18"}>
                      </path>
                    </svg>
                  </button>
                </div>
                <div style={{"display": "flex", "alignItems": "center", "gap": "8px"}}>
                  <span style={{"width": "12px", "height": "12px", "borderRadius": "3px", "background": v.sel.col}}>
                  </span>
                  <span style={{"fontSize": "14px", "fontWeight": "600"}}>
                    {v.sel.status}
                  </span>
                  <span style={{"fontSize": "13px", "color": "var(--night-muted)"}}>
                    {"· rank " + String(v.sel.rank)}
                  </span>
                </div>
                {(v.sel.rows || []).map((r, index0) => <React.Fragment key={index0}>
                  <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "fontSize": "13px", "padding": "6px 0", "borderTop": "1px solid var(--night-line)"}}>
                    <span style={{"color": "var(--night-muted)"}}>
                      {r.k}
                    </span>
                    <span style={{"fontWeight": "600"}}>
                      {r.v}
                    </span>
                  </div>
                </React.Fragment>)}
                <button type={"button"} className={"btn btn-p"} onClick={v.sel.trace} style={{"minHeight": "40px"}}>
                  {"Show calculation"}
                </button>
              </div>
            </> : null}
          </section>
          <div style={{"flex": "1 1 320px", "minWidth": "0", "display": "flex", "flexDirection": "column", "gap": "18px"}}>
            <section className={"card rise"} aria-label={"What if"} style={{"--i": "1", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "16px"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {"What if farms…"}
              </h2>
              <div>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline"}}>
                  <label className={"lbl"} htmlFor={"na-c"} style={{"margin": "0"}}>
                    {"Grow catch crops"}
                  </label>
                  <span className={"num"} style={{"fontSize": "17px", "fontWeight": "600"}}>
                    {String(v.catchPct) + " %"}
                  </span>
                </div>
                <input id={"na-c"} type={"range"} min={"0"} max={"60"} step={"5"} value={v.catchPct} onChange={v.setCatch} />
              </div>
              <div>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline"}}>
                  <label className={"lbl"} htmlFor={"na-n"} style={{"margin": "0"}}>
                    {"Use less nitrogen"}
                  </label>
                  <span className={"num"} style={{"fontSize": "17px", "fontWeight": "600"}}>
                    {String(v.nPct) + " %"}
                  </span>
                </div>
                <input id={"na-n"} type={"range"} min={"0"} max={"30"} step={"5"} value={v.nPct} onChange={v.setN} />
              </div>
              <div style={{"display": "flex", "alignItems": "center", "gap": "12px"}}>
                <button type={"button"} className={"sw"} aria-pressed={v.bufStr} aria-label={"Add buffer strips by water"} onClick={v.toggleBuf}>
                </button>
                <span style={{"fontSize": "14px", "fontWeight": "600"}}>
                  {"Add buffer strips by water"}
                </span>
              </div>
              <div style={{"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "12px", "paddingTop": "14px", "borderTop": "1px solid var(--line)"}}>
                <div>
                  <div style={{"fontSize": "12px", "color": "var(--muted)"}}>
                    {"Phosphorus to water"}
                  </div>
                  <div className={"num"} style={{"fontSize": "24px", "fontWeight": "600"}}>
                    {String(v.n.p) + " t"}
                  </div>
                  <div className={"num"} style={{"fontSize": "12.5px", "color": v.pInk}}>
                    {String(v.n.pd) + " %"}
                  </div>
                </div>
                <div>
                  <div style={{"fontSize": "12px", "color": "var(--muted)"}}>
                    {"Nitrogen to water"}
                  </div>
                  <div className={"num"} style={{"fontSize": "24px", "fontWeight": "600"}}>
                    {String(v.n.nn) + " t"}
                  </div>
                  <div className={"num"} style={{"fontSize": "12.5px", "color": v.nInk}}>
                    {String(v.n.nd) + " %"}
                  </div>
                </div>
              </div>
            </section>
            <section className={"card rise"} aria-label={"Top catchments"} style={{"--i": "2", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {"Act here first"}
              </h2>
              {(v.top || []).map((c, index0) => <React.Fragment key={index0}>
                <button type={"button"} onClick={c.pick} aria-pressed={c.sel} style={{"display": "grid", "gridTemplateColumns": "22px 58px 1fr 44px", "gap": "10px", "alignItems": "center", "width": "100%", "minHeight": "44px", "padding": "6px 10px", "borderRadius": "12px", "border": "1px solid " + String(c.bd), "background": c.bg, "textAlign": "left"}}>
                  <span className={"num"} style={{"fontWeight": "600", "color": "var(--muted)"}}>
                    {c.rank}
                  </span>
                  <span className={"mono"} style={{"fontSize": "13px", "fontWeight": "500"}}>
                    {c.id}
                  </span>
                  <span style={{"display": "block", "height": "10px", "borderRadius": "999px", "background": "var(--sunk)", "overflow": "hidden"}}>
                    <span className={"w-a"} style={{"display": "block", "height": "100%", "width": String(c.w) + "%", "background": c.col, "borderRadius": "999px"}}>
                    </span>
                  </span>
                  <span className={"num"} style={{"textAlign": "right", "fontSize": "13px", "fontWeight": "600"}}>
                    {c.score}
                  </span>
                </button>
              </React.Fragment>)}
            </section>
          </div>
        </div>
      </div>
    </>;
  }
}
