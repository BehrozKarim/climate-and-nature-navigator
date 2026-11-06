import '@fontsource-variable/manrope/wght.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import landscape from './nordic-fields.webp';
import {
  createElement, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleAlert, ClipboardList, Download,
  FileCheck2, FileText, Gauge, Leaf, Package, Pause, Play, Route, Search, Ship, Truck, X,
} from 'lucide';
import { factors, issues, version, findLeg, freight, fuelComparison, estimateKg, issueId } from './freight.js';

const icons = { ArrowRight, ArrowUpRight, Check, ChevronRight, CircleAlert, ClipboardList, Download, FileCheck2, FileText, Gauge, Leaf, Package, Pause, Play, Route, Search, Ship, Truck, X };
const icon = (name, size = 18) => createElement(icons[name], {
  width: size, height: size, 'stroke-width': 1.65, 'aria-hidden': 'true',
}).outerHTML;
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const fmt = (value, digits = 0) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
const tonnes = (kg) => fmt(kg / 1000, 2);
const pages = { overview: 'Overview', checks: 'Data checks', inventory: 'Freight inventory', fuel: 'Fuel test' };
const sources = {
  shipments: ['Freight', 'Truck'],
  erp_purchase_lines: ['Purchasing', 'Package'],
  energy_meter_readings: ['Energy meters', 'Gauge'],
  supplier_pcfs: ['Supplier footprints', 'Package'],
  travel_bookings: ['Travel', 'ClipboardList'],
};
const sourceCredit = 'Apetit Climate & Nature Navigator synthetic dataset, Since AI ry 2026 (CC BY 4.0)';
const roadPath = 'M1432 742 C1422 693 1380 652 1325 607 C1263 561 1196 534 1194 489 C1192 448 1253 419 1302 384 C1346 353 1388 332 1388 294';
const main = document.querySelector('#main');
const nav = document.querySelector('#navigation');
const drawer = document.querySelector('#drawer');
const announce = document.querySelector('#announcement');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const storageKey = 'apetit-workbench-2025-v1';
let saved = { decisions: {}, history: [], paused: false };
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored?.decisions && Array.isArray(stored.history)) saved = stored;
} catch { /* The workbench is also usable without storage. */ }

let filter = 'all';
let search = '';
let statusFilter = 'open';
let selectedIssue;
let sceneCleanup;
let origin;
let pointer = false;
let focusAfterClose;
let flash;
let share = 40;
let rate = '';

const decisions = () => saved.decisions;
const open = () => issues.filter((issue) => !decisions()[issueId(issue)]);
const byImpact = (left, right) => (right.factor ? estimateKg(right) : 0) - (left.factor ? estimateKg(left) : 0);
const page = () => pages[location.hash.slice(1)] ? location.hash.slice(1) : 'overview';
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); return true; }
  catch { return false; }
}
function btn(label, action, glyph, look = 'secondary', value = '') {
  return '<button class="button ' + look + '" type="button" data-action="' + action + '" data-value="' + esc(value) + '">' +
    label + (glyph ? icon(glyph, 16) : '') + '</button>';
}
function closeButton() {
  return '<button type="button" class="icon-button" data-action="close" aria-label="Close details">' + icon('X', 21) + '</button>';
}
function head(title, description, action = '') {
  return '<header class="page-heading"><div><h1>' + title + '</h1><p>' + description + '</p></div>' + action + '</header>';
}
function badge(text, kind = 'review') {
  return '<span class="status ' + kind + '"><i></i>' + text + '</span>';
}
function currentStatus(issue) {
  const decision = decisions()[issueId(issue)];
  if (decision?.kind === 'dismiss') return badge('Dismissed', 'waiting');
  if (decision) return badge(decision.km ? 'Correction approved' : 'Reviewed', 'done');
  return badge('Needs review', 'input');
}

function hero() {
  const count = open().length;
  return '<section class="hero work-hero" aria-labelledby="hero-heading"><svg class="road-art" id="hero-route" viewBox="0 0 1536 1024" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">' +
    '<image href="' + landscape + '" width="1536" height="1024"/>' +
    '<defs><filter id="road-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>' +
    '<path class="route-shadow" d="' + roadPath + '"/><path class="route-line" d="' + roadPath + '"/>' +
    '<circle class="route-node" cx="1388" cy="294" r="7"/><circle class="route-node" cx="1432" cy="742" r="7"/>' +
    '<g class="route-runner"><circle r="19" fill="#e7ffc0" opacity=".65" filter="url(#road-glow)"/><circle r="7" fill="#f5ffd8"/>' +
    '<animateMotion dur="6.5s" repeatCount="indefinite" path="' + roadPath + '"/></g></svg>' +
    '<div class="hero-content"><div class="hero-kicker"><span></span> 2025 INVENTORY REVIEW</div>' +
    '<h1 id="hero-heading">Bring the numbers<br><em>into focus.</em></h1>' +
    '<p>Find data gaps, check their sources, and approve corrections to inbound freight.</p>' +
    '<a class="button hero-button" href="#checks">' + (count ? 'Review ' + count + ' flags' : 'Open data checks') + icon('ArrowRight', 17) + '</a></div>' +
    '<div class="hero-route-card"><span class="road-caption">' + icon('Route', 17) + ' Illustrative road</span>' +
    '<button class="motion-toggle" type="button" data-action="motion" aria-label="Pause road animation">' + icon('Pause', 16) + '</button></div></section>';
}

function metrics(data) {
  const unresolved = open();
  return '<section class="metrics" aria-label="2025 workbench summary"><div><span>' + icon('Leaf', 16) +
    ' Inbound freight estimate</span><strong>' + tonnes(data.kg) + ' <small>t CO₂e</small></strong><p>Scope 3 · Category 4 only</p></div><div><span>' +
    icon('CircleAlert', 16) + ' Flags to review</span><strong>' + unresolved.length + '</strong><p>' +
    unresolved.filter((issue) => issue.factor).length + ' possible freight gaps</p></div><div><span>' + icon('Truck', 16) +
    ' Recorded legs counted</span><strong>' + fmt(data.included.length) + '</strong><p>' + data.held.length +
    ' held by input checks</p></div><div class="period-metric"><span>' + icon('FileCheck2', 16) +
    ' Approved additions</span><strong>' + data.adjustments.length + '</strong><p>Source records retained</p></div></section>';
}

function issueRow(issue) {
  const [source, glyph] = sources[issue.table];
  return '<button type="button" class="queue-row" data-action="item" data-value="' + esc(issueId(issue)) + '">' +
    '<span class="type-icon ' + (issue.factor ? 'freight' : '') + '">' + icon(glyph, 19) + '</span>' +
    '<span class="queue-title"><strong>' + esc(issue.title) + '</strong><small>' +
    esc(issue.subject) + ' · ' + source + ' · ' + issue.owner + '</small></span>' +
    (issue.factor && !decisions()[issueId(issue)] ? badge('+' + tonnes(estimateKg(issue)) + ' t potential', 'input') : currentStatus(issue)) +
    '<span class="queue-arrow">' + icon('ChevronRight', 16) + '</span></button>';
}

function empty() {
  return '<div class="empty"><span class="type-icon">' + icon('Check', 19) + '</span><strong>No matching flags</strong><p>Try another feed, review status or search.</p></div>';
}

function modeBars(data) {
  const total = data.kg || 1;
  return '<div class="mode-bars">' + Object.entries(data.totals).map(([mode, kg]) =>
    '<button type="button" class="mode-row" data-action="records" data-value="' + mode + '">' +
    '<span>' + icon(mode === 'Truck' ? 'Truck' : 'Ship', 17) + ' ' + mode + '</span>' +
    '<span class="mode-track" aria-hidden="true"><i style="--share:' + kg / total + '"></i></span>' +
    '<strong>' + tonnes(kg) + ' t</strong>' + icon('ChevronRight', 14) + '</button>').join('') + '</div>';
}

function overview() {
  const data = freight(decisions());
  const priority = open().sort(byImpact).slice(0, 4);
  return hero() + metrics(data) + '<div class="overview-grid"><section class="surface queue-preview">' +
    '<header class="section-heading"><div><h2>Start with the freight gaps</h2><p>Sorted by estimated impact on the inventory.</p></div>' +
    '<a class="button small secondary" href="#checks">All checks ' + icon('ArrowRight', 15) + '</a></header>' +
    '<div class="queue-list">' + (priority.length ? priority.map(issueRow).join('') : empty()) + '</div></section>' +
    '<section class="surface trend"><header class="section-heading"><div><h2>Freight by mode</h2><p>2025 · Recorded legs plus approved additions</p></div></header>' +
    modeBars(data) + '<a class="text-link section-link" href="#inventory">Open freight inventory ' + icon('ArrowUpRight', 15) + '</a></section></div>';
}

function checkRows() {
  const term = search.trim().toLowerCase();
  const matched = issues.filter((issue) =>
    (filter === 'all' || issue.table === filter) &&
    (statusFilter === 'all' || Boolean(decisions()[issueId(issue)]) === (statusFilter === 'reviewed')) &&
    [issue.key, issue.subject, issue.title, issue.owner].some((text) => text.toLowerCase().includes(term))
  ).sort(byImpact);
  return matched.length ? matched.map(issueRow).join('') : empty();
}

function checks() {
  return head('Data checks', 'Investigate flags from the raw files. Each one shows the rule, source and person to follow up with.',
    btn('Export A1 candidates', 'a1', 'Download')) +
    '<div class="work-grid"><section class="surface work-table"><div class="filter-bar"><div class="filters" aria-label="Filter by source">' +
    [['all', 'All feeds'], ...Object.entries(sources).map(([key, [label]]) => [key, label])].map(([key, label]) =>
      '<button type="button" data-action="filter" data-value="' + key + '" aria-pressed="' + (filter === key) + '">' + label + '</button>').join('') +
    '</div><div class="check-search"><label><span class="sr-only">Review status</span><select id="status-filter"><option value="open">Open flags</option>' +
    '<option value="reviewed"' + (statusFilter === 'reviewed' ? ' selected' : '') + '>Reviewed</option><option value="all"' +
    (statusFilter === 'all' ? ' selected' : '') + '>All statuses</option></select></label><label class="search">' + icon('Search', 17) +
    '<input id="queue-search" type="search" value="' + esc(search) + '" aria-label="Search by record or owner" placeholder="Search records"></label></div></div>' +
    '<div class="queue-list" id="queue-results">' + checkRows() + '</div></section>' +
    '<aside class="surface intake"><span class="type-icon">' + icon('ClipboardList', 21) + '</span><h2>Open by feed</h2><p>Signals for expert review. A flag can point to a gap or a legitimate exception.</p><dl>' +
    Object.entries(sources).map(([key, [label]]) => '<div><dt>' + label + '</dt><dd>' + open().filter((issue) => issue.table === key).length + '</dd></div>').join('') +
    '</dl><small>Scope and scoring are described in Tasks and scoring §A1.</small></aside></div>';
}

function inventory() {
  const data = freight(decisions());
  const openFreight = open().filter((issue) => issue.factor).length;
  return head('Inbound freight inventory', '2025 · Scope 3 category 4 · Calculated from recorded tonne-kilometres and transport factors.',
    btn('Export leg audit', 'audit', 'Download', 'primary')) +
    '<div class="overview-grid inventory-grid"><section class="surface inventory-total"><header class="section-heading"><div><h2>Working estimate</h2><p>Includes recorded legs and approved corrections.</p></div>' +
    badge(openFreight || data.held.length ? 'Partial coverage' : 'Reviewed flags', openFreight || data.held.length ? 'input' : 'done') + '</header>' +
    '<div class="inventory-number">' + tonnes(data.kg) + ' <small>t CO₂e</small></div><dl class="inventory-breakdown"><div><dt>Recorded freight</dt><dd>' +
    tonnes(data.recordedKg) + ' t</dd></div><div><dt>Approved additions</dt><dd>+' + tonnes(data.kg - data.recordedKg) +
    ' t</dd></div><div><dt>Open freight flags</dt><dd>' + openFreight + '</dd></div></dl>' +
    '<p class="inventory-note">Based on the supplied synthetic records. Other legs may be missing. These figures cover inbound freight only.</p></section>' +
    '<section class="surface"><header class="section-heading"><div><h2>By mode</h2><p>Select a mode to trace its source records.</p></div></header>' + modeBars(data) + '</section></div>' +
    '<section class="surface evidence-list"><header class="section-heading"><div><h2>Review history</h2><p>Record key, evidence and reviewer are retained with each decision.</p></div>' +
    (saved.history.length ? btn('Export decisions', 'decisions', 'Download', 'small secondary') : '') + '</header>' +
    (saved.history.length ? saved.history.map((decision) =>
      '<article class="event-row"><span class="type-icon">' + icon('FileCheck2', 19) + '</span><div><h2>' +
      esc(decision.kind === 'approve' ? 'Freight correction approved' : decision.kind === 'dismiss' ? 'Flag dismissed' : 'Flag reviewed') +
      '</h2><p>' + esc(decision.key) + ' · ' + esc(decision.reviewer) + '</p><p>' +
      (decision.km ? 'No sea leg → ' + fmt(decision.km, 1) + ' km · ' + esc(decision.basis) + ' · ' + esc(decision.source) + ' · ' : '') +
      esc(decision.note) + '</p></div></article>').join('') : '<div class="empty"><p>Review a flag to create the first decision.</p></div>') + '</section>';
}

function fuelResult() {
  const fuel = fuelComparison(freight(decisions()).adjusted);
  const avoided = (fuel.diesel - fuel.renewable) * share / 100;
  return { fuel, avoided, after: fuel.diesel - avoided, cost: rate === '' ? null : fuel.activity * share / 100 / 1000 * Number(rate) };
}
function fuelNumbers() {
  const { fuel, avoided, after, cost } = fuelResult();
  return '<div><span>Modelled reduction</span><strong>' + tonnes(avoided) + ' <small>t CO₂e</small></strong></div>' +
    '<div><span>Modelled incremental cost</span><strong>' + (cost === null ? 'Quote needed' : '€' + fmt(cost)) + '</strong></div>' +
    '<div><span>Diesel today → Modelled mix</span><strong>' + tonnes(fuel.diesel) + ' → ' + tonnes(after) + ' <small>t CO₂e</small></strong></div>';
}
function fuelPage() {
  const { fuel, after } = fuelResult();
  return head('Test a fuel switch', 'Use the 2025 standard diesel truck activity to size a carrier conversation.') +
    '<section class="surface scenario-shell"><header class="section-heading"><div><h2>Diesel to HVO100</h2><p>' + fmt(fuel.count) +
    ' eligible truck legs · Same distance and load</p></div>' + badge('Illustrative model') + '</header>' +
    '<div class="scenario-controls"><label for="share">Share of eligible activity switched <strong id="share-value">' + share + '%</strong></label>' +
    '<input type="range" id="share" min="0" max="100" step="5" value="' + share + '"><p>Uses ' + fmt(fuel.activity) +
    ' recorded tonne-kilometres. Refrigerated trucks, ship and ferry legs are excluded.</p></div>' +
    '<div class="fuel-bars" aria-label="Modelled remaining emissions relative to diesel"><span>Diesel baseline</span><i></i><span>Modelled mix</span><i id="fuel-bar" style="--share:' +
    (fuel.diesel ? after / fuel.diesel : 0) + '"></i></div>' +
    '<div class="scenario-numbers" id="scenario-results">' + fuelNumbers() + '</div>' +
    '<div class="scenario-controls cost-control"><label for="premium">Carrier premium in € per 1,000 tonne-km (optional)</label>' +
    '<input id="premium" type="number" min="0" max="100000" step="any" value="' + esc(rate) + '" placeholder="Enter a quote to estimate cost">' +
    '<p>Next step · Procurement can ask the carrier about price, fuel availability and feedstock. This model is separate from the inventory.</p></div>' +
    '<details><summary>Calculation and factors</summary><p>Eligible tonne-km × selected share × (diesel factor − HVO factor). ' +
    'EF-TKM-TRUCK at ' + factors['EF-TKM-TRUCK'].rate + ' and EF-TKM-TRUCK-HVO at ' + factors['EF-TKM-TRUCK-HVO'].rate +
    ' kg CO₂e per tonne-km, from the 2025 synthetic factor library. This is a single lever sensitivity test.</p></details></section>';
}

function syncMotion() {
  const route = document.querySelector('#hero-route');
  const control = document.querySelector('[data-action=motion]');
  if (!route || !control) return;
  const stopped = saved.paused || reduce.matches;
  if (stopped) route.pauseAnimations?.();
  else route.unpauseAnimations?.();
  control.hidden = reduce.matches;
  control.setAttribute('aria-label', stopped ? 'Play road animation' : 'Pause road animation');
  control.innerHTML = icon(stopped ? 'Play' : 'Pause', 16);
}
function render(focus = false) {
  const current = page();
  nav.innerHTML = Object.entries(pages).map(([key, label]) =>
    '<a href="#' + key + '"' + (current === key ? ' aria-current="page"' : '') + '>' + label + '</a>').join('');
  const views = { overview, checks, inventory, fuel: fuelPage };
  main.innerHTML = (flash ? '<div class="save-banner" role="status">' + icon('Check', 17) + esc(flash) + '</div>' : '') + views[current]();
  syncMotion();
  if (focus) main.focus({ preventScroll: true });
}

function show(title, label, content) {
  if (!drawer.open) origin = document.activeElement;
  sceneCleanup?.();
  sceneCleanup = undefined;
  drawer.className = pointer ? 'from-pointer' : '';
  drawer.innerHTML = '<header class="drawer-heading"><div><p>' + esc(label) + '</p><h2 id="drawer-title" tabindex="-1">' + esc(title) +
    '</h2></div>' + closeButton() + '</header><div class="drawer-body">' + content + '</div>';
  if (!drawer.open) drawer.showModal();
  drawer.querySelector('#drawer-title').focus();
}
function issueDetails(issue) {
  if (!issue) return;
  selectedIssue = issue;
  const decision = decisions()[issueId(issue)];
  const road = issue.road && findLeg(issue.road);
  const factor = factors[issue.factor];
  show(issue.title, issue.key, '<div class="drawer-meta">' + currentStatus(issue) + '<span>Owner · ' + issue.owner + '</span></div>' +
    '<p class="drawer-description">' + esc(issue.explanation) + '</p>' +
    '<div class="evidence-card"><span class="type-icon">' + icon('FileText', 18) + '</span><div><strong>Source</strong><p>' +
    esc(issue.source) + '</p><p>' + esc(issue.subject) + '</p></div></div>' +
    (road ? '<div class="scene" id="leg-scene"><div class="scene-fallback" aria-hidden="true">' + icon('Truck', 39) + '<i></i>' +
      icon('Ship', 39) + '</div><span>Two-leg schematic · illustration</span></div>' +
      '<div class="leg-choices">' + btn('Road · ' + fmt(road.distance, 1) + ' km', 'leg', 'Truck', 'secondary', 'road') +
      btn(decision?.km ? 'Sea · ' + fmt(decision.km, 1) + ' km' : 'Sea · Missing', 'leg', 'Ship', 'secondary', 'vessel') +
      '</div><p class="leg-feedback" id="leg-feedback" role="status"></p>' : '') +
    (factor ? '<div class="next-box"><strong>Suggested estimate · ' + fmt(issue.km, 1) + ' km</strong><p>Median of ' +
      issue.matchCount + ' comparable recorded legs (' + fmt(issue.range[0], 1) + '–' + fmt(issue.range[1], 1) +
      ' km). Uses ' + fmt(issue.mass, 3) + ' tonnes from road leg ' + issue.road + '. Verify the port pair or carrier record before using a measured distance.</p>' +
      '<p>+ ' + tonnes(estimateKg(issue)) + ' t CO₂e to coverage if approved.</p><p>Factor ' + issue.factor + ' · ' + factor.rate +
      ' kg CO₂e / tonne-km · ' + esc(factor.source) + ' · ' + esc(factor.version) + '.</p></div>' +
      '<details class="leg-record"><summary>Example comparable shipment rows</summary>' +
      issue.exampleRows.map(([id, year, km]) => '<p>' + esc(id) + ' · ' + year + ' · ' + fmt(km, 1) + ' km</p>').join('') + '</details>' :
      (issue.examples ? '<div class="next-box"><strong>Compare with</strong><p>' + issue.examples.map(esc).join(', ') + '</p></div>' : '')) +
    (decision ? '<div class="evidence-card"><strong>' + esc(decision.reviewer) + '</strong><p>' + esc(decision.note) + '</p></div>' :
      '<div class="drawer-actions">' + btn(factor ? 'Review correction' : 'Record review', 'review', 'Check', 'primary') +
      btn('Dismiss flag', 'dismiss', null, 'quiet') + '</div>'));
  const scene = drawer.querySelector('#leg-scene');
  if (scene) import('./scene.js').then(({ mountScene }) => {
    if (scene.isConnected) sceneCleanup = mountScene(scene, !decision?.km, showLeg);
  }).catch(() => { /* The static diagram and controls are always available. */ });
}
function showLeg(id) {
  const node = drawer.querySelector('#leg-feedback');
  const road = findLeg(selectedIssue.road);
  const approved = decisions()[issueId(selectedIssue)];
  if (node) node.textContent = id === 'road'
    ? road.id + ' · ' + fmt(road.mass, 3) + ' t · ' + fmt(road.activity, 2) + ' tonne-km · ' + road.factor
    : approved?.km ? fmt(approved.km, 1) + ' km · ' + approved.basis + ' · ' + approved.source
      : 'The sea record is absent. The suggested distance comes from earlier comparable shipments.';
  drawer.querySelectorAll('[data-action=leg]').forEach((control) =>
    control.setAttribute('aria-pressed', String(control.dataset.value === id)));
}
function reviewForm(dismiss) {
  const issue = selectedIssue;
  const correcting = Boolean(issue.factor && !dismiss);
  show(dismiss ? 'Dismiss this flag' : correcting ? 'Approve a freight correction' : 'Record the review', issue.key,
    '<p class="drawer-description">' + (correcting ? 'Compare the proposal with the original records. An approved estimate adds missing coverage to the working inventory.' :
      'Record what you checked and what should happen next. The original source stays intact.') + '</p>' +
    '<form id="review-form" data-kind="' + (dismiss ? 'dismiss' : correcting ? 'approve' : 'review') + '">' +
    (correcting ? '<label for="distance">Sea distance (km)</label><input id="distance" name="km" type="number" required min="0.1" max="50000" step="any">' +
      '<label for="basis">Distance basis</label><select id="basis" name="basis"><option>Carrier record</option><option>Historical lane estimate</option></select>' +
      '<label for="reference">Evidence reference</label><input id="reference" name="source" required maxlength="180">' +
      '<button type="button" class="text-link" data-action="suggest">Use historical estimate · ' + fmt(issue.km, 1) + ' km</button>' +
      '<div class="next-box" id="preview-correction">Enter a distance to preview the impact.</div>' : '') +
    '<label for="reviewer">Reviewer</label><input id="reviewer" name="reviewer" required maxlength="75" value="Demo reviewer">' +
    '<label for="note">Reason or next step</label><textarea id="note" name="note" required maxlength="400" rows="3"></textarea>' +
    '<label class="checkbox"><input type="checkbox" required> I checked the evidence and assumptions.</label>' +
    '<div class="drawer-actions"><button type="submit" class="button primary">' + (correcting ? 'Approve correction' : 'Save decision') +
    icon('Check', 16) + '</button>' + btn('Back to flag', 'back', null, 'quiet') + '</div></form>');
}
function previewCorrection() {
  const km = Number(drawer.querySelector('#distance').value);
  const data = freight(decisions());
  drawer.querySelector('#preview-correction').textContent = km > 0
    ? 'Working estimate: ' + tonnes(data.kg) + ' → ' + tonnes(data.kg + estimateKg(selectedIssue, km)) +
      ' t CO₂e. Adds ' + tonnes(estimateKg(selectedIssue, km)) + ' t from a missing leg.'
    : 'Enter a distance to preview the impact.';
}
function recordsList(mode) {
  const list = freight(decisions()).adjusted.filter((leg) => leg.group === mode);
  show(mode + ' records', '2025 · Inbound freight', '<p class="drawer-description">' + fmt(list.length) +
    ' counted legs. Filter by shipment ID or purchase reference.</p><label class="search"><input id="record-search" type="search" placeholder="Search shipment or purchase" aria-label="Search shipment or purchase"></label><div id="record-results"></div>');
  const input = drawer.querySelector('#record-search');
  function update() {
    const term = input.value.trim().toLowerCase();
    const matches = list.filter((leg) => (leg.id + ' ' + leg.ref).toLowerCase().includes(term));
    drawer.querySelector('#record-results').innerHTML = '<p class="port-label">Showing ' + Math.min(matches.length, 30) + ' of ' +
      fmt(matches.length) + ' matches</p>' + matches.slice(0, 30).map((leg) => {
        const factor = factors[leg.factor];
        return '<details class="leg-record"><summary>' + esc(leg.id) + ' · ' + tonnes(leg.kg) + ' t CO₂e</summary><p>Purchase ' +
          esc(leg.ref) + ' · ' + fmt(leg.mass, 3) + ' t · ' + fmt(leg.distance, 1) + ' km</p><p>' +
          fmt(leg.activity, 2) + ' tonne-km × ' + factor.rate + ' kg CO₂e / tonne-km</p><p>' +
          esc(leg.factor) + ' · ' + esc(factor.source) + ' · ' + esc(factor.version) + '</p><p>' +
          (leg.source ? esc(leg.basis) + ' · ' + esc(leg.source) : '02_raw_feeds/shipments.csv') + '</p></details>';
      }).join('');
  }
  input.addEventListener('input', update);
  update();
}

function download(file, rows) {
  const csvCell = (value) => {
    const text = String(value ?? '');
    const safe = typeof value === 'string' && /^[=+@\t\r-]/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCandidates() {
  const candidates = new Map();
  for (const issue of issues) {
    if (decisions()[issueId(issue)]?.kind === 'dismiss') continue;
    const prior = candidates.get(issue.key);
    if (!prior || issue.confidence > prior.confidence) candidates.set(issue.key, issue);
  }
  download('A1_issues_submission.csv', [
    ['table', 'record_key', 'issue_type', 'confidence', 'explanation'],
    ...Array.from(candidates.values(), (issue) => [issue.table, issue.key, issue.type, issue.confidence, issue.explanation]),
  ]);
}
function exportAudit() {
  const data = freight(decisions());
  download('2025_inbound_freight_leg_audit.csv', [
    ['shipment_or_issue_key', 'purchase', 'mode', 'tonnes', 'km', 'tonne_km', 'factor_id', 'kg_co2e_per_tonne_km', 'factor_version', 'factor_reference', 'source', 'basis', 'kg_co2e', 'dataset_attribution'],
    ...data.adjusted.map((leg) => [leg.id, leg.ref, leg.mode, leg.mass, leg.distance, leg.activity, leg.factor,
      factors[leg.factor].rate, factors[leg.factor].version, factors[leg.factor].source,
      leg.source ?? '02_raw_feeds/shipments.csv', leg.basis ?? 'Recorded', leg.kg, sourceCredit]),
  ]);
}
function exportDecisions() {
  download('2025_review_decisions.csv', [
    ['record_key', 'issue_type', 'decision', 'reviewer', 'timestamp', 'before_km', 'after_km', 'basis', 'evidence', 'reason', 'factor_id', 'factor_version', 'dataset_attribution'],
    ...saved.history.map((item) => [item.key, item.type, item.kind, item.reviewer, item.at, '', item.km, item.basis,
      item.source, item.note, item.factor, factors[item.factor]?.version, sourceCredit]),
  ]);
}

document.addEventListener('pointerdown', () => { pointer = true; }, { passive: true });
document.addEventListener('keydown', () => { pointer = false; });
document.addEventListener('click', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, value } = control.dataset;
  switch (action) {
    case 'motion': saved.paused = !saved.paused; persist(); syncMotion(); break;
    case 'item': issueDetails(issues.find((issue) => issueId(issue) === value)); break;
    case 'leg': showLeg(value); break;
    case 'back': issueDetails(selectedIssue); break;
    case 'review': reviewForm(false); break;
    case 'dismiss': reviewForm(true); break;
    case 'close': drawer.close(); break;
    case 'records': recordsList(value); break;
    case 'a1': exportCandidates(); break;
    case 'audit': exportAudit(); break;
    case 'decisions': exportDecisions(); break;
    case 'filter':
      filter = value;
      render();
      document.querySelector('[data-action=filter][data-value="' + value + '"]').focus();
      break;
    case 'suggest':
      drawer.querySelector('#distance').value = selectedIssue.km;
      drawer.querySelector('#basis').value = 'Historical lane estimate';
      drawer.querySelector('#reference').value = selectedIssue.examples.join(', ');
      drawer.querySelector('#note').value = 'Median of ' + selectedIssue.matchCount + ' prior comparable legs; verify against carrier evidence when available.';
      previewCorrection();
      break;
  }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'status-filter') {
    statusFilter = event.target.value;
    document.querySelector('#queue-results').innerHTML = checkRows();
  }
});
document.addEventListener('input', (event) => {
  const { id, value } = event.target;
  if (id === 'queue-search') {
    search = value;
    document.querySelector('#queue-results').innerHTML = checkRows();
  } else if (id === 'distance') {
    previewCorrection();
  } else if (id === 'share' || id === 'premium') {
    if (id === 'share') share = Number(value);
    else rate = event.target.validity.valid ? value : '';
    document.querySelector('#share-value').textContent = share + '%';
    document.querySelector('#scenario-results').innerHTML = fuelNumbers();
    const { fuel, after } = fuelResult();
    document.querySelector('#fuel-bar').style.setProperty('--share', fuel.diesel ? after / fuel.diesel : 0);
  }
});
drawer.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id !== 'review-form' || decisions()[issueId(selectedIssue)]) return;
  const fields = Object.fromEntries(Array.from(new FormData(form), ([key, value]) => [key, value.trim()]));
  for (const input of form.querySelectorAll('[required][name]')) {
    if (!fields[input.name]) { input.value = ''; form.reportValidity(); return; }
  }
  const decision = {
    key: selectedIssue.key, type: selectedIssue.type, kind: form.dataset.kind,
    reviewer: fields.reviewer, note: fields.note, at: new Date().toISOString(),
    ...(form.dataset.kind === 'approve' ? { km: Number(fields.km), source: fields.source, basis: fields.basis, factor: selectedIssue.factor } : {}),
  };
  saved.decisions[issueId(selectedIssue)] = decision;
  saved.history.unshift(decision);
  const stored = persist();
  flash = (decision.km ? 'Correction approved. The freight estimate now includes this leg.' : 'Review decision recorded.') +
    (stored ? '' : ' Browser storage is unavailable; changes last for this tab.');
  announce.textContent = flash;
  focusAfterClose = true;
  render();
  drawer.close();
});
drawer.addEventListener('close', () => {
  sceneCleanup?.();
  sceneCleanup = undefined;
  if (!focusAfterClose && origin?.isConnected) origin.focus();
  else main.focus({ preventScroll: true });
  focusAfterClose = false;
});
window.addEventListener('hashchange', () => { flash = undefined; render(true); window.scrollTo(0, 0); });
document.querySelector('.skip-link').addEventListener('click', (event) => { event.preventDefault(); main.focus(); });
reduce.addEventListener('change', syncMotion);
document.querySelector('#dataset-credit').textContent = sourceCredit + ' · v' + version;
render();

