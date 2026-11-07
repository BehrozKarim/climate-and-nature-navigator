import React from 'react';

export default class Inventory extends React.Component {
  constructor(...args) { super(...args); this.state = {yr:2024,rest:false}; }
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
        {v.syncStatus}
        {v.isDraft ? <>
          <div className={"swap-a"} role={"alert"} style={{"display": "flex", "flexWrap": "wrap", "gap": "12px", "alignItems": "center", "padding": "14px 18px", "borderRadius": "16px", "background": "var(--clay-50)", "color": "var(--clay-ink)", "border": "1px solid #F3B49B"}}>
            <svg width={"20"} height={"20"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"}>
              <path d={"M12 3l9.5 17h-19L12 3Z"}>
              </path>
              <path d={"M12 10v4M12 17.5v.01"}>
              </path>
            </svg>
            <span style={{"flex": "1 1 300px", "fontSize": "14px", "fontWeight": "500"}}>
              {v.draftMessage || "Draft source checks require review."}
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
        {v.sourcePanel || <section className={"card rise"} aria-label={"Data feeds"} style={{"--i": "5", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
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
        </section>}
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
