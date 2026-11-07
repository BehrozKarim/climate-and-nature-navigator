import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import BackendGate from './lib/BackendGate.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <main style={{ padding: 32, fontFamily: 'Inter, sans-serif' }}>
      <h1>Navigator couldn’t open this screen</h1>
      <p role="alert">{this.state.error.message}</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><BackendGate><App /></BackendGate></ErrorBoundary>);
