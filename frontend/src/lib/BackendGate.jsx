import React from 'react';
import { api, backendMode } from './api.js';

export default function BackendGate({ children }) {
  const [state, setState] = React.useState(backendMode ? 'loading' : 'ready');
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    if (!backendMode) return;
    let active = true;
    api.prepare().then(() => { if (active) setState('ready'); }).catch(e => {
      if (active) { setError(e.message); setState('error'); }
    });
    return () => { active = false; };
  }, []);
  if (state === 'ready') return children;
  return <main style={{ padding: 32, maxWidth: 720, margin: '10vh auto', fontFamily: 'var(--f-ui)' }}>
    <h1 className="h-d">{state === 'loading' ? 'Opening Navigator...' : 'Backend unavailable'}</h1>
    <p role="status">{state === 'loading' ? 'Loading the selected dataset and review queue.' : error}</p>
    {state === 'error' && <><button className="btn btn-p" onClick={() => window.location.reload()}>Retry</button></>}
  </main>;
}
