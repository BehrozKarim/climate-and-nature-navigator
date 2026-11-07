export function installNavigation(app, screenIds) {
  const onHash = () => {
    const screen = window.location.hash.slice(1);
    if (screenIds.includes(screen)) app.setState({ screen, palette: false, sflip: app.state.sflip + 1 });
  };
  const onKey = event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      app.setState({ palette: !app.state.palette, ask: false, trace: null, q: '', act: 0 });
    }
    if (event.key === 'Escape') app.setState({ palette: false, ask: false, trace: null });
    if (event.key === 'Tab') {
      const dialog = document.querySelector('[aria-modal="true"], .drawer');
      if (!dialog) return;
      const items = [...dialog.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      if (!items.length) return;
      const active = document.activeElement;
      if ((event.shiftKey && (active === items[0] || !dialog.contains(active))) || (!event.shiftKey && (active === items.at(-1) || !dialog.contains(active)))) {
        event.preventDefault();
        (event.shiftKey ? items.at(-1) : items[0]).focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  onHash();
  return () => {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onHash);
  };
}

export function syncDialogFocus(app) {
  const open = app.state.palette || app.state.ask || !!app.state.trace;
  const dialog = document.querySelector('[aria-modal="true"], .drawer');
  if (open && (!app._dialogOpen || dialog !== app._activeDialog || !dialog?.contains(document.activeElement))) {
    if (!app._dialogOpen) app._returnFocus = document.activeElement;
    dialog?.querySelector('input, textarea, button')?.focus();
  } else if (!open && app._dialogOpen) {
    app._returnFocus?.focus();
  }
  app._dialogOpen = open;
  app._activeDialog = dialog;
}
