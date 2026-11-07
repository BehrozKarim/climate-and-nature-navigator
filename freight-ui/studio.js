import { studioData } from './freight.js';

export const tracks = [
  { page: 'checks', code: 'A', name: 'Data & inventory', icon: 'Database', detail: 'Check source files and close the emissions inventory.', meta: 'A1 · A2' },
  { page: 'pathways', code: 'B', name: 'Reduction pathways', icon: 'GitBranch', detail: 'Compare targets, actions and cost.', meta: 'B1 · B2' },
  { page: 'risk', code: 'C', name: 'Crop & sourcing risk', icon: 'Sprout', detail: 'Explore yield and supply exposure.', meta: 'C1 · C2 · C3' },
  { page: 'nature', code: 'D', name: 'Nature hotspots', icon: 'Map', detail: 'Prioritise catchments and import origins.', meta: 'D1 · D2' },
  { page: 'copilot', code: 'E', name: 'Evidence copilot', icon: 'Sparkles', detail: 'Ask a question and inspect its sources.', meta: 'E' },
];

const graphNodes = [
  ['farms', 'Farms', 'Sprout', 17, 74, 'Contract growers link crop output, fertiliser and soil to sourcing risk.', '03_farming · farm surveys and parcel plans', 'risk'],
  ['suppliers', 'Suppliers', 'Package', 17, 27, 'Purchase receipts and supplier footprints explain where materials come from.', '02_raw_feeds · ERP and supplier declarations', 'checks'],
  ['operations', 'Operations', 'Factory', 47, 49, 'Join purchases, freight and site meters before calculating the inventory.', '02_raw_feeds · shipments and meter readings', 'inventory'],
  ['emissions', 'Emissions', 'ChartNoAxesCombined', 79, 23, 'Reviewed inventory lines feed the baseline and reduction scenarios.', '01_master · factor library and methodology', 'pathways'],
  ['catchments', 'Catchments', 'Waves', 79, 74, 'Sourcing locations connect nutrient pressure with the state of receiving waters.', '06_nature · catchments and origin indicators', 'nature'],
];
const graphLinks = [
  'M119 77 C220 77 209 140 329 140', 'M119 212 C225 212 210 140 329 140',
  'M329 140 C431 140 446 66 553 66', 'M329 140 C425 140 449 212 553 212',
  'M119 212 C236 269 445 273 553 212',
];

const documents = {
  accounting: ['GHG Protocol · accounting', 'framework_digest.md · Accounting: GHG Protocol; METHODOLOGY.md §4', 'The challenge uses a well-to-wheel tonne-kilometre method for inbound freight. A missing transport leg affects inventory coverage.'],
  targets: ['SBTi · climate targets and FLAG', 'framework_digest.md · Climate targets: SBTi; SCENARIOS_AND_RISK.md · Track B', 'The challenge separates land-related emissions from the other Scope 3 emissions. Scope 1 and 2, Scope 3 non-FLAG and FLAG use distinct annual reduction assumptions in the rubric.'],
  boundary: ['Structural changes · Foodhills', 'METHODOLOGY.md §1; structural_events.csv · Foodhills', 'The synthetic 2025 inventory includes Bjuv operations from December. Swedish pea growers are outside the 2025 inventory and enter from 2026. A comparable target baseline needs an explicit boundary choice.'],
  nature: ['SBTN · pressure and state', 'NATURE_SBTN.md · D1 priority formula', 'The scoring method combines phosphorus and nitrogen relative to sample medians, then weights for ecological state and phosphorus sensitivity.'],
  csrd: ['CSRD and ESRS · reporting context', 'framework_digest.md · Nature: SBTN, TNFD, ESRS', 'The package digest connects nature-related dependencies and impacts to ESRS E4. Applicability and disclosure obligations need a separately verified assessment.'],
};
const questions = [
  ['freight', 'Why would missing freight increase emissions?', 'accounting',
    'A shipment can have more than one leg. Adding a previously absent sea leg increases the amount of transport included. Log the before and after, the distance basis and the factor version, then have Logistics verify the carrier evidence.', 'Review the highest-impact sea-leg flag', 'checks'],
  ['flag', 'What counts as FLAG?', 'targets',
    'FLAG covers land-related emissions and removals. The package includes soil nitrous oxide, organic soils and liming in FLAG. Fertiliser manufacture and farm diesel sit in the non-FLAG calculation.', 'Compare the FLAG and non-FLAG targets', 'pathways'],
  ['boundary', 'How does Foodhills affect the baseline?', 'boundary',
    'The acquisition changes the accounting boundary. The package includes Foodhills operations from December 2025, while Swedish growers enter the following year. Document any adjustment separately from abatement.', 'Inspect the base-year comparison', 'pathways'],
  ['nature', 'Why is a catchment ranked high?', 'nature',
    'A priority score combines the relative phosphorus and nitrogen loads, ecological status and phosphorus sensitivity. Open the catchment detail to see each input and the sample being ranked.', 'Inspect the catchment priority calculation', 'nature'],
  ['csrd', 'Where does ESRS E4 fit?', 'csrd',
    'Use ESRS E4 to frame what to disclose about biodiversity and ecosystems when relevant. The challenge’s SBTN-style screening can support internal prioritisation. A qualified reviewer should confirm which obligations apply.', 'Open the nature screening preview', 'nature'],
];
const stepNames = ['Collect source files', 'Validate units & coverage', 'Generate recommendations', 'Queue for expert review'];
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
const pMedian = median(studioData.catchments.map((item) => item.p));
const nMedian = median(studioData.catchments.map((item) => item.n));
const weight = { good: 1, moderate: 1.2, poor: 1.5, bad: 1.8 };
const ranked = studioData.catchments.map((item) => ({
  ...item, score: (item.p / pMedian + 0.5 * item.n / nMedian) * weight[item.status] * item.sensitivity,
})).sort((a, b) => b.score - a.score);

export function createStudio({ icon, esc, fmt, btn, head, badge, show, render, persist, openCount, inventoryKg, reviewState }) {
  let node = 'operations';
  let agent = -1;
  let agentTimer;
  let pathYear = '2025';
  let scenario = 'net_zero_2050';
  let scope = 'flag';
  const actions = new Set(['L08', 'L09']);
  let riskView = 'future';
  let crop = 'pea';
  let region = 'fi';
  let ssp = 'ssp245';
  let area = 600;
  let natureView = 'catchments';
  let selected = ranked[0].id;
  let origin = studioData.origins[0].origin_country;
  let question;
  let prompt = '';
  let answering = false;
  let answerTimer;
  let asked = false;
  let reviewTopic;

  const label = (text) => '<span class="panel-label">' + text + '</span>';
  const link = (text, id, style = 'secondary') => '<a class="button ' + style + '" href="#' + id + '">' + text + icon('ArrowUpRight', 15) + '</a>';
  const options = (id, items, value, title) => '<label class="field-select"><span>' + title + '</span><select id="' + id + '">' +
    items.map(([key, text]) => '<option value="' + key + '"' + (value === key ? ' selected' : '') + '>' + text + '</option>').join('') + '</select></label>';
  const tabs = (name, items, active) => '<div class="studio-tabs">' + items.map(([key, text]) =>
    '<button type="button" data-action="' + name + '" data-value="' + key + '" aria-pressed="' + (key === active) + '">' + text + '</button>').join('') + '</div>';
  const metric = (name, value, note = '') => '<div><span>' + name + '</span><strong>' + value + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
  const section = (name, desc, extra = '') => '<header class="section-heading"><div><h2>' + name + '</h2><p>' + desc + '</p></div>' + extra + '</header>';
  const source = (id) => btn(documents[id][0], 'studio-source', 'FileText', 'source-link', id);
  const panel = (title, desc, body, controls = '') => '<section class="surface studio-panel">' + section(title, desc, controls) + body + '</section>';

  function overview() {
    const active = graphNodes.find(([id]) => id === node);
    const contours = Array.from({ length: 10 }, (_, i) => {
      const y = 20 + i * 26;
      return '<path d="M-35 ' + y + ' C111 ' + (y - 70) + ' 201 ' + (y + 105) + ' 331 ' + (y + 13) +
        ' S550 ' + (y - 52) + ' 735 ' + (y + 23) + '"/>';
    }).join('');
    const network = '<section class="surface network"><header class="section-heading"><div><div class="panel-label"><i></i> RELATIONSHIP MAP</div><h2>Follow the value chain</h2><p>Select a node to see its evidence and next decision.</p></div>' +
      '<button class="icon-button" type="button" data-action="motion" aria-label="Pause relationship animation">' + icon('Pause', 17) + '</button></header>' +
      '<div class="network-stage"><svg id="network-flow" viewBox="0 0 700 286" preserveAspectRatio="none" aria-hidden="true">' +
      '<g class="network-contours">' + contours + '</g><g class="network-paths">' +
      graphLinks.map((path, i) => '<path class="' + (i === 4 ? 'secondary-path' : '') + '" d="' + path + '"/>').join('') + '</g>' +
      graphLinks.slice(0, 4).map((path, i) => '<circle class="network-runner" r="3.5"><animateMotion dur="' + (3.2 + i * .55) +
        's" begin="' + i * .42 + 's" repeatCount="indefinite" path="' + path + '"/></circle>').join('') + '</svg>' +
      graphNodes.map(([id, name, glyph, x, y]) => '<button type="button" class="network-node" data-action="studio-node" data-value="' + id +
        '" aria-pressed="' + (node === id) + '" style="--x:' + x + '%;--y:' + y + '%"><span>' + icon(glyph, 18) + '</span><strong>' + name + '</strong></button>').join('') +
      '</div><div class="network-detail"><div><strong>' + active[1] + '</strong><p>' + active[5] + '</p><small>' + active[6] +
      '</small></div>' + link('Open workstream', active[7], 'quiet') + '</div></section>';
    return '<section class="studio-intro"><div>' + label('CLIMATE & NATURE NAVIGATOR') +
      '<h1>Climate decision studio</h1><p>Trace the footprint, compare the futures and decide what needs review.</p></div>' +
      '<div class="intro-actions">' + link('Ask copilot', 'copilot', 'primary') + '</div></section>' +
      '<div class="studio-overview-grid">' + network +
      '<div class="overview-aside"><section class="surface agent-panel" id="agent-panel">' + agentPanel() + '</section>' +
      '<section class="surface focus-panel">' + section('Review next', 'Start with records and decisions that need evidence.') +
      '<a href="#checks"><span class="mini-icon">' + icon('ClipboardList', 17) + '</span><span><strong>' + openCount() +
      ' source flags</strong><small>2025 synthetic raw feeds</small></span>' + icon('ChevronRight', 15) + '</a>' +
      '<a href="#inventory"><span class="mini-icon">' + icon('FileCheck2', 17) + '</span><span><strong>' + fmt(inventoryKg() / 1000, 2) +
      ' t CO₂e</strong><small>Inbound freight · working estimate</small></span>' + icon('ChevronRight', 15) + '</a></section></div></div>' +
      '<div class="workstream-heading"><h2>Workstreams</h2><span>Five challenge tracks</span></div><div class="track-grid">' +
      tracks.map(({ page, code, name, icon: glyph, detail, meta }) => '<a class="track-tile" href="#' + page + '"><span class="track-top"><i>' +
        icon(glyph, 19) + '</i><small>TRACK ' + code + '</small></span><strong>' + name + '</strong><p>' + detail +
        '</p><span class="track-bottom">' + meta + icon('ArrowUpRight', 16) + '</span></a>').join('') + '</div>';
  }

  function agentPanel() {
    const running = agent >= 0 && agent < stepNames.length;
    return section('Data agent', 'Simulated collection and validation run.', badge(running ? 'Running' : agent === 4 ? 'Ready' : 'Demo', running ? 'input' : 'review')) +
      '<ol class="agent-steps">' + stepNames.map((name, index) => '<li class="' + (agent > index ? 'complete' : agent === index ? 'active' : '') +
        '"><i>' + (agent > index ? icon('Check', 12) : '0' + (index + 1)) + '</i><span>' + name + '</span>' +
        (agent === index ? '<small>Working</small>' : agent > index ? '<small>Done</small>' : '') + '</li>').join('') + '</ol>' +
      '<div class="agent-footer">' + (running ? '<span role="status">Simulating agent steps…</span>' :
        btn(agent === 4 ? 'Replay agent run' : 'Simulate agent run', 'studio-agent', 'Play', 'secondary')) +
      (agent === 4 ? '<a href="#checks" class="agent-result">Open ' + openCount() + ' source flags ' + icon('ArrowRight', 14) + '</a>' : '') + '</div>' +
      (agent === 4 ? '<p class="agent-recommendation">Suggested next step · Logistics verifies the flagged sea legs before inventory close.</p>' : '');
  }

  function inventoryPreview() {
    const scopes = [
      ['Scope 1', 'Owned operations', 5160, 'Fuel combustion, fuel stock changes and refrigerant top-ups'],
      ['Scope 2', 'Purchased electricity & heat', 280, 'Market-based example with certificates and supplier factors'],
      ['Scope 3', 'Value chain', 206400, 'Purchased goods, farm footprints, freight and downstream categories'],
    ];
    return head('2025 emissions inventory', 'Preview a consolidated inventory and drill into the part calculated from package records.', badge('A2 · mixed preview')) +
      '<div class="studio-two">' + panel('Group inventory preview', 'Simulated figures for testing the reporting workflow.', '<div class="studio-metrics">' +
      scopes.map(([name, detail, amount]) => metric(name, fmt(amount) + ' t', detail)).join('') + '</div><div class="stack-detail">' +
      scopes.map(([name, , , detail]) => '<p><strong>' + name + '</strong> · ' + detail + '.</p>').join('') +
      '<p>Organisational boundary · continuing operations, with Foodhills included from December 2025 in the package methodology.</p>' +
      source('accounting') + source('boundary') + '</div>') +
      panel('Audited calculation', 'Derived from 2025 shipment records and transport factors.', '<div class="studio-metrics vertical">' +
      metric('Scope 3 · Category 4', fmt(inventoryKg() / 1000, 2) + ' t', 'Working inbound freight estimate') + '</div><div class="stack-detail">' +
      '<p>Track the original rows, apply approved additions, and export the evidence behind each number.</p>' +
      link('Open freight audit', 'inventory', 'primary') + '</div>') + '</div>';
  }

  function plot(series, xlabels, unit) {
    const all = series.flatMap((row) => row.values);
    const min = Math.min(...all) * .92;
    const max = Math.max(...all) * 1.05;
    const span = max - min || 1;
    const points = (values) => values.map((v, i) => [54 + i * 487 / (values.length - 1), 143 - (v - min) * 116 / span]);
    return '<div class="studio-plot"><svg viewBox="0 0 572 174" aria-hidden="true">' +
      [0, 1, 2, 3].map((i) => '<path class="plot-grid" d="M54 ' + (28 + i * 38) + ' H541"/><text x="47" y="' +
        (31 + i * 38) + '" text-anchor="end">' + fmt(max - i * span / 3, 1) + '</text>').join('') +
      series.map((row, j) => '<polyline class="plot-line line-' + j + '" pathLength="1" points="' +
        points(row.values).map((p) => p.join(',')).join(' ') + '"/>' +
        points(row.values).map(([x, y]) => '<circle class="plot-dot line-' + j + '" cx="' + x + '" cy="' + y + '" r="3"/>').join('')).join('') +
      xlabels.map((text, i) => '<text x="' + points(series[0].values)[i][0] + '" y="167" text-anchor="middle">' + text + '</text>').join('') +
      '</svg><div class="plot-legend">' + series.map((row, i) => '<span><i class="line-' + i + '"></i>' + row.name + '</span>').join('') +
      '<span class="plot-unit">' + unit + '</span></div><details><summary>View chart values</summary><div class="chart-table"><table><thead><tr><th>Series</th>' +
      xlabels.map((text) => '<th>' + text + '</th>').join('') + '</tr></thead><tbody>' +
      series.map((row) => '<tr><th>' + row.name + '</th>' + row.values.map((value) => '<td>' + fmt(value, 2) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div></details></div>';
  }

  function pathways() {
    const isLatest = pathYear === '2025';
    const definitions = {
      operations: ['Scopes 1 + 2', isLatest ? 5.2 : 7.4, 0.042],
      value: ['Scope 3 non-FLAG', isLatest ? 86.4 : 91.8, 0.025],
      flag: ['FLAG land emissions', isLatest ? 119.1 : 125.2, 0.0303],
    };
    const [name, basis, target] = definitions[scope];
    const years = [2025, 2027, 2030, 2035];
    const orderly = scenario === 'net_zero_2050';
    const plan = studioData.levers.filter((row) => actions.has(row.lever_id));
    const abatement = plan.reduce((sum, row) => sum + Number(row.abatement_tco2e_2030_design), 0);
    const cost = plan.reduce((sum, row) => sum + Number(row.opex_delta_eur_per_yr), 0);
    const price = studioData.transition.find((row) => row.scenario === scenario && row.year === '2030');
    const impact = plan.filter((row) => scope === 'flag' ? row.flag === 'True' : scope === 'value' && row.flag !== 'True')
      .reduce((sum, row) => sum + Number(row.abatement_tco2e_2030_design), 0) / 1000;
    const targetLine = years.map((year) => basis * (1 - (year - Number(pathYear)) * target));
    const modelLine = years.map((year) => basis * (1 - (year - 2025) * (orderly ? .018 : .007)) - impact * Math.min((year - 2025) / 5, 1));
    return head('Reduction pathways', 'Compare a recalculated base year, two transition scenarios and a portfolio of actions.', badge('Track B · simulation')) +
      '<div class="studio-controls">' + options('studio-base', [['2025', '2025 · Foodhills boundary'], ['2019', '2019 · recalculated']], pathYear, 'Base year') +
      options('studio-transition', [['net_zero_2050', 'Orderly transition'], ['delayed_transition', 'Delayed transition']], scenario, 'Transition scenario') +
      options('studio-scope', Object.entries(definitions).map(([key, item]) => [key, item[0]]), scope, 'Emissions boundary') + '</div>' +
      '<div class="studio-two">' + panel('B1 · Target pathway', name + ' · Illustrative baseline and projections', plot([
        { name: 'Modelled pathway', values: modelLine }, { name: 'Target line', values: targetLine },
      ], years, 'kt CO₂e')) +
      panel('Baseline assumptions', 'Keep boundary changes separate from reductions.', '<div class="stack-detail">' +
        '<p><strong>' + fmt(basis, 1) + ' kt CO₂e</strong> · simulated base-year value</p><p><strong>' + fmt(target * 100, 2) +
        '% / year</strong> · target-rate assumption from the challenge rubric</p><p><strong>€' + price.carbon_price_eur_t +
        ' / t</strong> · illustrative 2030 carbon price</p><p>' +
        (isLatest ? 'Foodhills operations enter from December 2025. The full-year target baseline needs review.' :
          'Recalculate the continuing business after the grain-trade divestment before comparing years.') + '</p>' +
        '<p>The 2026 Pudasjärvi and 2027 Kantvik changes are future boundary events. The preview holds them separate from the action total.</p>' +
        source('boundary') + source('targets') + '</div>') + '</div>' +
      panel('B2 · Action portfolio', 'Toggle catalogue levers to see indicative annual costs and abatement.', '<div class="studio-metrics">' +
        metric('2030 design abatement', fmt(abatement) + ' t', 'Selected catalogue levers') +
        metric('Annual operating change', (cost < 0 ? '−' : '') + '€' + fmt(Math.abs(cost))) +
        metric('Selected actions', String(plan.length), 'Review for overlap before implementation') + '</div><div class="lever-list">' +
        studioData.levers.map((row) => '<label class="lever-row"><input type="checkbox" data-lever="' + row.lever_id + '"' +
          (actions.has(row.lever_id) ? ' checked' : '') + '><span><strong>' + esc(row.name) + '</strong><small>' + row.lever_id + ' · Starts ' +
          row.earliest_start + ' · ' + row.confidence + ' confidence · ' + esc(row.trade_offs || 'Confirm implementation constraints') + '</small></span>' +
          '<span class="lever-value"><strong>' + fmt(Number(row.abatement_tco2e_2030_design)) + ' t</strong><small>' +
          (row.indicative_cost_eur_per_tco2e ? '€' + fmt(Number(row.indicative_cost_eur_per_tco2e)) + '/t' : 'Measurement only') +
          '</small></span></label>').join('') + '</div><div class="cost-chart"><strong>Indicative marginal cost</strong><span>€ per tonne avoided · selected levers</span>' +
          plan.filter((row) => row.indicative_cost_eur_per_tco2e).sort((a, b) => Number(a.indicative_cost_eur_per_tco2e) - Number(b.indicative_cost_eur_per_tco2e))
            .map((row) => {
              const value = Number(row.indicative_cost_eur_per_tco2e);
              return '<div><span>' + row.lever_id + '</span><i class="' + (value < 0 ? 'savings' : '') + '" style="--bar:' +
                Math.min(100, Math.abs(value) / 205 * 100) + '%"></i><strong>' + (value < 0 ? '−€' : '€') + fmt(Math.abs(value)) + '/t</strong></div>';
            }).join('') +
          '</div><p class="panel-note">Catalogue design estimates are illustrative. L27 improves measurement and contributes 0 t of abatement.</p>');
  }

  function risk() {
    const baseline = (crop === 'pea' ? 3.18 : crop === 'potato' ? 29.4 : 34.2) * (region === 'se' ? .91 : 1);
    const seasonal = riskView === 'season';
    const stress = { ssp126: 0.04, ssp245: 0.09, ssp585: 0.16 }[ssp] * (region === 'se' ? 1.37 : 1) * (crop === 'pea' ? 1 : .71);
    const mean = baseline * (1 - stress);
    const bad = Math.min(.75, .08 + stress * 1.55);
    const [price, premium] = studioData.prices[region === 'se' && crop === 'pea' ? 'pea_SE' : crop];
    const shortfall = baseline * stress * area;
    const cost = shortfall * price * premium;
    const years = seasonal ? ['2027', '2028', '2029', '2030', '2031'] : ['2041', '2045', '2050', '2055', '2060'];
    const projected = seasonal ? [1.015, .948, .984, .914, .971].map((scale) => baseline * scale)
      : [.98, 1.024, .967, 1.011, 1.018].map((scale) => mean * scale);
    return head('Crop & sourcing risk', 'Explore how weather assumptions translate into yield and replacement cost.', badge('Track C · simulation')) +
      tabs('studio-risk-view', [['future', '2041–2060 climate risk'], ['season', '2027–2031 seasonal outlook']], riskView) +
      '<div class="studio-controls">' + options('studio-region', [['fi', 'Southwest Finland'], ['se', 'Southern Sweden']], region, 'Sourcing region') +
      options('studio-crop', [['pea', 'Peas'], ['potato', 'Potatoes'], ['carrot', 'Carrots']], crop, 'Crop') +
      (seasonal ? '<div class="field-select"><span>Weather scenario</span><strong>SSP2–4.5 · fixed in C1</strong></div>'
        : options('studio-ssp', [['ssp126', 'SSP1–2.6 · lower warming'], ['ssp245', 'SSP2–4.5 · middle'], ['ssp585', 'SSP5–8.5 · higher warming']], ssp, 'Physical scenario')) + '</div>' +
      '<div class="studio-two">' + panel(seasonal ? 'C1 · Seasonal yield outlook' : 'C2 · Long-term yield risk', 'Simulated forecast · the 1991–2020 baseline is illustrative.',
        plot([{ name: 'Model preview', values: projected }, { name: 'Historical baseline', values: years.map(() => baseline) }], years, 't / ha')) +
      panel(seasonal ? 'Seasonal estimates' : 'Risk summary', seasonal ? 'Five illustrated seasons under one weather scenario.' : 'Mean change and the chance of a poor harvest.', '<div class="studio-metrics vertical">' +
        (seasonal ? metric('Lowest modelled season', fmt(Math.min(...projected), 2) + ' t/ha', '2030 · simulated fixture') :
          metric('Mean yield change', '−' + fmt(stress * 100, 1) + '%', 'Against the illustrated baseline') +
          metric('Poor harvest probability', fmt(bad * 100, 1) + '%', 'Yield below 80% of baseline')) +
        '</div><p class="panel-note">Model preview only. A real forecast would fit the historical yield and weather files, then backtest by crop and region.</p>') + '</div>' +
      (seasonal ? panel('Parcel-year forecast preview', 'Illustrative rows for the C1 submission workflow.', '<div class="studio-plot"><div class="chart-table"><table><thead><tr><th>Parcel</th>' +
        years.map((year) => '<th>' + year + ' · t/ha</th>').join('') + '</tr></thead><tbody>' +
        [1.02, .96, 1.04].map((offset, index) => '<tr><th>' + region.toUpperCase() + '-DEMO-' + (index + 1) + '</th>' +
          projected.map((value) => '<td>' + fmt(value * offset, 2) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div></div>') : panel('C3 · Replacement exposure', 'Turn a modelled yield loss into an incremental import cost.', '<div class="studio-controls compact">' +
        '<label class="field-select"><span>Contract area (ha)</span><input id="studio-area" type="number" min="1" max="100000" step="1" value="' + area + '"></label>' +
        '</div><div class="studio-metrics" id="studio-risk-metrics">' + metric('Modelled shortfall', fmt(shortfall) + ' t') +
        metric('Incremental replacement cost', '€' + fmt(cost)) + metric('Contract price × import premium', '€' + fmt(price) + ' × ' + fmt(premium * 100) + '%') +
        '</div><p class="panel-note">Price and premium come from the synthetic 2025 contract-price file. Procurement can test regional diversification or irrigation as follow-up options.</p>'));
  }

  function nature() {
    const item = ranked.find((row) => row.id === selected);
    const originRow = studioData.origins.find((row) => row.origin_country === origin);
    const tabsHtml = tabs('studio-nature-view', [['catchments', 'Catchment priorities'], ['imports', 'Import screening']], natureView);
    const heading = head('Nature hotspots', 'Connect sourcing to local water pressure and review the evidence behind each priority.', badge('Track D · synthetic data'));
    if (natureView === 'imports') {
      return heading + tabsHtml + '<div class="studio-two">' +
        panel('D2 · Import origins', 'Indicative categories from the challenge package.', '<div class="rank-list">' +
          studioData.origins.map((row) => '<button type="button" data-action="studio-origin" data-value="' + esc(row.origin_country) +
            '" aria-pressed="' + (row.origin_country === origin) + '"><strong>' + esc(row.origin_country) + '</strong><span>' +
            esc(row.commodity) + '</span>' + icon('ChevronRight', 15) + '</button>').join('') + '</div>') +
        panel(originRow.origin_country + ' · ' + esc(originRow.commodity), 'Sourcing materiality screen', '<div class="stack-detail">' +
          '<p>Water stress category <strong>' + esc(originRow.baseline_water_stress_cat_indicative) + ' / 4</strong></p><p>Conversion risk <strong>' +
          esc(originRow.deforestation_conversion_risk_indicative) + '</strong></p><p>Biodiversity sensitivity <strong>' +
          esc(originRow.biodiversity_sensitivity_indicative) + '</strong></p><p>Freshwater nutrient status <strong>' +
          esc(originRow.freshwater_nutrient_status_indicative) + '</strong></p><p>Procurement can confirm farm locations and licensed risk layers.</p>' +
          '<p class="muted">Source · origin_state_of_nature_indicative.csv</p></div>') + '</div>';
    }
    const pts = Object.values(studioData.shapes).flat();
    const minX = Math.min(...pts.map((p) => p[0]));
    const maxX = Math.max(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1]));
    const maxY = Math.max(...pts.map((p) => p[1]));
    const mapScale = Math.min(436 / ((maxX - minX) * .54), 304 / (maxY - minY));
    const x = (lon) => 46 + (lon - minX) * mapScale * .54;
    const y = (lat) => 39 + (maxY - lat) * mapScale;
    const map = '<div class="catchment-map"><svg viewBox="0 0 526 390" aria-hidden="true"><defs><pattern id="nature-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 28V0H28"/></pattern></defs>' +
      '<rect width="100%" height="100%" fill="url(#nature-grid)"/>' +
      Object.entries(studioData.shapes).map(([id, points]) => '<polygon points="' + points.map(([lon, lat]) => x(lon).toFixed(1) + ',' + y(lat).toFixed(1)).join(' ') +
        '" class="' + (id === selected ? 'selected' : ranked.some((row) => row.id === id) ? 'ranked' : '') + '" ' +
        (ranked.some((row) => row.id === id) ? 'data-action="studio-catchment" data-value="' + id + '"' : '') + '/>').join('') +
      '<text x="42" y="375">SOUTHERN SWEDEN</text><text x="340" y="21">SOUTHWEST FINLAND</text></svg><small>Six public dev catchments ranked · other shapes are context</small></div>';
    return heading + tabsHtml + '<div class="studio-two">' + panel('D1 · Pressure × state', 'Synthetic catchment geometries and public development loads.', map) +
      panel('Priority list', 'Select a catchment to inspect its score.', '<div class="rank-list">' +
        ranked.map((row, i) => '<button type="button" data-action="studio-catchment" data-value="' + row.id + '" aria-pressed="' +
          (row.id === selected) + '"><strong>' + (i + 1) + '</strong><span>' + row.id + ' · ' + row.status + '</span><strong>' +
          fmt(row.score, 2) + '</strong></button>').join('') + '</div>') + '</div>' +
      panel('Evidence · ' + item.id, 'Rank ' + (ranked.indexOf(item) + 1) + ' of six public dev rows. Apetit-contract loads only.',
        '<div class="studio-metrics">' + metric('Phosphorus', fmt(item.p, 2) + ' kg') + metric('Nitrogen', fmt(item.n, 2) + ' kg') +
        metric('Priority score', fmt(item.score, 2), 'State multiplier ' + weight[item.status] + ' · sensitivity ' + item.sensitivity) +
        '</div><div class="stack-detail"><p>(P ÷ ' + fmt(pMedian, 2) + ' + 0.5 × N ÷ ' + fmt(nMedian, 2) +
        ') × ecological-state weight × P sensitivity. Medians are from the six development rows shown.</p>' + source('nature') + '</div>');
  }

  function copilot() {
    return head('Evidence copilot', 'Ask a question, read the sources and review the answer before reusing it.', badge('Track E · simulated retrieval')) +
      '<div class="studio-two copilot-grid">' + panel('Ask the workspace', 'Try a challenge topic or one of these prompts.', '<div class="prompt-list">' +
      questions.map(([id, text]) => btn(text, 'studio-question', 'ArrowUpRight', 'secondary', id)).join('') +
      '</div><form id="studio-ask-form" class="ask-form"><label for="studio-prompt">Your question</label><div><input id="studio-prompt" name="prompt" value="' +
      esc(prompt) + '" placeholder="Ask about freight, FLAG or catchments" maxlength="180" required><button class="button primary" type="submit">Ask ' + icon('Send', 16) +
      '</button></div></form>') + panel('Evidence-backed answer', 'Responses are curated from the local challenge documents.',
      answering ? '<div class="answer-body"><p role="status">Finding a relevant source…</p><div class="answer-skeleton"><i></i><i></i><i></i></div></div>'
        : !question ? '<div class="answer-body empty-answer"><span class="mini-icon">' + icon('Sparkles', 22) + '</span><strong>' +
          (asked ? 'No matching demo topic' : 'Choose a question') + '</strong><p>' + (asked ? 'Try freight, FLAG, Foodhills, catchments or ESRS E4.' : 'The answer, citation and review controls will appear here.') + '</p></div>'
          : '<article class="answer-body"><div class="answer-status">' + badge(reviewState[question[0]] ? 'Reviewed in demo' : 'Needs expert review',
            reviewState[question[0]] ? 'done' : 'input') + '</div><h3>' + question[1] + '</h3><p>' + question[3] + '</p><div class="answer-cites"><strong>Retrieved source</strong>' +
            source(question[2]) + '</div><details><summary>How this answer was assembled</summary><p>The demo matches the question to a local framework or methodology topic, selects the cited section, then uses a curated answer. It does not call a language model.</p></details>' +
            '<div class="answer-actions">' + link(question[4], question[5], 'quiet') +
            (reviewState[question[0]] ? '<p class="panel-note">' + esc(reviewState[question[0]].note) + '</p>' : btn('Record expert review', 'studio-review', 'Check', 'secondary')) +
            '</div></article>') + '</div><section class="surface framework-shelf">' + section('Framework shelf', 'Open a source to see the referenced section.') +
            '<div>' + Object.keys(documents).map(source).join('') + '</div></section>';
  }

  function refocus(action, value) {
    render();
    document.querySelector('button[data-action="' + action + '"][data-value="' + value + '"]')?.focus({ preventScroll: true });
  }
  function ask(topic, text) {
    clearTimeout(answerTimer);
    prompt = text;
    asked = true;
    answering = true;
    render();
    answerTimer = setTimeout(() => {
      question = topic;
      answering = false;
      if (location.hash === '#copilot') {
        render();
        document.querySelector('#studio-prompt')?.focus({ preventScroll: true });
      }
    }, 340);
  }

  function handle(action, value) {
    switch (action) {
      case 'studio-node': node = value; refocus(action, value); return true;
      case 'studio-risk-view': riskView = value; refocus(action, value); return true;
      case 'studio-nature-view': natureView = value; refocus(action, value); return true;
      case 'studio-origin': origin = value; refocus(action, value); return true;
      case 'studio-catchment': selected = value; refocus(action, value); return true;
      case 'studio-agent': {
        clearInterval(agentTimer);
        agent = 0;
        const refresh = () => {
          const card = document.querySelector('#agent-panel');
          if (card) card.innerHTML = agentPanel();
        };
        refresh();
        agentTimer = setInterval(() => {
          agent++;
          refresh();
          if (agent >= stepNames.length) clearInterval(agentTimer);
        }, 640);
        return true;
      }
      case 'studio-question': {
        const topic = questions.find(([id]) => id === value);
        ask(topic, topic[1]);
        return true;
      }
      case 'studio-source': {
        const doc = documents[value];
        show(doc[0], 'Local challenge source', '<p class="drawer-description">' + esc(doc[2]) +
          '</p><div class="next-box"><strong>Source location</strong><p>' + esc(doc[1]) + '</p></div><p class="panel-note">Source summary for this UI preview.</p>');
        return true;
      }
      case 'studio-review':
        reviewTopic = question;
        show('Review the answer', 'Evidence copilot · simulated reviewer', '<p class="drawer-description">' + esc(question[1]) +
          '</p><form id="studio-review-form"><label for="studio-review-note">Review note</label><textarea name="note" id="studio-review-note" rows="3" maxlength="280" required></textarea>' +
          '<label class="checkbox"><input type="checkbox" required> I checked the cited source and assumptions.</label><div class="drawer-actions"><button class="button primary" type="submit">Save review</button></div></form>');
        return true;
      default: return false;
    }
  }
  function change(target) {
    const values = {
      'studio-base': (value) => { pathYear = value; }, 'studio-transition': (value) => { scenario = value; },
      'studio-scope': (value) => { scope = value; }, 'studio-region': (value) => { region = value; },
      'studio-crop': (value) => { crop = value; }, 'studio-ssp': (value) => { ssp = value; },
      'studio-area': (value) => { area = Math.max(1, Math.min(100000, Number(value) || 600)); },
    };
    if (values[target.id]) {
      values[target.id](target.value);
      render();
      document.getElementById(target.id)?.focus({ preventScroll: true });
      return true;
    }
    if (target.dataset.lever) {
      const id = target.dataset.lever;
      if (target.checked) actions.add(id);
      else actions.delete(id);
      render();
      document.querySelector('[data-lever="' + id + '"]')?.focus({ preventScroll: true });
      return true;
    }
    return false;
  }
  function submit(form) {
    if (form.id === 'studio-ask-form') {
      const text = new FormData(form).get('prompt').trim();
      if (!text) return true;
      const words = text.toLowerCase();
      const key = /foodhills|acquisition|boundary/.test(words) ? 'boundary' : /\bflag\b|organic soil/.test(words) ? 'flag'
        : /catchment|nutrient|phosphorus|sbtn/.test(words) ? 'nature' : /esrs|csrd|disclosure/.test(words) ? 'csrd'
          : /freight|shipment|transport|sea leg/.test(words) ? 'freight' : '';
      ask(questions.find(([id]) => id === key), text);
      return true;
    }
    if (form.id === 'studio-review-form') {
      const note = new FormData(form).get('note').trim();
      if (!note || !reviewTopic) return true;
      reviewState[reviewTopic[0]] = { note, at: new Date().toISOString() };
      persist();
      render();
      document.querySelector('#drawer').close();
      return true;
    }
    return false;
  }
  return { overview, inventoryPreview, pathways, risk, nature, copilot, handle, change, submit };
}

