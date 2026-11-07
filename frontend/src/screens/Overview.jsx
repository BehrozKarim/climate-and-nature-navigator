import React from 'react';

const S12 = 6314, S3 = 238410, BASE = 244724, LEV = 52480;
const tgt = (y) => S12 * Math.max(0.1, 1 - 0.042 * (y - 2025)) + (y <= 2035 ? S3 * (1 - 0.025 * (y - 2025)) : S3 * (0.75 - 0.65 * (y - 2035) / 15));
const plan = (y) => BASE - LEV * Math.max(0, Math.min(1, (y - 2026) / 4));
const HIST = [[2019, 317215], [2021, 282440], [2022, 207747], [2023, 268334], [2024, 244724]];
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const SITES = [
  { id: 'S-SAK', name: 'Säkylä', lon: 22.2538, lat: 61.0787, h: 3, color: '#3CCB7F', what: 'Frozen vegetables and ready meals' },
  { id: 'S-KAN', name: 'Kantvik', lon: 24.383, lat: 60.084, h: 3, color: '#3CCB7F', what: 'Rapeseed crushing and oil' },
  { id: 'S-BJU', name: 'Bjuv', lon: 12.92, lat: 56.084, h: 3, color: '#3CCB7F', what: 'Frozen peas · joined 2025' },
  { id: 'S-HQ', name: 'Helsinki', lon: 24.962, lat: 60.185, h: 1.6, color: '#EAF2F7', what: 'Head office' },
  { id: 'S-PUD', name: 'Pudasjärvi', lon: 26.99, lat: 65.36, h: 1.4, color: '#9DB2C1', dim: true, what: 'Frozen pizza · closing 2026' }
];
const FLOWS = [
  { id: 'f1', a: [24.07, 56.99], b: [24.383, 60.084], color: '#5AA9F0', t: 'Rapeseed by sea', r: 'Riga → Kantvik' },
  { id: 'f2', a: [24.95, 59.5], b: [24.383, 60.084], color: '#5AA9F0', t: 'Rapeseed by sea', r: 'Muuga → Kantvik' },
  { id: 'f3', a: [18.65, 54.6], b: [24.383, 60.084], color: '#5AA9F0', t: 'Rapeseed by sea', r: 'Gdańsk → Kantvik' },
  { id: 'f4', a: [12.92, 56.084], b: [22.2538, 61.0787], color: '#9DB2C1', t: 'Frozen peas, road and ferry', r: 'Bjuv → Säkylä' },
  { id: 'f5', a: [22.2538, 61.0787], b: [24.962, 60.185], color: '#3CCB7F', t: 'Products by truck', r: 'Säkylä → Helsinki' },
  { id: 'f6', a: [24.383, 60.084], b: [24.962, 60.185], color: '#3CCB7F', t: 'Oil by truck', r: 'Kantvik → Helsinki' }
];
const TOWNS = [['Helsinki', 24.94, 60.17, 70], ['Turku', 22.27, 60.45, 60], ['Tampere', 23.76, 61.5, 60], ['Pori', 21.8, 61.48, 40], ['Rauma', 21.51, 61.13, 40], ['Uusikaupunki', 21.41, 60.8, 28], ['Eura', 22.13, 61.13, 20], ['Huittinen', 22.7, 61.18, 20], ['Loimaa', 23.06, 60.85, 24], ['Oulu', 25.47, 65.01, 90], ['Vaasa', 21.62, 63.1, 60], ['Stockholm', 18.07, 59.33, 90], ['Tallinn', 24.75, 59.44, 90], ['Riga', 24.11, 56.95, 90], ['Copenhagen', 12.57, 55.68, 60], ['Malmö', 13.0, 55.6, 45], ['Helsingborg', 12.69, 56.05, 32], ['Lund', 13.19, 55.7, 24], ['Landskrona', 12.83, 55.87, 20], ['Kristianstad', 14.16, 56.03, 30]];
const CROP = { pea_FI: 'Pea', pea_SE: 'Pea', rape_FI: 'Turnip rape', potato_FI: 'Potato', carrot_FI: 'Carrot' };
const STOPS = [[-8, [239, 106, 58]], [-3, [242, 194, 48]], [0, [157, 178, 193]], [3, [90, 169, 240]]];
function riskColor(v) { if (v <= STOPS[0][0]) return 'rgb(' + STOPS[0][1].join(',') + ')'; for (let i = 0; i < STOPS.length - 1; i++) { const a = STOPS[i], b = STOPS[i + 1]; if (v <= b[0]) { const t = (v - a[0]) / (b[0] - a[0]); return 'rgb(' + a[1].map((c, k) => Math.round(c + (b[1][k] - c) * t)).join(',') + ')'; } } return 'rgb(' + STOPS[3][1].join(',') + ')'; }
const sgn = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);

export default class Overview extends React.Component {
  constructor(...a) {
    super(...a);
    this.state = { tv: {}, farms: null, sel: null, lay: { farms: true, sites: true, arcs: true }, hov: null, loading: true };
    this.canvasRef = (el) => { if (el && el !== this._cv) { this._cv = el; this.boot(); } };
  }
  P() { const p = this.props || {}; const s = ['ssp126', 'ssp245', 'ssp585'].indexOf(p.scenario) > -1 ? p.scenario : 'ssp245'; let y = Number(p.year); if ([2030, 2040, 2050].indexOf(y) < 0) y = 2040; return { s, y }; }
  componentDidMount() { fetch('/demo/farms.json').then((r) => r.json()).then((f) => { if (this._dead) return; this.setState({ farms: f, loading: false }); this.boot(); }).catch(() => this.setState({ loading: false })); this.sync(true); }
  componentDidUpdate() { this.boot(); this.sync(false); }
  componentWillUnmount() { this._dead = true; clearTimeout(this._retry); cancelAnimationFrame(this._twr); if (this.map) this.map.dispose(); }
  sync(first) { const { s, y } = this.P(); const k = s + y + (this.state.farms ? 1 : 0); if (k === this._k) return; this._k = k; this.tween(this.targets()); if (this.map && this.state.farms) this.map.recolorDots('farms', (it) => riskColor(it.f.risk[s][y]), first ? null : [22.25, 61.08]); }
  targets() { const { s, y } = this.P(); const F = this.state.farms || []; const lose = F.filter((f) => f.risk[s][y] <= -3).length; return { cut: (BASE - tgt(y)) / BASE * 100, gap: plan(y) - tgt(y), lose, n: F.length || 680 }; }
  tween(to) { const from = Object.assign({}, this.state.tv), t0 = performance.now(); cancelAnimationFrame(this._twr); const step = (t) => { const p = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - p, 3), tv = {}; for (const k in to) { const a = from[k] != null ? from[k] : 0; tv[k] = a + (to[k] - a) * e; } this.setState({ tv }); if (p < 1) this._twr = requestAnimationFrame(step); }; this._twr = requestAnimationFrame(step); }
  boot() {
    if (this.map || this._booting || !this._cv || !this.state.farms || !window.THREE || !window.NavMap) { if (this._cv && (!window.THREE || !window.NavMap) && !this._retry) { this._retry = setTimeout(() => { this._retry = null; this.boot(); }, 150); } return; }
    this._booting = true; window.NavMap.ready.then(() => { if (!this._dead) this.create(); });
  }
  create() {
    const { s, y } = this.P();
    try {
      const m = this.map = window.NavMap.create(this._cv, { bounds: [10, 54.5, 31.5, 66.8], view: { lon: 19.6, lat: 59.2, dist: 120, pol: 0.72, az: 0 }, minDist: 9, onPick: (h) => this.pick(h) });
      m.setDots('farms', this.state.farms.map((f) => ({ id: f.id, lon: f.lon, lat: f.lat, r: 0.07 + Math.sqrt(Math.max(1, f.ha)) * 0.012, color: riskColor(f.risk[s][y]), f })));
      m.setSites(SITES.map((x) => Object.assign({}, x))); m.setArcs(FLOWS.map((x) => Object.assign({}, x)));
    } catch (e) { console.warn('map', e); }
  }
  paintFields(g, px, py, bb, span) {
    const P = this.parcels; if (!P || span > 3.2) return; const kmx = (px(bb[0] + 1) - px(bb[0])) / (111.32 * Math.cos((bb[1] + bb[3]) / 2 * Math.PI / 180)), kmy = (py(bb[3] - 1) - py(bb[3])) / 111.32;
    for (let i = 0; i < P.length; i++) { const p = P[i]; if (p[0] < bb[0] || p[0] > bb[2] || p[1] < bb[1] || p[1] > bb[3]) continue; const side = Math.sqrt(p[2]) / 10; const w = Math.max(1.5, side * kmx), h = Math.max(1.5, side * kmy);
      g.fillStyle = p[6] === 4 ? 'rgba(242,194,48,.42)' : 'rgba(60,203,127,.30)'; g.fillRect(px(p[0]) - w / 2, py(p[1]) - h / 2, w, h); }
  }
  pick(h) { if (!h) { this.setState({ sel: null }); if (this.map) this.map.select(null); return; } this.setState({ sel: h }); if (this.map) this.map.select(h.kind, h.id); }
  selCard() {
    const h = this.state.sel; if (!h) return null; const { s, y } = this.P(); const nav = (id) => () => { if (this.props.onNav) this.props.onNav(id); };
    if (h.kind === 'farms') { const f = h.item.f; const v = f.risk[s][y];
      return { kind: (f.reg === 'FI' ? 'Finland' : 'Sweden') + ' · ' + CROP[f.crop], title: 'Farm ' + f.id, hasBig: true, big: sgn(v) + ' %', bigLbl: 'yield by ' + y, bigCol: riskColor(v),
        rows: [{ k: 'Fields', v: fmt(f.ha) + ' ha' }, { k: 'Peat soil', v: Math.round(f.org * 100) + ' %' }, { k: 'Irrigated', v: f.irr > 0.3 ? 'Yes' : 'No' }, { k: 'Footprint', v: f.fp != null ? f.fp + ' kg/kg (' + f.fpy + ')' : 'No data' }],
        hasGo: true, goLbl: 'Open climate risk', go: nav('climate') }; }
    if (h.kind === 'sites') { const x = h.item; return { kind: 'Plant', title: x.name, hasBig: false, rows: [{ k: 'Makes', v: x.what }], hasGo: true, goLbl: 'Open emissions', go: nav('inventory') }; }
    if (h.kind === 'arcs') { const x = h.item; return { kind: 'Freight', title: x.r, hasBig: false, rows: [{ k: 'Flow', v: x.t }], hasGo: true, goLbl: 'Open freight', go: nav('freight') }; }
    return null;
  }
  viewModel() {
    const { s, y } = this.P(); const st = this.state, tv = st.tv || {}; const nav = (id) => () => { if (this.props.onNav) this.props.onNav(id); }; const tr = (o) => () => { if (this.props.onTrace) this.props.onTrace(o); };
    const L = 46, R = 590, TOP = 10, BOT = 214, YMAX = 340000; const xs = (yy) => L + (yy - 2019) / 31 * (R - L), ysc = (v) => BOT - v / YMAX * (BOT - TOP);
    const yrs = []; for (let k = 2024; k <= 2050; k++) yrs.push(k);
    const line = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + xs(p[0]).toFixed(1) + ' ' + ysc(p[1]).toFixed(1)).join(' ');
    const tp = yrs.map((k) => [k, k === 2024 ? BASE : tgt(k)]), pp = yrs.map((k) => [k, k === 2024 ? BASE : plan(k)]);
    let grid = ''; [0, 100000, 200000, 300000].forEach((v) => { grid += 'M' + L + ' ' + ysc(v).toFixed(1) + ' L' + R + ' ' + ysc(v).toFixed(1) + ' '; });
    const gapD = line(pp) + ' ' + pp.map((p, i) => [p[0], Math.min(p[1], tp[i][1])]).reverse().map((p) => 'L' + xs(p[0]).toFixed(1) + ' ' + ysc(p[1]).toFixed(1)).join(' ') + ' Z';
    const gap = tv.gap || 0; const card = this.selCard(); const hv = st.hov;
    let hov = null;
    if (hv) { const rows = []; const hh = HIST.find((h) => h[0] === hv); if (hh) rows.push({ k: 'Actual', v: fmt(hh[1]) + ' t' }); if (hv >= 2025) { rows.push({ k: 'Target', v: fmt(tgt(hv)) + ' t' }); rows.push({ k: 'Planned', v: fmt(plan(hv)) + ' t' }); const g = plan(hv) - tgt(hv); rows.push({ k: g > 0 ? 'Gap' : 'Ahead', v: fmt(Math.abs(g)) + ' t' }); } hov = { y: String(hv), left: (xs(hv) / 6).toFixed(2), tipL: Math.min(72, Math.max(2, xs(hv) / 6 + 2)).toFixed(2), rows }; }
    return {
      kpis: [
        { label: 'Emissions 2024', v: fmt(BASE) + ' t', w: 100, bar: 'var(--night)', ink: 'var(--ink)', sub: 'Last approved · tCO₂e', go: nav('inventory') },
        { label: 'Cut needed by ' + y, v: '−' + Math.round(tv.cut || 0) + ' %', w: Math.round(tv.cut || 0), bar: 'var(--glacier)', ink: 'var(--ink)', sub: 'Science-based target', go: nav('pathways') },
        { label: gap > 0 ? 'Gap in ' + y : 'Ahead in ' + y, v: fmt(Math.abs(gap)) + ' t', w: Math.min(100, Math.abs(gap) / 2000), bar: gap > 0 ? 'var(--ember)' : 'var(--pea)', ink: gap > 0 ? 'var(--ember-ink)' : 'var(--pea-ink)', sub: 'After planned actions', go: nav('pathways') },
        { label: 'Farms losing 3 %+ yield', v: Math.round(tv.lose || 0) + ' / ' + Math.round(tv.n || 680), w: (tv.lose || 0) / 6.8, bar: 'var(--rape)', ink: 'var(--ink)', sub: 'By ' + y + ', model prediction', go: nav('climate') }
      ],
      canvasRef: this.canvasRef, year: y, loading: st.loading,
      labels: SITES.filter((x) => x.id !== 'S-HQ').map((x) => ({ t: x.name, lon: x.lon, lat: x.lat, h: x.h + 0.5, op: x.dim ? 0.7 : 1, hs: 'site', md: 0, bg: 'rgba(11,26,36,.86)', bd: 'var(--night-line)', fw: 600, fs: 12 })).concat(TOWNS.map((t) => ({ t: t[0], lon: t[1], lat: t[2], h: 0.15, op: 0.9, hs: '', md: t[3], bg: 'transparent', bd: 'transparent', fw: 500, fs: 11 }))),
      layers: [['farms', 'Farms', '#F2C230'], ['sites', 'Plants', '#3CCB7F'], ['arcs', 'Freight', '#5AA9F0']].map((l) => ({ t: l[1], c: l[2], on: st.lay[l[0]] ? 'true' : 'false', toggle: () => { const lay = Object.assign({}, st.lay); lay[l[0]] = !lay[l[0]]; this.setState({ lay }); if (this.map) this.map.setLayerVisible(l[0], lay[l[0]]); } })),
      zin: () => this.map && this.map.zoomIn(), zout: () => this.map && this.map.zoomOut(), zreset: () => { if (this.map) { this.map.reset(); this.map.select(null); } this.setState({ sel: null }); },
      hasSel: !!card, sel: card || { kind: '', title: '', rows: [] }, clearSel: () => this.pick(null),
      gridD: grid, histD: line(HIST), tgtD: line(tp), planD: line(pp), gapD,
      yTicks: [[0, '0'], [100000, '100k'], [200000, '200k'], [300000, '300k']].map((a) => ({ label: a[1], top: (ysc(a[0]) / 2.4).toFixed(2) })),
      xTicks: [2020, 2030, 2040, 2050].map((k) => ({ label: String(k), left: (xs(k) / 6).toFixed(2) })), markL: (xs(y) / 6).toFixed(2),
      chMove: (e) => { const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 600; const yy = Math.round(2019 + (x - L) / (R - L) * 31); const c = Math.max(2019, Math.min(2050, yy)); if (c !== st.hov) this.setState({ hov: c }); },
      chLeave: () => this.setState({ hov: null }), hasHover: !!hov, hov: hov || { rows: [] },
      todo: [
        { tag: 'Blocked', cls: 'p-risk', title: '2025 draft has unit errors', open: tr({ title: '2025 draft, Scope 3', value: '71 534 593', unit: 'tCO₂e as drafted', status: 'blocked', note: '300× the 2024 value. Likely a unit error.', steps: [{ k: 'Source', t: 'draft_report_summary_2025.csv', id: 'report:2025:scope3', d: 'Preliminary' }, { k: 'Check', t: 'Compared with 2024', id: '238 410 t', d: 'Issue type: unit_error' }] }) },
        { tag: 'Redo', cls: 'p-rev', title: 'Recalculate base year (Bjuv)', open: tr({ title: 'Bjuv acquisition', value: '27 Nov 2025', unit: '', status: 'review', steps: [{ k: 'Source', t: 'structural_events.csv', id: 'acquisition', d: '~300 Swedish pea growers join Scope 3.' }] }) },
        { tag: 'Review', cls: 'p-info', title: '4 results waiting for approval', open: nav('review') }
      ]
    };
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(230px, 100%), 1fr))", "gap": "14px"}}>
          {(v.kpis || []).map((k, index0) => <React.Fragment key={index0}>
            <button type={"button"} className={"card lift rise"} onClick={k.go} style={{"--i": index0, "padding": "18px 20px", "display": "flex", "flexDirection": "column", "gap": "6px", "textAlign": "left"}}>
              <span style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--muted)"}}>
                {k.label}
              </span>
              <span className={"num"} style={{"fontSize": "34px", "fontWeight": "600", "lineHeight": "1.05", "color": k.ink}}>
                {k.v}
              </span>
              <span style={{"display": "block", "width": "100%", "height": "6px", "borderRadius": "999px", "background": "var(--sunk)", "overflow": "hidden", "marginTop": "4px"}}>
                <span className={"w-a"} style={{"display": "block", "height": "100%", "width": String(k.w) + "%", "background": k.bar, "borderRadius": "999px"}}>
                </span>
              </span>
              <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
                {k.sub}
              </span>
            </button>
          </React.Fragment>)}
        </div>
        <section className={"dark rise"} aria-label={"Map of farms and plants"} style={{"--i": "4", "position": "relative", "height": "600px", "overflow": "hidden"}}>
          <canvas ref={v.canvasRef} className={"canvas3d"} aria-hidden={"true"} style={{"position": "absolute", "inset": "0"}}>
          </canvas>
          {(v.labels || []).map((l, index0) => <React.Fragment key={index0}>
            <div className={"anchor"} data-anchor={"1"} data-lon={l.lon} data-lat={l.lat} data-h={l.h} data-maxdist={l.md} data-hs={l.hs}>
              <span style={{"opacity": l.op, "background": l.bg, "borderColor": l.bd, "fontWeight": l.fw, "fontSize": String(l.fs) + "px"}}>
                {l.t}
              </span>
            </div>
          </React.Fragment>)}
          <div style={{"position": "absolute", "left": "18px", "top": "18px", "display": "flex", "flexDirection": "column", "gap": "10px", "maxWidth": "calc(100% - 36px)"}}>
            <h2 className={"h-d"} style={{"fontSize": "20px", "fontWeight": "600", "color": "var(--night-ink)"}}>
              {"Farms and plants"}
            </h2>
            <div role={"group"} aria-label={"Layers"} style={{"display": "flex", "flexWrap": "wrap", "gap": "6px"}}>
              {(v.layers || []).map((ly, index0) => <React.Fragment key={index0}>
                <button type={"button"} className={"mapchip"} aria-pressed={ly.on} onClick={ly.toggle}>
                  <span className={"dot"} style={{"background": ly.c}}>
                  </span>
                  {ly.t}
                </button>
              </React.Fragment>)}
            </div>
          </div>
          <div className={"mapcard"} style={{"position": "absolute", "left": "18px", "bottom": "18px", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "8px", "minWidth": "240px"}}>
            <span style={{"fontSize": "12px", "fontWeight": "600", "color": "var(--night-muted)"}}>
              {"Farm yield change by " + String(v.year)}
            </span>
            <span aria-hidden={"true"} style={{"display": "block", "height": "8px", "borderRadius": "999px", "background": "linear-gradient(90deg, #EF6A3A, #F2C230, #9DB2C1, #5AA9F0)"}}>
            </span>
            <span className={"mono"} style={{"display": "flex", "justifyContent": "space-between", "fontSize": "11px", "color": "var(--night-muted)"}}>
              <span>
                {"−8 %"}
              </span>
              <span>
                {"0"}
              </span>
              <span>
                {"+3 %"}
              </span>
            </span>
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
            <div style={{"position": "absolute", "inset": "0", "display": "flex", "alignItems": "center", "justifyContent": "center", "color": "var(--night-muted)", "fontSize": "14px"}}>
              {"Loading map…"}
            </div>
          </> : null}
          {v.hasSel ? <>
            <div className={"mapcard card-in"} style={{"position": "absolute", "right": "18px", "top": "18px", "width": "min(300px, calc(100% - 36px))", "padding": "16px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
              <div style={{"display": "flex", "alignItems": "flex-start", "gap": "10px"}}>
                <div style={{"flex": "1", "minWidth": "0"}}>
                  <div style={{"fontSize": "12px", "fontWeight": "600", "color": "var(--night-muted)"}}>
                    {v.sel.kind}
                  </div>
                  <div className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600", "marginTop": "2px"}}>
                    {v.sel.title}
                  </div>
                </div>
                <button type={"button"} className={"mapbtn"} aria-label={"Close details"} onClick={v.clearSel} style={{"width": "34px", "height": "34px"}}>
                  <svg width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                    <path d={"M6 6l12 12M18 6 6 18"}>
                    </path>
                  </svg>
                </button>
              </div>
              {v.sel.hasBig ? <>
                <div style={{"display": "flex", "alignItems": "baseline", "gap": "8px"}}>
                  <span className={"num"} style={{"fontSize": "32px", "fontWeight": "600", "color": v.sel.bigCol}}>
                    {v.sel.big}
                  </span>
                  <span style={{"fontSize": "13px", "color": "var(--night-muted)"}}>
                    {v.sel.bigLbl}
                  </span>
                </div>
              </> : null}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                {(v.sel.rows || []).map((r, index0) => <React.Fragment key={index0}>
                  <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "fontSize": "13px", "padding": "6px 0", "borderTop": "1px solid var(--night-line)"}}>
                    <span style={{"color": "var(--night-muted)"}}>
                      {r.k}
                    </span>
                    <span style={{"fontWeight": "600", "textAlign": "right"}}>
                      {r.v}
                    </span>
                  </div>
                </React.Fragment>)}
              </div>
              {v.sel.hasGo ? <>
                <button type={"button"} className={"btn btn-p"} onClick={v.sel.go} style={{"minHeight": "40px"}}>
                  {v.sel.goLbl}
                </button>
              </> : null}
            </div>
          </> : null}
        </section>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "18px", "alignItems": "stretch"}}>
          <section className={"card rise"} style={{"--i": "5", "flex": "2 1 560px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
            <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "center"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {"Emissions vs target"}
              </h2>
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "14px", "fontSize": "12px", "color": "var(--muted)"}}>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "16px", "height": "3px", "background": "var(--ink)"}}>
                  </span>
                  {"Actual"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "16px", "borderTop": "2px dashed var(--ink-2)"}}>
                  </span>
                  {"Target"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "16px", "height": "3px", "background": "var(--pea)"}}>
                  </span>
                  {"With planned actions"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "12px", "height": "12px", "background": "var(--ember-50)", "border": "1px solid #F3B49B"}}>
                  </span>
                  {"Gap"}
                </span>
              </div>
            </div>
            <div style={{"position": "relative", "width": "100%", "aspectRatio": "600 / 240"}} onPointerMove={v.chMove} onPointerLeave={v.chLeave}>
              <svg className={"reveal"} viewBox={"0 0 600 240"} preserveAspectRatio={"none"} role={"img"} aria-label={"Emissions 2019 to 2050 against the science-based target"} style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible"}}>
                <path d={v.gridD} fill={"none"} stroke={"#DFE5E3"} strokeWidth={"1"} vectorEffect={"non-scaling-stroke"}>
                </path>
                <path d={v.gapD} fill={"#FCE5DB"}>
                </path>
                <path d={v.tgtD} fill={"none"} stroke={"#253642"} strokeWidth={"2"} strokeDasharray={"6 5"} vectorEffect={"non-scaling-stroke"}>
                </path>
                <path d={v.planD} fill={"none"} stroke={"#3CCB7F"} strokeWidth={"3"} vectorEffect={"non-scaling-stroke"}>
                </path>
                <path d={v.histD} fill={"none"} stroke={"#0B1A24"} strokeWidth={"3"} strokeLinejoin={"round"} vectorEffect={"non-scaling-stroke"}>
                </path>
              </svg>
              {(v.yTicks || []).map((t, index0) => <React.Fragment key={index0}>
                <span className={"mono"} style={{"position": "absolute", "left": "0", "top": String(t.top) + "%", "transform": "translateY(-50%)", "fontSize": "11px", "color": "var(--muted)"}}>
                  {t.label}
                </span>
              </React.Fragment>)}
              {(v.xTicks || []).map((t, index0) => <React.Fragment key={index0}>
                <span className={"mono"} style={{"position": "absolute", "left": String(t.left) + "%", "bottom": "-4px", "transform": "translateX(-50%)", "fontSize": "11px", "color": "var(--muted)"}}>
                  {t.label}
                </span>
              </React.Fragment>)}
              <div aria-hidden={"true"} style={{"position": "absolute", "top": "2%", "bottom": "9%", "left": String(v.markL) + "%", "borderLeft": "2px solid var(--ink)", "transition": "left .7s var(--spring)"}}>
              </div>
              {v.hasHover ? <>
                <div aria-hidden={"true"} style={{"position": "absolute", "top": "2%", "bottom": "9%", "left": String(v.hov.left) + "%", "borderLeft": "1px dashed var(--muted)"}}>
                </div>
                <div className={"tip"} style={{"left": String(v.hov.tipL) + "%", "top": "4%"}}>
                  <div style={{"fontWeight": "700", "marginBottom": "4px"}}>
                    {v.hov.y}
                  </div>
                  {(v.hov.rows || []).map((r, index0) => <React.Fragment key={index0}>
                    <div style={{"display": "flex", "gap": "14px", "justifyContent": "space-between"}}>
                      <span style={{"color": "var(--night-muted)"}}>
                        {r.k}
                      </span>
                      <span className={"num"}>
                        {r.v}
                      </span>
                    </div>
                  </React.Fragment>)}
                </div>
              </> : null}
            </div>
          </section>
          <section className={"card rise"} style={{"--i": "6", "flex": "1 1 300px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "10px"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"To do"}
            </h2>
            {(v.todo || []).map((a, index0) => <React.Fragment key={index0}>
              <button type={"button"} className={"lift"} onClick={a.open} style={{"display": "flex", "alignItems": "center", "gap": "12px", "width": "100%", "padding": "14px", "borderRadius": "14px", "border": "1px solid var(--line)", "background": "#fff", "textAlign": "left"}}>
                <span className={"pill " + String(a.cls)} style={{"flex": "none"}}>
                  {a.tag}
                </span>
                <span style={{"flex": "1", "fontSize": "14px", "fontWeight": "600", "lineHeight": "1.35"}}>
                  {a.title}
                </span>
                <svg width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#56666F"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                  <path d={"M9 6l6 6-6 6"}>
                  </path>
                </svg>
              </button>
            </React.Fragment>)}
          </section>
        </div>
      </div>
    </>;
  }
}
