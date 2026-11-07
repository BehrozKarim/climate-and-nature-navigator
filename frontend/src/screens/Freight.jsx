import React from 'react';
import { api, backendMode, routeToMap, mapToRoute } from '../lib/api.js';
import { REFERENCE_PLACES, placeLookup } from '../lib/freight-locations.js';

const EF = { 'truck': [0.092, 'EF-TKM-TRUCK', 'Truck'], 'truck-reefer': [0.118, 'EF-TKM-TRUCK-REEFER', 'Cooled truck'], 'truck-hvo': [0.02, 'EF-TKM-TRUCK-HVO', 'Truck, HVO100'], 'rail': [0.012, 'EF-TKM-RAIL', 'Rail'], 'ship-bulk': [0.013, 'EF-TKM-SHIP-BULK', 'Bulk ship'], 'ropax': [0.06, 'EF-TKM-ROPAX', 'Ferry'], 'ship-reefer': [0.021, 'EF-TKM-SHIP-REEFER', 'Cooled container ship'] };
const PRESETS = {
  lv: { label: 'Latvia → Kantvik', material: 'Rapeseed', mass: 2400, legs: [
    { kind: 'road', from: 'Jelgava', to: 'Riga port', km: 48, mode: 'truck', pts: [[23.71, 56.65], [23.92, 56.85], [24.07, 56.99]] },
    { kind: 'sea', from: 'Riga port', to: 'Kantvik', km: 372, mode: 'ship-bulk', pts: [[24.07, 56.99], [23.75, 57.6], [23.35, 58.5], [23.3, 59.3], [24.05, 59.8], [24.383, 60.084]] } ] },
  ee: { label: 'Estonia → Kantvik', material: 'Rapeseed', mass: 1800, legs: [
    { kind: 'road', from: 'Tartu', to: 'Muuga port', km: 186, mode: 'truck', pts: [[26.72, 58.38], [25.9, 58.9], [24.95, 59.5]] },
    { kind: 'sea', from: 'Muuga port', to: 'Kantvik', km: 84, mode: 'ship-bulk', pts: [[24.95, 59.5], [24.85, 59.72], [24.6, 59.95], [24.383, 60.084]] } ] },
  se: { label: 'Bjuv → Säkylä', material: 'Frozen peas', mass: 22, legs: [
    { kind: 'road', from: 'Bjuv', to: 'Kapellskär', km: 694, mode: 'truck-reefer', pts: [[12.92, 56.084], [14.16, 57.78], [16.2, 58.6], [18.07, 59.33], [19.07, 59.72]] },
    { kind: 'sea', from: 'Kapellskär', to: 'Naantali', km: 262, mode: 'ropax', pts: [[19.07, 59.72], [19.9, 59.85], [20.6, 60.05], [21.4, 60.28], [22.03, 60.47]] },
    { kind: 'road', from: 'Naantali', to: 'Säkylä', km: 86, mode: 'truck-reefer', pts: [[22.03, 60.47], [22.15, 60.8], [22.2538, 61.0787]] } ] },
  fi: { label: 'Farm → Säkylä', material: 'Peas from farm F0001', mass: 26, legs: [
    { kind: 'road', from: 'Farm F0001', to: 'Säkylä', km: 19, mode: 'truck', pts: [[22.536, 61.009], [22.4, 61.04], [22.2538, 61.0787]] } ] },
  custom: { label: 'Your route', material: 'Your cargo', mass: 24, legs: [] }
};
const PLACES = placeLookup(REFERENCE_PLACES);
const BATCH = [['Truck', 43600752, 'truck'], ['Cooled truck', 29002341, 'truck-reefer'], ['Ferry', 20329662, 'ropax'], ['Bulk ship', 43938216, 'ship-bulk'], ['Cooled container ship', 10132546, 'ship-reefer']];
const ICON = { road: 'M2.5 6.5h11v9h-11ZM13.5 9.5h4l3 3v3h-7', sea: 'M3 15c3 2 6 2 9 0s6-2 9 0M5 12l1-5h12l1 5M12 4v3' };
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const decimal = (n) => Number(n).toLocaleString('en-GB', { maximumFractionDigits: 4 });
const calculation = (mass, km, factor, kg) => `${decimal(mass)} t × ${decimal(km)} km × ${factor} kg CO₂e/tkm ≈ ${fmt(kg)} kg CO₂e`;
const hav = (a, b) => { const R = 6371, r = Math.PI / 180, dl = (b[1] - a[1]) * r, dn = (b[0] - a[0]) * r; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const cap = (s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1);

export default class Freight extends React.Component {
  constructor(...a) {
    super(...a);
    this.state = { preset: 'lv', mass: 2400, massStr: '2400', modes: PRESETS.lv.legs.map((l) => l.mode), cO: '', cD: '', cLegs: [], cid: 0, looking: false, err: '', hvo: false, tv: {}, flip: 0, leg: -1, places: backendMode ? [] : REFERENCE_PLACES, catalogLoading: backendMode, catalogError: '' };
    this.canvasRef = (el) => { if (el && el !== this._cv) { this._cv = el; this.boot(); } };
  }
  legsNow() { const st = this.state; const src = st.preset === 'custom' ? st.cLegs : PRESETS[st.preset].legs; return src.map((l, i) => Object.assign({}, l, { mode: st.modes[i] || l.mode })); }
  calc(legs, m, ov) { let kg = 0; const per = legs.map((l) => { const k = m * l.km * EF[ov ? ov(l) : l.mode][0]; kg += k; return k; }); return { kg, per }; }
  batch(hvo) { const rows = BATCH.map((b) => ({ mode: b[0], id: b[2], tkm: b[1], ef: hvo && b[2] === 'truck' ? 0.02 : EF[b[2]][0], efId: hvo && b[2] === 'truck' ? 'EF-TKM-TRUCK-HVO' : EF[b[2]][1] })); rows.forEach((r) => { r.t = r.tkm * r.ef / 1000; }); return { rows, total: rows.reduce((s, r) => s + r.t, 0) }; }
  componentDidMount() { this.sync(); if (backendMode) { this.syncBackend(); this.loadCatalog(); } }
  componentDidUpdate() { this.sync(); if (backendMode) this.syncBackend(); }
  componentWillUnmount() { this._dead = true; this._tripAbort?.abort(); this._lookupAbort?.abort(); this._catalogAbort?.abort(); clearTimeout(this._tripTimer); cancelAnimationFrame(this._twr); clearTimeout(this._lk); clearTimeout(this._retry); if (this.map) this.map.dispose(); }
  async loadCatalog() {
    this._catalogAbort?.abort();
    const abort = this._catalogAbort = new AbortController();
    this.setState({ catalogLoading: true, catalogError: '' });
    try {
      const catalog = await api.freightCatalog({ signal: abort.signal });
      if (!this._dead && !abort.signal.aborted) this.setState({ places: catalog.places, catalogLoading: false });
    } catch (error) {
      if (!this._dead && error.name !== 'AbortError') this.setState({ catalogLoading: false, catalogError: 'Couldn’t load the supported locations. ' + error.message });
    }
  }
  changeLocation(field, value) {
    this._lookupAbort?.abort(); clearTimeout(this._lk);
    this.setState(st => ({ [field]: value, cLegs: [], modes: [], trip: null, cid: st.cid + 1, looking: false, leg: -1, err: '' }));
  }
  syncBackend() {
    const legs = this.legsNow(), mass_t = this.state.mass;
    const key = JSON.stringify([legs,mass_t]);
    if (this._tripKey === key) return;
    this._tripKey = key;
    clearTimeout(this._tripTimer); this._tripAbort?.abort();
    this.setState({trip:null, comparisons:null, tripError:''});
    if (!(mass_t > 0) || !legs.length) return;
    this._tripTimer = setTimeout(async () => {
      const abort = this._tripAbort = new AbortController();
      try {
        const variants = [legs, legs.map(l => ({...l,mode:l.mode === 'truck' ? 'truck-hvo' : l.mode})), legs.map(l => ({...l,mode:l.mode === 'truck' ? (l.km > 150 ? 'rail' : 'truck-hvo') : l.mode}))];
        const results = await Promise.allSettled(variants.map(route => api.trip({mass_t,legs:route.map(mapToRoute)},false,{signal:abort.signal})));
        if (this._dead || abort.signal.aborted) return;
        if (results[0].status === 'rejected') throw results[0].reason;
        this.setState({trip:results[0].value.output,comparisons:results.map(result => result.status === 'fulfilled' ? result.value.output.total_kgco2e : null)});
      } catch(e) { if (!this._dead && e.name !== 'AbortError') this.setState({err:e.message,tripError:e.message}); }
    },200);
  }
  async findBackendRoute() {
    if (this.state.looking) return;
    this._lookupAbort?.abort();
    const abort = this._lookupAbort = new AbortController();
    this.setState(st => ({looking:true,err:'',cLegs:[],modes:[],cid:st.cid+1,leg:-1}));
    try {
      const result = await api.lookup(this.state.cO,this.state.cD,{signal:abort.signal});
      const legs = result.legs.map(routeToMap);
      if (!this._dead && !abort.signal.aborted) this.setState(st => ({looking:false,cLegs:legs,modes:legs.map(l => l.mode),cid:st.cid+1,flip:st.flip+1,leg:-1}));
    } catch(e) { if (!this._dead && e.name !== 'AbortError') this.setState({looking:false,err:e.message}); }
  }
  sync() {
    const st = this.state; const k1 = [st.preset, st.cid, st.mass, st.modes.join(), st.hvo].join('|');
    if (k1 !== this._k1) { this._k1 = k1; const legs = this.legsNow(), m = st.mass > 0 ? st.mass : 0, b = this.batch(st.hvo), b0 = this.batch(false); this.tween({ total: this.calc(legs, m).kg, batch: b.total, saved: b0.total - b.total }); }
    const k2 = st.preset + '|' + st.cid; if (k2 !== this._k2 && this.map) { this._k2 = k2; this.map.setRoute(this.legsNow().map((l, i) => ({ id: 'leg' + i, kind: l.kind, pts: l.pts, i }))); }
  }
  tween(to) { const from = Object.assign({}, this.state.tv), t0 = performance.now(); cancelAnimationFrame(this._twr); const step = (t) => { const p = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - p, 3), tv = {}; for (const k in to) { const a = from[k] != null ? from[k] : 0; tv[k] = a + (to[k] - a) * e; } this.setState({ tv }); if (p < 1) this._twr = requestAnimationFrame(step); }; this._twr = requestAnimationFrame(step); }
  boot() {
    if (this.map || this._booting || !this._cv) return;
    if (!window.THREE || !window.NavMap) { this._retry = setTimeout(() => this.boot(), 150); return; }
    this._booting = true; window.NavMap.ready.then(() => { if (!this._dead) this.create(); });
  }
  create() {
    try { this.map = window.NavMap.create(this._cv, { bounds: [10, 54.5, 31.5, 66.8], view: { lon: 22, lat: 58.8, dist: 90, pol: 0.8 }, minDist: 5, onPick: (h) => { if (h && h.kind === 'route') this.setState({ leg: h.item.i }); else this.setState({ leg: -1 }); } }); this._k2 = null; this.sync(); } catch (e) { console.warn('map', e); }
  }
  pick(id) { this._lookupAbort?.abort(); clearTimeout(this._lk); const p = PRESETS[id]; this.setState({ preset: id, mass: p.mass, massStr: String(p.mass), modes: id === 'custom' ? this.state.cLegs.map((l) => l.mode) : p.legs.map((l) => l.mode), err: '', looking: false, flip: this.state.flip + 1, leg: -1 }); }
  findRoute() {
    if (!this.state.cO || !this.state.cD) { this.setState({ err: 'Choose both From and To locations.' }); return; }
    if (this.state.cO === this.state.cD) { this.setState({ err: 'From and To must be different locations.' }); return; }
    if (backendMode) { this.findBackendRoute(); return; }
    const o = PLACES[(this.state.cO || '').trim().toLowerCase()], d = PLACES[(this.state.cD || '').trim().toLowerCase()];
    if (!o || !d) { this.setState({ err: 'Place not found. Try Helsinki, Turku, Tallinn, Riga, Stockholm, Bjuv or Säkylä.' }); return; }
    if (o === d) { this.setState({ err: 'From and To are the same place.' }); return; }
    const O = REFERENCE_PLACES.find(p => p.id === this.state.cO)?.name || cap(this.state.cO), Dn = REFERENCE_PLACES.find(p => p.id === this.state.cD)?.name || cap(this.state.cD); let legs;
    if (o[2] === d[2]) legs = [{ kind: 'road', from: O, to: Dn, km: Math.round(hav(o, d) * 1.25), mode: 'truck', pts: [[o[0], o[1]], [d[0], d[1]]], est: true }];
    else { const port = (g, ref) => Object.keys(PLACES).filter((k) => PLACES[k][2] === g && PLACES[k][3]).sort((a, b) => hav(PLACES[a], ref) - hav(PLACES[b], ref))[0]; const po = port(o[2], d), pd = port(d[2], o), P1 = PLACES[po], P2 = PLACES[pd]; legs = [];
      if (hav(o, P1) > 2) legs.push({ kind: 'road', from: O, to: cap(po), km: Math.round(hav(o, P1) * 1.25), mode: 'truck', pts: [[o[0], o[1]], [P1[0], P1[1]]], est: true });
      legs.push({ kind: 'sea', from: cap(po), to: cap(pd), km: Math.round(hav(P1, P2) * 1.15), mode: (o[2] === 'SE' || d[2] === 'SE') ? 'ropax' : 'ship-bulk', pts: [[P1[0], P1[1]], [P2[0], P2[1]]], est: true });
      if (hav(P2, d) > 2) legs.push({ kind: 'road', from: cap(pd), to: Dn, km: Math.round(hav(P2, d) * 1.25), mode: 'truck', pts: [[P2[0], P2[1]], [d[0], d[1]]], est: true }); }
    this.setState({ looking: true, err: '', cLegs: [], cid: this.state.cid + 1, leg: -1 }); clearTimeout(this._lk);
    this._lk = setTimeout(() => this.setState({ looking: false, cLegs: legs, modes: legs.map((l) => l.mode), cid: this.state.cid + 1, flip: this.state.flip + 1 }), 900);
  }
  legTrace(l, i, m, kg) { return { title: l.from + ' → ' + l.to, value: fmt(kg), unit: 'kg CO₂e', status: 'draft', note: 'Illustrative distance. No external road or maritime routing service has verified this route.', steps: [
    { k: 'Source', t: l.est ? 'Coordinate-based estimate' : 'Design route preset', id: decimal(l.km) + ' km', d: l.est ? 'Great-circle distance with an illustrative uplift' : 'Distance supplied with the v3 design' },
    { k: 'Factor', t: EF[l.mode][2], id: EF[l.mode][1] + ' · ' + EF[l.mode][0] + ' kg/tkm · v2025', d: 'emission_factor_library.csv' },
    { k: 'Calculation', t: fmt(m) + ' t × ' + fmt(l.km) + ' km × ' + EF[l.mode][0], id: '= ' + fmt(kg) + ' kg CO₂e', d: 'tonnes × km × factor' } ] }; }
  viewModel() {
    const st = this.state, tv = st.tv || {}; const legs = this.legsNow(); const m = st.mass > 0 ? st.mass : 0; const c = this.calc(legs, m);
    const tr = (o) => () => { if (this.props.onTrace) this.props.onTrace(o); };
    const hvo = this.calc(legs, m, (l) => (l.mode === 'truck' ? 'truck-hvo' : l.mode)).kg, best = this.calc(legs, m, (l) => (l.mode === 'truck' ? (l.km > 150 ? 'rail' : 'truck-hvo') : l.mode)).kg, mx = Math.max(1, c.kg, hvo, best);
    const b = this.batch(st.hvo); const km = legs.reduce((s, l) => s + l.km, 0); const L = st.leg >= 0 ? legs[st.leg] : null;
    const stops = []; legs.forEach((l, i) => { if (i === 0) stops.push({ t: l.from, lon: l.pts[0][0], lat: l.pts[0][1], h: 1.7 }); const e = l.pts[l.pts.length - 1]; stops.push({ t: l.to, lon: e[0], lat: e[1], h: i === legs.length - 1 ? 1.7 : 1.1 }); });
    return {
      presets: Object.keys(PRESETS).map((k) => ({ label: PRESETS[k].label, on: st.preset === k ? 'true' : 'false', pick: () => this.pick(k) })),
      isCustom: st.preset === 'custom', cO: st.cO, cD: st.cD, setO: (e) => this.changeLocation('cO', e.target.value), setD: (e) => this.changeLocation('cD', e.target.value),
      placeGroups: [['FI','Finland'],['BAL','Baltic region and Poland'],['SE','Sweden']].map(([id,label]) => ({id,label,places:st.places.filter(p => p.group === id).sort((a,b) => a.name.localeCompare(b.name))})),
      findRoute: (e) => { e.preventDefault(); this.findRoute(); }, hasErr: !!st.err, err: st.err, looking: st.looking,
      material: PRESETS[st.preset].material, massStr: st.massStr, massErr: !(st.mass > 0),
      setMass: (e) => { const v = parseFloat(e.target.value); this.setState({ massStr: e.target.value, mass: isNaN(v) ? 0 : v }); },
      legs: legs.map((l, i) => ({ n: String(i + 1), sid: 'leg-' + i, from: l.from, to: l.to, road: l.kind === 'road', sea: l.kind === 'sea', mode: l.mode, km: decimal(l.km), kg: fmt(c.per[i] || 0), formula:m > 0 ? calculation(m,l.km,EF[l.mode][0],c.per[i]) : 'Enter a positive cargo mass to calculate emissions.', icon: ICON[l.kind], col: l.kind === 'sea' ? 'var(--glacier)' : 'var(--pea)', bd: st.leg === i ? 'var(--ink)' : 'var(--line)', bg: st.leg === i ? 'var(--sunk)' : '#fff',
        setMode: (e) => { const md = st.modes.slice(); md[i] = e.target.value; this.setState({ modes: md }); }, focus: () => { this.setState({ leg: i }); if (this.map) this.map.fitTo(l.pts, 2.6); } })),
      n: { total: m > 0 && legs.length ? fmt(tv.total || 0) : '—', batch: fmt(tv.batch || 0), saved: fmt(tv.saved || 0) },
      compare: m > 0 && legs.length ? [['Now', c.kg, '#EAF2F7'], ['HVO100', hvo, '#3CCB7F'], ['Rail + ship', best, '#5AA9F0']].map((x) => ({ label: x[0], v: fmt(x[1]), w: (x[1] / mx * 100).toFixed(1), col: x[2] })) : [],
      canvasRef: this.canvasRef, stops, flipCls: st.flip % 2 ? 'swap-a' : 'swap-b',
      routeName: legs.length ? legs[0].from + ' → ' + legs[legs.length - 1].to : 'Choose a route', routeSub: legs.length ? decimal(km) + ' km · ' + legs.length + (legs.length > 1 ? ' legs' : ' leg') + (legs.some((l) => l.est) ? ' · estimated' : '') : 'Select From and To, then Go.',
      zin: () => this.map && this.map.zoomIn(), zout: () => this.map && this.map.zoomOut(), zfit: () => { if (this.map && legs.length) this.map.fitTo([].concat.apply([], legs.map((l) => l.pts)), 2.1); },
      hasLeg: !!L, clearLeg: () => this.setState({ leg: -1 }),
      leg: L ? { n: String(st.leg + 1), from: L.from, to: L.to, rows: [{ k: 'Distance', v: fmt(L.km) + ' km' }, { k: 'Source', v: L.kind === 'sea' ? 'Port distance' : 'Road route' + (L.est ? ' (est.)' : '') }, { k: 'Transport', v: EF[L.mode][2] }, { k: 'Emissions', v: fmt(c.per[st.leg]) + ' kg' }], trace: tr(this.legTrace(L, st.leg, m, c.per[st.leg])) } : { rows: [] },
      hvo: st.hvo, hvoStr: st.hvo ? 'true' : 'false', toggleHvo: () => this.setState({ hvo: !st.hvo }),
      batch: b.rows.map((r) => ({ mode: r.mode, t: fmt(r.t), w: (r.t / 4100 * 100).toFixed(1), col: r.id.indexOf('truck') === 0 ? (st.hvo && r.id === 'truck' ? 'var(--pea)' : 'var(--ink-2)') : 'var(--glacier)',
        trace: tr({ title: r.mode + ' 2025', value: fmt(r.t), unit: 't CO₂e', status: 'review', steps: [{ k: 'Source', t: 'shipments.csv', id: (r.tkm / 1e6).toFixed(1) + ' M tonne-km', d: '2025 legs for this mode' }, { k: 'Factor', t: r.efId, id: r.ef + ' kg/tkm', d: 'emission_factor_library.csv · v2025' }] }) }))
    };
  }

  render() {
    const v = this.viewModel();
    if (backendMode) {
      v.n.total = this.state.trip ? fmt(this.state.trip.total_kgco2e) : this.state.tripError || !(this.state.mass > 0) ? 'Unavailable' : this.legsNow().length ? '…' : '—';
      v.routeSub += ' · illustrative route';
      v.legs = v.legs.map((leg,i) => {
        const line = this.state.trip?.lines[i];
        return {...leg,kg:line ? fmt(line.kgco2e) : '—',formula:line ? calculation(line.mass_t,line.distance_km,line.factor_kgco2e_per_tkm,line.kgco2e) : 'Calculation pending · a valid cargo mass and available factor are required.'};
      });
      const values = this.state.comparisons;
      const max = values ? Math.max(1,...values.filter(value => value != null)) : 1;
      v.compare = v.compare.map((item,i) => ({...item,v:values ? values[i] == null ? 'Unavailable' : fmt(values[i]) : '…',w:values && values[i] != null ? values[i] / max * 100 : 0}));
      if (this.state.trip && this.state.leg >= 0) {
        const line = this.state.trip.lines[this.state.leg];
        if (line) v.leg.trace = () => this.props.onTrace?.({title:`${line.origin} → ${line.destination}`,value:fmt(line.kgco2e),unit:'kg CO₂e',status:'draft',note:this.state.trip.limitations.join('\n'),steps:[
          {k:'Source',t:'Illustrative route distance',id:`${line.distance_km} km`,d:line.distance_verification},
          {k:'Factor',t:line.factor_id,id:`${line.factor_kgco2e_per_tkm} kg/tkm · ${line.factor_version}`,d:`${line.factor_source.file} · row ${line.factor_source.row_number}`},
          {k:'Calculation',t:`${line.mass_t} t × ${line.distance_km} km × ${line.factor_kgco2e_per_tkm}`,id:`${line.kgco2e} kg CO₂e`,d:this.state.trip.method_version}
        ]});
      }
    }
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "18px", "alignItems": "stretch"}}>
          <section className={"card rise"} aria-label={"Shipment"} style={{"flex": "1 1 360px", "minWidth": "0", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <div role={"group"} aria-label={"Route"} style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
              {(v.presets || []).map((p, index0) => <React.Fragment key={index0}>
                <button type={"button"} className={"chipbtn"} aria-pressed={p.on} onClick={p.pick}>
                  {p.label}
                </button>
              </React.Fragment>)}
            </div>
            {v.isCustom ? <>
              <form onSubmit={v.findRoute} style={{"display": "grid", "gridTemplateColumns": "minmax(0,1fr) minmax(0,1fr) auto", "gap": "8px", "alignItems": "end"}}>
                <div style={{minWidth:0}}>
                  <label className={"lbl"} htmlFor={"fr-o"}>
                    {"From"}
                  </label>
                  <select id="fr-o" className="field" value={v.cO} onChange={v.setO} required disabled={this.state.catalogLoading || !!this.state.catalogError} aria-describedby="fr-location-help">
                    <option value="">Select origin</option>
                    {v.placeGroups.map(group => <optgroup key={group.id} label={group.label}>
                      {group.places.map(place => <option key={place.id} value={place.id} disabled={place.id === v.cD}>{place.name}</option>)}
                    </optgroup>)}
                  </select>
                </div>
                <div style={{minWidth:0}}>
                  <label className={"lbl"} htmlFor={"fr-d"}>
                    {"To"}
                  </label>
                  <select id="fr-d" className="field" value={v.cD} onChange={v.setD} required disabled={this.state.catalogLoading || !!this.state.catalogError} aria-describedby="fr-location-help">
                    <option value="">Select destination</option>
                    {v.placeGroups.map(group => <optgroup key={group.id} label={group.label}>
                      {group.places.map(place => <option key={place.id} value={place.id} disabled={place.id === v.cO}>{place.name}</option>)}
                    </optgroup>)}
                  </select>
                </div>
                <button type={"submit"} className={"btn btn-n"} disabled={this.state.catalogLoading || !!this.state.catalogError || v.looking || !v.cO || !v.cD || v.massErr}>
                  {v.looking ? 'Finding…' : 'Go'}
                </button>
              </form>
              <p id="fr-location-help" style={{margin:0,fontSize:12,color:'var(--muted)'}}>{this.state.catalogLoading ? 'Loading supported locations…' : `${this.state.places.length} supported locations. Route distances are illustrative estimates.`}</p>
              {this.state.catalogError && <div role="alert" style={{fontSize:13,color:'var(--ember-ink)'}}>{this.state.catalogError} <button type="button" className="btn" onClick={() => this.loadCatalog()}>Retry</button></div>}
            </> : null}
            {v.hasErr && <div role="alert" style={{fontSize:13,color:'var(--ember-ink)'}}>{v.err}</div>}
            <div style={{"display": "grid", "gridTemplateColumns": "1fr 120px", "gap": "12px", "alignItems": "end"}}>
              <div>
                <span className={"lbl"}>
                  {"Cargo"}
                </span>
                <div style={{"fontSize": "15px", "fontWeight": "600", "minHeight": "44px", "display": "flex", "alignItems": "center"}}>
                  {v.material}
                </div>
              </div>
              <div>
                <label className={"lbl"} htmlFor={"fr-m"}>
                  {"Tonnes"}
                </label>
                <input id={"fr-m"} className={"field num"} type={"number"} min={"0"} step={"0.1"} value={v.massStr} onChange={v.setMass} style={{"fontSize": "16px", "fontWeight": "600"}} />
              </div>
            </div>
            {v.massErr ? <>
              <div role={"alert"} style={{"fontSize": "12.5px", "color": "var(--ember-ink)", "marginTop": "-8px"}}>
                {"Enter more than 0 t."}
              </div>
            </> : null}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
              {v.looking ? <>
                <div className={"shim"} style={{"height": "84px", "borderRadius": "14px"}}>
                </div>
                <div className={"shim"} style={{"height": "84px", "borderRadius": "14px"}}>
                </div>
              </> : null}
              {(v.legs || []).map((l, index0) => <React.Fragment key={index0}>
                <div className={"rise"} style={{"--i": index0, "border": "1px solid " + String(l.bd), "borderRadius": "14px", "padding": "12px", "display": "flex", "flexDirection": "column", "gap": "10px", "background": l.bg, "transition": "border-color .25s, background .25s"}}>
                  <button type={"button"} onClick={l.focus} style={{"display": "flex", "alignItems": "center", "gap": "10px", "border": "0", "background": "transparent", "padding": "0", "textAlign": "left"}}>
                    <span style={{"flex": "none", "width": "28px", "height": "28px", "borderRadius": "50%", "background": l.col, "color": "var(--night)", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                      <svg width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                        <path d={l.icon}>
                        </path>
                      </svg>
                    </span>
                    <span style={{"flex": "1", "minWidth": "0", "fontSize": "14px", "fontWeight": "600"}}>
                      {String(l.from) + " → " + String(l.to)}
                    </span>
                    <span className={"num"} style={{"fontSize": "15px", "fontWeight": "600", "whiteSpace": "nowrap"}}>
                      {String(l.km) + " km"}
                    </span>
                  </button>
                  <div style={{"display": "flex", "gap": "10px", "alignItems": "center"}}>
                    {l.road ? <>
                      <label className={"sr"} htmlFor={l.sid}>
                        {"Transport for leg " + String(l.n)}
                      </label>
                      <select id={l.sid} className={"field"} value={l.mode} onChange={l.setMode} style={{"flex": "1", "minHeight": "40px"}}>
                        <option value={"truck"}>
                          {"Truck"}
                        </option>
                        <option value={"truck-reefer"}>
                          {"Cooled truck"}
                        </option>
                        <option value={"truck-hvo"}>
                          {"Truck, HVO100"}
                        </option>
                        <option value={"rail"}>
                          {"Rail"}
                        </option>
                      </select>
                    </> : null}
                    {l.sea ? <>
                      <label className={"sr"} htmlFor={l.sid}>
                        {"Transport for leg " + String(l.n)}
                      </label>
                      <select id={l.sid} className={"field"} value={l.mode} onChange={l.setMode} style={{"flex": "1", "minHeight": "40px"}}>
                        <option value={"ship-bulk"}>
                          {"Bulk ship"}
                        </option>
                        <option value={"ropax"}>
                          {"Ferry"}
                        </option>
                        <option value={"ship-reefer"}>
                          {"Cooled container ship"}
                        </option>
                      </select>
                    </> : null}
                    <span style={{"flex": "none", "fontSize": "13px", "color": "var(--muted)", "whiteSpace": "nowrap"}}>
                      <span className={"num"} style={{"color": "var(--ink)", "fontWeight": "600"}}>
                        {l.kg}
                      </span>
                      {" kg"}
                    </span>
                  </div>
                  <div className="mono" style={{fontSize:11,lineHeight:1.6,color:'var(--muted)',overflowWrap:'anywhere'}}>{l.formula}</div>
                </div>
              </React.Fragment>)}
            </div>
            <div style={{"padding": "16px", "borderRadius": "14px", "background": "var(--night)", "color": "var(--night-ink)", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
              <div style={{"display": "flex", "alignItems": "baseline", "justifyContent": "space-between", "gap": "10px", "flexWrap": "wrap"}}>
                <span style={{"fontSize": "13px", "color": "var(--night-muted)"}}>
                  {"Emissions"}
                </span>
                <span>
                  <span className={"num"} style={{"fontSize": "34px", "fontWeight": "600"}}>
                    {v.n.total}
                  </span>
                  <span style={{"fontSize": "14px", "color": "var(--night-muted)"}}>
                    {"kg CO₂e"}
                  </span>
                </span>
              </div>
              {(v.compare || []).map((c, index0) => <React.Fragment key={index0}>
                <div style={{"display": "grid", "gridTemplateColumns": "96px 1fr 64px", "gap": "10px", "alignItems": "center", "fontSize": "12.5px"}}>
                  <span style={{"color": "var(--night-muted)"}}>
                    {c.label}
                  </span>
                  <span style={{"display": "block", "height": "8px", "borderRadius": "999px", "background": "var(--night-3)", "overflow": "hidden"}}>
                    <span className={"w-a"} style={{"display": "block", "height": "100%", "width": String(c.w) + "%", "background": c.col, "borderRadius": "999px"}}>
                    </span>
                  </span>
                  <span className={"num"} style={{"textAlign": "right", "fontWeight": "600"}}>
                    {c.v}
                  </span>
                </div>
              </React.Fragment>)}
            </div>
          </section>
          <section className={"dark rise"} aria-label={"Route map"} style={{"--i": "2", "flex": "2 1 560px", "minWidth": "0", "position": "relative", "minHeight": "600px", "overflow": "hidden"}}>
            <canvas ref={v.canvasRef} className={"canvas3d"} aria-hidden={"true"} style={{"position": "absolute", "inset": "0"}}>
            </canvas>
            {(v.stops || []).map((s, index0) => <React.Fragment key={index0}>
              <div className={"anchor"} data-anchor={"1"} data-lon={s.lon} data-lat={s.lat} data-h={s.h} data-hs={"route"}>
                <span>
                  {s.t}
                </span>
              </div>
            </React.Fragment>)}
            <div className={v.flipCls} style={{"position": "absolute", "left": "18px", "top": "18px", "display": "flex", "flexDirection": "column", "gap": "2px"}}>
              <span className={"h-d"} style={{"fontSize": "20px", "fontWeight": "600"}}>
                {v.routeName}
              </span>
              <span style={{"fontSize": "13px", "color": "var(--night-muted)"}}>
                {v.routeSub}
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
              <button type={"button"} className={"mapbtn"} aria-label={"Fit route"} onClick={v.zfit}>
                <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                  <path d={"M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"}>
                  </path>
                </svg>
              </button>
            </div>
            <div style={{"position": "absolute", "left": "18px", "bottom": "18px", "display": "flex", "gap": "6px"}}>
              <span className={"mapchip"}>
                <span className={"dot"} style={{"background": "#3CCB7F"}}>
                </span>
                {"Road"}
              </span>
              <span className={"mapchip"}>
                <span className={"dot"} style={{"background": "#5AA9F0"}}>
                </span>
                {"Sea"}
              </span>
            </div>
            {v.hasLeg ? <>
              <div className={"mapcard card-in"} style={{"position": "absolute", "right": "18px", "top": "18px", "width": "min(290px, calc(100% - 36px))", "padding": "16px", "display": "flex", "flexDirection": "column", "gap": "10px"}}>
                <div style={{"display": "flex", "gap": "10px", "alignItems": "flex-start"}}>
                  <div style={{"flex": "1"}}>
                    <div style={{"fontSize": "12px", "color": "var(--night-muted)", "fontWeight": "600"}}>
                      {"Leg " + String(v.leg.n)}
                    </div>
                    <div className={"h-d"} style={{"fontSize": "17px", "fontWeight": "600", "marginTop": "2px"}}>
                      {String(v.leg.from) + " → " + String(v.leg.to)}
                    </div>
                  </div>
                  <button type={"button"} className={"mapbtn"} aria-label={"Close details"} onClick={v.clearLeg} style={{"width": "34px", "height": "34px"}}>
                    <svg width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                      <path d={"M6 6l12 12M18 6 6 18"}>
                      </path>
                    </svg>
                  </button>
                </div>
                {(v.leg.rows || []).map((r, index0) => <React.Fragment key={index0}>
                  <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "fontSize": "13px", "padding": "6px 0", "borderTop": "1px solid var(--night-line)"}}>
                    <span style={{"color": "var(--night-muted)"}}>
                      {r.k}
                    </span>
                    <span style={{"fontWeight": "600", "textAlign": "right"}}>
                      {r.v}
                    </span>
                  </div>
                </React.Fragment>)}
                <button type={"button"} className={"btn btn-p"} onClick={v.leg.trace} style={{"minHeight": "40px"}}>
                  {"Show calculation"}
                </button>
              </div>
            </> : null}
          </section>
        </div>
        <section className={"card rise"} aria-label={"All 2025 shipments"} style={{"--i": "3", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "14px", "justifyContent": "space-between"}}>
            <div style={{"display": "flex", "alignItems": "baseline", "gap": "12px", "flexWrap": "wrap"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {backendMode ? 'All shipments 2025 · design sample' : 'All shipments 2025'}
              </h2>
              <span>
                <span className={"num"} style={{"fontSize": "26px", "fontWeight": "600"}}>
                  {v.n.batch}
                </span>
                <span style={{"fontSize": "13px", "color": "var(--muted)"}}>
                  {"t CO₂e · 2 339 legs"}
                </span>
              </span>
              {v.hvo ? <>
                <span className={"pill p-ok swap-a"}>
                  {"−" + String(v.n.saved) + " t"}
                </span>
              </> : null}
            </div>
            <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
              <button type={"button"} className={"sw"} aria-pressed={v.hvoStr} aria-label={"Use HVO100 in all trucks"} onClick={v.toggleHvo}>
              </button>
              <span style={{"fontSize": "13px", "fontWeight": "600"}}>
                {"HVO100 in trucks"}
              </span>
            </div>
          </div>
          <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
            {(v.batch || []).map((b, index0) => <React.Fragment key={index0}>
              <button type={"button"} onClick={b.trace} style={{"display": "grid", "gridTemplateColumns": "170px 1fr 90px", "gap": "14px", "alignItems": "center", "padding": "6px 4px", "border": "0", "background": "transparent", "textAlign": "left", "fontSize": "13.5px"}}>
                <span style={{"fontWeight": "600"}}>
                  {b.mode}
                </span>
                <span style={{"display": "block", "height": "12px", "borderRadius": "999px", "background": "var(--sunk)", "overflow": "hidden"}}>
                  <span className={"w-a"} style={{"display": "block", "height": "100%", "width": String(b.w) + "%", "background": b.col, "borderRadius": "999px"}}>
                  </span>
                </span>
                <span className={"num"} style={{"textAlign": "right", "fontWeight": "600"}}>
                  {String(b.t) + " t"}
                </span>
              </button>
            </React.Fragment>)}
          </div>
        </section>
      </div>
    </>;
  }
}
