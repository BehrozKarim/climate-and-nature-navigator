import React from 'react';
export default function OverviewView({model:v}) {
    return <>
      <div className="restored-overview" style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
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
              {"Registered locations · illustrative connections"}
            </span>
            <span aria-hidden={"true"} style={{"display": "block", "height": "8px", "borderRadius": "999px", "background": "linear-gradient(90deg, #3CCB7F, #5AA9F0)"}}>
            </span>
            <span className={"mono"} style={{"display": "flex", "justifyContent": "space-between", "fontSize": "11px", "color": "var(--night-muted)"}}>
              <span>
                {"Farms"}
              </span>
              <span>
                {"·"}
              </span>
              <span>
                {"Sites"}
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
                  {"Published"}
                </span>
                <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "16px", "borderTop": "2px dashed var(--ink-2)"}}>
                  </span>
                  {"Illustrative target"}
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
              <svg className={"reveal"} viewBox={"0 0 600 240"} preserveAspectRatio={"none"} role={"img"} aria-label={"Published emissions and illustrative pathway, 2019 to 2050"} style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible"}}>
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
