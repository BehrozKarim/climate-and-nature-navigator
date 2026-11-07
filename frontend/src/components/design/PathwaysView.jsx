import React from 'react';
export default function PathwaysView({model:v}) {
    return <>
      <div className="restored-pathways" style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
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
              {`Needed: ${v.needLabel} t (line)`}
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
              {"Against the illustrative target"}
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
                {"· " + String(v.onCount) + " of " + String(v.actionCount) + " on"}
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
          <div style={{"display": "grid", "gridTemplateColumns": "44px minmax(170px, 1.3fr) minmax(180px, 2fr) 80px 60px", "gap": "14px", "padding": "0 8px", "fontSize": "12px", "fontWeight": "600", "color": "var(--muted)"}}>
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
              <div style={{"display": "grid", "gridTemplateColumns": "44px minmax(170px, 1.3fr) minmax(180px, 2fr) 80px 60px", "gap": "14px", "alignItems": "center", "padding": "8px", "borderRadius": "12px", "background": l.bg, "transition": "background .3s"}}>
                <button type={"button"} className={"sw"} aria-pressed={l.on} aria-label={l.aria} onClick={l.toggle} disabled={l.disabled}>
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
                  <button type={"button"} aria-label={l.dragLbl} disabled={l.disabled} onPointerDown={l.down} onPointerMove={l.move} onPointerUp={l.up} onKeyDown={l.key} style={{"position": "absolute", "top": "4px", "bottom": "4px", "left": String(l.x) + "%", "right": "0", "border": "0", "padding": "0 0 0 8px", "borderRadius": "6px", "background": "linear-gradient(90deg, " + String(l.c0) + " 0, " + String(l.c1) + " " + String(l.rampPct) + "%)", "cursor": "ew-resize", "textAlign": "left", "transition": "left .25s var(--ease)", "touchAction": "none"}}>
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
