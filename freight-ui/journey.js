import truckUrl from './assets/truck.webp';
import vesselUrl from './assets/vessel.webp';
import coastUrl from './assets/coast.webp';
import { factors } from './freight.js';
import { blankDraft, journeyModes, journeySteps, journeyResult, recordSnapshot, sampleShipment } from './journey-model.js';

export function createJourney({ icon, esc, fmt, btn, saved, persist, render, announce }) {
  saved.journey ??= { draft: blankDraft(), records: [], paused: false };
  const data = saved.journey;
  data.draft = { ...blankDraft(), ...data.draft };
  data.records ??= [];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let scene;
  let host;
  let movingTimer;
  let numberFrame;
  let announcementTimer;
  let lastResultAnnouncement;
  let storageUnavailable = false;
  let displayKg = 0;
  let lastProgress = 0;
  let lastMode;
  const draft = () => data.draft;
  const result = () => journeyResult(draft());
  const stopped = () => data.paused || media.matches;
  const complete = () => data.records.find((record) => record.id === draft().reviewed);
  const progress = () => complete() ? 100 : result().completed * 20;
  const input = (label, id, props) => '<label for="' + id + '">' + label + '</label><input id="' + id + '" ' + props + '>';
  const stepTitle = () => journeySteps[Number(draft().stage) || 0];

  function view() {
    const mode = draft().mode || 'truck';
    const p = progress();
    return '<header class="shipment-heading"><div><p class="context-label">Freight workspace</p><h1>A clearer journey.</h1><p>Complete a shipment. See its footprint take shape.</p></div>' +
      '<div>' + btn('Use an example', 'journey-example', 'Play', 'secondary') + '</div></header>' + storageNotice() +
      '<div class="journey-layout"><div class="journey-world"><section class="journey-visual" id="journey-visual" data-mode="' + mode +
      '" data-paused="' + stopped() + '" style="--progress:' + p + '%"><div class="scene-heading"><span><i></i> ' +
      (mode === 'truck' ? 'Road freight' : 'Sea freight') + '</span><button type="button" class="scene-pause" data-action="journey-motion" aria-label="' +
      (stopped() ? 'Resume scene motion' : 'Pause scene motion') + '">' + icon(stopped() ? 'Play' : 'Pause', 16) + '</button></div>' +
      '<div class="scene-estimate" id="journey-scene-estimate">' + (result().calculated ? fmt(result().kg, 2) + ' kg CO₂e' : 'Estimate pending') +
      '</div><img class="journey-backdrop" src="' + coastUrl + '" alt=""><div class="fallback-vehicle-track"><img class="fallback-vehicle" src="' +
      (mode === 'truck' ? truckUrl : vesselUrl) + '" alt=""></div><div class="journey-world-caption"><span>Illustrative journey</span>' +
      '<strong id="journey-scene-status">' + (complete() ? 'Record complete' : 'Add shipment information to move forward') + '</strong></div></section>' +
      '<nav class="journey-stops" aria-label="Shipment stages">' + journeySteps.map((step, index) => '<button type="button" data-action="journey-stage" data-value="' +
      index + '" aria-current="' + (index === draft().stage ? 'step' : 'false') + '"' + (index > result().completed ? ' disabled' : '') +
      '><i class="' + (result().completed > index || complete() ? 'done' : '') + '">' +
      (result().completed > index || complete() ? icon('Check', 13) : index + 1) + '</i><span>' + step + '</span></button>').join('') +
      '</nav><section class="journey-result"><div><span>Shipment estimate</span><strong><b id="journey-kg">' +
      (result().calculated ? fmt(result().kg, 2) : '—') + '</b> <small>kg CO₂e</small></strong></div><div class="journey-equation" id="journey-equation">' + equation() +
      '</div><span class="journey-result-badge" id="journey-result-badge">' + resultBadge() +
      '</span></section><span id="journey-result-status" class="sr-only" role="status" aria-atomic="true"></span><p class="journey-scope">Prototype shipment · Progress shows record completion. Calculations use the synthetic 2025 factor library.</p></div>' +
      '<section class="journey-input-panel" aria-labelledby="journey-input-title"><div id="journey-step-content">' + stepContent() +
      '</div></section></div><div class="shipment-bottom"><section class="surface journey-recent"><header><h2>Recent shipments</h2><a class="inline-link" href="#shipments">View records ' +
      icon('ArrowRight', 15) + '</a></header>' + recent() + '</section><section class="journey-assist"><span class="mini-icon">' + icon('FileCheck2', 20) +
      '</span><div><h2>Every input has a source</h2><p>Record a distance, explain an estimate, and keep the review with the result.</p>' +
      '<a href="#checks">Review source flags ' + icon('ArrowRight', 14) + '</a></div></section></div>';
  }

  function storageNotice() {
    return '<p class="journey-storage-notice" role="status"' + (storageUnavailable ? '' : ' hidden') +
      '>Browser storage is unavailable. Your work is only held in this open tab. Download approved records before closing it.</p>';
  }

  function resultBadge() {
    const r = result();
    return complete() ? 'Reviewed in demo' : r.valid ? 'Ready to review' : r.calculated ? 'Add evidence to review' : 'Complete the inputs';
  }

  function equation() {
    const r = result();
    if (!r.mode) return '<span>Choose a transport type to begin.</span>';
    return '<span><b>' + (r.validMass ? fmt(r.mass, 3) : '—') + '</b> t</span><i>×</i><span><b>' +
      (r.validDistance ? fmt(r.distance, 2) : '—') + '</b> km</span><i>×</i><span><b>' + r.factor.rate +
      '</b><small>kg CO₂e / tonne-km</small></span>';
  }

  function stepContent() {
    const d = draft();
    const r = result();
    const approved = complete();
    if (approved) {
      const alternate = factors[journeyModes[approved.mode].alternative];
      const alternativeKg = approved.activityTkm * alternate.rate;
      const difference = approved.kg - alternativeKg;
      return '<div class="journey-step-caption">Arrival · Record complete</div><div class="arrival-mark">' + icon('Check', 26) +
        '</div><h2 id="journey-input-title">Ready for the next decision.</h2><p class="step-intro">' + esc(approved.id) + ' · Reviewed by ' +
        esc(approved.reviewer) + '</p><div class="arrival-summary"><span>' + (storageUnavailable ? 'Session estimate' : 'Saved estimate') + '</span><strong>' + fmt(approved.kg, 2) +
        ' <small>kg CO₂e</small></strong><span>' + esc(approved.basis) + ' distance · ' + esc(approved.reference) +
        '</span></div><details class="journey-evidence"><summary>Evidence and calculation</summary>' + snapshotDetail(approved) +
        '</details><div class="arrival-alternative"><span>Explore a change</span><strong>' + journeyModes[approved.mode].alternativeLabel +
        '</strong><p>' + fmt(alternativeKg, 2) + ' kg CO₂e at the same tonne-km. Modelled difference ' + fmt(difference, 2) +
        ' kg CO₂e.</p><small>' + (approved.mode === 'truck' ? 'Confirm availability and feedstock with the carrier.' :
          'Illustrative mode comparison. A feasible rail route and new distances must be confirmed.') + '</small></div>' +
        '<div class="journey-form-actions">' + btn('New shipment', 'journey-new', 'Plus', 'primary') +
        btn('Download record', 'journey-download', 'Download', 'secondary', approved.id) + '</div>';
    }
    const stage = Number(d.stage) || 0;
    const intros = [
      ['Choose your transport.', 'Start with one road or sea leg.'],
      ['What’s on board?', 'Use the shipment’s physical weight.'],
      ['How far does it travel?', r.mode?.inputLabel + ', from its source record.'],
      ['Keep the evidence.', 'A source now makes this result easier to review later.'],
      ['Check, then approve.', 'Keep the original inputs and factor with the result.'],
    ];
    let body;
    if (stage === 0) {
      body = '<div class="transport-choice">' + Object.entries(journeyModes).map(([id, mode]) =>
        '<button type="button" data-action="journey-mode" data-value="' + id + '" aria-pressed="' + (d.mode === id) + '"><img src="' +
        (id === 'truck' ? truckUrl : vesselUrl) + '" alt=""><strong>' + mode.label + '</strong><small>' +
        (id === 'truck' ? 'Road leg' : 'Bulk sea leg') + '</small></button>').join('') + '</div>';
    } else if (stage === 1) {
      body = '<form id="journey-form"><div class="quantity-field">' + input('Cargo weight', 'journey-mass',
        'name="mass" type="number" min="0" max="' + (d.unit === 'kg' ? 1000000000 : 1000000) + '" step="any" inputmode="decimal" required placeholder="24" value="' + esc(d.mass) + '"') +
        '<label class="sr-only" for="journey-unit">Weight unit</label><select id="journey-unit"><option value="t"' +
        (d.unit === 't' ? ' selected' : '') + '>tonnes</option><option value="kg"' + (d.unit === 'kg' ? ' selected' : '') +
        '>kg</option></select></div><p class="field-hint">Find this on the purchase order or carrier record.</p>' + nextAction(stage) + '</form>';
    } else if (stage === 2) {
      const sample = sampleShipment(d.mode);
      body = '<form id="journey-form">' + input(r.mode.inputLabel + ' (km)', 'journey-distance',
        'name="distance" type="number" min="0" max="50000" step="any" inputmode="decimal" required placeholder="340" value="' + esc(d.distance) + '"') +
        '<label for="journey-basis">Distance basis</label><select id="journey-basis"><option value="Recorded"' + (d.basis === 'Recorded' ? ' selected' : '') +
        '>From a shipment record</option><option value="Estimate"' + (d.basis === 'Estimate' ? ' selected' : '') + '>Estimated distance</option></select>' +
        (sample ? '<button type="button" class="recorded-distance" data-action="journey-distance-example">' + icon('FileText', 16) +
          '<span>Use recorded example<strong>' + fmt(sample.distance, 1) + ' km · ' + sample.id + '</strong></span>' + icon('ArrowRight', 15) + '</button>' : '') +
        '<p class="field-hint">The scene illustrates progress. Distance comes from this field.</p>' + nextAction(stage) + '</form>';
    } else if (stage === 3) {
      body = '<form id="journey-form">' + input('Source reference', 'journey-reference',
        'name="reference" required minlength="3" maxlength="160" placeholder="Carrier manifest, file or shipment ID" value="' + esc(d.reference) + '"') +
        '<label for="journey-note">' + (d.basis === 'Estimate' ? 'Explain the estimate' : 'Assumption or note (optional)') +
        '</label><textarea id="journey-note" name="note" rows="3" maxlength="400"' + (d.basis === 'Estimate' ? ' required' : '') + '>' + esc(d.note) +
        '</textarea><div class="factor-citation">' + icon('FileCheck2', 17) + '<span>Factor attached<strong>' + r.mode.factor + ' · ' +
        r.factor.rate + ' kg CO₂e / tonne-km</strong><small>Library v' + r.factor.version + '</small></span></div>' + nextAction(stage) + '</form>';
    } else {
      body = '<div class="review-inputs"><div><span>Transport</span><strong>' + r.mode.label + '</strong></div><div><span>Cargo weight</span><strong>' +
        fmt(r.mass, 3) + ' t</strong></div><div><span>Distance</span><strong>' + fmt(r.distance, 2) + ' km · ' + esc(d.basis) +
        '</strong></div><div><span>Source</span><strong>' + esc(d.reference) + '</strong></div></div>' +
        '<details class="journey-evidence"><summary>Factor and method</summary><p>' + esc(r.factor.source) + ' · ' + r.mode.factor +
        ' · v' + esc(r.factor.version) + '</p><p>Tonnes × kilometres × kg CO₂e per tonne-kilometre. ' + esc(d.note) +
        '</p></details><form id="journey-approve">' + input('Reviewer', 'journey-reviewer',
          'name="reviewer" required maxlength="75" placeholder="Your name" value="' + esc(d.reviewer) + '"') +
        '<label class="checkbox"><input id="journey-ack" type="checkbox" required> I checked the inputs and their sources.</label>' +
        '<div class="journey-form-actions"><button class="button primary" type="submit">Approve shipment ' + icon('Check', 16) +
        '</button>' + btn('Back', 'journey-back', null, 'quiet') + '</div><p class="field-hint">Simulated expert review · ' +
        (storageUnavailable ? 'Session only. Download after approval.' : 'Saved in this browser when storage is available.') + '</p></form>';
    }
    return '<div class="journey-step-caption">0' + (stage + 1) + ' / 05 · ' + journeySteps[stage] +
      '</div><h2 id="journey-input-title" tabindex="-1">' + intros[stage][0] + '</h2><p class="step-intro">' + esc(intros[stage][1]) +
      '</p>' + body + '<p class="journey-validation" id="journey-validation" role="status"></p>';
  }

  function nextAction(stage) {
    const r = result();
    const ready = stage === 1 ? r.validMass : stage === 2 ? r.validDistance : r.hasEvidence;
    return '<div class="journey-form-actions"><button type="submit" class="button primary" id="journey-continue"' + (ready ? '' : ' disabled') +
      '>Continue ' + icon('ArrowRight', 16) + '</button>' + btn('Back', 'journey-back', null, 'quiet') + '</div>';
  }

  function recent() {
    if (!data.records.length) return '<div class="journey-empty"><span class="record-mini">' + icon('Truck', 20) +
      '</span><p>Your approved shipments will appear here.</p></div>';
    return data.records.slice(0, 3).map((row) => '<button type="button" class="journey-record-row" data-action="journey-open" data-value="' +
      row.id + '"><span class="record-mini">' + icon(row.mode === 'truck' ? 'Truck' : 'Ship', 18) + '</span><span><strong>' +
      esc(row.id) + '</strong><small>' + fmt(row.massTonnes, 2) + ' t · ' + fmt(row.distanceKm, 1) + ' km · ' + esc(row.basis) +
      '</small></span><strong>' + fmt(row.kg, 2) + ' kg</strong>' + icon('ChevronRight', 15) + '</button>').join('');
  }

  function snapshotDetail(row) {
    return '<dl><div><dt>Source</dt><dd>' + esc(row.reference) + '</dd></div><div><dt>Distance basis</dt><dd>' + esc(row.basis) +
      '</dd></div><div><dt>Entered weight</dt><dd>' + fmt(row.enteredMass ?? row.massTonnes, 3) + ' ' + esc(row.enteredUnit ?? 't') +
      '</dd></div><div><dt>Activity</dt><dd>' + fmt(row.activityTkm, 3) + ' tonne-km</dd></div><div><dt>Factor</dt><dd>' + esc(row.factorId) +
      ' · ' + row.factorRate + ' kg CO₂e / tonne-km</dd></div><div><dt>Factor version</dt><dd>' + esc(row.factorVersion) +
      '</dd></div><div><dt>Factor source</dt><dd>' + esc(row.factorSource) + '</dd></div><div><dt>Reviewer</dt><dd>' + esc(row.reviewer) +
      '</dd></div><div><dt>Approved</dt><dd>' + esc(new Date(row.at).toLocaleString('en-GB')) + '</dd></div>' +
      (row.note ? '<div><dt>Assumption</dt><dd>' + esc(row.note) + '</dd></div>' : '') + '</dl>';
  }

  function ledger() {
    return '<header class="shipment-heading"><div><p class="context-label">Shipment ledger · ' + (storageUnavailable ? 'this session' : 'this browser') + '</p><h1>Every record, traceable.</h1></div>' +
      btn('New shipment', 'journey-new', 'Plus', 'primary') + '</header>' + storageNotice() + '<section class="surface ledger-list">' +
      (data.records.length ? data.records.map((row) => '<details class="ledger-record"><summary><span class="record-mini">' +
        icon(row.mode === 'truck' ? 'Truck' : 'Ship', 19) + '</span><span><strong>' + esc(row.id) + '</strong><small>' + esc(row.reference) +
        '</small></span><span class="status done">Reviewed</span><strong>' + fmt(row.kg, 2) + ' kg CO₂e</strong></summary>' +
        '<div class="ledger-evidence">' + snapshotDetail(row) + btn('Download record', 'journey-download', 'Download', 'secondary', row.id) + '</div></details>').join('') :
        '<div class="journey-empty"><p>Complete and approve a shipment to start the ledger.</p></div>') +
      '</section><p class="journey-scope">These prototype shipment records are separate from the package inventory.</p>';
  }

  function refresh(animate = true) {
    const d = draft();
    const r = result();
    const approved = complete();
    const p = progress();
    const mode = d.mode || 'truck';
    const visual = document.querySelector('#journey-visual');
    if (!visual) return;
    visual.dataset.mode = mode;
    visual.dataset.paused = String(stopped());
    visual.style.setProperty('--progress', p + '%');
    visual.querySelector('.fallback-vehicle').src = mode === 'truck' ? truckUrl : vesselUrl;
    visual.querySelector('.scene-heading > span').innerHTML = '<i></i>' + (mode === 'truck' ? 'Road freight' : 'Sea freight');
    visual.querySelector('#journey-scene-status').textContent = approved ? 'Record complete · reviewed in demo'
      : r.completed + ' of 4 inputs complete · ' + (r.completed === 4 ? 'Ready for review' : journeySteps[Math.min(r.completed, 3)] + ' next');
    visual.querySelector('#journey-scene-estimate').textContent = r.calculated ? fmt(r.kg, 2) + ' kg CO₂e' : 'Estimate pending';
    const motion = visual.querySelector('[data-action=journey-motion]');
    motion.innerHTML = icon(stopped() ? 'Play' : 'Pause', 16);
    motion.setAttribute('aria-label', stopped() ? 'Resume scene motion' : 'Pause scene motion');
    motion.hidden = media.matches;
    if (p !== lastProgress || mode !== lastMode) {
      visual.classList.toggle('travelling', !stopped() && animate);
      clearTimeout(movingTimer);
      movingTimer = setTimeout(() => visual.classList.remove('travelling'), 1250);
    }
    scene?.update({ progress: p, mode, paused: stopped() });
    lastProgress = p;
    lastMode = mode;
    const number = document.querySelector('#journey-kg');
    if (number) {
      if (numberFrame) cancelAnimationFrame(numberFrame);
      if (!r.calculated) {
        number.textContent = '—';
        displayKg = 0;
      } else {
        const start = displayKg;
        const target = r.kg;
        if (stopped() || !animate || typeof requestAnimationFrame !== 'function') {
          number.textContent = fmt(target, 2);
          displayKg = target;
        } else {
          let startTime;
          const paint = (time) => {
            startTime ??= time;
            const t = Math.min(1, (time - startTime) / 520);
            displayKg = start + (target - start) * (1 - (1 - t) ** 3);
            number.textContent = fmt(displayKg, 2);
            if (t < 1) numberFrame = requestAnimationFrame(paint);
          };
          numberFrame = requestAnimationFrame(paint);
        }
      }
    }
    document.querySelector('#journey-equation').innerHTML = equation();
    document.querySelector('#journey-result-badge').textContent = resultBadge();
    clearTimeout(announcementTimer);
    const resultAnnouncement = r.calculated ? 'Shipment estimate: ' + fmt(r.kg, 2) + ' kilograms of carbon dioxide equivalent.' :
      'Estimate pending. Add valid cargo weight and distance.';
    announcementTimer = setTimeout(() => {
      const status = document.querySelector('#journey-result-status');
      if (status && resultAnnouncement !== lastResultAnnouncement) {
        status.textContent = resultAnnouncement;
        lastResultAnnouncement = resultAnnouncement;
      }
    }, 650);
    document.querySelectorAll('.journey-stops button').forEach((button, index) => {
      button.disabled = index > r.completed;
      button.setAttribute('aria-current', index === d.stage ? 'step' : 'false');
      button.querySelector('i').classList.toggle('done', index < r.completed || Boolean(approved));
      button.querySelector('i').innerHTML = index < r.completed || approved ? icon('Check', 13) : String(index + 1);
    });
    const next = document.querySelector('#journey-continue');
    if (next) next.disabled = d.stage === 1 ? !r.validMass : d.stage === 2 ? !r.validDistance : !r.hasEvidence;
    const activeInput = document.querySelector(d.stage === 1 ? '#journey-mass' : '#journey-distance');
    const validation = document.querySelector('#journey-validation');
    if (activeInput && validation) {
      const valid = d.stage === 1 ? r.validMass : r.validDistance;
      const invalid = activeInput.value !== '' && !valid;
      activeInput.setAttribute('aria-invalid', String(invalid));
      activeInput.setAttribute('aria-describedby', 'journey-validation');
      validation.textContent = !invalid ? '' : d.stage === 1 ?
        'Enter a weight greater than zero, up to ' + fmt(d.unit === 'kg' ? 1000000000 : 1000000) + ' ' + d.unit + '.' :
        'Enter a distance greater than zero, up to 50,000 km.';
    }
  }

  function save() {
    storageUnavailable = !persist();
    document.querySelectorAll('.journey-storage-notice').forEach((note) => { note.hidden = !storageUnavailable; });
    return !storageUnavailable;
  }

  function focusStep() {
    const content = document.querySelector('#journey-step-content');
    (content?.querySelector('input') ?? content?.querySelector('#journey-input-title'))?.focus({ preventScroll: true });
    if (matchMedia('(max-width: 760px)').matches) {
      document.querySelector('.journey-input-panel')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  function step(stage) {
    draft().stage = stage;
    save();
    const content = document.querySelector('#journey-step-content');
    if (content) {
      content.innerHTML = stepContent();
      content.dataset.stage = String(stage);
      if (!stopped() && content.animate && document.documentElement.dataset.input !== 'keyboard') {
        content.animate([{ opacity: .5, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 300, easing: 'cubic-bezier(.2,.72,.2,1)' });
      }
      focusStep();
      refresh();
    } else render();
  }

  function action(name, value) {
    if (!name.startsWith('journey-')) return false;
    const d = draft();
    switch (name) {
      case 'journey-mode':
        if (journeyModes[value]) {
          if (d.mode && d.mode !== value) { d.distance = ''; d.reference = ''; d.note = ''; }
          d.mode = value; delete d.reviewed;
          step(1);
        }
        break;
      case 'journey-back': step(Math.max(0, d.stage - 1)); break;
      case 'journey-stage': if (Number(value) <= result().completed) step(Number(value)); break;
      case 'journey-motion': data.paused = !data.paused; save(); refresh(false); break;
      case 'journey-distance-example': {
        const row = sampleShipment(d.mode);
        if (!row) break;
        d.distance = String(row.distance);
        d.basis = 'Recorded';
        d.reference = 'shipments.csv · ' + row.id + ' · 2025';
        d.note = 'Distance from the synthetic shipment row. Cargo weight was entered separately.';
        document.querySelector('#journey-distance').value = d.distance;
        document.querySelector('#journey-basis').value = d.basis;
        save(); refresh();
        break;
      }
      case 'journey-example': {
        const mode = d.mode || 'truck';
        const row = sampleShipment(mode);
        data.draft = { ...blankDraft(), mode, mass: String(row.mass), unit: 't', distance: String(row.distance), basis: 'Recorded',
          reference: 'shipments.csv · ' + row.id + ' · 2025', note: 'Synthetic package example. Verify inputs before approval.', reviewer: '', stage: 4 };
        save(); step(4);
        break;
      }
      case 'journey-new':
        data.draft = blankDraft();
        save();
        if (location.hash !== '#overview') location.hash = 'overview';
        else { render(); window.scrollTo(0, 0); }
        break;
      case 'journey-open': {
        const row = data.records.find((item) => item.id === value);
        if (!row) break;
        data.draft = { ...blankDraft(), mode: row.mode, mass: String(row.massTonnes), distance: String(row.distanceKm),
          basis: row.basis, reference: row.reference, note: row.note, reviewer: row.reviewer, reviewed: row.id, stage: 4 };
        save();
        if (location.hash !== '#overview') location.hash = 'overview';
        else render();
        break;
      }
      case 'journey-download': {
        const row = data.records.find((item) => item.id === value);
        if (!row) break;
        const url = URL.createObjectURL(new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = row.id + '.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        break;
      }
    }
    return true;
  }

  function field(target) {
    const key = {
      'journey-mass': 'mass', 'journey-distance': 'distance', 'journey-reference': 'reference',
      'journey-note': 'note', 'journey-basis': 'basis', 'journey-reviewer': 'reviewer',
    }[target.id];
    if (key) {
      draft()[key] = target.value;
      delete draft().reviewed;
      save(); refresh();
      return true;
    }
    if (target.id === 'journey-unit') {
      const d = draft();
      if (target.value === d.unit) return true;
      const value = Number(d.mass);
      if (d.mass !== '' && Number.isFinite(value)) d.mass = String(target.value === 'kg' ? value * 1000 : value / 1000);
      d.unit = target.value;
      delete d.reviewed;
      const input = document.querySelector('#journey-mass');
      input.value = d.mass;
      input.max = d.unit === 'kg' ? '1000000000' : '1000000';
      save(); refresh();
      return true;
    }
    return false;
  }
  function submit(form) {
    if (form.id === 'journey-form') {
      const r = result();
      const stage = Number(draft().stage);
      const valid = stage === 1 ? r.validMass : stage === 2 ? r.validDistance : r.hasEvidence;
      if (valid) step(Math.min(4, stage + 1));
      return true;
    }
    if (form.id === 'journey-approve') {
      if (complete()) return true;
      const acknowledgement = form.querySelector('#journey-ack').checked;
      const row = recordSnapshot(draft(), acknowledgement);
      if (!row) {
        document.querySelector('#journey-validation').textContent = 'Check the shipment inputs, reviewer and acknowledgement.';
        return true;
      }
      data.records.unshift(row);
      draft().reviewed = row.id;
      const stored = save();
      document.querySelector('#journey-step-content').innerHTML = stepContent();
      document.querySelector('.journey-recent').innerHTML = '<header><h2>Recent shipments</h2><a class="inline-link" href="#shipments">View records ' + icon('ArrowRight', 15) + '</a></header>' + recent();
      refresh();
      announce.textContent = stored ? 'Shipment approved in demo and saved with its sources.' :
        'Shipment approved in demo for this session only. Download the record before closing this tab.';
      focusStep();
      return true;
    }
    return false;
  }
  async function mount() {
    host = document.querySelector('#journey-visual');
    if (!host) return;
    const ownHost = host;
    lastProgress = progress();
    displayKg = result().kg;
    refresh(false);
    try {
      const { mountJourneyScene } = await import('./journey-scene.js');
      if (!ownHost.isConnected) return;
      const rendered = await mountJourneyScene(ownHost, { progress: progress(), mode: draft().mode || 'truck', paused: stopped() });
      if (ownHost.isConnected) {
        scene = rendered;
        scene?.update({ progress: progress(), mode: draft().mode || 'truck', paused: stopped() });
      }
      else rendered?.dispose();
    } catch { /* The image scene and every form control remain usable. */ }
  }
  function cleanup() {
    scene?.dispose();
    scene = undefined;
    clearTimeout(movingTimer);
    clearTimeout(announcementTimer);
    if (numberFrame) cancelAnimationFrame(numberFrame);
  }
  media.addEventListener('change', () => refresh(false));
  return { view, ledger, action, field, submit, mount, cleanup };
}
