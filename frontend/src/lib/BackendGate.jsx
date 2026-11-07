import React from 'react';
import {api} from './api.js';

export default function BackendGate({children}) {
  const [error,setError]=React.useState('');
  React.useEffect(()=>{
    let active=true,lastCheck=Date.now();
    api.verifySnapshot().then(()=>api.prepare()).catch(e=>{if(active)setError(e.message);});
    const focus=()=>{if(Date.now()-lastCheck<15000)return;lastCheck=Date.now();api.verifySnapshot().then(context=>{if(active)setError('');if(context.changed)return api.prepare();}).catch(e=>{if(active)setError(e.message);});};
    window.addEventListener('focus',focus);
    return()=>{active=false;window.removeEventListener('focus',focus);};
  },[]);
  return <>{children}{error&&<div className="cache-connection-note" role="status">Showing cached synthetic snapshot. {error}<button className="ev" onClick={()=>{setError('');api.verifySnapshot().then(()=>api.prepare()).catch(e=>setError(e.message));}}>Reconnect</button></div>}</>;
}
