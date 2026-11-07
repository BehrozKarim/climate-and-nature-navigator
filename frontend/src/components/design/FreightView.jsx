import React from 'react';
export default function FreightView({model:v}) {
    return <>
      <div className="restored-freight" style={{"display": "flex", "flexDirection": "column", "gap": "18px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
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
                  <select id="fr-o" className="field" value={v.cO} onChange={v.setO} required disabled={v.catalogLoading || !!v.catalogError} aria-describedby="fr-location-help">
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
                  <select id="fr-d" className="field" value={v.cD} onChange={v.setD} required disabled={v.catalogLoading || !!v.catalogError} aria-describedby="fr-location-help">
                    <option value="">Select destination</option>
                    {v.placeGroups.map(group => <optgroup key={group.id} label={group.label}>
                      {group.places.map(place => <option key={place.id} value={place.id} disabled={place.id === v.cO}>{place.name}</option>)}
                    </optgroup>)}
                  </select>
                </div>
                <button type={"submit"} className={"btn btn-n"} disabled={v.catalogLoading || !!v.catalogError || v.looking || !v.cO || !v.cD || v.massErr}>
                  {v.looking ? 'Finding…' : 'Go'}
                </button>
              </form>
              <p id="fr-location-help" style={{margin:0,fontSize:12,color:'var(--muted)'}}>{v.catalogLoading ? 'Loading supported locations…' : `${v.places.length} supported locations. Route distances are illustrative estimates.`}</p>
              {v.catalogError && <div role="alert" style={{fontSize:13,color:'var(--ember-ink)'}}>{v.catalogError} <button type="button" className="btn" onClick={() => v.retryCatalog()}>Retry</button></div>}
            </> : null}
            {v.hasErr && <div role="alert" style={{fontSize:13,color:'var(--ember-ink)'}}>{v.err}</div>}
            {true && <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button type="button" className="btn btn-p" disabled={!!v.saving || v.looking || !v.trip || !!v.tripError || v.massErr || !v.legs.length} onClick={() => v.saveAssessment()}>{v.saving ? 'Saving assessment…' : 'Save assessment for review'}</button>
              {v.saveError && <p role="alert" style={{margin:0,fontSize:13,color:'var(--clay-ink)'}}>{v.saveError}</p>}
            </div>}
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
        <section className={"card rise"} aria-label={"Annual shipment comparison"} style={{"--i": "3", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "14px", "justifyContent": "space-between"}}>
            <div style={{"display": "flex", "alignItems": "baseline", "gap": "12px", "flexWrap": "wrap"}}>
              <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
                {v.batchTitle}
              </h2>
              <span>
                <span className={"num"} style={{"fontSize": "26px", "fontWeight": "600"}}>
                  {v.n.batch}
                </span>
                <span style={{"fontSize": "13px", "color": "var(--muted)"}}>
                  {`t CO₂e · ${v.batchCount} included legs`}
                </span>
              </span>
              {v.hvo ? <>
                <span className={"pill p-ok swap-a"}>
                  {"−" + String(v.n.saved) + " t"}
                </span>
              </> : null}
            </div>
            <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
              <button type={"button"} className={"sw"} aria-pressed={v.hvoStr} aria-label={"Use HVO100 in eligible dry trucks"} onClick={v.toggleHvo}>
              </button>
              <span style={{"fontSize": "13px", "fontWeight": "600"}}>
                {"HVO100 in trucks"}
              </span>
            </div>
          </div>
          <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
            {(v.batch || []).map((b, index0) => <React.Fragment key={index0}>
              <button type={"button"} onClick={b.trace} style={{"display": "grid", "gridTemplateColumns": "minmax(100px,170px) minmax(40px,1fr) 80px", "gap": "14px", "alignItems": "center", "padding": "6px 4px", "border": "0", "background": "transparent", "textAlign": "left", "fontSize": "13.5px"}}>
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
