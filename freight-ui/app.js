import '@fontsource-variable/manrope/wght.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import landscape from './nordic-fields.webp';
import {
  createElement, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleAlert, ClipboardList, Copy,
  Download, FileCheck2, FileText, History, Leaf, Package, Pause, Play, Plus, Route, Search, Ship,
  SlidersHorizontal, Sprout, Truck, X,
} from 'lucide';
import { labels, statusLabels, owners, period, baseline, months, scenarios, scenarioBaseline, loadWorkspace, saveWorkspace, log, freightEffect, scenarioResult } from './demo-workspace.js';

const icons = { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleAlert, ClipboardList, Copy, Download, FileCheck2, FileText, History, Leaf, Package, Pause, Play, Plus, Route, Search, Ship, SlidersHorizontal, Sprout, Truck, X };
const icon = (name, size = 18) => createElement(icons[name], {
  width: size, height: size, 'stroke-width': 1.65, 'aria-hidden': 'true',
}).outerHTML;
const esc = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const number = (value, digits = 0) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
const euro = (value) => '€' + number(value);
const pages = { overview: 'Overview', queue: 'Work queue', scenarios: 'Scenarios', evidence: 'Evidence' };
const categoryIcon = { freight: 'Truck', supplier: 'Package', farm: 'Sprout', purchasing: 'ClipboardList' };
const main = document.querySelector('#main');
const nav = document.querySelector('#navigation');
const drawer = document.querySelector('#drawer');
const announcement = document.querySelector('#announcement');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const state = loadWorkspace();
let motionPaused = state.motionPaused ?? false;
let chartMonths = 6;
let filter = 'open';
let search = '';
let scenario = 'fuel';
let share = 45;
let pointerOpened = false;
let origin;
let sceneCleanup;
let activeRecord;
let activity = null;

const view = () => pages[location.hash.slice(1)] ? location.hash.slice(1) : 'overview';
const openRecords = () => state.records.filter((record) => record.status !== 'done');
const announced = (message) => { announcement.textContent = message; };
function save(message) {
  const saved = saveWorkspace(state);
  announced(saved ? message : message + ' Browser storage is unavailable.');
  activity = { text: message, saved };
}
const iconButton = (label, glyph, action, value = '') =>
  '<button class="icon-button" type="button" data-action="' + action + '" data-value="' + value + '" aria-label="' + label + '">' + icon(glyph) + '</button>';
const button = (label, action, glyph, style = 'secondary', value = '') =>
  '<button type="button" class="button ' + style + '" data-action="' + action + '" data-value="' + value + '">' + label + (glyph ? icon(glyph, 16) : '') + '</button>';
const pill = (record) => '<span class="status ' + record.status + '"><i></i>' + statusLabels[record.status] + '</span>';
const nextStep = (record) => record.status === 'review' ? 'Check the proposed evidence'
  : record.status === 'done' ? 'View reviewed evidence'
    : record.status === 'waiting' ? 'Check whether the requested evidence has arrived'
      : record.factor ? 'Find or estimate the vessel distance' : 'Add supporting evidence';

function hero() {
  const remaining = openRecords().length;
  const freight = state.records.find((record) => record.id === 'FR-2048');
  const completed = freight.status === 'done';
  return '<section class="hero" aria-labelledby="hero-heading">' +
    '<img class="hero-image" src="' + landscape + '" alt="" fetchpriority="high">' +
    '<div class="hero-content"><div class="hero-kicker"><span></span> SUSTAINABILITY WORKSPACE</div>' +
    '<h1 id="hero-heading">Climate work,<br><em>in focus.</em></h1>' +
    '<p>See what needs attention, check the evidence, and decide what to do next.</p>' +
    '<a class="button hero-button" href="#queue">' + (remaining ? 'Review ' + remaining + ' open items' : 'Open work queue') + icon('ArrowRight', 17) + '</a></div>' +
    '<div class="route-visual"><svg id="hero-route" viewBox="0 0 560 310" aria-hidden="true">' +
    '<defs><filter id="route-glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="4"/></filter></defs>' +
    '<path class="route-shadow" d="M31 245 C92 241 145 241 185 205 S213 111 270 107 C331 100 366 177 422 140 S479 74 532 73"/>' +
    '<path class="route-line" d="M31 245 C92 241 145 241 185 205 S213 111 270 107 C331 100 366 177 422 140 S479 74 532 73"/>' +
    '<circle class="route-node" cx="31" cy="245" r="6"/><circle class="route-node" cx="270" cy="107" r="6"/><circle class="route-node" cx="532" cy="73" r="6"/>' +
    '<g class="route-runner"><circle r="12" fill="#d9eea5" opacity=".65" filter="url(#route-glow)"/><circle r="4.2" fill="#f1ffd1"/>' +
    '<animateMotion dur="7s" repeatCount="indefinite" path="M31 245 C92 241 145 241 185 205 S213 111 270 107 C331 100 366 177 422 140 S479 74 532 73"/></g></svg></div>' +
    '<div class="hero-route-card"><button type="button" data-action="item" data-value="FR-2048" class="route-open">' +
    '<span class="route-icon">' + icon('Route', 21) + '</span><span><strong>Baltic rapeseed</strong><small>Illustrative route · ' + (completed ? 'Reviewed' : '2 transport legs') + '</small></span>' + icon('ArrowUpRight', 16) + '</button>' +
    '<button class="motion-toggle" type="button" data-action="motion" aria-label="Pause route animation">' + icon('Pause', 16) + '</button></div></section>';
}

function trendData() {
  const values = [...baseline];
  values[values.length - 1] += state.records.reduce((sum, record) => sum + (record.approved ? freightEffect(record, record.approved) : 0), 0);
  return values;
}

function statStrip() {
  const ready = state.records.filter((record) => record.status === 'review').length;
  const reviewed = state.records.filter((record) => record.status === 'done').length;
  return '<section class="metrics" aria-label="October workspace summary">' +
    '<div><span>' + icon('Leaf', 16) + ' Period emissions estimate</span><strong>' + number(trendData().at(-1), 1) + ' <small>t CO₂e</small></strong><p>October · Fictional figures</p></div>' +
    '<div><span>' + icon('ClipboardList', 16) + ' Open items</span><strong>' + openRecords().length + '</strong><p>' + ready + ' ready for review</p></div>' +
    '<div><span>' + icon('FileCheck2', 16) + ' Reviewed records</span><strong>' + reviewed + '</strong><p>Approved in this workspace</p></div>' +
    '<div class="period-metric"><span>' + icon('CalendarDays', 16) + ' Reporting period</span><strong>Oct <small>2026</small></strong><p>Demo inventory close</p></div></section>';
}

function heading(title, description, actions = '') {
  return '<header class="page-heading"><div><h1>' + title + '</h1><p>' + description + '</p></div>' + actions + '</header>';
}

function row(record) {
  return '<button type="button" class="queue-row" data-action="item" data-value="' + esc(record.id) + '">' +
    '<span class="type-icon ' + record.category + '">' + icon(categoryIcon[record.category], 19) + '</span>' +
    '<span class="queue-title"><strong>' + esc(record.title) + '</strong><small>' + esc(record.subject) + ' · ' + owners[record.category] + '</small></span>' +
    pill(record) + '<span class="queue-arrow">' + icon('ChevronRight', 16) + '</span></button>';
}

function chart() {
  const values = trendData().slice(-chartMonths);
  const names = months.slice(-chartMonths);
  const low = Math.min(...values) - 120;
  const high = Math.max(...values) + 120;
  const points = values.map((value, index) => [22 + index * 332 / (values.length - 1), 135 - (value - low) / (high - low) * 113]);
  const line = points.map(([x, y], index) => (index ? 'L' : 'M') + x + ',' + y).join(' ');
  const area = line + ' L354,135 L22,135 Z';
  const delta = (values.at(-1) / values[0] - 1) * 100;
  return '<section class="surface trend" aria-labelledby="trend-title"><header class="section-heading">' +
    '<div><h2 id="trend-title">Emissions trend</h2><p>Monthly estimates · fictional data</p></div>' +
    '<div class="segmented" aria-label="Trend period">' + [3, 6].map((length) =>
      '<button type="button" data-action="chart" data-value="' + length + '" aria-pressed="' + (length === chartMonths) + '">' + length + 'M</button>').join('') + '</div></header>' +
    '<div class="chart-stat"><strong>' + (delta < 0 ? '−' : '+') + number(Math.abs(delta), 1) + '%</strong><span>over ' + chartMonths + ' months</span></div>' +
    '<svg class="trend-svg" viewBox="0 0 376 165" aria-hidden="true"><defs><linearGradient id="chart-fill" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#c8deaa" stop-opacity=".62"/><stop offset="1" stop-color="#e7eedf" stop-opacity=".05"/></linearGradient></defs>' +
    [25, 65, 105, 135].map((y) => '<path d="M22 ' + y + ' H354" class="chart-grid"/>').join('') +
    '<path d="' + area + '" fill="url(#chart-fill)"/><path d="' + line + '" class="chart-line"/>' +
    points.map(([x, y], index) => '<circle cx="' + x + '" cy="' + y + '" r="' + (index === points.length - 1 ? 5 : 3) + '"/><text x="' + x + '" y="157">' + names[index] + '</text>').join('') +
    '</svg><details class="chart-values"><summary>View monthly figures</summary><dl>' + values.map((value, index) =>
      '<div><dt>' + names[index] + '</dt><dd>' + number(value, 1) + ' t CO₂e</dd></div>').join('') + '</dl></details></section>';
}

function overview() {
  const records = openRecords().slice(0, 4);
  return hero() + statStrip() + '<div class="overview-grid"><section class="surface queue-preview" aria-labelledby="queue-preview-title">' +
    '<header class="section-heading"><div><h2 id="queue-preview-title">Needs attention</h2><p>Review the records holding up this period.</p></div>' +
    button('Add record', 'add', 'Plus', 'small secondary') + '</header>' +
    (records.length ? '<div class="queue-list">' + records.map(row).join('') + '</div>' : emptyQueue()) +
    '</section>' + chart() + '</div>';
}

function emptyQueue() {
  return '<div class="empty"><span class="type-icon">' + icon('Check', 19) + '</span><strong>No matching records</strong><p>Change the filter or add a record for review.</p></div>';
}

function queueRows() {
  const term = search.trim().toLowerCase();
  const matches = state.records.filter((record) => {
    const scope = filter === 'all' || (filter === 'open' && record.status !== 'done') || record.category === filter || (filter === 'done' && record.status === 'done');
    return scope && [record.title, record.subject, record.id, owners[record.category]].some((value) => value.toLowerCase().includes(term));
  });
  return matches.length ? matches.map(row).join('') : emptyQueue();
}

function queue() {
  return heading('Work queue', 'Check incoming records, follow up on gaps and move evidence into review.', button('Add record', 'add', 'Plus', 'primary')) +
    '<div class="work-grid"><section class="surface work-table"><div class="filter-bar"><div class="filters" aria-label="Filter work queue">' +
    Object.entries({ open: 'Open', all: 'All', ...labels, done: 'Reviewed' }).map(([key, value]) =>
      '<button type="button" data-action="filter" data-value="' + key + '" aria-pressed="' + (filter === key) + '">' + value + '</button>').join('') +
    '</div><label class="search">' + icon('Search', 17) + '<input id="queue-search" type="search" value="' + esc(search) + '" aria-label="Find a record" placeholder="Find a record"></label></div>' +
    '<div class="queue-list" id="queue-results">' + queueRows() + '</div></section>' +
    '<aside class="surface intake"><span class="type-icon">' + icon('Package', 21) + '</span><h2>Record intake</h2><p>Add a fictional record with a source reference. Each record has an owner, a next step and a review status.</p><dl>' +
    Object.entries(labels).map(([key, value]) => '<div><dt>' + value + '</dt><dd>' + state.records.filter((record) => record.category === key).length + '</dd></div>').join('') +
    '</dl><small>Manual entry · local prototype</small></aside></div>';
}

function scenarioNumbers() {
  const result = scenarioResult(scenario, share);
  return '<div><span>Potential reduction</span><strong>' + number(result.saved, 1) + ' <small>t CO₂e / year</small></strong></div>' +
    '<div><span>Illustrative additional cost</span><strong>' + euro(result.cost) + ' <small>/ year</small></strong></div>';
}

function comparisonBars() {
  return '<div class="comparison-bars" aria-label="Potential annual reduction by option">' +
    Object.entries(scenarios).map(([key, option]) => {
      const { saved } = scenarioResult(key, share);
      return '<div><span>' + option.name + '</span><span class="comparison-track" aria-hidden="true"><i data-option="' + key +
        '" style="--fraction:' + saved / scenarioBaseline + '"></i></span><strong data-savings="' + key + '">' +
        number(saved, 1) + ' t</strong></div>';
    }).join('') + '</div>';
}

function scenarioPage() {
  const option = scenarios[scenario];
  const alt = scenarios[scenario === 'fuel' ? 'rail' : 'fuel'];
  return heading('Compare reduction options', 'Explore two freight actions on the same fictional baseline.') +
    '<section class="surface scenario-shell"><div class="scenario-options" aria-label="Select an action">' +
    Object.entries(scenarios).map(([key, item]) => '<button type="button" data-action="scenario" data-value="' + key + '" aria-pressed="' + (scenario === key) + '"><span>' + icon(key === 'fuel' ? 'Leaf' : 'Route', 22) + '</span><strong>' + item.name + '</strong><small>' + item.description + '</small></button>').join('') +
    '</div><div class="scenario-controls"><label for="share">Share of eligible freight <strong id="share-value">' + share + '%</strong></label>' +
    '<input type="range" id="share" min="5" max="100" step="5" value="' + share + '"><p>Illustrative eligible freight baseline · ' + scenarioBaseline + ' t CO₂e per year</p></div>' +
    '<div class="scenario-numbers" id="scenario-results">' + scenarioNumbers() + '</div>' +
    '<div class="scenario-detail"><div><strong>Estimated timing</strong><p>' + option.timing + '</p><strong>Other benefit</strong><p>' + option.benefit + '</p></div><div><strong>What to check</strong><p>' + option.tradeoff + '</p></div></div>' +
    comparisonBars() + '<div class="comparison" id="scenario-comparison">' + comparisonText(alt) + '</div><div class="scenario-footer">' +
    '<p>Planning estimates. A supplier quote and feasibility check are needed.</p>' + button('Save comparison', 'save-scenario', 'Check', 'primary') + '</div></section>';
}

function comparisonText(alt) {
  const alternate = scenarioResult(scenario === 'fuel' ? 'rail' : 'fuel', share);
  return '<span>At the same ' + share + '% share, ' + alt.name.toLowerCase() + ' models <strong>' + number(alternate.saved, 1) +
    ' t CO₂e / year</strong> at <strong>' + euro(alternate.cost) + ' / year</strong>.</span>';
}

function evidencePage() {
  return heading('Evidence and history', 'See what changed, which source supports it and who reviewed it.',
    state.events.length ? button('Download history', 'download', 'Download') : '') +
    '<section class="surface evidence-list">' + (state.events.length ? state.events.map((event) => {
      const date = new Date(event.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      const record = state.records.find((item) => item.id === event.record);
      return '<article class="event-row"><span class="type-icon">' + icon(event.reviewer ? 'FileCheck2' : 'History', 19) + '</span><div>' +
        '<h2>' + esc(event.title) + '</h2><p>' + esc(event.record) + ' · ' + esc(date) + (event.reviewer ? ' · ' + esc(event.reviewer) : '') + '</p>' +
        (event.after ? '<details><summary>View evidence and change</summary><p><strong>Before</strong> ' + esc(evidenceLabel(event.before, event.distance)) +
          '</p><p><strong>After</strong> ' + esc(evidenceLabel(event.after, event.distance)) + '</p><p>' + esc(event.after.basis) + ' · ' +
          esc(event.after.reference) + '</p>' + (event.factor ? '<p>Demo factor v1 · ' + event.factor + ' kg CO₂e / tonne-km</p>' : '') + '<p>' + esc(event.after.note) + '</p></details>' : '') +
        (event.note ? '<p>' + esc(event.note) + '</p>' : '') + '</div>' +
        (record ? button('Open record', 'item', 'ChevronRight', 'quiet', record.id) : '') + '</article>';
    }).join('') : '<div class="empty"><span class="type-icon">' + icon('History', 22) + '</span><h2>No changes recorded yet</h2><p>Saved evidence, reviewed records and scenario comparisons appear here.</p><a class="button secondary" href="#queue">Go to work queue' + icon('ArrowRight', 15) + '</a></div>') + '</section>';
}

function motionState() {
  const route = document.querySelector('#hero-route');
  const control = document.querySelector('[data-action=motion]');
  if (!route || !control) return;
  const stopped = motionPaused || reduce.matches;
  if (stopped) route.pauseAnimations?.();
  else route.unpauseAnimations?.();
  control.hidden = reduce.matches;
  control.setAttribute('aria-label', stopped ? 'Play route animation' : 'Pause route animation');
  control.innerHTML = icon(stopped ? 'Play' : 'Pause', 16);
}

function render(focus = false) {
  const page = view();
  nav.innerHTML = Object.entries(pages).map(([id, title]) => '<a href="#' + id + '"' +
    (page === id ? ' aria-current="page"' : '') + '>' + title + '</a>').join('');
  const content = page === 'overview' ? overview() : page === 'queue' ? queue() : page === 'scenarios' ? scenarioPage() : evidencePage();
  main.innerHTML = (activity ? '<div class="save-banner" role="status">' + icon(activity.saved ? 'Check' : 'CircleAlert', 17) +
    '<span>' + esc(activity.text) + (activity.saved ? '' : ' Changes are only available in this tab.') + '</span>' +
    iconButton('Dismiss message', 'X', 'dismiss') + '</div>' : '') + content;
  motionState();
  if (focus) main.focus({ preventScroll: true });
}

function openDrawer(title, eyebrow, body) {
  if (!drawer.open) origin = document.activeElement;
  sceneCleanup?.();
  sceneCleanup = undefined;
  drawer.className = pointerOpened ? 'from-pointer' : '';
  drawer.innerHTML = '<header class="drawer-heading"><div><p>' + eyebrow + '</p><h2 id="drawer-title" tabindex="-1">' + title + '</h2></div>' +
    iconButton('Close details', 'X', 'close') + '</header><div class="drawer-body">' + body + '</div>';
  if (!drawer.open) drawer.showModal();
  drawer.querySelector('#drawer-title').focus();
}

function evidenceLabel(evidence, distance) {
  return evidence ? evidence.value + (distance ? ' km' : '') : 'No value recorded';
}

function roadScene(record) {
  return '<div class="scene" id="leg-scene"><div class="scene-fallback" aria-hidden="true">' + icon('Truck', 46) +
    '<i></i>' + icon('Ship', 46) + '</div><span>Shipment schematic</span></div>' +
    '<div class="leg-choices"><button type="button" data-action="leg" data-value="road">' + icon('Truck', 18) + ' Road · 92 km</button>' +
    '<button type="button" data-action="leg" data-value="vessel">' + icon('Ship', 18) + ' Vessel · ' +
    (record.evidence ? esc(record.evidence.value) + ' km' : 'Missing distance') + '</button></div><p class="leg-feedback" id="leg-feedback" role="status"></p>';
}

function item(record) {
  if (!record) return;
  activeRecord = record;
  const distance = Boolean(record.factor);
  openDrawer(esc(record.title), esc(record.id) + ' · ' + labels[record.category],
    '<div class="drawer-meta">' + pill(record) + '<span>Owner · ' + owners[record.category] + '</span></div>' +
    '<p class="drawer-description">' + esc(record.description) + '</p>' +
    (distance ? roadScene(record) + '<p class="port-label">Fictional port pair · ' + esc(record.ports) + '</p>' : '') +
    '<div class="evidence-card"><span class="type-icon">' + icon('FileText', 18) + '</span><div><strong>Source record</strong><p>' + esc(record.source) + '</p></div></div>' +
    (record.evidence ? '<div class="evidence-card"><span class="type-icon">' + icon('FileCheck2', 18) + '</span><div><strong>' +
      (record.status === 'done' ? 'Reviewed evidence' : 'Proposed evidence') + '</strong><p>' + esc(evidenceLabel(record.original, distance)) + ' → ' +
      esc(evidenceLabel(record.evidence, distance)) + '</p><p>' + esc(record.evidence.basis) + ' · ' + esc(record.evidence.reference) +
      '</p>' + (distance ? '<p>' + number(freightEffect(record), 2) + ' t CO₂e for the vessel leg · demo factor v1 (' + record.factor + ' kg CO₂e / tonne-km)</p>' : '') +
      (record.reviewer ? '<p>Reviewed by ' + esc(record.reviewer) + '</p>' : '') + '</div></div>' : '') +
    '<div class="next-box"><strong>Next step</strong><p>' + nextStep(record) + '</p>' +
    (record.approved && record.status !== 'done' ? '<p>The period estimate still uses the last reviewed value.</p>' : '') + '</div>' +
    (record.status === 'done' ? '<div class="drawer-actions">' + button('Reopen record', 'reopen', 'History') + '</div>' : '<div class="drawer-actions">' +
      (record.status === 'review' ? button('Review evidence', 'approve', 'Check', 'primary') + button('Edit evidence', 'entry', null)
        : button('Add evidence', 'entry', 'Plus', 'primary') + button('Draft request', 'draft', 'FileText')) + '</div>'));
  const scene = drawer.querySelector('#leg-scene');
  if (scene) import('./scene.js').then(({ mountScene }) => {
    if (scene.isConnected) sceneCleanup = mountScene(scene, !record.evidence, (id) => showLeg(id));
  }).catch(() => { /* Regular buttons and static diagram remain available. */ });
}

function showLeg(leg) {
  const detail = drawer.querySelector('#leg-feedback');
  if (detail) detail.textContent = leg === 'road'
    ? 'Road leg · 92 km from the fictional carrier manifest.'
    : activeRecord.evidence ? 'Vessel leg · ' + activeRecord.evidence.value + ' km · ' + activeRecord.evidence.basis + '.'
      : 'Vessel leg · Distance needed for the port-to-port segment.';
  drawer.querySelectorAll('[data-action=leg]').forEach((control) =>
    control.setAttribute('aria-pressed', String(control.dataset.value === leg)));
}

function field(label, name, props = '') {
  return '<label for="field-' + name + '">' + label + '</label><input id="field-' + name + '" name="' + name + '" ' + props + '>';
}
const noteField = (label, value = '', required = true) => '<label for="field-note">' + label + '</label><textarea id="field-note" name="note" rows="3" maxlength="320"' +
  (required ? ' required' : '') + '>' + esc(value) + '</textarea>';
const formButton = (label) => '<button class="button primary" type="submit">' + label + icon('ArrowRight', 16) + '</button>';

function entry() {
  const record = activeRecord;
  const before = record.evidence;
  const distance = Boolean(record.factor);
  openDrawer('Add supporting evidence', esc(record.id), '<p class="drawer-description">' + (distance
    ? 'Enter a carrier distance or record an estimate with its basis. Estimated values stay labelled through review.'
    : 'Record the corrected value or method alongside the document it came from.') + '</p>' +
    '<form id="entry-form">' +
    field(distance ? 'Vessel distance (km)' : 'Corrected value or method', 'value', distance
      ? 'type="number" min="0.1" max="50000" step="0.1" required value="' + esc(before?.value) + '"'
      : 'required maxlength="120" value="' + esc(before?.value) + '"') +
    (distance ? '<p class="port-label">Fictional port pair · ' + esc(record.ports) + '</p><button class="text-link" data-action="suggest" type="button">Use fictional port-distance example · ' + record.suggestion + ' km</button>' : '') +
    '<label for="field-basis">Basis</label><select id="field-basis" name="basis"><option>Source document</option><option' +
    (before?.basis === 'Estimate' ? ' selected' : '') + '>Estimate</option></select>' +
    field('Source reference', 'reference', 'required maxlength="120" value="' + esc(before?.reference) + '"') +
    noteField('Reason or assumption', before?.note) +
    '<div class="drawer-actions">' + formButton('Save for review') + button('Back to record', 'back', null, 'quiet') + '</div></form>');
}

function approval() {
  const record = activeRecord;
  if (record.status !== 'review') return;
  openDrawer('Review supporting evidence', esc(record.id), '<p class="drawer-description">Check the change against its source. This records a simulated approval in this browser.</p>' +
    '<div class="next-box"><strong>' + esc(evidenceLabel(record.original, Boolean(record.factor))) + ' → ' +
    esc(evidenceLabel(record.evidence, Boolean(record.factor))) + '</strong><p>' + esc(record.evidence.basis) + ' · ' + esc(record.evidence.reference) +
    '</p></div><form id="approve-form">' + field('Reviewer name', 'reviewer', 'required maxlength="60" value="Demo reviewer"') +
    '<label class="checkbox"><input type="checkbox" required> I have checked the source and assumptions.</label><div class="drawer-actions">' +
    formButton('Mark reviewed') + button('Back to record', 'back', null, 'quiet') + '</div></form>');
}

function addRecord() {
  activeRecord = undefined;
  openDrawer('Add an incoming record', 'Manual intake', '<p class="drawer-description">Add another fictional record to the workspace to try the daily workflow.</p>' +
    '<form id="add-form"><label for="field-category">Source type</label><select id="field-category" name="category">' +
    Object.entries(labels).map(([id, label]) => '<option value="' + id + '">' + label + '</option>').join('') + '</select>' +
    field('What needs checking?', 'title', 'required maxlength="95"') + field('Supplier, shipment or grower', 'subject', 'required maxlength="75"') +
    field('Source reference', 'source', 'required maxlength="100"') + noteField('What is missing or unclear?') +
    '<div class="drawer-actions">' + formButton('Add to work queue') + '</div></form>');
}

function draft() {
  const record = activeRecord;
  const request = record.category === 'supplier'
    ? 'Could you share the footprint method, reporting period and activities covered?'
    : record.category === 'freight' ? 'Could you share the vessel distance and carrier document for this shipment?'
      : 'Could you send the source record and confirm the corrected value?';
  openDrawer('Draft a follow-up', esc(record.id), '<p class="drawer-description">Edit this template before copying it into your own message.</p>' +
    '<label for="draft-text">Message</label><textarea id="draft-text" rows="6">Hello,\n\n' + request + '\n\nReference: ' +
    esc(record.subject) + ' · ' + esc(record.id) + '. Thank you.</textarea><div class="drawer-actions">' +
    button('Copy draft', 'copy', 'Copy', 'primary') + button('Mark waiting', 'waiting', 'History') + '</div><p id="copy-status" role="status"></p>');
}

function finish(message) {
  save(message);
  render();
  drawer.close();
}

function download() {
  const lines = ['Apetit · Demo evidence history', period + ' · Fictional data', ''];
  for (const event of state.events) {
    lines.push(event.at + ' · ' + event.record + ' · ' + event.title);
    if (event.reviewer) lines.push('Reviewer: ' + event.reviewer);
    if (event.before || event.after) lines.push('Before: ' + evidenceLabel(event.before, event.distance), 'After: ' + evidenceLabel(event.after, event.distance));
    if (event.after) lines.push('Basis: ' + event.after.basis, 'Source: ' + event.after.reference, 'Assumption: ' + event.after.note);
    if (event.factor) lines.push('Demo factor v1: ' + event.factor + ' kg CO₂e / tonne-km');
    if (event.note) lines.push(event.note);
    lines.push('');
  }
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'apetit-demo-evidence.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener('pointerdown', () => { pointerOpened = true; }, { passive: true });
document.addEventListener('keydown', () => { pointerOpened = false; });
document.addEventListener('click', async (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, value } = control.dataset;
  switch (action) {
    case 'motion':
      motionPaused = !motionPaused;
      state.motionPaused = motionPaused;
      saveWorkspace(state);
      motionState();
      break;
    case 'item': item(state.records.find((record) => record.id === value)); break;
    case 'leg': showLeg(value); break;
    case 'close': drawer.close(); break;
    case 'add': addRecord(); break;
    case 'entry': entry(); break;
    case 'approve': approval(); break;
    case 'back': item(activeRecord); break;
    case 'draft': draft(); break;
    case 'waiting':
      activeRecord.status = 'waiting';
      log(state, activeRecord, 'Follow-up marked as waiting');
      finish('Record marked as waiting.');
      break;
    case 'reopen':
      activeRecord.original = activeRecord.evidence;
      activeRecord.status = 'input';
      delete activeRecord.reviewer;
      log(state, activeRecord, 'Record reopened for new evidence');
      finish('Record reopened for new evidence.');
      break;
    case 'suggest':
      drawer.querySelector('#field-value').value = activeRecord.suggestion;
      drawer.querySelector('#field-basis').value = 'Estimate';
      drawer.querySelector('#field-reference').value = 'Fictional distance table v1 · ' + activeRecord.ports;
      drawer.querySelector('#field-note').value = 'Illustrative port-to-port distance. Confirm with the carrier.';
      break;
    case 'filter':
      filter = value; render(); main.querySelector('[data-action=filter][data-value="' + value + '"]').focus(); break;
    case 'chart':
      chartMonths = Number(value);
      main.querySelector('.trend').outerHTML = chart();
      main.querySelector('[data-action=chart][data-value="' + value + '"]').focus();
      break;
    case 'scenario':
      scenario = value; render(); main.querySelector('[data-action=scenario][data-value="' + value + '"]').focus(); break;
    case 'save-scenario': {
      const options = Object.entries(scenarios).map(([key, option]) => {
        const { saved, cost } = scenarioResult(key, share);
        return option.name + ': ' + number(saved, 1) + ' t CO₂e / year · ' + euro(cost) + ' / year';
      });
      log(state, { id: 'Scenario' }, 'Freight comparison saved',
        { note: share + '% of ' + scenarioBaseline + ' t CO₂e eligible baseline. ' + options.join(' | ') + '. Planning estimates.' });
      save('Comparison saved to Evidence.');
      render();
      main.querySelector('[data-action=save-scenario]').focus({ preventScroll: true });
      break;
    }
    case 'dismiss': activity = null; render(true); break;
    case 'download': download(); break;
    case 'copy': {
      const field = drawer.querySelector('#draft-text');
      const status = drawer.querySelector('#copy-status');
      try { await navigator.clipboard.writeText(field.value); status.textContent = 'Draft copied.'; }
      catch { field.focus(); field.select(); status.textContent = 'Use Copy on your device to copy the selected draft.'; }
      break;
    }
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'queue-search') {
    search = event.target.value;
    document.querySelector('#queue-results').innerHTML = queueRows();
  } else if (event.target.id === 'share') {
    share = Number(event.target.value);
    document.querySelector('#share-value').textContent = share + '%';
    document.querySelector('#scenario-results').innerHTML = scenarioNumbers();
    document.querySelector('#scenario-comparison').innerHTML = comparisonText(scenarios[scenario === 'fuel' ? 'rail' : 'fuel']);
    for (const key of Object.keys(scenarios)) {
      const { saved } = scenarioResult(key, share);
      document.querySelector('[data-option="' + key + '"]').style.setProperty('--fraction', saved / scenarioBaseline);
      document.querySelector('[data-savings="' + key + '"]').textContent = number(saved, 1) + ' t';
    }
  }
});

drawer.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const fields = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
  for (const field of form.querySelectorAll('[name][required]')) {
    if (!fields[field.name]) { field.value = ''; form.reportValidity(); return; }
  }
  if (form.id === 'add-form') {
    const record = { id: 'DEMO-' + String(state.records.length + 1).padStart(3, '0'), category: fields.category, title: fields.title,
      subject: fields.subject, source: fields.source, description: fields.note, status: 'input' };
    state.records.unshift(record);
    log(state, record, 'Incoming record added', { note: record.source });
    filter = 'open';
    search = '';
    finish('Record added to the work queue.');
  } else if (form.id === 'entry-form') {
    const before = activeRecord.evidence ?? activeRecord.original;
    activeRecord.evidence = fields;
    activeRecord.status = 'review';
    log(state, activeRecord, 'Evidence submitted for review', { before, after: fields, distance: Boolean(activeRecord.factor), factor: activeRecord.factor });
    finish('Evidence saved. The record is ready for review.');
  } else if (form.id === 'approve-form' && activeRecord.status === 'review') {
    activeRecord.status = 'done';
    activeRecord.reviewer = fields.reviewer;
    activeRecord.approved = activeRecord.evidence;
    log(state, activeRecord, 'Record reviewed', { before: activeRecord.original, after: activeRecord.evidence,
      reviewer: fields.reviewer, distance: Boolean(activeRecord.factor), factor: activeRecord.factor });
    finish('Record marked as reviewed.');
  }
});

drawer.addEventListener('close', () => {
  sceneCleanup?.();
  sceneCleanup = undefined;
  if (origin?.isConnected) origin.focus();
  else main.focus({ preventScroll: true });
});
window.addEventListener('hashchange', () => {
  activity = null;
  render(true);
  window.scrollTo(0, 0);
});
reduce.addEventListener('change', motionState);
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  main.focus();
});
render();

