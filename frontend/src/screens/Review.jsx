import React from 'react';

export default class Review extends React.Component {
  constructor(...args) { super(...args); this.state={sel:null,filter:'all',note:'',noteErr:false,flip:0}; }
  componentDidUpdate() { if(this.state.sel!==this._sel){const first=this._sel==null;this._sel=this.state.sel;if(!first)this.setState({flip:this.state.flip+1});} }
  viewModel() {
    return {filters:[['all','All'],['waiting','Waiting'],['blocked','Blocked'],['approved','Approved']].map(([id,label])=>({label,n:'0',on:String(this.state.filter===id)})),queue:[],empty:true,flipCls:this.state.flip%2?'swap-a':'swap-b',note:this.state.note,noteErr:this.state.noteErr,setNote:e=>this.setState({note:e.target.value,noteErr:false}),submit:e=>e.preventDefault(),approve:()=>this.act('approved'),reqChange:()=>this.act('changes'),log:[]};
  }
  render() {
    const v = this.viewModel();
    return <>
      <div style={{"display": "flex", "flexDirection": "column", "gap": "20px", "fontFamily": "var(--f-ui)", "color": "var(--ink)", "background": "var(--ground)"}}>
        {v.intro && <p style={{margin:0,fontSize:14,lineHeight:1.5,color:'var(--muted)'}}>{v.intro}</p>}
        <div role={"group"} aria-label={"Filter the queue"} style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
          {(v.filters || []).map((f, index0) => <React.Fragment key={index0}>
            <button type={"button"} className={"chipbtn"} aria-pressed={f.on} onClick={f.pick}>
              {String(f.label) + " · " + String(f.n)}
            </button>
          </React.Fragment>)}
        </div>
        <div style={{"display": "flex", "flexWrap": "wrap", "gap": "20px", "alignItems": "flex-start"}}>
          <section className={"card rise"} aria-label={"Review queue"} style={{"flex": "1 1 340px", "minWidth": "0", "padding": "10px", "display": "flex", "flexDirection": "column", "gap": "6px"}}>
            {(v.queue || []).map((q, index0) => <React.Fragment key={index0}>
              <button type={"button"} onClick={q.pick} aria-pressed={q.sel} style={{"display": "flex", "flexDirection": "column", "alignItems": "flex-start", "gap": "6px", "width": "100%", "padding": "14px", "borderRadius": "14px", "border": "1px solid " + String(q.bd), "background": q.bg, "textAlign": "left", "transition": "background .25s, border-color .25s, transform .25s var(--spring)", "transform": "translateX(" + String(q.dx) + "px)"}}>
                <span style={{"display": "flex", "width": "100%", "justifyContent": "space-between", "gap": "8px", "alignItems": "center"}}>
                  <span className={"pill " + String(q.cls)}>
                    {q.st}
                  </span>
                  <span style={{"fontSize": "12px", "color": "var(--muted)"}}>
                    {q.kind}
                  </span>
                </span>
                <span style={{"fontSize": "14px", "fontWeight": "600", "lineHeight": "1.35"}}>
                  {q.title}
                </span>
                <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
                  {q.owner}
                </span>
              </button>
            </React.Fragment>)}
            {v.empty ? <>
              <div style={{"padding": "24px", "textAlign": "center", "fontSize": "14px", "color": "var(--muted)"}}>
                {"Nothing here. Pick another filter."}
              </div>
            </> : null}
          </section>
          <section className={"card rise"} aria-label={"Item detail"} style={{"--i": "1", "flex": "2 1 560px", "minWidth": "0", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "position": "relative", "overflow": "hidden"}}>
            <div className={v.flipCls} style={{"display": "flex", "flexDirection": "column", "gap": "18px"}}>
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "12px", "alignItems": "flex-start", "justifyContent": "space-between"}}>
                <div style={{"flex": "1 1 300px"}}>
                  <div style={{"display": "flex", "gap": "8px", "alignItems": "center"}}>
                    <span className={"pill " + String(v.d.cls)}>
                      {v.d.st}
                    </span>
                    <span className={"mono"} style={{"fontSize": "12px", "color": "var(--muted)"}}>
                      {String(v.d.referenceLabel || v.d.id) + " · version " + String(v.d.ver)}
                    </span>
                  </div>
                  <h2 className={"h-d"} style={{"fontSize": "24px", "fontWeight": "600", "marginTop": "10px", "lineHeight": "1.2"}}>
                    {v.d.title}
                  </h2>
                  <p style={{"margin": "6px 0 0", "fontSize": "14px", "color": "var(--muted)", "lineHeight": "1.5"}}>
                    {v.d.sum}
                  </p>
                </div>
                <div style={{"textAlign": "right"}}>
                  <div className={"num"} style={{"fontSize": "34px", "fontWeight": "600"}}>
                    {v.d.value}
                  </div>
                  <div style={{"fontSize": "13px", "color": "var(--muted)"}}>
                    {v.d.unit}
                  </div>
                </div>
              </div>
              {this.assessmentPanel?.()}
              <div>
                <div className={"eyebrow"} style={{"fontSize": "11px", "marginBottom": "10px"}}>
                  {"Where it comes from"}
                </div>
                <div style={{"overflowX": "auto", "paddingBottom": "6px"}}>
                  <div style={{"display": "flex", "alignItems": "stretch", "minWidth": "640px"}}>
                    {(v.d.nodes || []).map((nd, index0) => <React.Fragment key={index0}>
                      <div style={{"flex": "1", "display": "flex", "alignItems": "center"}}>
                        <div className={"rise"} style={{"--i": nd.i, "flex": "1", "minWidth": "0", "padding": "12px", "borderRadius": "14px", "border": "1px solid " + String(nd.bd), "background": nd.bg, "display": "flex", "flexDirection": "column", "gap": "4px"}}>
                          <span className={"eyebrow"} style={{"fontSize": "10.5px", "color": nd.ink}}>
                            {nd.k}
                          </span>
                          <span style={{"fontSize": "13px", "fontWeight": "600", "lineHeight": "1.3"}}>
                            {nd.t}
                          </span>
                          <span className={"mono"} style={{"fontSize": "11px", "color": "var(--baltic-ink)", "wordBreak": "break-word"}}>
                            {nd.id}
                          </span>
                        </div>
                        {nd.arrow ? <>
                          <div aria-hidden={"true"} style={{"flex": "0 0 28px", "position": "relative", "height": "2px", "background": "var(--line-2)", "overflow": "visible"}}>
                            <span style={{"position": "absolute", "top": "-3px", "width": "8px", "height": "8px", "marginLeft": "-4px", "borderRadius": "50%", "background": "var(--spruce)", "animation": "travel 1.6s linear infinite", "animationDelay": nd.delay}}>
                            </span>
                          </div>
                        </> : null}
                      </div>
                    </React.Fragment>)}
                  </div>
                </div>
              </div>
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", "gap": "14px"}}>
                <div style={{"padding": "14px", "borderRadius": "14px", "background": "var(--sunk)", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                  <span className={"eyebrow"} style={{"fontSize": "11px"}}>
                    {"Assumptions"}
                  </span>
                  {(v.d.assume || []).map((a, index0) => <React.Fragment key={index0}>
                    <span style={{"display": "flex", "gap": "8px", "fontSize": "13px", "lineHeight": "1.45"}}>
                      <span aria-hidden={"true"} style={{"flex": "none", "width": "6px", "height": "6px", "marginTop": "7px", "borderRadius": "50%", "background": "var(--ink-2)"}}>
                      </span>
                      {a}
                    </span>
                  </React.Fragment>)}
                </div>
                <div style={{"padding": "14px", "borderRadius": "14px", "background": v.d.aiBg, "color": v.d.aiInk, "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                  <span className={"eyebrow"} style={{"fontSize": "11px", "color": "inherit"}}>
                    {"Automatic check"}
                  </span>
                  <span style={{"fontSize": "13px", "lineHeight": "1.5"}}>
                    {v.d.ai}
                  </span>
                </div>
              </div>
              <form onSubmit={v.submit} style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                <label className={"lbl"} htmlFor={"rv-c"} style={{"margin": "0"}}>
                  {"Reviewer note"}
                </label>
                <textarea id={"rv-c"} className={"field"} rows={"3"} value={v.note} onChange={v.setNote} placeholder={"Add a note"} style={{"padding": "10px 12px", "resize": "vertical", "minHeight": "84px", "lineHeight": "1.5"}}>
                </textarea>
                {v.noteErr ? <>
                  <div role={"alert"} style={{"fontSize": "12.5px", "color": "var(--clay-ink)"}}>
                    {"Add a short note so the change request is clear to the owner."}
                  </div>
                </> : null}
                <div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>
                  <button type={"button"} className={"btn btn-p"} onClick={v.approve} disabled={v.d.st === 'Blocked' || v.d.st === 'Published source' || v.d.approveDisabled}>
                    {"Approve"}
                  </button>
                  <button type={"button"} className={"btn"} onClick={v.reqChange}>
                    {"Request change"}
                  </button>
                </div>
              </form>
              {this.receiptPanel?.()}
            </div>
            {v.d.approved ? <>
              <div aria-hidden={"true"} style={{"position": "absolute", "right": "26px", "top": "86px", "padding": "8px 18px", "border": "4px solid var(--spruce)", "borderRadius": "12px", "color": "var(--spruce)", "fontFamily": "var(--f-d)", "fontSize": "24px", "fontWeight": "700", "letterSpacing": ".1em", "background": "rgba(255,255,255,.85)", "animation": "stamp .6s var(--spring) both"}}>
                {"APPROVED"}
              </div>
            </> : null}
          </section>
        </div>
        <section className={"card rise"} aria-label={"Audit trail"} style={{"--i": "2", "padding": "20px", "display": "flex", "flexDirection": "column", "gap": "12px"}}>
          <div style={{"display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "10px", "alignItems": "baseline"}}>
            <h2 className={"h-d"} style={{"fontSize": "19px", "fontWeight": "600"}}>
              {v.auditTitle || "Audit trail"}
            </h2>
          </div>
          <ol style={{"listStyle": "none", "margin": "0", "padding": "0", "display": "flex", "flexDirection": "column"}}>
            {(v.log || []).map((l, index0) => <React.Fragment key={index0}>
              <li className={l.anim} style={{"display": "grid", "gridTemplateColumns": "96px 18px 1fr", "gap": "12px", "alignItems": "start", "padding": "10px 0", "borderBottom": "1px solid var(--line)"}}>
                <span className={"mono"} style={{"fontSize": "12px", "color": "var(--muted)", "paddingTop": "1px"}}>
                  {l.when}
                </span>
                <span aria-hidden={"true"} style={{"width": "10px", "height": "10px", "marginTop": "4px", "borderRadius": "50%", "background": l.col}}>
                </span>
                <span style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
                  <span style={{"fontSize": "13.5px", "fontWeight": "600"}}>
                    {l.what}
                  </span>
                  <span style={{"fontSize": "12.5px", "color": "var(--muted)"}}>
                    {l.who}
                  </span>
                </span>
              </li>
            </React.Fragment>)}
          </ol>
        </section>
      </div>
    </>;
  }
}
