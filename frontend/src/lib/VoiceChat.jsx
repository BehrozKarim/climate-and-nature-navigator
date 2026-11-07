import React from 'react';
import {api} from './api.js';
import {VoiceSession} from './voice-session.js';

export default function VoiceChat({onQuestion, onActive, disabled}) {
  const [state,setState] = React.useState({phase:'idle',active:false,message:'Speak naturally; Navigator will reply aloud.'});
  const [config,setConfig] = React.useState(null);
  const [reload,setReload] = React.useState(0);
  const callbacks = React.useRef({onQuestion,onActive});
  callbacks.current = {onQuestion,onActive};
  const session = React.useRef(null);
  React.useEffect(() => {
    const abort = new AbortController();
    setConfig(null);
    api.voiceStatus({signal:abort.signal}).then(setConfig).catch(error => {
      if (!abort.signal.aborted) setConfig({available:false,reason:error.message});
    });
    return () => abort.abort();
  },[reload]);
  React.useEffect(() => {
    let mounted = true, wasActive = false;
    const controller = session.current = new VoiceSession({api,onQuestion:question => callbacks.current.onQuestion(question),onState:next => {
      if (mounted) setState(next);
      if (wasActive !== next.active) { wasActive = next.active; callbacks.current.onActive(next.active); }
    }});
    const visibility = () => { if (document.hidden && controller.active) controller.stop('Voice stopped while this tab was hidden.'); };
    document.addEventListener('visibilitychange',visibility);
    return () => { mounted = false; controller.stop(); document.removeEventListener('visibilitychange',visibility); };
  },[]);
  const message = !config ? 'Checking voice availability…' : !config.available ? config.reason : state.message;
  return <section className="voice-chat" aria-label="Voice conversation">
    <div className="voice-actions">
      <button type="button" className={'btn ' + (state.active ? 'btn-n' : '')} aria-pressed={state.active} disabled={!state.active && (disabled || !config?.available)} onClick={() => state.active ? session.current.stop() : session.current.start()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>
        {state.active ? 'Stop voice' : 'Talk to Navigator'}
      </button>
      {state.phase === 'listening' && <button type="button" className="btn" onClick={() => session.current.finishTurn()}>Send now</button>}
      {state.phase === 'speaking' && <button type="button" className="btn" onClick={() => session.current.interrupt()}>Interrupt</button>}
      {config && !config.available && <button type="button" className="btn" onClick={() => setReload(value => value + 1)}>Retry</button>}
    </div>
    <p role={state.phase === 'error' ? 'alert' : 'status'} aria-live="polite" className="voice-status"><span aria-hidden="true" className={'voice-dot ' + (state.active ? 'active' : '')}/>{message}</p>
    {config?.available && <p className="voice-provider">Audio uses ElevenLabs; answers use Gemini. {state.active ? 'Stop voice to return to typing.' : 'Microphone starts only when you choose Talk.'}</p>}
  </section>;
}
