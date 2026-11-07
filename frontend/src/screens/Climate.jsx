import React from 'react';

const KEYS = ['pea_FI', 'pea_SE', 'rape_FI', 'potato_FI', 'carrot_FI'];
const NAMES = { pea_FI: 'Pea · Finland', pea_SE: 'Pea · Sweden', rape_FI: 'Turnip rape', potato_FI: 'Potato', carrot_FI: 'Carrot' };
const SC = { ssp126: ['Low warming', '#3CCB7F', 'rgba(60,203,127,.16)'], ssp245: ['Medium warming', '#D9A400', 'rgba(242,194,48,.22)'], ssp585: ['High warming', '#EF6A3A', 'rgba(239,106,58,.16)'] };
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const sgn = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);

export default class Climate extends React.Component {
  constructor(...a) { super(...a); this.state = { data: null, crop: 'pea_FI', irr: false, hov: null, err: false }; }
  componentDidMount() { fetch('/demo/climate.json').then((r) => r.json()).then((d) => { if (!this._dead) this.setState({ data: d }); }).catch(() => this.setState({ err: true })); }
  componentWillUnmount() { this._dead = true; }
  P() { const p = this.props || {}; const s = SC[p.scenario] ? p.scenario : 'ssp245'; let y = Number(p.year); if ([2030, 2040, 2050].indexOf(y) < 0) y = 2040; return { s, y }; }
  viewModel() {
    const st = this.state, D = st.data, { s, y } = this.P(); const tr = (o) => () => { if (this.props.onTrace) this.props.onTrace(o); };
    const crops = KEYS.map((k) => ({ label: NAMES[k], on: st.crop === k ? 'true' : 'false', pick: () => this.setState({ crop: k }) }));
    if (!D) return { crops, irrStr: 'false', toggleIrr: () => {}, tiles: [], cropName: NAMES[st.crop], bandLegend: '#eee', aria: '', winX: 0, winW: 0, gridD: 'M0 0', bandD: 'M0 0', l126: 'M0 0', l245: 'M0 0', l585: 'M0 0', fitD: 'M0 0', w126: 1, w245: 1, w585: 1, o126: 0, o245: 0, o585: 0, bandFill: 'none', dotsA: [], dotsP: [], yT: [], xT: [], todayL: 0, hasHover: false, hov: { rows: [] }, hot: [], normB: 0, scnName: SC[s][0], trainYears: '', rmse: '', all: [], year: y, chMove: () => {}, chLeave: () => {}, trModel: () => {} };
    const YRS = D.years, C = D.crops[st.crop], reg = C.reg, src = st.irr ? C.irr : C.pred, drv = D.drivers[reg];
    const roll = (arr, i) => { let a = 0, n = 0; for (let k = i - 4; k <= i + 5; k++) if (k >= 0 && k < arr.length) { a += arr[k]; n++; } return a / n; };
    const dec = (arr) => roll(arr, YRS.indexOf(y));
    const allv = []; Object.keys(C.actual).forEach((k) => allv.push(C.actual[k])); ['ssp126', 'ssp245', 'ssp585'].forEach((k) => src[k].forEach((v) => allv.push(v)));
    let lo = Math.min.apply(null, allv), hi = Math.max.apply(null, allv); const pad = (hi - lo) * 0.12; lo = Math.max(0, lo - pad); hi = hi + pad + C.rmse * 0.3;
    const L = 40, R = 893, TOP = 10, BOT = 270; const xs = (yy) => L + (yy - 2012) / 48 * (R - L), ysc = (v) => BOT - (v - lo) / (hi - lo) * (BOT - TOP);
    const i0 = YRS.indexOf(2026);
    const rollLine = (arr, from) => YRS.map((yy, i) => (i < from ? null : 'L' + xs(yy).toFixed(1) + ' ' + ysc(roll(arr, i)).toFixed(1))).filter(Boolean).join(' ').replace(/^L/, 'M');
    const fit = YRS.slice(0, i0 + 1).map((yy, i) => (i ? 'L' : 'M') + xs(yy).toFixed(1) + ' ' + ysc(roll(src.ssp245, i)).toFixed(1)).join(' ');
    const sel = src[s]; const upper = [], lower = []; for (let i = i0; i < YRS.length; i++) { const m = roll(sel, i); upper.push(xs(YRS[i]).toFixed(1) + ' ' + ysc(m + C.rmse).toFixed(1)); lower.push(xs(YRS[i]).toFixed(1) + ' ' + ysc(m - C.rmse).toFixed(1)); }
    const bandD = 'M' + upper.join(' L') + ' L' + lower.reverse().join(' L') + ' Z';
    let grid = ''; const step = (hi - lo) > 20 ? 10 : ((hi - lo) > 4 ? 1 : 0.5); const ticks = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { ticks.push(v); grid += 'M' + L + ' ' + ysc(v).toFixed(1) + ' L' + R + ' ' + ysc(v).toFixed(1) + ' '; }
    const base = C.base, chg = (dec(sel) / base - 1) * 100;
    const hotDec = dec(drv[s].hot), wbDec = dec(drv[s].wb), nrm = drv.normal;
    const loss = Math.max(0, -chg) / 100; const cost = C.price ? loss * 1000 * C.price * C.prem : 0;
    const hotMax = Math.max.apply(null, ['ssp126', 'ssp245', 'ssp585'].map((k) => Math.max.apply(null, drv[k].hot))) || 1;
    let hov = null; if (st.hov) { const i = YRS.indexOf(st.hov); const rows = []; if (C.actual[st.hov] != null) rows.push({ k: 'Actual', v: C.actual[st.hov].toFixed(2) }); rows.push({ k: 'Predicted', v: sel[i].toFixed(2) }); rows.push({ k: 'Hot days', v: String(drv[s].hot[i]) }); rows.push({ k: 'Water balance', v: Math.round(drv[s].wb[i]) + ' mm' }); hov = { y: String(st.hov), left: (xs(st.hov) / 9).toFixed(2), tipL: Math.min(78, Math.max(2, xs(st.hov) / 9 + 1.5)).toFixed(2), rows }; }
    const ws = Math.max(2012, y - 4), we = Math.min(2060, y + 5);
    const allC = KEYS.map((k) => { const c = D.crops[k], a = (st.irr ? c.irr : c.pred)[s]; const v = (roll(a, YRS.indexOf(y)) / c.base - 1) * 100; return { k, v }; });
    const mxv = Math.max(8, Math.max.apply(null, allC.map((x) => Math.abs(x.v))));
    const wk = (k) => (k === s ? 3.5 : 1.5), ok = (k) => (k === s ? 1 : 0.35);
    return {
      crops, irrStr: st.irr ? 'true' : 'false', toggleIrr: () => this.setState({ irr: !st.irr }), year: y, scnName: SC[s][0], cropName: NAMES[st.crop],
      tiles: [
        { label: 'Yield change by ' + y, v: sgn(chg, 1) + ' %', sub: (we - 9) + '–' + we + ' average vs 2012–2026', ink: chg < -3 ? 'var(--ember-ink)' : (chg > 1 ? 'var(--glacier-ink)' : 'var(--ink)') },
        { label: 'Hot days, Jun–Aug', v: hotDec.toFixed(1), sub: 'Normal ' + nrm.hot + ' days · days ≥ 27 °C', ink: hotDec > nrm.hot * 2 ? 'var(--ember-ink)' : 'var(--ink)' },
        { label: 'Summer water balance', v: sgn(wbDec, 0) + ' mm', sub: 'June–July rain minus evaporation · normal ' + sgn(nrm.wb, 0), ink: 'var(--ink)' },
        { label: 'Extra cost per 1 000 t', v: '€' + fmt(cost), sub: C.price ? 'Imports at +' + Math.round(C.prem * 100) + ' % on €' + C.price + '/t' : 'No price data', ink: cost > 0 ? 'var(--ember-ink)' : 'var(--ink)' }
      ],
      bandLegend: SC[s][2], bandFill: SC[s][2], bandD, fitD: fit,
      l126: rollLine(src.ssp126, i0), l245: rollLine(src.ssp245, i0), l585: rollLine(src.ssp585, i0), w126: wk('ssp126'), w245: wk('ssp245'), w585: wk('ssp585'), o126: ok('ssp126'), o245: ok('ssp245'), o585: ok('ssp585'),
      winX: xs(ws).toFixed(1), winW: (xs(we) - xs(ws)).toFixed(1), gridD: grid,
      dotsA: Object.keys(C.actual).map((k) => ({ x: (xs(+k) / 9).toFixed(2), y: (ysc(C.actual[k]) / 3).toFixed(2) })),
      dotsP: YRS.map((yy, i) => (yy > 2026 ? { x: (xs(yy) / 9).toFixed(2), y: (ysc(sel[i]) / 3).toFixed(2), c: SC[s][1] } : null)).filter(Boolean),
      yT: ticks.map((v) => ({ l: step < 1 ? v.toFixed(1) : String(v), top: (ysc(v) / 3).toFixed(2) })), xT: [2015, 2026, 2035, 2045, 2055].map((k) => ({ l: String(k), left: (xs(k) / 9).toFixed(2) })), todayL: (xs(2026) / 9).toFixed(2),
      aria: NAMES[st.crop] + ' yield: actual 2012 to 2026 and predicted to 2060. By ' + y + ': ' + sgn(chg, 1) + ' percent.',
      chMove: (e) => { const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 900; const yy = Math.max(2012, Math.min(2060, Math.round(2012 + (x - L) / (R - L) * 48))); if (yy !== st.hov) this.setState({ hov: yy }); },
      chLeave: () => this.setState({ hov: null }), hasHover: !!hov, hov: hov || { rows: [] },
      hot: YRS.map((yy, i) => ({ h: (drv[s].hot[i] / hotMax * 100).toFixed(1), c: yy <= 2026 ? '#9DB2C1' : (drv[s].hot[i] > nrm.hot * 2 ? '#EF6A3A' : SC[s][1]), t: yy + ': ' + drv[s].hot[i] + ' hot days' })), normB: (nrm.hot / hotMax * 100).toFixed(1),
      trainYears: reg === 'SE' ? '2018–2026' : '2012–2026', rmse: C.rmse.toFixed(2),
      all: allC.map((x) => ({ label: NAMES[x.k], v: sgn(x.v, 1) + ' %', l: (x.v < 0 ? 50 + x.v / mxv * 50 : 50).toFixed(2), w: (Math.abs(x.v) / mxv * 50).toFixed(2), c: x.v < 0 ? '#EF6A3A' : '#5AA9F0', ink: x.v < -3 ? 'var(--ember-ink)' : 'var(--ink)', on: x.k === st.crop ? 'true' : 'false', bd: x.k === st.crop ? 'var(--ink)' : 'var(--line)', bg: x.k === st.crop ? 'var(--sunk)' : '#fff', pick: () => this.setState({ crop: x.k }) })),
      trModel: tr({ title: 'Yield model · ' + NAMES[st.crop], value: '±' + C.rmse.toFixed(2), unit: 't/ha typical error', status: 'review', note: 'Simulated stand-in for the backend ML model. Same inputs; a simple regression keeps it explainable.', steps: [
        { k: 'Source', t: reg === 'FI' ? 'farm_survey_fi.csv' : 'foodhills_odlingsdata_se.csv', id: C.n + ' farm-years', d: 'Implausible values (over 3× the yearly median) left out.' },
        { k: 'Source', t: 'weather_monthly_1991_2060.csv', id: (reg === 'FI' ? '36' : '48') + ' grid cells', d: 'Hot days June–August, June–July water balance, May–August temperature.' },
        { k: 'Calculation', t: 'Yield ~ heat + water + temperature', id: 'heat ' + C.coef.heat + ' t/ha per day · water ' + C.coef.water + ' per mm', d: 'Fitted on actual years, applied to each warming level.' } ] })
    };
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "center", "justifyContent": "space-between"}}>
          <div role={"group"} aria-label={"Crop"} style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
            {(v.crops || []).map((c, index0) => <React.Fragment key={index0}>
              <button type={"button"} className={"chipbtn"} aria-pressed={c.on} onClick={c.pick}>
                {c.label}
              </button>
            </React.Fragment>)}
          </div>
          <div style={{"display": "flex", "alignItems": "center", "gap": "10px", "padding": "8px 14px", "borderRadius": "999px", "background": "#fff", "border": "1px solid var(--line)"}}>
            <button type={"button"} className={"sw"} aria-pressed={v.irrStr} aria-label={"What if the fields are irrigated"} onClick={v.toggleIrr}>
            </button>
            <span style={{"fontSize": "13px", "fontWeight": "600"}}>
              {"What if irrigated"}
            </span>
          </div>
        </div>
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", "gap": "14px"}}>
          {(v.tiles || []).map((t, index0) => <React.Fragment key={index0}>
            <article className={"card rise"} style={{"--i": index0, "padding": "18px 20px", "display": "flex", "flexDirection": "column", "gap": "4px"}}>
              <span style={{"fontSize": "13px", "fontWeight": "600", "color": "var(--muted)"}}>
                {t.label}
              </span>
              <span className={"num"} style={{"fontSize": "32px", "fontWeight": "600", "color": t.ink}}>
                {t.v}
              </span>
              <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
                {t.sub}
              </span>
            </article>
          </React.Fragment>)}
        </div>
        <section className={"card rise"} aria-label={"Yield chart"} style={{"--i": "4", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "center"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {String(v.cropName) + " yield, t/ha"}
            </h2>
            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "14px", "fontSize": "12px", "color": "var(--muted)"}}>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "8px", "height": "8px", "borderRadius": "50%", "background": "var(--ink)"}}>
                </span>
                {"Actual"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "16px", "height": "3px", "background": "#3CCB7F"}}>
                </span>
                {"Low"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "16px", "height": "3px", "background": "#D9A400"}}>
                </span>
                {"Medium"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "16px", "height": "3px", "background": "#EF6A3A"}}>
                </span>
                {"High"}
              </span>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                <span style={{"width": "12px", "height": "12px", "background": v.bandLegend}}>
                </span>
                {"Likely range"}
              </span>
            </div>
          </div>
          <div style={{"position": "relative", "width": "100%", "aspectRatio": "900 / 300"}} onPointerMove={v.chMove} onPointerLeave={v.chLeave}>
            <svg viewBox={"0 0 900 300"} preserveAspectRatio={"none"} role={"img"} aria-label={v.aria} style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible"}}>
              <rect x={v.winX} y={"10"} width={v.winW} height={"260"} fill={"#EEF2F1"} style={{"transition": "x .6s var(--ease)"}}>
              </rect>
              <path d={v.gridD} fill={"none"} stroke={"#DFE5E3"} strokeWidth={"1"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path className={"d-a"} style={{"d": "path('" + String(v.bandD) + "')"}} fill={v.bandFill}>
              </path>
              <path className={"d-a"} style={{"d": "path('" + String(v.l126) + "')"}} fill={"none"} stroke={"#3CCB7F"} strokeWidth={v.w126} strokeOpacity={v.o126} strokeLinecap={"round"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path className={"d-a"} style={{"d": "path('" + String(v.l245) + "')"}} fill={"none"} stroke={"#D9A400"} strokeWidth={v.w245} strokeOpacity={v.o245} strokeLinecap={"round"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path className={"d-a"} style={{"d": "path('" + String(v.l585) + "')"}} fill={"none"} stroke={"#EF6A3A"} strokeWidth={v.w585} strokeOpacity={v.o585} strokeLinecap={"round"} vectorEffect={"non-scaling-stroke"}>
              </path>
              <path className={"d-a"} style={{"d": "path('" + String(v.fitD) + "')"}} fill={"none"} stroke={"#56666F"} strokeWidth={"1.5"} strokeDasharray={"3 4"} vectorEffect={"non-scaling-stroke"}>
              </path>
            </svg>
            {(v.dotsA || []).map((d, index0) => <React.Fragment key={index0}>
              <span aria-hidden={"true"} style={{"position": "absolute", "left": String(d.x) + "%", "top": String(d.y) + "%", "width": "9px", "height": "9px", "margin": "-4.5px", "borderRadius": "50%", "background": "var(--ink)", "transition": "top .6s var(--ease)"}}>
              </span>
            </React.Fragment>)}
            {(v.dotsP || []).map((d, index0) => <React.Fragment key={index0}>
              <span aria-hidden={"true"} style={{"position": "absolute", "left": String(d.x) + "%", "top": String(d.y) + "%", "width": "5px", "height": "5px", "margin": "-2.5px", "borderRadius": "50%", "background": d.c, "opacity": ".55", "transition": "top .6s var(--ease)"}}>
              </span>
            </React.Fragment>)}
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
            <div aria-hidden={"true"} style={{"position": "absolute", "top": "3%", "bottom": "9%", "left": String(v.todayL) + "%", "borderLeft": "1px solid var(--ink-2)"}}>
              <span style={{"position": "absolute", "top": "-2px", "left": "6px", "fontSize": "11px", "fontWeight": "600", "color": "var(--ink-2)"}}>
                {"Today"}
              </span>
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
          <div style={{"display": "flex", "justifyContent": "space-between", "gap": "10px", "alignItems": "baseline", "paddingTop": "6px"}}>
            <span style={{"fontSize": "13px", "fontWeight": "600"}}>
              {"Hot days, June–August · " + String(v.scnName)}
            </span>
            <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
              {"Line = 1991–2020 normal"}
            </span>
          </div>
          <div style={{"position": "relative", "height": "80px", "display": "flex", "alignItems": "flex-end", "gap": "2px", "paddingLeft": "4.2%", "paddingRight": "0.8%"}}>
            {(v.hot || []).map((h, index0) => <React.Fragment key={index0}>
              <span className={"h-a"} title={h.t} style={{"flex": "1", "height": String(h.h) + "%", "borderRadius": "2px 2px 0 0", "background": h.c}}>
              </span>
            </React.Fragment>)}
            <span aria-hidden={"true"} style={{"position": "absolute", "left": "4.2%", "right": "0.8%", "bottom": String(v.normB) + "%", "borderTop": "1.5px dashed var(--ink-2)"}}>
            </span>
          </div>
          <div style={{"display": "flex", "flexWrap": "wrap", "gap": "10px", "alignItems": "center", "justifyContent": "space-between", "paddingTop": "8px", "borderTop": "1px solid var(--line)"}}>
            <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
              {"Model trained on " + String(v.trainYears) + " yields · typical error ±" + String(v.rmse) + " t/ha"}
            </span>
            <button type={"button"} className={"ev"} onClick={v.trModel}>
              {"How the model works"}
            </button>
          </div>
        </section>
        <section className={"card rise"} aria-label={"All crops"} style={{"--i": "5", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "10px"}}>
          <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
            {"All crops by " + String(v.year) + " · " + String(v.scnName)}
          </h2>
          {(v.all || []).map((a, index0) => <React.Fragment key={index0}>
            <button type={"button"} onClick={a.pick} aria-pressed={a.on} style={{"display": "grid", "gridTemplateColumns": "150px 1fr 70px", "gap": "14px", "alignItems": "center", "padding": "8px", "borderRadius": "10px", "border": "1px solid " + String(a.bd), "background": a.bg, "textAlign": "left", "fontSize": "13.5px"}}>
              <span style={{"fontWeight": "600"}}>
                {a.label}
              </span>
              <span style={{"position": "relative", "display": "block", "height": "14px"}}>
                <span style={{"position": "absolute", "left": "50%", "top": "-3px", "bottom": "-3px", "borderLeft": "1px solid var(--line-2)"}}>
                </span>
                <span className={"pos-a"} style={{"position": "absolute", "top": "0", "bottom": "0", "left": String(a.l) + "%", "width": String(a.w) + "%", "borderRadius": "4px", "background": a.c}}>
                </span>
              </span>
              <span className={"num"} style={{"textAlign": "right", "fontWeight": "600", "color": a.ink}}>
                {a.v}
              </span>
            </button>
          </React.Fragment>)}
        </section>
      </div>
    </>;
  }
}
