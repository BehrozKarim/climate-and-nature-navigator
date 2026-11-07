import React from 'react';
import { api, backendMode, sourceTrace } from './lib/api.js';
import { installNavigation, syncDialogFocus } from './lib/interactions.js';
import { ConnectedInventory, ConnectedReview } from './lib/connected-screens.jsx';
import VoiceChat from './lib/VoiceChat.jsx';
import Overview from './screens/Overview.jsx';
import Freight from './screens/Freight.jsx';
import Pathways from './screens/Pathways.jsx';
import Climate from './screens/Climate.jsx';
import Nature from './screens/Nature.jsx';

const InventoryScreen = ConnectedInventory;
const ReviewScreen = ConnectedReview;

const SCN = {
  ssp126: { ssp: 'SSP1-2.6', label: 'Low', t: '2.6', tc: '#0D6A3C' },
  ssp245: { ssp: 'SSP2-4.5', label: 'Medium', t: '4.5', tc: '#6B4A00' },
  ssp585: { ssp: 'SSP5-8.5', label: 'High', t: '8.5', tc: '#A43A14' }
};
const ICONS = {
  compass: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z', 'M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5Z', ''],
  layers: ['M12 3 3 8l9 5 9-5-9-5Z', 'M3 12.5l9 5 9-5', 'M3 17l9 5 9-5'],
  truck: ['M2.5 6.5h11v9h-11Z', 'M13.5 9.5h4l3 3v3h-7', 'M5 17.5a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0ZM15.6 17.5a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0Z'],
  trend: ['M3 6l6.5 6.5 4-4L21 16', 'M21 10v6h-6', ''],
  thermo: ['M14 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0Z', 'M12 9v7', ''],
  leaf: ['M5 20c0-9 5.5-15 15-16-.5 10-6.5 16-15 16Z', 'M5 20l8-8', ''],
  shield: ['M12 3l8 3v6c0 4.6-3.4 8-8 9-4.6-1-8-4.4-8-9V6l8-3Z', 'M8.8 12.2l2.2 2.2 4.2-4.4', '']
};
const SCREENS = [
  { id: 'overview', label: 'Overview', icon: 'compass' }, { id: 'inventory', label: 'Emissions', icon: 'layers' }, { id: 'freight', label: 'Freight', icon: 'truck' },
  { id: 'pathways', label: 'Pathways', icon: 'trend' }, { id: 'climate', label: 'Climate risk', icon: 'thermo' }, { id: 'nature', label: 'Nature', icon: 'leaf' }, { id: 'review', label: 'Review', icon: 'shield' }
];
const Q = [
  { q: 'Which actions close the 2030 gap cheapest?' }, { q: 'How does high warming hit our peas?' }, { q: 'Why is the 2025 draft blocked?' }, { q: 'Where do freight emissions come from?' }
];

export default class Main extends React.Component {
  constructor(...a) {
    super(...a);
    const p = this.props || {};
    this.state = { screen: p.startScreen || 'overview', pinned: !!p.railPinned, scenario: 'ssp245', year: 2040, sflip: 0, palette: false, q: '', act: 0, ask: false, askInput: '', thread: [], trace: null, trStatus: 'review', toast: '', inbox: 0 };
    this.navTo = (id) => { if (!SCREENS.some(s => s.id === id)) return; history.pushState(null, '', '#' + id); this.setState({ screen: id, sflip: this.state.sflip + 1, palette: false, q: '' }); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {} };
    this.openTrace = (o) => { if (!o) return; this.setState({ trace: o, trStatus: o.status || 'review', palette: false, ask: false }); };
    this.askQ = (q) => this.ask(q);
    this.toastFn = (m) => this.toast(m);
    this.palRef = (el) => { if (el) setTimeout(() => { try { el.focus(); } catch (e) {} }, 40); };
    this.threadRef = (el) => { this._thread = el; };
    this.stop = (e) => e.stopPropagation();
  }
  componentDidMount() {
    this._removeNavigation = installNavigation(this, SCREENS.map(s => s.id));
    if (backendMode) api.reviews().then(q => { if (!this._dead) this.setState({ inbox: q.items.filter(i => !['approved_for_demo','published_source_context'].includes(i.status)).length }); }).catch(e => this.toast(e.message));
  }
  componentWillUnmount() { this._dead = true; this._removeNavigation?.(); clearTimeout(this._searchTimer); this._searchAbort?.abort(); cancelAnimationFrame(this._typeRaf); clearTimeout(this._tt); }
  componentDidUpdate() {
    syncDialogFocus(this);
    if (backendMode && this.state.palette && this.state.q !== this._searchQuery) {
      this._searchQuery = this.state.q;
      const query = this.state.q.trim();
      clearTimeout(this._searchTimer); this._searchAbort?.abort();
      this.setState({ searchResults: [], searchError: '' });
      if (query) this._searchTimer = setTimeout(async () => {
        const abort = this._searchAbort = new AbortController();
        try {
          const result = await api.search(query, { signal: abort.signal });
          if (!this._dead && !abort.signal.aborted) this.setState({ searchResults: result.records });
        } catch(e) { if (!this._dead && e.name !== 'AbortError') this.setState({ searchError: e.message }); }
      }, 250);
    }
    const n = this.state.thread.length + ':' + (this.state.thread.length ? this.state.thread[this.state.thread.length - 1].shown : 0); if (n !== this._tn && this._thread) { this._tn = n; try { this._thread.scrollTop = this._thread.scrollHeight; } catch (e) {} } }
  toast(msg) { clearTimeout(this._tt); this.setState({ toast: msg }); this._tt = setTimeout(() => this.setState({ toast: '' }), 2600); }
  async askBackend(q) {
    if (this._asking) return;
    this._asking = true;
    const pending = { role: 'ai', text: 'Retrieving sources and asking AI… Temporary connection failures are retried automatically.', shown: 150, cites: [] };
    this.setState(st => ({ thread: [...st.thread, { role:'user', text:q }, pending], askInput:'', ask:true, asking:true, palette:false, trace:null }));
    try {
      const messages = await api.ask(q);
      if (!this._dead) this.setState({ thread: messages.map((m,index) => {
        const generated = m.generation_mode === 'ai_explanation_requires_review';
        const label = generated ? `AI · ${m.provider_model || 'Navigator'}${m.answer_scope === 'conversation_only' ? '' : ' · requires review'}` : m.generation_mode === 'guidance_not_ai' ? 'Navigator guidance' : `${m.provider_status === 'unavailable_or_invalid_output' ? 'AI unavailable' : 'Source response'} · ${m.provider_error || 'AI generation was not used.'}`;
        const text = m.role === 'assistant' ? label + '\n\n' + m.text : m.text;
        return { role: m.role === 'assistant' ? 'ai' : 'user', text, shown:text.length,
          retryQuestion:m.role === 'assistant' && m.provider_retryable && index === messages.length-1 ? messages[index-1]?.text : null,
          cites:(m.citations || []).map(c => [c.path, { title:c.path, value:c.source_kind === 'model' ? 'Model parameters' : c.line_start ? 'Lines ' + c.line_start + '–' + c.line_end : 'Source', unit:'', status:'draft', note:c.excerpt, steps:[{k:'Source',t:c.path,id:c.citation_id,d:c.file_sha256 || c.model?.config_sha256 || c.source?.file_sha256 || ''}] }]) };
      }) });
      return messages.filter(message => message.role === 'assistant').at(-1);
    } catch(e) {
      if (!this._dead) this.setState(st => ({ thread: st.thread.map(m => m === pending ? { ...m, text:e.message, shown:e.message.length } : m) }));
      throw e;
    } finally { this._asking = false; if (!this._dead) this.setState({asking:false}); }
  }
  ask(q) {
    const text = (q || '').trim();
    if (text && !this.state.voiceActive) this.askBackend(text).catch(() => {});
  }
  palGroups() {
    const s = this;
    const G = [
      { g: 'Pages', items: SCREENS.map((x) => ({ label: x.label, sub: '', tag: 'Page', tagCls: 'p-draft', run: () => s.navTo(x.id) })) },
      { g: 'Actions', items: [
        { label: 'Route Riga → Kantvik', sub: 'Freight', tag: 'Do', tagCls: 'p-ok', run: () => s.navTo('freight') },
        { label: 'High warming', sub: 'Set warming level', tag: 'Do', tagCls: 'p-ok', run: () => { s.setState({ scenario: 'ssp585', palette: false }); s.toast('Warming set to high'); } },
        { label: 'Low warming', sub: 'Set warming level', tag: 'Do', tagCls: 'p-ok', run: () => { s.setState({ scenario: 'ssp126', palette: false }); s.toast('Warming set to low'); } },
        { label: Q[0].q, sub: 'Ask', tag: 'Ask', tagCls: 'p-rev', run: () => s.ask(Q[0].q) }
      ] },
      { g: 'Records', items: (this.state.searchResults || []).map(r => ({ label:r.record_id, sub:r.table, tag:'Record', tagCls:'p-info', run:() => this.openTrace(sourceTrace(r)) })) }
    ];
    const q = (this.state.q || '').trim().toLowerCase();
    let out = G.map((g) => ({ g: g.g, items: q ? g.items.filter((it) => (it.label + ' ' + it.sub + ' ' + it.tag).toLowerCase().indexOf(q) > -1) : g.items })).filter((g) => g.items.length);
    let i = 0; const flat = [];
    out = out.map((g) => ({ g: g.g, items: g.items.map((it) => { const bg = i === this.state.act ? 'var(--sunk)' : 'transparent'; flat.push(it); i++; return Object.assign({}, it, { bg }); }) }));
    this._flat = flat; return out;
  }
  viewModel() {
    const st = this.state; const idx = Math.max(0, SCREENS.findIndex((x) => x.id === st.screen)); const cur = SCREENS[idx];
    const nav = SCREENS.map((x, i) => ({ label: x.label, d1: ICONS[x.icon][0], d2: ICONS[x.icon][1], d3: ICONS[x.icon][2], cur: i === idx ? 'page' : 'false', color: i === idx ? '#3CCB7F' : '#C9D8E2', badge: x.id === 'review' && st.inbox > 0, badgeN: String(st.inbox), go: () => this.navTo(x.id) }));
    const pal = st.palette ? this.palGroups() : [];
    const thread = st.thread.map((m, i) => { const done = m.role === 'ai' && m.shown >= m.text.length; return { user: m.role === 'user', ai: m.role === 'ai', text: m.text, display: m.role === 'ai' ? m.text.slice(0, m.shown) : m.text, caret: m.role === 'ai' && !done ? 'caret' : '', done, canRetry:!!m.retryQuestion,retry:()=>this.ask(m.retryQuestion), cites: (m.cites || []).map((c) => ({ label: c[0], open: () => this.openTrace(typeof c[1] === 'object' ? c[1] : null) })) }; });
    const asked = st.thread.filter((m) => m.role === 'user').map((m) => m.text);
    const suggest = Q.map((x) => ({ q: x.q, go: () => this.ask(x.q) })); const suggestRest = suggest.filter((x) => asked.indexOf(x.q) < 0); const lastAi = st.thread[st.thread.length - 1];
    const tr = st.trace || { title: '', value: '', unit: '', steps: [] };
    const trMap = { approved: ['p-ok', 'Approved'], review: ['p-rev', 'In review'], draft: ['p-draft', 'Draft'], blocked: ['p-risk', 'Blocked'], changes: ['p-risk', 'Changes requested'], published_source_context: ['p-info', 'Published source'], source_context: ['p-info', 'Source context'], preliminary: ['p-draft', 'Preliminary'], unavailable: ['p-info', 'Unavailable'] }; const trm = trMap[st.trStatus] || trMap.review;
    const stCol = { Source: '#1B5E96', Factor: '#6B4A00', Calculation: '#0D6A3C', Check: '#A43A14' };
    const keys = ['ssp126', 'ssp245', 'ssp585'];
    return {
      railCls: 'rail' + (st.pinned ? '' : ' collapsed'), railW: st.pinned ? 232 : 76, indTop: idx * 52, nav,
      pinnedStr: st.pinned ? 'true' : 'false', pinLabel: st.pinned ? 'Collapse menu' : 'Expand menu', pinText: 'Collapse', pinRot: st.pinned ? 180 : 0, togglePin: () => this.setState({ pinned: !st.pinned }),
      showW: ['overview', 'climate'].indexOf(st.screen) > -1, showY: ['overview', 'climate', 'pathways'].indexOf(st.screen) > -1,
      screenLabel: cur.label, sflipCls: st.sflip % 2 ? 'swap-a' : 'swap-b', scrCls: st.sflip % 2 ? 'scr-a' : 'scr-b',
      palette: st.palette, openPal: () => this.setState({ palette: true, q: '', act: 0 }), closePal: () => this.setState({ palette: false }), stop: this.stop, palRef: this.palRef,
      q: st.q, pal, palEmpty: st.palette && pal.length === 0, onQ: (e) => this.setState({ q: e.target.value, act: 0 }),
      palKey: (e) => { const n = (this._flat || []).length; if (e.key === 'Escape') { e.preventDefault(); this.setState({ palette: false }); } else if (e.key === 'ArrowDown') { e.preventDefault(); this.setState({ act: n ? (st.act + 1) % n : 0 }); } else if (e.key === 'ArrowUp') { e.preventDefault(); this.setState({ act: n ? (st.act - 1 + n) % n : 0 }); } else if (e.key === 'Enter') { e.preventDefault(); const it = (this._flat || [])[st.act]; if (it) it.run(); } },
      scenario: st.scenario, year: st.year,
      scns: keys.map((k) => ({ label: SCN[k].label, t: SCN[k].t, tc: SCN[k].tc, tip: SCN[k].ssp + ' · supplied climate scenario', on: st.scenario === k ? 'true' : 'false', pick: () => this.setState({ scenario: k }) })),
      scnThumb: 4 + keys.indexOf(st.scenario) * 96,
      years: [2030, 2040, 2050].map((y) => ({ label: String(y), on: st.year === y ? 'true' : 'false', pick: () => this.setState({ year: y }) })), yrThumb: 4 + [2030, 2040, 2050].indexOf(st.year) * 54,
      openAsk: () => this.setState({ ask: true, trace: null, palette: false }), closeAsk: () => this.setState({ ask: false }),
      inbox: String(st.inbox), inboxLabel: st.inbox + ' items to review', goReview: () => this.navTo('review'),
      isOverview: st.screen === 'overview', isInventory: st.screen === 'inventory', isFreight: st.screen === 'freight', isPathways: st.screen === 'pathways', isClimate: st.screen === 'climate', isNature: st.screen === 'nature', isReview: st.screen === 'review',
      openTrace: this.openTrace, navTo: this.navTo, askQ: this.askQ, toastFn: this.toastFn,
      ask: st.ask, threadRef: this.threadRef, threadEmpty: st.thread.length === 0, thread, suggest, suggestRest,
      showMore: st.thread.length > 0 && suggestRest.length > 0 && !!lastAi && lastAi.shown >= lastAi.text.length,
      askInput: st.askInput, onAskInput: (e) => this.setState({ askInput: e.target.value }), submitAsk: (e) => { e.preventDefault(); this.ask(st.askInput); },
      hasTrace: !!st.trace, tr, trCls: trm[0], trLabel: trm[1], trApproved: st.trStatus === 'approved', trHasNote: !!tr.note,
      trSteps: (tr.steps || []).map((s, i) => Object.assign({}, s, { n: String(i + 1), col: stCol[s.k] || '#253642' })),
      closeTrace: () => this.setState({ trace: null }),
      approve: () => this.toast('Open Review to review a saved item with a note'),
      requestChange: () => this.toast('Open Review to request a change with a note'),
      hasToast: !!st.toast, toast: st.toast
    };
  }

  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexWrap": "wrap", "minHeight": "100vh", "background": "var(--ground)", "fontFamily": "var(--f-ui)", "color": "var(--ink)"}}>
        <nav className={v.railCls} aria-label={"Main navigation"} style={{"width": String(v.railW) + "px", "flex": "0 0 auto", "display": "flex", "flexDirection": "column", "gap": "14px", "padding": "16px 14px", "background": "var(--night)", "color": "var(--night-ink)"}}>
          <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "height": "48px"}}>
            <svg width={"48"} height={"48"} viewBox={"0 0 48 48"} aria-hidden={"true"} style={{"flex": "none"}}>
              <rect x={"1"} y={"1"} width={"46"} height={"46"} rx={"14"} fill={"#11263A"} stroke={"#22405A"}>
              </rect>
              <path d={"M13 33c0-11 7-19 22-20-1 13-9 20-22 20Z"} fill={"none"} stroke={"#3CCB7F"} strokeWidth={"2.4"} strokeLinejoin={"round"}>
              </path>
              <path d={"M13 33l11-11"} fill={"none"} stroke={"#3CCB7F"} strokeWidth={"2.4"} strokeLinecap={"round"}>
              </path>
              <circle cx={"35"} cy={"13"} r={"3.4"} fill={"#F2C230"}>
              </circle>
            </svg>
            <span className={"rail-label rail-word"} style={{"fontFamily": "var(--f-d)", "fontSize": "19px", "fontWeight": "700", "letterSpacing": "-0.02em"}}>
              {"Navigator"}
            </span>
          </div>
          <button type={"button"} className={"navbtn rail-pin"} aria-expanded={v.pinnedStr} aria-label={v.pinLabel} title={v.pinLabel} onClick={v.togglePin} style={{"display": "flex", "alignItems": "center", "gap": "14px", "width": "100%", "height": "44px", "padding": "0 12px", "border": "1px solid var(--night-line)", "borderRadius": "12px", "background": "var(--night-2)", "color": "var(--night-ink)", "fontSize": "13px", "fontWeight": "600", "textAlign": "left"}}>
            <svg width={"22"} height={"22"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} style={{"flex": "none", "transform": "rotate(" + String(v.pinRot) + "deg)", "transition": "transform .45s var(--spring)"}}>
              <path d={"M6 6l6 6-6 6"}>
              </path>
              <path d={"M13 6l6 6-6 6"}>
              </path>
            </svg>
            <span className={"rail-label"}>
              {v.pinText}
            </span>
          </button>
          <div className={"rail-nav"} style={{"position": "relative", "display": "flex", "flexDirection": "column", "gap": "4px", "marginTop": "6px"}}>
            <div className={"rail-ind"} aria-hidden={"true"} style={{"position": "absolute", "left": "0", "right": "0", "top": String(v.indTop) + "px", "height": "48px", "borderRadius": "12px", "background": "rgba(60,203,127,.14)", "boxShadow": "inset 3px 0 0 #3CCB7F"}}>
            </div>
            {(v.nav || []).map((it, index0) => <React.Fragment key={index0}>
              <button className={"navbtn"} type={"button"} title={it.label} aria-current={it.cur} onClick={it.go} style={{"position": "relative", "zIndex": "1", "display": "flex", "alignItems": "center", "gap": "14px", "width": "100%", "height": "48px", "padding": "0 13px", "border": "0", "borderRadius": "12px", "background": "transparent", "color": it.color, "fontSize": "14px", "fontWeight": "600", "textAlign": "left"}}>
                <svg width={"22"} height={"22"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.8"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} style={{"flex": "none"}}>
                  <path d={it.d1}>
                  </path>
                  <path d={it.d2}>
                  </path>
                  <path d={it.d3}>
                  </path>
                </svg>
                <span className={"rail-label"} style={{"flex": "1"}}>
                  {it.label}
                </span>
                {it.badge ? <>
                  <span aria-hidden={"true"} style={{"position": "absolute", "left": "30px", "top": "9px", "minWidth": "16px", "height": "16px", "padding": "0 4px", "borderRadius": "999px", "background": "var(--rape)", "color": "#2E2000", "fontSize": "10px", "fontWeight": "700", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                    {it.badgeN}
                  </span>
                </> : null}
              </button>
            </React.Fragment>)}
          </div>
        </nav>
        <div style={{"flex": "999 1 560px", "minWidth": "0", "display": "flex", "flexDirection": "column"}}>
          <header className={"hdr"} style={{"position": "sticky", "top": "0", "zIndex": "30", "display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "12px 14px", "padding": "14px 24px", "background": "rgba(244,246,245,.9)", "backdropFilter": "blur(14px)", "WebkitBackdropFilter": "blur(14px)", "borderBottom": "1px solid var(--line)"}}>
            <h1 className={"h-d " + String(v.sflipCls)} style={{"flex": "1 1 120px", "minWidth": "0", "fontSize": "26px", "fontWeight": "600", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis"}}>
              {v.screenLabel}
            </h1>
            <button type={"button"} onClick={v.openPal} aria-label={"Search"} style={{"flex": "0 1 210px", "minWidth": "130px", "height": "44px", "display": "flex", "alignItems": "center", "gap": "10px", "padding": "0 8px 0 14px", "borderRadius": "12px", "border": "1px solid var(--line-2)", "background": "#fff", "color": "var(--muted)", "fontSize": "14px"}}>
              <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"} style={{"flex": "none"}}>
                <path d={"M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14Z"}>
                </path>
                <path d={"M20 20l-4-4"}>
                </path>
              </svg>
              <span style={{"flex": "1", "textAlign": "left"}}>
                {"Search"}
              </span>
              <span className={"mono"} style={{"fontSize": "11px", "padding": "3px 7px", "borderRadius": "6px", "background": "var(--sunk)", "color": "var(--ink-2)"}}>
                {"⌘K"}
              </span>
            </button>
            {v.showW ? <>
              <div className={"swap-a"} style={{"display": "flex", "alignItems": "center", "gap": "8px"}}>
                <span style={{"fontSize": "12px", "fontWeight": "600", "color": "var(--muted)"}}>
                  {"Scenario"}
                </span>
                <div className={"seg"} role={"group"} aria-label={"Warming level"}>
                  <span className={"seg-thumb"} aria-hidden={"true"} style={{"left": String(v.scnThumb) + "px", "width": "96px"}}>
                  </span>
                  {(v.scns || []).map((s, index0) => <React.Fragment key={index0}>
                    <button type={"button"} aria-pressed={s.on} title={s.tip} onClick={s.pick} style={{"width": "96px"}}>
                      {String(s.label) + " "}
                      <span style={{"fontWeight": "500", "color": s.tc}}>
                        {s.t}
                      </span>
                    </button>
                  </React.Fragment>)}
                </div>
              </div>
            </> : null}
            {v.showY ? <>
              <div className={"swap-a"} style={{"display": "flex", "alignItems": "center", "gap": "8px"}}>
                <span style={{"fontSize": "12px", "fontWeight": "600", "color": "var(--muted)"}}>
                  {"Year"}
                </span>
                <div className={"seg"} role={"group"} aria-label={"Year"}>
                  <span className={"seg-thumb"} aria-hidden={"true"} style={{"left": String(v.yrThumb) + "px", "width": "54px"}}>
                  </span>
                  {(v.years || []).map((y, index0) => <React.Fragment key={index0}>
                    <button type={"button"} aria-pressed={y.on} onClick={y.pick} style={{"width": "54px"}}>
                      {y.label}
                    </button>
                  </React.Fragment>)}
                </div>
              </div>
            </> : null}
            <button type={"button"} className={"btn btn-p"} onClick={v.openAsk}>
              <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                <path d={"M4 5h16v11H9l-5 4V5Z"}>
                </path>
                <path d={"M8.5 10.5h7"}>
                </path>
              </svg>
              {"\n      Ask\n    "}
            </button>
            <button type={"button"} className={"ibtn"} aria-label={v.inboxLabel} title={v.inboxLabel} onClick={v.goReview}>
              <svg width={"20"} height={"20"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.8"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                <path d={"M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"}>
                </path>
                <path d={"M10 20.5a2 2 0 0 0 4 0"}>
                </path>
              </svg>
              <span style={{"position": "absolute", "top": "-5px", "right": "-5px", "minWidth": "20px", "height": "20px", "padding": "0 5px", "borderRadius": "999px", "background": "var(--rape)", "color": "#2E2000", "fontSize": "11px", "fontWeight": "700", "display": "inline-flex", "alignItems": "center", "justifyContent": "center", "boxShadow": "0 0 0 2px var(--ground)"}}>
                {v.inbox}
              </span>
            </button>
          </header>
          <main className={"content"} style={{"flex": "1", "padding": "22px 28px 64px"}}>
            {backendMode && <p role="status" style={{margin:'0 0 18px',fontSize:12,color:'var(--muted)'}}>
              Supplied synthetic snapshot · cached calculations · sources available in each view.
            </p>}
            <div className={v.scrCls}>
              {v.isOverview ? <>
                <Overview scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
              {v.isInventory ? <>
                <InventoryScreen scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
              {v.isFreight ? <>
                <Freight scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
              {v.isPathways ? <>
                <Pathways scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
              {v.isClimate ? <>
                <Climate scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
              {v.isNature ? <>
                <Nature scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
              {v.isReview ? <>
                <ReviewScreen scenario={v.scenario} year={v.year} onTrace={v.openTrace} onNav={v.navTo} onAsk={v.askQ} onToast={v.toastFn} />
              </> : null}
            </div>
          </main>
        </div>
        {v.palette ? <>
          <div className={"overlay"} onClick={v.closePal} style={{"display": "flex", "justifyContent": "center", "alignItems": "flex-start", "padding": "10vh 16px 16px"}}>
            <div className={"palette card"} role={"dialog"} aria-modal={"true"} aria-label={"Search"} onClick={v.stop} style={{"width": "min(620px, 100%)", "maxHeight": "76vh", "display": "flex", "flexDirection": "column", "overflow": "hidden", "borderRadius": "20px", "boxShadow": "var(--sh-2)"}}>
              <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": "6px 10px 6px 18px", "borderBottom": "1px solid var(--line)"}}>
                <svg width={"20"} height={"20"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#56666F"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"} style={{"flex": "none"}}>
                  <path d={"M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14Z"}>
                  </path>
                  <path d={"M20 20l-4-4"}>
                  </path>
                </svg>
                <label htmlFor={"palq"} className={"sr"}>
                  {"Search pages, farms, suppliers and actions"}
                </label>
                <input id={"palq"} ref={v.palRef} value={v.q} onChange={v.onQ} onKeyDown={v.palKey} autoComplete={"off"} placeholder={"Farm, supplier, lever, place…"} style={{"flex": "1", "minWidth": "0", "height": "54px", "border": "0", "outline": "0", "fontSize": "16px", "background": "transparent"}} />
                <button type={"button"} className={"ibtn"} aria-label={"Close search"} onClick={v.closePal} style={{"width": "40px", "height": "40px", "border": "0"}}>
                  <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                    <path d={"M6 6l12 12M18 6 6 18"}>
                    </path>
                  </svg>
                </button>
              </div>
              <div style={{"overflow": "auto", "padding": "6px 8px 10px"}}>
                {(v.pal || []).map((g, index0) => <React.Fragment key={index0}>
                  <div style={{"padding": "12px 10px 6px", "fontSize": "11px", "fontWeight": "700", "letterSpacing": ".06em", "textTransform": "uppercase", "color": "var(--muted)"}}>
                    {g.g}
                  </div>
                  {(g.items || []).map((it, index1) => <React.Fragment key={index1}>
                    <button type={"button"} className={"palrow"} onClick={it.run} style={{"display": "flex", "alignItems": "center", "gap": "12px", "width": "100%", "minHeight": "48px", "padding": "8px 10px", "border": "0", "borderRadius": "12px", "background": it.bg, "textAlign": "left"}}>
                      <span className={"pill " + String(it.tagCls)} style={{"flex": "none", "minWidth": "72px", "justifyContent": "center"}}>
                        {it.tag}
                      </span>
                      <span style={{"flex": "1", "minWidth": "0"}}>
                        <span style={{"display": "block", "fontSize": "14px", "fontWeight": "600", "color": "var(--ink)"}}>
                          {it.label}
                        </span>
                        <span style={{"display": "block", "fontSize": "12px", "color": "var(--muted)", "marginTop": "1px"}}>
                          {it.sub}
                        </span>
                      </span>
                    </button>
                  </React.Fragment>)}
                </React.Fragment>)}
                {v.palEmpty ? <>
                  <div style={{"padding": "28px 16px", "textAlign": "center", "color": "var(--muted)", "fontSize": "14px"}}>
                    {"No matches. Try F0001, L20 or Riga."}
                  </div>
                </> : null}
              </div>
            </div>
          </div>
        </> : null}
        {v.ask ? <>
          <div className={"overlay"} onClick={v.closeAsk} style={{"background": "rgba(11,26,36,.18)"}}>
          </div>
          <aside className={"drawer"} aria-label={"Ask Navigator"}>
            <div style={{"display": "flex", "alignItems": "center", "gap": "14px", "padding": "18px 18px 16px 22px", "background": "var(--night)", "color": "var(--night-ink)"}}>
              <div style={{"flex": "1", "minWidth": "0"}}>
                <h2 className={"h-d"} style={{"fontSize": "20px", "fontWeight": "600"}}>
                  {"Ask Navigator"}
                </h2>
                <p style={{"margin": "3px 0 0", "fontSize": "13px", "color": "var(--night-muted)"}}>
                  {'Answers link to sources and calculations.'}
                </p>
              </div>
              <button type={"button"} className={"mapbtn"} aria-label={"Close"} onClick={v.closeAsk}>
                <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                  <path d={"M6 6l12 12M18 6 6 18"}>
                  </path>
                </svg>
              </button>
            </div>
            <div ref={v.threadRef} style={{"flex": "1", "overflow": "auto", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
              {v.threadEmpty ? <>
                <div className={"rise"} style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
                  {(v.suggest || []).map((sg, index0) => <React.Fragment key={index0}>
                    <button type={"button"} className={"card lift"} onClick={sg.go} disabled={this.state.voiceActive || this.state.asking} style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": "14px 16px", "textAlign": "left", "fontSize": "14px", "fontWeight": "600", "color": "var(--ink)"}}>
                      <span style={{"flex": "1"}}>
                        {sg.q}
                      </span>
                      <svg width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#0D6A3C"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
                        <path d={"M5 12h14M13 6l6 6-6 6"}>
                        </path>
                      </svg>
                    </button>
                  </React.Fragment>)}
                </div>
              </> : null}
              {(v.thread || []).map((m, index0) => <React.Fragment key={index0}>
                {m.user ? <>
                  <div className={"rise"} style={{"alignSelf": "flex-end", "maxWidth": "86%", "background": "var(--night)", "color": "#fff", "padding": "12px 14px", "borderRadius": "16px 16px 4px 16px", "fontSize": "14px", "lineHeight": "1.5"}}>
                    {m.text}
                  </div>
                </> : null}
                {m.ai ? <>
                  <div style={{"alignSelf": "flex-start", "maxWidth": "96%", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                    <div className={m.caret} style={{"background": "var(--sunk)", "padding": "14px 16px", "borderRadius": "4px 16px 16px 16px", "fontSize": "14px", "lineHeight": "1.6", "whiteSpace": "pre-line"}}>
                      {m.display}
                    </div>
                    {m.done ? <>
                      <div style={{"display": "flex", "flexWrap": "wrap", "gap": "6px"}}>
                        {m.canRetry && <button type="button" className="ev" disabled={this.state.voiceActive || this.state.asking} onClick={m.retry}>Try again</button>}
                        {(m.cites || []).map((c, index1) => <React.Fragment key={index1}>
                          <button type={"button"} className={"ev rise"} onClick={c.open} style={{"--i": index1}}>
                            <svg width={"13"} height={"13"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2.2"} strokeLinecap={"round"} aria-hidden={"true"}>
                              <path d={"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"}>
                              </path>
                              <path d={"M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"}>
                              </path>
                            </svg>
                            {"\n                    " + String(c.label) + "\n                  "}
                          </button>
                        </React.Fragment>)}
                      </div>
                    </> : null}
                  </div>
                </> : null}
              </React.Fragment>)}
              {v.showMore ? <>
                <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
                  {(v.suggestRest || []).map((sg, index0) => <React.Fragment key={index0}>
                    <button type={"button"} className={"chipbtn"} onClick={sg.go} disabled={this.state.voiceActive || this.state.asking} style={{"fontSize": "12.5px"}}>
                      {sg.q}
                    </button>
                  </React.Fragment>)}
                </div>
              </> : null}
            </div>
            <VoiceChat onQuestion={question => this.askBackend(question)} onActive={active => { if (!this._dead) this.setState({voiceActive:active}); }} disabled={this.state.asking}/>
            <form onSubmit={v.submitAsk} style={{"display": "flex", "gap": "8px", "padding": "14px 16px 16px", "borderTop": "1px solid var(--line)"}}>
              <label htmlFor={"askq"} className={"sr"}>
                {"Your question"}
              </label>
              <input id={"askq"} className={"field"} value={v.askInput} onChange={v.onAskInput} disabled={this.state.voiceActive || this.state.asking} autoComplete={"off"} placeholder={"Ask a question"} />
              <button type={"submit"} className={"btn btn-p"} aria-label={"Send"} disabled={this.state.voiceActive || this.state.asking} style={{"width": "48px", "padding": "0", "flex": "none"}}>
                <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinejoin={"round"} aria-hidden={"true"}>
                  <path d={"M4 12l16-8-6 16-2.5-6.5L4 12Z"}>
                  </path>
                </svg>
              </button>
            </form>
          </aside>
        </> : null}
        {v.hasTrace ? <>
          <div className={"overlay"} onClick={v.closeTrace} style={{"background": "rgba(11,26,36,.18)"}}>
          </div>
          <aside className={"drawer"} aria-label={"Source"}>
            <div style={{"position": "relative", "padding": "18px 18px 20px 22px", "background": "var(--night)", "color": "var(--night-ink)", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
              <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                <span style={{"flex": "1", "fontSize": "12px", "fontWeight": "600", "color": "var(--night-muted)"}}>
                  {"Where this number comes from"}
                </span>
                <button type={"button"} className={"mapbtn"} aria-label={"Close"} onClick={v.closeTrace}>
                  <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} aria-hidden={"true"}>
                    <path d={"M6 6l12 12M18 6 6 18"}>
                    </path>
                  </svg>
                </button>
              </div>
              <h2 className={"h-d"} style={{"fontSize": "20px", "fontWeight": "600", "lineHeight": "1.25"}}>
                {v.tr.title}
              </h2>
              <div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "baseline", "gap": "10px"}}>
                <span className={"num"} style={{"fontSize": "34px", "fontWeight": "600"}}>
                  {v.tr.value}
                </span>
                <span style={{"fontSize": "14px", "color": "var(--night-muted)"}}>
                  {v.tr.unit}
                </span>
              </div>
              <div>
                <span className={"pill " + String(v.trCls)}>
                  {v.trLabel}
                </span>
              </div>
              {v.trApproved ? <>
                <div aria-hidden={"true"} style={{"position": "absolute", "right": "70px", "top": "60px", "padding": "6px 14px", "border": "3px solid #3CCB7F", "borderRadius": "10px", "color": "#3CCB7F", "fontFamily": "var(--f-d)", "fontSize": "18px", "fontWeight": "700", "letterSpacing": ".08em", "animation": "stamp .6s var(--spring) both"}}>
                  {"APPROVED"}
                </div>
              </> : null}
            </div>
            <div style={{"flex": "1", "overflow": "auto", "padding": "22px"}}>
              <div style={{"position": "relative"}}>
                <div aria-hidden={"true"} style={{"position": "absolute", "left": "17px", "top": "18px", "bottom": "36px", "width": "2px", "background": "var(--line-2)", "transformOrigin": "top", "animation": "growY 1.1s var(--ease) both"}}>
                </div>
                <ol style={{"listStyle": "none", "margin": "0", "padding": "0", "position": "relative"}}>
                  {(v.trSteps || []).map((st, index0) => <React.Fragment key={index0}>
                    <li className={"rise"} style={{"--i": index0, "position": "relative", "display": "flex", "gap": "14px", "padding": "0 0 20px"}}>
                      <div style={{"flex": "none", "width": "36px", "height": "36px", "borderRadius": "50%", "background": "#fff", "border": "2px solid " + String(st.col), "color": st.col, "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "13px", "fontWeight": "700", "position": "relative", "zIndex": "1"}}>
                        {st.n}
                      </div>
                      <div style={{"flex": "1", "minWidth": "0", "paddingTop": "1px"}}>
                        <div style={{"fontSize": "11px", "fontWeight": "700", "letterSpacing": ".05em", "textTransform": "uppercase", "color": "var(--muted)"}}>
                          {st.k}
                        </div>
                        <div style={{"fontSize": "14px", "fontWeight": "600", "marginTop": "3px", "lineHeight": "1.4"}}>
                          {st.t}
                        </div>
                        <div className={"mono"} style={{"fontSize": "12px", "color": "var(--glacier-ink)", "marginTop": "4px", "wordBreak": "break-word"}}>
                          {st.id}
                        </div>
                        <div style={{"fontSize": "13px", "color": "var(--muted)", "marginTop": "4px", "lineHeight": "1.5"}}>
                          {st.d}
                        </div>
                      </div>
                    </li>
                  </React.Fragment>)}
                </ol>
              </div>
              {v.trHasNote ? <>
                <div style={{"margin": "4px 0 16px", "padding": "14px 16px", "borderRadius": "12px", "background": "var(--rape-50)", "color": "var(--rape-ink)", "fontSize": "13px", "lineHeight": "1.55"}}>
                  {v.tr.note}
                </div>
              </> : null}
            </div>
            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px", "padding": "14px 16px 16px", "borderTop": "1px solid var(--line)"}}>
              <button type={"button"} className={"btn btn-p"} onClick={v.approve} style={{"flex": "1 1 140px"}}>
                {"Approve"}
              </button>
              <button type={"button"} className={"btn"} onClick={v.requestChange} style={{"flex": "1 1 140px"}}>
                {"Request change"}
              </button>
            </div>
          </aside>
        </> : null}
        {v.hasToast ? <>
          <div className={"toast"} role={"status"} style={{"display": "flex", "alignItems": "center", "gap": "10px", "padding": "12px 18px", "borderRadius": "14px", "background": "var(--night)", "color": "#fff", "fontSize": "14px", "fontWeight": "500", "boxShadow": "var(--sh-2)"}}>
            <svg width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} stroke={"#3CCB7F"} strokeWidth={"2.4"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
              <path d={"M5 12l4 4 10-10"}>
              </path>
            </svg>
            {"\n    " + String(v.toast) + "\n  "}
          </div>
        </> : null}
      </div>
    </>;
  }
}
