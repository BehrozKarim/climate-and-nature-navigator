import React from 'react';

const LV = [
  { id: 'L01', name: 'Biogas at Säkylä', g: 0, s: 12, a: 1650, capex: 150000, opex: 180000, start: 2027, ramp: 2, conf: 'high', cost: 118 },
  { id: 'L03', name: 'Natural refrigerant cold store', g: 0, s: 12, a: 700, capex: 1100000, opex: -20000, start: 2028, ramp: 1, conf: 'high', cost: 50 },
  { id: 'L07', name: 'Biogas at Bjuv', g: 0, s: 12, a: 1300, capex: 80000, opex: 140000, start: 2027, ramp: 1, conf: 'medium', cost: 114 },
  { id: 'L08', name: 'Low-carbon fertiliser', g: 1, s: 3, a: 2100, capex: 0, opex: 260000, start: 2027, ramp: 4, conf: 'medium', cost: 124 },
  { id: 'L09', name: 'Precision nitrogen', g: 1, s: 3, a: 900, capex: 0, opex: 120000, start: 2027, ramp: 4, conf: 'medium', cost: 133 },
  { id: 'L11', name: 'Farm off peat soils', g: 1, s: 3, a: 8500, capex: 0, opex: 90000, start: 2027, ramp: 4, conf: 'medium', cost: 11 },
  { id: 'L12', name: 'Rewet retired peat', g: 1, s: 3, a: 1200, capex: 0, opex: 300000, start: 2029, ramp: 5, conf: 'low', cost: 250 },
  { id: 'L13', name: 'Rapeseed supplier data', g: 1, s: 3, a: 14000, capex: 0, opex: 450000, start: 2027, ramp: 4, conf: 'medium', cost: 32 },
  { id: 'L14', name: 'Lower-impact rapeseed origins', g: 1, s: 3, a: 6500, capex: 0, opex: 380000, start: 2027, ramp: 2, conf: 'medium', cost: 58 },
  { id: 'L25', name: 'Green power at suppliers', g: 1, s: 3, a: 1300, capex: 0, opex: 50000, start: 2027, ramp: 3, conf: 'low', cost: 38 },
  { id: 'L16', name: 'Lighter pizza recipes', g: 2, s: 3, a: 4200, capex: 120000, opex: 0, start: 2027, ramp: 3, conf: 'medium', cost: 29 },
  { id: 'L18', name: 'Recycled PET bottles', g: 2, s: 3, a: 550, capex: 0, opex: 90000, start: 2027, ramp: 2, conf: 'high', cost: 164 },
  { id: 'L20', name: 'HVO100 trucks', g: 2, s: 3, a: 3200, capex: 0, opex: 650000, start: 2027, ramp: 3, conf: 'high', cost: 203 },
  { id: 'L21', name: 'Rail and full ships', g: 2, s: 3, a: 400, capex: 0, opex: -50000, start: 2027, ramp: 2, conf: 'medium', cost: -125 },
  { id: 'L22', name: 'Freezers at −15 °C', g: 2, s: 3, a: 700, capex: 0, opex: -30000, start: 2028, ramp: 4, conf: 'low', cost: -43 }
];
const GROUPS = ['Plants', 'Farms and sourcing', 'Products and logistics'];
const DEF = ['L01', 'L11', 'L13', 'L14', 'L16', 'L21', 'L22'];
const S12 = 6314, S3 = 238410, BASE = 244724, MIN = 31127; const YRS = []; for (let y = 2025; y <= 2050; y++) YRS.push(y);
const tgt = (y) => S12 * Math.max(0.1, 1 - 0.042 * (y - 2025)) + (y <= 2035 ? S3 * (1 - 0.025 * (y - 2025)) : S3 * (0.75 - 0.65 * (y - 2035) / 15));
const ramp = (l, st, y) => Math.max(0, Math.min(1, (y - st + 1) / l.ramp));
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default class Pathways extends React.Component {
  constructor(...a) {
    super(...a); const on = {}, start = {}; LV.forEach((l) => { on[l.id] = DEF.indexOf(l.id) > -1; start[l.id] = l.start; });
    this.state = { on, start, tv: {}, hov: null }; this.tracks = {}; this.drag = null;
  }
  P() { let y = Number((this.props || {}).year); if ([2030, 2040, 2050].indexOf(y) < 0) y = 2040; return y; }
  series(on, start) { return YRS.map((y) => { let a = 0; LV.forEach((l) => { if (on[l.id]) a += l.a * ramp(l, start[l.id], y); }); return BASE - a; }); }
  targets() { const st = this.state; const ser = this.series(st.on, st.start); const sel = LV.filter((l) => st.on[l.id]); const o = {}; ser.forEach((v, i) => { o['e' + i] = v; });
    o.ab = BASE - ser[5]; const y = this.P(); o.gap = ser[y - 2025] - tgt(y); o.capex = sel.reduce((s, l) => s + l.capex, 0) / 1e6; o.opex = sel.reduce((s, l) => s + l.opex, 0) / 1e6; return o; }
  componentDidMount() { this.sync(); }
  componentDidUpdate() { this.sync(); }
  componentWillUnmount() { cancelAnimationFrame(this._twr); }
  sync() { const st = this.state; const k = JSON.stringify([st.on, st.start, this.P()]); if (k === this._k) return; this._k = k; this.tween(this.targets()); }
  tween(to) { const from = Object.assign({}, this.state.tv), t0 = performance.now(); cancelAnimationFrame(this._twr); const D = this.drag ? 160 : 750; const step = (t) => { const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3), tv = {}; for (const k in to) { const a = from[k] != null ? from[k] : (k.charAt(0) === 'e' && k !== 'e' ? BASE : 0); tv[k] = a + (to[k] - a) * e; } this.setState({ tv }); if (p < 1) this._twr = requestAnimationFrame(step); }; this._twr = requestAnimationFrame(step); }
  setStart(id, y) { y = Math.max(2026, Math.min(2035, Math.round(y))); if (y !== this.state.start[id]) { const s = Object.assign({}, this.state.start); s[id] = y; this.setState({ start: s }); } }
  viewModel() {
    const st = this.state, tv = st.tv || {}, y = this.P(); const tr = (o) => () => { if (this.props.onTrace) this.props.onTrace(o); };
    const L = 50, R = 890, TOP = 10, BOT = 270, YMAX = 260000, YMIN = 0; const xs = (yy) => L + (yy - 2025) / 25 * (R - L), ysc = (v) => BOT - (v - YMIN) / (YMAX - YMIN) * (BOT - TOP);
    const ser = YRS.map((yy, i) => (tv['e' + i] != null ? tv['e' + i] : BASE));
    const pts = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + xs(YRS[i]).toFixed(1) + ' ' + ysc(v).toFixed(1)).join(' ');
    const T = YRS.map(tgt); const lineD = pts(ser);
    const areaD = lineD + ' L' + xs(2050) + ' ' + ysc(0) + ' L' + xs(2025) + ' ' + ysc(0) + ' Z';
    const gapD = lineD + ' ' + ser.map((v, i) => [YRS[i], Math.min(v, T[i])]).reverse().map((p) => 'L' + xs(p[0]).toFixed(1) + ' ' + ysc(p[1]).toFixed(1)).join(' ') + ' Z';
    let grid = ''; [0, 50000, 100000, 150000, 200000, 250000].forEach((v) => { grid += 'M' + L + ' ' + ysc(v).toFixed(1) + ' L' + R + ' ' + ysc(v).toFixed(1) + ' '; });
    const toggle = (id) => () => { const on = Object.assign({}, st.on); on[id] = !on[id]; this.setState({ on }); };
    const sorted = LV.slice().sort((a, b) => a.cost - b.cost);
    let hov = null; if (st.hov != null) { const i = st.hov - 2025, g = ser[i] - T[i]; hov = { y: String(st.hov), left: (xs(st.hov) / 9).toFixed(2), tipL: Math.min(76, Math.max(2, xs(st.hov) / 9 + 1.5)).toFixed(2), rows: [{ k: 'With actions', v: fmt(ser[i]) + ' t' }, { k: 'Target', v: fmt(T[i]) + ' t' }, { k: g > 0 ? 'Gap' : 'Ahead', v: fmt(Math.abs(g)) + ' t' }] }; }
    const gap = tv.gap || 0;
    const groups = GROUPS.map((name, gi) => ({ name, items: LV.filter((l) => l.g === gi).map((l) => {
      const on = st.on[l.id], s0 = st.start[l.id]; const x = (s0 - 2025) / 15 * 100; const span = 100 - x; const rampPct = Math.min(100, (l.ramp / (2040 - s0)) * 100);
      return { id: l.id, name: l.name, conf: l.conf + ' confidence', on: on ? 'true' : 'false', aria: (on ? 'Turn off ' : 'Turn on ') + l.name, toggle: toggle(l.id),
        bg: on ? '#F3FBF6' : 'transparent', ink: on ? 'var(--ink)' : 'var(--muted)', a: fmt(l.a), cost: (l.cost < 0 ? '−' : '') + Math.abs(l.cost), costInk: l.cost < 0 ? 'var(--pea-ink)' : 'var(--muted)',
        x: x.toFixed(2), start: String(s0), rampPct: rampPct.toFixed(1), c0: on ? 'rgba(60,203,127,.25)' : 'rgba(86,102,111,.12)', c1: on ? '#3CCB7F' : '#C9D3D1', barInk: on ? '#052A18' : 'var(--muted)',
        dragLbl: l.name + ' starts ' + s0 + '. Drag or use arrow keys.',
        trackRef: (el) => { if (el) this.tracks[l.id] = el; },
        down: (e) => { const r = this.tracks[l.id] && this.tracks[l.id].getBoundingClientRect(); if (!r) return; this.drag = { id: l.id, r, x0: e.clientX, s0 }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {} if (!on) toggle(l.id)(); },
        move: (e) => { const d = this.drag; if (!d || d.id !== l.id) return; this.setStart(l.id, d.s0 + (e.clientX - d.x0) / d.r.width * 15); },
        up: () => { this.drag = null; }, key: (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); this.setStart(l.id, s0 + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); this.setStart(l.id, s0 - 1); } },
        info: tr({ title: l.id + ' · ' + l.name, value: fmt(l.a), unit: 't CO₂e a year when fully running', status: 'draft', note: 'Design estimate from the hackathon catalogue. Recompute from the inventory before deciding.', steps: [{ k: 'Source', t: 'decarbonisation_levers.csv', id: l.id, d: 'Investment €' + fmt(l.capex) + ' · running cost ' + (l.opex < 0 ? '−€' + fmt(-l.opex) : '€' + fmt(l.opex)) + ' a year · ' + l.cost + ' €/t' }, { k: 'Calculation', t: 'Starts ' + s0 + ', full effect after ' + l.ramp + ' yr', id: 'ramp ' + l.ramp + ' years', d: 'Effect held flat after the ramp.' }] }) };
    }) }));
    return {
      n: { ab: fmt(tv.ab || 0), gap: fmt(Math.abs(gap)), capex: (tv.capex || 0).toFixed(1), opex: ((tv.opex || 0) >= 0 ? '+' : '−') + Math.abs(tv.opex || 0).toFixed(2) },
      abW: Math.min(100, (tv.ab || 0) / 50000 * 100).toFixed(1), needW: (MIN / 50000 * 100).toFixed(1), abCol: (tv.ab || 0) >= MIN ? 'var(--pea)' : 'var(--rape)',
      gapLbl: gap > 0 ? 'Gap in ' + y : 'Ahead in ' + y, gapInk: gap > 0 ? 'var(--ember-ink)' : 'var(--pea-ink)',
      gridD: grid, lineD, areaD, gapD, tgtD: pts(T), bauD: pts(YRS.map(() => BASE)),
      yT: [[0, '0'], [100000, '100k'], [200000, '200k'], [250000, '250k']].map((a) => ({ l: a[1], top: (ysc(a[0]) / 3).toFixed(2) })),
      xT: [2025, 2030, 2035, 2040, 2045, 2050].map((k) => ({ l: String(k), left: (xs(k) / 9).toFixed(2) })), markL: (xs(y) / 9).toFixed(2),
      chartAria: 'Emissions with selected actions against the target, 2025 to 2050',
      chMove: (e) => { const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 900; const yy = Math.max(2025, Math.min(2050, Math.round(2025 + (x - L) / (R - L) * 25))); if (yy !== st.hov) this.setState({ hov: yy }); },
      chLeave: () => this.setState({ hov: null }), hasHover: !!hov, hov: hov || { rows: [] },
      groups, onCount: String(LV.filter((l) => st.on[l.id]).length),
      cheapest: () => { const on = {}; let acc = 0; sorted.forEach((l) => { on[l.id] = acc < MIN; if (acc < MIN) acc += l.a * ramp(l, st.start[l.id], 2030); }); this.setState({ on }); if (this.props.onToast) this.props.onToast('Cheapest actions to reach 2030 selected'); },
      allOn: () => { const on = {}; LV.forEach((l) => { on[l.id] = true; }); this.setState({ on }); }, allOff: () => { const on = {}; LV.forEach((l) => { on[l.id] = false; }); this.setState({ on }); },
      trLev: tr({ title: 'Action catalogue', value: '15', unit: 'actions shown', status: 'draft', steps: [{ k: 'Source', t: 'decarbonisation_levers.csv', id: 'abatement · cost · start · ramp', d: 'Design estimates for the hackathon.' }, { k: 'Source', t: 'framework_digest.md · SBTi', id: 'Scope 1+2 −4.2 %/yr · Scope 3 −2.5 %/yr', d: 'Target line. −90 % by 2050.' }] })
    };
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", "gap": "14px"}}>
          <article className={"card rise"} style={{"padding": "18px 20px", "display": "flex", "flexDirection": "column", "gap": "6px"}}>
            <span style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--muted)"}}>
              {"Cut by 2030"}
            </span>
            <span className={"num"} style={{"fontSize": "34px", "fontWeight": "600"}}>
              {"−" + String(v.n.ab) + " t"}
            </span>
            <span style={{"display": "block", "position": "relative", "height": "8px", "borderRadius": "999px", "background": "var(--sunk)", "overflow": "visible", "marginTop": "4px"}}>
              <span className={"w-a"} style={{"position": "absolute", "left": "0", "top": "0", "bottom": "0", "width": String(v.abW) + "%", "background": v.abCol, "borderRadius": "999px"}}>
              </span>
              <span style={{"position": "absolute", "top": "-4px", "bottom": "-4px", "left": String(v.needW) + "%", "width": "2px", "background": "var(--ink)"}}>
              </span>
            </span>
            <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
              {"Needed: 31 127 t (line)"}
            </span>
          </article>
          <article className={"card rise"} style={{"--i": "1", "padding": "18px 20px", "display": "flex", "flexDirection": "column", "gap": "6px"}}>
            <span style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--muted)"}}>
              {v.gapLbl}
            </span>
            <span className={"num"} style={{"fontSize": "34px", "fontWeight": "600", "color": v.gapInk}}>
              {String(v.n.gap) + " t"}
            </span>
            <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
              {"Against the science-based target"}
            </span>
          </article>
          <article className={"card rise"} style={{"--i": "2", "padding": "18px 20px", "display": "flex", "flexDirection": "column", "gap": "6px"}}>
            <span style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--muted)"}}>
              {"Cost"}
            </span>
            <span className={"num"} style={{"fontSize": "34px", "fontWeight": "600"}}>
              {"€" + String(v.n.capex) + " M"}
            </span>
            <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
              {"Investment · "}
              <span className={"num"} style={{"color": "var(--ink)", "fontWeight": "600"}}>
                {String(v.n.opex) + " M€"}
              </span>
              {" per year to run"}
            </span>
          </article>
        </div>
        <section className={"card rise"} aria-label={"Emissions pathway"} style={{"--i": "3", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "center"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"Emissions 2025–2050"}
            </h2>
            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "14px", "fontSize": "12px", "color": "var(--muted)"}}>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "16px", "borderTop": "2px dotted var(--muted)"}}>
                </span>
                {"No action"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "16px", "borderTop": "2px dashed var(--ink)"}}>
                </span>
                {"Target"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "16px", "height": "3px", "background": "var(--pea)"}}>
                </span>
                {"With selected actions"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "12px", "height": "12px", "background": "var(--ember-50)", "border": "1px solid #F3B49B"}}>
                </span>
                {"Gap"}
              </span>
            </div>
          </div>
          <div style={{"position": "relative", "width": "100%", "aspectRatio": "900 / 300"}} onPointerMove={v.chMove} onPointerLeave={v.chLeave}>
            <svg viewBox={"0 0 900 300"} preserveAspectRatio={"none"} role={"img"} aria-label={v.chartAria} style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible"}}>
              <path d={v.gridD} fill={"none"} stroke={"#DFE5E3"} strokeWidth={"1"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path d={v.areaD} fill={"#DFF6EA"}>
              </path>
              <path d={v.gapD} fill={"#FCE5DB"}>
              </path>
              <path d={v.bauD} fill={"none"} stroke={"#56666F"} strokeWidth={"2"} strokeDasharray={"2 5"} strokeLinecap={"round"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path d={v.tgtD} fill={"none"} stroke={"#0B1A24"} strokeWidth={"2"} strokeDasharray={"7 5"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path d={v.lineD} fill={"none"} stroke={"#3CCB7F"} strokeWidth={"3.5"} strokeLinejoin={"round"} vectorEffect={"non-scaling-stroke"}>
              </path>
            </svg>
            {(v.yT || []).map((t, index0) => <React.Fragment key={index0}>
              <span className={"mono"} style={{"position": "absolute", "left": "0", "top": String(t.top) + "%", "transform": "translateY(-50%)", "fontSize": "11px", "color": "var(--muted)"}}>
                {t.l}
              </span>
            </React.Fragment>)}
            {(v.xT || []).map((t, index0) => <React.Fragment key={index0}>
              <span className={"mono"} style={{"position": "absolute", "left": String(t.left) + "%", "bottom": "-4px", "transform": "translateX(-50%)", "fontSize": "11px", "color": "var(--muted)"}}>
                {t.l}
              </span>
            </React.Fragment>)}
            <div aria-hidden={"true"} style={{"position": "absolute", "top": "3%", "bottom": "9%", "left": String(v.markL) + "%", "borderLeft": "2px solid var(--ink)", "transition": "left .7s var(--spring)"}}>
            </div>
            {v.hasHover ? <>
              <div aria-hidden={"true"} style={{"position": "absolute", "top": "3%", "bottom": "9%", "left": String(v.hov.left) + "%", "borderLeft": "1px dashed var(--muted)"}}>
              </div>
              <div className={"tip"} style={{"left": String(v.hov.tipL) + "%", "top": "6%"}}>
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
        <section className={"card rise"} aria-label={"Actions"} style={{"--i": "4", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "10px", "justifyContent": "space-between"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {"Actions "}
              <span style={{"fontSize": "14px", "fontWeight": "500", "color": "var(--muted)"}}>
                {"· " + String(v.onCount) + " of 15 on"}
              </span>
            </h2>
            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
              <button type={"button"} className={"btn"} onClick={v.cheapest} style={{"minHeight": "38px", "fontSize": "13px"}}>
                {"Cheapest way to 2030"}
              </button>
              <button type={"button"} className={"btn"} onClick={v.allOn} style={{"minHeight": "38px", "fontSize": "13px"}}>
                {"All on"}
              </button>
              <button type={"button"} className={"btn"} onClick={v.allOff} style={{"minHeight": "38px", "fontSize": "13px"}}>
                {"All off"}
              </button>
            </div>
          </div>
          <div style={{"display": "grid", "gridTemplateColumns": "52px minmax(180px, 1.3fr) minmax(220px, 2fr) 90px 70px", "gap": "14px", "padding": "0 8px", "fontSize": "12px", "fontWeight": "600", "color": "var(--muted)"}}>
            <span>
            </span>
            <span>
              {"Action"}
            </span>
            <span style={{"display": "flex", "justifyContent": "space-between"}}>
              <span>
                {"Start (drag)"}
              </span>
              <span className={"mono"}>
                {"2025 · 2030 · 2035 · 2040"}
              </span>
            </span>
            <span style={{"textAlign": "right"}}>
              {"t / year"}
            </span>
            <span style={{"textAlign": "right"}}>
              {"€ / t"}
            </span>
          </div>
          {(v.groups || []).map((g, index0) => <React.Fragment key={index0}>
            <div style={{"padding": "10px 8px 2px", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".06em", "textTransform": "uppercase", "color": "var(--muted)"}}>
              {g.name}
            </div>
            {(g.items || []).map((l, index1) => <React.Fragment key={index1}>
              <div style={{"display": "grid", "gridTemplateColumns": "52px minmax(180px, 1.3fr) minmax(220px, 2fr) 90px 70px", "gap": "14px", "alignItems": "center", "padding": "8px", "borderRadius": "12px", "background": l.bg, "transition": "background .3s"}}>
                <button type={"button"} className={"sw"} aria-pressed={l.on} aria-label={l.aria} onClick={l.toggle}>
                </button>
                <button type={"button"} onClick={l.info} style={{"border": "0", "background": "transparent", "padding": "0", "textAlign": "left", "display": "flex", "flexDirection": "column", "gap": "2px"}}>
                  <span style={{"fontSize": "14px", "fontWeight": "600", "color": l.ink}}>
                    {l.name}
                  </span>
                  <span className={"mono"} style={{"fontSize": "11px", "color": "var(--muted)"}}>
                    {String(l.id) + " · " + String(l.conf)}
                  </span>
                </button>
                <div ref={l.trackRef} style={{"position": "relative", "height": "28px", "borderRadius": "8px", "background": "var(--sunk)"}}>
                  <span aria-hidden={"true"} style={{"position": "absolute", "top": "0", "bottom": "0", "left": "33.3%", "borderLeft": "1px solid var(--line-2)"}}>
                  </span>
                  <span aria-hidden={"true"} style={{"position": "absolute", "top": "0", "bottom": "0", "left": "66.6%", "borderLeft": "1px solid var(--line-2)"}}>
                  </span>
                  <button type={"button"} aria-label={l.dragLbl} onPointerDown={l.down} onPointerMove={l.move} onPointerUp={l.up} onKeyDown={l.key} style={{"position": "absolute", "top": "4px", "bottom": "4px", "left": String(l.x) + "%", "right": "0", "border": "0", "padding": "0 0 0 8px", "borderRadius": "6px", "background": "linear-gradient(90deg, " + String(l.c0) + " 0, " + String(l.c1) + " " + String(l.rampPct) + "%)", "cursor": "ew-resize", "textAlign": "left", "transition": "left .25s var(--ease)", "touchAction": "none"}}>
                    <span className={"num"} style={{"fontSize": "11px", "fontWeight": "700", "color": l.barInk}}>
                      {l.start}
                    </span>
                  </button>
                </div>
                <span className={"num"} style={{"textAlign": "right", "fontSize": "14px", "fontWeight": "600", "color": l.ink}}>
                  {l.a}
                </span>
                <span className={"num"} style={{"textAlign": "right", "fontSize": "13px", "color": l.costInk}}>
                  {l.cost}
                </span>
              </div>
            </React.Fragment>)}
          </React.Fragment>)}
          <button type={"button"} className={"ev"} onClick={v.trLev} style={{"alignSelf": "flex-start"}}>
            {"Source: decarbonisation_levers.csv"}
          </button>
        </section>
      </div>
    </>;
  }
}
