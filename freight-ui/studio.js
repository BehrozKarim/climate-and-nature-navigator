import { studioData } from './freight.js';

export const tracks = [
  { page: 'checks', code: 'A', name: 'Data & inventory', icon: 'Database', detail: 'Check source files and close the emissions inventory.', meta: 'A1 · A2' },
  { page: 'pathways', code: 'B', name: 'Reduction pathways', icon: 'GitBranch', detail: 'Compare targets, actions and cost.', meta: 'B1 · B2' },
  { page: 'risk', code: 'C', name: 'Crop & sourcing risk', icon: 'Sprout', detail: 'Explore yield and supply exposure.', meta: 'C1 · C2 · C3' },
  { page: 'nature', code: 'D', name: 'Nature hotspots', icon: 'Map', detail: 'Prioritise catchments and import origins.', meta: 'D1 · D2' },
  { page: 'copilot', code: 'E', name: 'Evidence copilot', icon: 'Sparkles', detail: 'Ask a question and inspect its sources.', meta: 'E' },
];

const documents = {
  accounting: ['GHG Protocol · accounting', 'framework_digest.md · Accounting: GHG Protocol; METHODOLOGY.md §4', 'The challenge uses a well-to-wheel tonne-kilometre method for inbound freight. A missing transport leg affects inventory coverage.'],
  sea: ['Shipment records and transport factors', 'shipments.csv · EF-TKM-SHIP-BULK and EF-TKM-SHIP-REEFER; emission_factor_library.csv · v2025', 'Sum tonne-km × factor for recorded bulk and refrigerated ship legs, then add approved ship corrections. Ferries appear as a separate mode.'],
  targets: ['SBTi · climate targets and FLAG', 'framework_digest.md · Climate targets: SBTi; SCENARIOS_AND_RISK.md · Track B', 'The challenge separates land-related emissions from the other Scope 3 emissions. Scope 1 and 2, Scope 3 non-FLAG and FLAG use distinct annual reduction assumptions in the rubric.'],
  boundary: ['Structural changes · Foodhills', 'METHODOLOGY.md §1; structural_events.csv · Foodhills', 'The synthetic 2025 inventory includes Bjuv operations from December. Swedish pea growers are outside the 2025 inventory and enter from 2026. A comparable target baseline needs an explicit boundary choice.'],
  nature: ['SBTN · pressure and state', 'NATURE_SBTN.md · D1 priority formula', 'The scoring method combines phosphorus and nitrogen relative to sample medians, then weights for ecological state and phosphorus sensitivity.'],
  csrd: ['CSRD and ESRS · reporting context', 'framework_digest.md · Nature: SBTN, TNFD, ESRS', 'The package digest connects nature-related dependencies and impacts to ESRS E4. Applicability and disclosure obligations need a separately verified assessment.'],
};
const questions = [
  ['sea', 'What did inbound ship freight emit in 2025?', 'sea', '', 'Open freight audit', 'inventory'],
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

export function createStudio({ icon, esc, fmt, btn, head, badge, show, render, persist, openCount, inventoryKg, nextFreight, seaEvidence, reviewState }) {
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

  const link = (text, id, style = 'secondary') => '<a class="button ' + style + '" href="#' + id + '">' + text + icon('ArrowUpRight', 15) + '</a>';
  const options = (id, items, value, title) => '<label class="field-select"><span>' + title + '</span><select id="' + id + '">' +
    items.map(([key, text]) => '<option value="' + key + '"' + (value === key ? ' selected' : '') + '>' + text + '</option>').join('') + '</select></label>';
  const tabs = (name, items, active) => '<div class="studio-tabs">' + items.map(([key, text]) =>
    '<button type="button" data-action="' + name + '" data-value="' + key + '" aria-pressed="' + (key === active) + '">' + text + '</button>').join('') + '</div>';
  const metric = (name, value, note = '') => '<div><span>' + name + '</span><strong>' + value + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
  const section = (name, desc, extra = '') => '<header class="section-heading"><div><h2>' + name + '</h2>' + (desc ? '<p>' + desc + '</p>' : '') + '</div>' + extra + '</header>';
  const source = (id) => btn(documents[id][0], 'studio-source', 'FileText', 'source-link', id);
  const panel = (title, desc, body, controls = '') => '<section class="surface studio-panel">' + section(title, desc, controls) + body + '</section>';

  function overview() {
    const next = nextFreight();
    const top = ranked[0];
    return '<header class="desk-heading"><div><p class="context-label">2025 review workspace</p><h1>Review desk</h1></div>' +
      link('Ask about the data', 'copilot', 'secondary') + '</header>' +
      '<section class="desk-next"><div class="next-content"><span class="context-label">' + icon('CircleAlert', 14) +
      ' ' + (next ? 'Next review' : 'Review status') + '</span><h2>' +
      (next ? 'Check a missing sea leg' : 'Freight review is up to date') + '</h2><p>' +
      (next ? esc(next.subject) + ' · Logistics' : 'Open the queue to see the remaining data checks.') + '</p>' +
      (next ? btn('Review shipment', 'item', 'ArrowRight', 'primary', next.id) : link('Open data checks', 'checks', 'primary')) +
      '</div><div class="next-number"><strong>' + (next ? '+' + fmt(next.kg / 1000, 2) : fmt(openCount())) +
      '</strong><span>' + (next ? 't CO₂e if added' : 'open flags') + '</span>' +
      (next ? '<small>Estimated coverage change</small>' : '') + '</div></section>' +
      '<div class="desk-grid"><section class="surface desk-list">' + section('Open work', '') +
      '<a href="#checks"><span class="mini-icon">' + icon('ClipboardList', 18) + '</span><span><strong>Check source records</strong><small>Data quality</small></span><b>' +
      openCount() + ' flags</b>' + icon('ChevronRight', 16) + '</a>' +
      '<a href="#nature"><span class="mini-icon">' + icon('Map', 18) + '</span><span><strong>Investigate nutrient pressure</strong><small>Nature</small></span><b>' +
      top.id + ' first</b>' + icon('ChevronRight', 16) + '</a>' +
      '<a href="#pathways"><span class="mini-icon">' + icon('GitBranch', 18) + '</span><span><strong>Compare reduction options</strong><small>Pathways</small></span><b>2030</b>' +
      icon('ChevronRight', 16) + '</a></section>' +
      '<section class="surface desk-summary">' + section('Inbound freight', '', badge('Working estimate')) +
      '<div class="desk-total"><strong>' + fmt(inventoryKg() / 1000, 2) + '</strong><span>t CO₂e</span></div>' +
      '<p class="desk-caption">Scope 3 · Category 4</p><a class="inline-link" href="#inventory">Open freight audit ' + icon('ArrowRight', 16) +
      '</a></section></div><section class="surface agent-panel" id="agent-panel">' + agentPanel() + '</section>';
  }

  function agentPanel() {
    const running = agent >= 0 && agent < stepNames.length;
    const complete = agent === stepNames.length;
    return '<div class="agent-bar"><span class="mini-icon">' + icon('Database', 17) +
      '</span><div><h2>Source checks</h2><p>' + (running ? stepNames[agent] + '…' : complete
        ? 'Run complete · ' + openCount() + ' flags to review' : 'Simulated run') +
      '</p></div>' + (running ? '<span role="status" class="agent-count">' + (agent + 1) + ' / ' + stepNames.length + '</span>'
        : complete ? '<div class="agent-actions">' + btn('Run again', 'studio-agent', 'Play', 'quiet') +
          link('Open flags', 'checks') + '</div>' : btn('Run checks', 'studio-agent', 'Play', 'secondary')) + '</div>' +
      (agent >= 0 ? '<div class="agent-progress" aria-hidden="true">' + stepNames.map((name, i) =>
        '<i class="' + (agent > i ? 'complete' : agent === i ? 'active' : '') + '"></i>').join('') + '</div>' : '') +
      (complete ? '<details class="compact-details"><summary>Run log</summary><ol class="agent-steps">' + stepNames.map((name) =>
        '<li class="complete"><i>' + icon('Check', 12) + '</i><span>' + name + '</span></li>').join('') + '</ol></details>' : '');
  }

  function inventoryPreview() {
    const scopes = [
      ['Scope 1', 'Owned operations', 5160, 'Fuel combustion, fuel stock changes and refrigerant top-ups'],
      ['Scope 2', 'Purchased electricity & heat', 280, 'Market-based example with certificates and supplier factors'],
      ['Scope 3', 'Value chain', 206400, 'Purchased goods, farm footprints, freight and downstream categories'],
    ];
    return head('2025 emissions inventory', '', badge('Simulated group estimate')) +
      '<div class="studio-two">' + panel('Group totals', 'Simulated figures', '<div class="studio-metrics">' +
      scopes.map(([name, detail, amount]) => metric(name, fmt(amount) + ' t', detail)).join('') + '</div><details class="compact-details"><summary>Scope and boundary</summary><div class="method-body">' +
      scopes.map(([name, , , detail]) => '<p><strong>' + name + '</strong> · ' + detail + '.</p>').join('') +
      '<p>Organisational boundary · continuing operations, with Foodhills included from December 2025 in the package methodology.</p>' +
      source('accounting') + source('boundary') + '</div></details>') +
      panel('Calculated from shipment records', '', '<div class="studio-metrics vertical">' +
      metric('Scope 3 · Category 4', fmt(inventoryKg() / 1000, 2) + ' t', 'Working inbound freight estimate') + '</div><div class="stack-detail">' +
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
    const leverNames = {
      L08: 'Low-carbon fertiliser', L09: 'Precision fertiliser application',
      L20: 'HVO for trucking', L21: 'Shift freight to ship or rail', L27: 'Improve supplier data',
    };
    const abatement = plan.reduce((sum, row) => sum + Number(row.abatement_tco2e_2030_design), 0);
    const cost = plan.reduce((sum, row) => sum + Number(row.opex_delta_eur_per_yr), 0);
    const price = studioData.transition.find((row) => row.scenario === scenario && row.year === '2030');
    const impact = plan.filter((row) => scope === 'flag' ? row.flag === 'True' : scope === 'value' && row.flag !== 'True')
      .reduce((sum, row) => sum + Number(row.abatement_tco2e_2030_design), 0) / 1000;
    const targetLine = years.map((year) => basis * (1 - (year - Number(pathYear)) * target));
    const modelLine = years.map((year) => basis * (1 - (year - 2025) * (orderly ? .018 : .007)) - impact * Math.min((year - 2025) / 5, 1));
    const gap = modelLine[2] - targetLine[2];
    return head('Reduction pathways', '', badge('Simulated')) +
      '<div class="studio-controls">' + options('studio-base', [['2025', '2025 · Foodhills boundary'], ['2019', '2019 · recalculated']], pathYear, 'Base year') +
      options('studio-transition', [['net_zero_2050', 'Orderly transition'], ['delayed_transition', 'Delayed transition']], scenario, 'Transition scenario') +
      options('studio-scope', Object.entries(definitions).map(([key, item]) => [key, item[0]]), scope, 'Emissions boundary') + '</div>' +
      '<div class="studio-two">' + panel('Emissions through 2035', name, plot([
        { name: 'Modelled pathway', values: modelLine }, { name: 'Target line', values: targetLine },
      ], years, 'kt CO₂e')) +
      panel('2030 target gap', '', '<div class="studio-metrics vertical">' +
        metric(gap >= 0 ? 'Above target' : 'Below target', fmt(Math.abs(gap), 2) + ' kt CO₂e') +
        '</div><details class="compact-details"><summary>Baseline and assumptions</summary><div class="method-body">' +
        '<p><strong>' + fmt(basis, 1) + ' kt CO₂e</strong> · simulated base-year value</p><p><strong>' + fmt(target * 100, 2) +
        '% / year</strong> · target-rate assumption from the challenge rubric</p><p><strong>€' + price.carbon_price_eur_t +
        ' / t</strong> · illustrative 2030 carbon price</p><p>' +
        (isLatest ? 'Foodhills operations enter from December 2025. The full-year target baseline needs review.' :
          'Recalculate the continuing business after the grain-trade divestment before comparing years.') + '</p>' +
        '<p>The 2026 Pudasjärvi and 2027 Kantvik changes are future boundary events. The preview holds them separate from the action total.</p>' +
        source('boundary') + source('targets') + '</div></details>') + '</div>' +
      panel('Choose actions', 'Illustrative 2030 catalogue estimates', '<div class="studio-metrics">' +
        metric('2030 design abatement', fmt(abatement) + ' t', 'Selected catalogue levers') +
        metric('Annual operating change', (cost < 0 ? '−' : '') + '€' + fmt(Math.abs(cost))) +
        metric('Selected actions', String(plan.length)) + '</div><div class="lever-list">' +
        studioData.levers.map((row) => '<label class="lever-row"><input type="checkbox" data-lever="' + row.lever_id + '"' +
          (actions.has(row.lever_id) ? ' checked' : '') + '><span><strong>' + esc(leverNames[row.lever_id] || row.name) + '</strong><small>' + row.lever_id +
          ' · ' + (row.lever_id === 'L27' ? 'Measurement only' : row.confidence + ' confidence') + '</small></span>' +
          '<span class="lever-value"><strong>' + fmt(Number(row.abatement_tco2e_2030_design)) + ' t</strong><small>' +
          (row.indicative_cost_eur_per_tco2e ? '€' + fmt(Number(row.indicative_cost_eur_per_tco2e)) + '/t' : 'Measurement only') +
          '</small></span></label>').join('') + '</div><details class="compact-details"><summary>Cost ranking and assumptions</summary><div class="method-body">' +
          '<p>Indicative euros per tonne avoided for selected levers. Check for overlapping effects before combining them.</p><div class="cost-chart">' +
          plan.filter((row) => row.indicative_cost_eur_per_tco2e).sort((a, b) => Number(a.indicative_cost_eur_per_tco2e) - Number(b.indicative_cost_eur_per_tco2e))
            .map((row) => {
              const value = Number(row.indicative_cost_eur_per_tco2e);
              return '<div><span>' + row.lever_id + '</span><i class="' + (value < 0 ? 'savings' : '') + '" style="--bar:' +
                Math.min(100, Math.abs(value) / 205 * 100) + '%"></i><strong>' + (value < 0 ? '−€' : '€') + fmt(Math.abs(value)) + '/t</strong></div>';
            }).join('') +
          '</div>' + plan.map((row) => '<p><strong>' + row.lever_id + '</strong> · ' + esc(row.name) + ' · Starts ' + row.earliest_start +
            (row.co_benefits ? ' · ' + esc(row.co_benefits) : '') + (row.trade_offs ? ' · ' + esc(row.trade_offs) : '') + '</p>').join('') +
          '<p>L27 improves measurement and contributes 0 t of abatement.</p></div></details>');
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
    return head('Crop & sourcing risk', '', badge('Simulated')) +
      tabs('studio-risk-view', [['future', '2041–2060 climate risk'], ['season', '2027–2031 seasonal outlook']], riskView) +
      '<div class="studio-controls">' + options('studio-region', [['fi', 'Southwest Finland'], ['se', 'Southern Sweden']], region, 'Sourcing region') +
      options('studio-crop', [['pea', 'Peas'], ['potato', 'Potatoes'], ['carrot', 'Carrots']], crop, 'Crop') +
      (seasonal ? '<div class="field-select"><span>Weather scenario</span><strong>SSP2–4.5 · selected weather series</strong></div>'
        : options('studio-ssp', [['ssp126', 'SSP1–2.6 · lower warming'], ['ssp245', 'SSP2–4.5 · middle'], ['ssp585', 'SSP5–8.5 · higher warming']], ssp, 'Physical scenario')) + '</div>' +
      '<div class="studio-two">' + panel(seasonal ? 'Seasonal yield outlook' : 'Long-term yield risk', 'Illustrative forecast and 1991–2020 baseline',
        plot([{ name: 'Model preview', values: projected }, { name: 'Historical baseline', values: years.map(() => baseline) }], years, 't / ha')) +
      panel(seasonal ? 'Lowest forecast' : 'Harvest risk', '', '<div class="studio-metrics vertical">' +
        (seasonal ? metric('Lowest modelled season', fmt(Math.min(...projected), 2) + ' t/ha', '2030 · simulated fixture') :
          metric('Mean yield change', '−' + fmt(stress * 100, 1) + '%', 'Against the illustrated baseline') +
          metric('Poor harvest probability', fmt(bad * 100, 1) + '%', 'Yield below 80% of baseline')) +
        '</div><details class="compact-details"><summary>Model assumptions</summary><div class="method-body"><p>Simulated values. A real forecast would fit the historical yield and weather files and backtest by crop and region.</p></div></details>') + '</div>' +
      (seasonal ? panel('Field forecast preview', 'Illustrative field-level yields', '<div class="studio-plot"><div class="chart-table"><table><thead><tr><th>Field</th>' +
        years.map((year) => '<th>' + year + ' · t/ha</th>').join('') + '</tr></thead><tbody>' +
        [1.02, .96, 1.04].map((offset, index) => '<tr><th>' + region.toUpperCase() + '-DEMO-' + (index + 1) + '</th>' +
          projected.map((value) => '<td>' + fmt(value * offset, 2) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div></div>') : panel('Replacement cost', '', '<div class="studio-controls compact">' +
        '<label class="field-select"><span>Contract area (ha)</span><input id="studio-area" type="number" min="1" max="100000" step="1" value="' + area + '"></label>' +
        '</div><div class="studio-metrics" id="studio-risk-metrics">' + metric('Incremental cost', '€' + fmt(cost)) +
        metric('Modelled shortfall', fmt(shortfall) + ' t') +
        '</div><details class="compact-details"><summary>Cost assumptions</summary><div class="method-body"><p>Shortfall × €' + fmt(price) + '/t contract price × ' +
        fmt(premium * 100) + '% import premium. Source · 2025 contract price table.</p><p>Procurement can compare regional sourcing or irrigation before choosing an adaptation plan.</p></div></details>'));
  }

  function nature() {
    const item = ranked.find((row) => row.id === selected);
    const originRow = studioData.origins.find((row) => row.origin_country === origin);
    const tabsHtml = tabs('studio-nature-view', [['catchments', 'Catchment priorities'], ['imports', 'Import screening']], natureView);
    const heading = head('Nature priorities', '', badge('2025 reference sample'));
    if (natureView === 'imports') {
      return heading + tabsHtml + '<div class="studio-two">' +
        panel('Sourcing origins', 'Indicative screening values', '<div class="rank-list">' +
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
    const rank = ranked.indexOf(item) + 1;
    const topScore = ranked[0].score;
    const regionLabel = item.region.startsWith('SE') ? 'Southern Sweden' : 'Southwest Finland';
    const why = [
      item.p >= pMedian ? 'Phosphorus above the sample median' : '',
      item.n >= nMedian ? 'Nitrogen above the sample median' : '',
      item.status === 'poor' || item.status === 'bad' ? 'Poorer water condition' : '',
    ].filter(Boolean).join(' · ') || 'Lower nutrient pressure within this sample';
    const rows = ranked.map((row, i) =>
      '<button type="button" class="priority-row" data-action="studio-catchment" data-value="' + row.id + '" aria-pressed="' +
      (row.id === selected) + '" aria-label="Rank ' + (i + 1) + ', ' + row.id + ', ' + row.status + ' water condition, priority score ' +
      fmt(row.score, 2) + '"><span class="priority-rank">' + (i + 1) + '</span><span class="priority-name"><strong>' + row.id +
      '</strong><small>' + (row.region.startsWith('SE') ? 'Southern Sweden' : 'Southwest Finland') +
      '</small></span><span class="priority-state ' + row.status + '">' + row.status + '</span><span class="priority-bar" aria-hidden="true"><i style="--bar:' +
      row.score / topScore * 100 + '%"></i></span><strong class="priority-score">' + fmt(row.score, 2) + '</strong></button>').join('');
    return heading + tabsHtml + '<div class="nature-grid"><section class="surface priority-panel">' +
      section('Catchments to investigate', '2025 · Ranked among six public development catchments') +
      '<div class="priority-key" aria-hidden="true"><span>Rank</span><span>Catchment</span><span>Water condition</span><span>Priority score</span></div>' +
      '<div class="priority-list">' + rows + '</div></section><section class="surface catchment-detail" aria-labelledby="catchment-detail-title">' +
      '<header><div class="context-label">Rank ' + rank + ' of ' + ranked.length + '</div><h2 id="catchment-detail-title">' + item.id + '</h2><p>' + regionLabel +
      ' · ' + item.status[0].toUpperCase() + item.status.slice(1) + ' water condition</p></header><div class="catchment-loads">' +
      metric('Phosphorus', fmt(item.p, 2) + ' kg/yr') + metric('Nitrogen', fmt(item.n, 2) + ' kg/yr') +
      '</div><div class="catchment-why"><strong>Why it ranks here</strong><p>' + why + '.</p></div>' +
      '<div class="catchment-next"><strong>Next step · Agronomy</strong><p>Check monitoring evidence before choosing a mitigation action.</p></div>' +
      '<details class="compact-details"><summary>How priority is calculated</summary><div class="method-body"><p>A catchment drains into shared water. The score combines loads from Apetit-contract fields with the ecological status of that water.</p>' +
      '<p>(P ÷ ' + fmt(pMedian, 2) + ' + 0.5 × N ÷ ' + fmt(nMedian, 2) + ') × ' + weight[item.status] + ' state weight × ' + item.sensitivity +
      ' phosphorus sensitivity = ' + fmt(item.score, 2) + '.</p><p>Sources · D1_dev_catchments_2025.csv, row ' + item.id +
      ', and catchments.csv. The six public reference rows are excluded from test scoring.</p>' + source('nature') + '</div></details>' +
      '</section></div><details class="surface location-details"><summary>See locations on regional maps</summary>' + locationMaps() + '</details>';
  }

  function locationMaps() {
    const regions = [
      ['Southwest Finland', 'CA'],
      ['Southern Sweden', 'CS'],
    ];
    return '<div class="regional-maps">' + regions.map(([name, prefix]) => {
      const entries = Object.entries(studioData.shapes).filter(([id]) => id.startsWith(prefix));
      const all = entries.flatMap(([, points]) => points);
      const minX = Math.min(...all.map(([lon]) => lon));
      const maxX = Math.max(...all.map(([lon]) => lon));
      const minY = Math.min(...all.map(([, lat]) => lat));
      const maxY = Math.max(...all.map(([, lat]) => lat));
      const scale = Math.min(246 / ((maxX - minX) * .54), 128 / (maxY - minY));
      const x = (lon) => 145 + (lon - (minX + maxX) / 2) * scale * .54;
      const y = (lat) => 80 - (lat - (minY + maxY) / 2) * scale;
      return '<figure class="region-map"><figcaption>' + name + '</figcaption><svg viewBox="0 0 290 160" role="img" aria-label="' +
        name + ' catchment outlines' + (selected.startsWith(prefix) ? ', selected catchment ' + selected : '') + '">' +
        entries.map(([id, points]) => {
          const css = id === selected ? 'selected' : ranked.some((row) => row.id === id) ? 'ranked' : '';
          const pos = points.map(([lon, lat]) => x(lon).toFixed(1) + ',' + y(lat).toFixed(1)).join(' ');
          return '<polygon class="' + css + '" points="' + pos + '"/>' +
            (id === selected ? '<text x="' + x(points.reduce((sum, [lon]) => sum + lon, 0) / points.length).toFixed(1) +
              '" y="' + y(points.reduce((sum, [, lat]) => sum + lat, 0) / points.length).toFixed(1) + '">' + id + '</text>' : '');
        }).join('') + '</svg></figure>';
    }).join('') + '</div><p class="map-legend"><span><i class="outline"></i> Context</span><span><i class="ranked"></i> Ranked in sample</span>' +
    '<span><i class="selected"></i> Selected</span><small>Synthetic outlines · maps use separate scales</small></p>';
  }

  function reviewKey(topic) {
    if (topic[0] !== 'sea') return topic[0];
    const data = seaEvidence();
    return ['sea', data.kg.toFixed(2), data.recorded, data.added, data.held, data.open].join(':');
  }

  function answerContent(topic) {
    if (topic[0] !== 'sea') return '<p>' + topic[3] + '</p>';
    const data = seaEvidence();
    return '<p class="answer-amount">' + fmt(data.kg / 1000, 2) + ' t CO₂e</p><p>2025 inbound bulk and refrigerated ships · ' +
      data.recorded + ' recorded legs, ' + data.added + ' approved additions.</p><p>' + data.open + ' open ship flags · ' +
      data.held + ' held rows. Ferry emissions are separate.</p>';
  }

  function copilot() {
    const reviewed = question && reviewState[reviewKey(question)];
    const form = '<form id="studio-ask-form" class="ask-form"><label for="studio-prompt">Question</label><div><input id="studio-prompt" name="prompt" value="' +
      esc(prompt) + '" placeholder="Ask about freight, FLAG or catchments" maxlength="180" required><button class="button primary" type="submit">Ask ' +
      icon('Send', 16) + '</button></div></form>';
    return head('Evidence copilot', '', badge('Retrieval preview')) +
      '<div class="studio-two copilot-grid">' + panel('Ask a question', '', form +
      '<div class="prompt-list">' + questions.filter(([id]) => ['sea', 'flag', 'nature'].includes(id)).map(([id, text]) =>
        btn(text, 'studio-question', 'ArrowUpRight', 'secondary', id)).join('') + '</div>') +
      panel('Answer', '', answering ? '<div class="answer-body"><p role="status">Finding a source…</p></div>'
        : !question ? '<div class="answer-body empty-answer"><p>' +
          (asked ? 'No matching topic. Try freight, FLAG, Foodhills, catchments or ESRS.' : 'Ask a question to see the answer and its sources.') + '</p></div>'
          : '<article class="answer-body"><div class="answer-status">' + badge(reviewed ? 'Reviewed in demo' : 'Needs expert review', reviewed ? 'done' : 'input') +
            '</div><h3>' + question[1] + '</h3>' + answerContent(question) +
            '<div class="answer-cites">' + source(question[2]) + '</div><details><summary>How the answer was assembled</summary><p>' +
            (question[0] === 'sea' ? 'The figure comes from the shipment calculation and current local review decisions.' :
              'This preview matches the question to a local topic and returns a curated answer with its source.') + '</p></details>' +
            '<div class="answer-actions">' + link(question[4], question[5], 'quiet') +
            (reviewed ? '<p class="panel-note">' + esc(reviewed.note) + '</p>' : btn('Record expert review', 'studio-review', 'Check', 'secondary')) +
            '</div></article>') + '</div><details class="surface compact-details framework-shelf"><summary>Browse framework sources</summary>' +
            '<div>' + Object.keys(documents).map(source).join('') + '</div></details>';
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
        const row = value === 'sea' ? seaEvidence().example : undefined;
        show(doc[0], 'Local challenge source', '<p class="drawer-description">' + esc(doc[2]) +
          '</p><div class="next-box"><strong>Source location</strong><p>' + esc(doc[1]) +
          (row ? '</p><p>Example shipment record · ' + esc(row) : '') + '</p></div>');
        return true;
      }
      case 'studio-review':
        reviewTopic = reviewKey(question);
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
          : /\bship\b|\bsea\b|\bvessel\b/.test(words) && /emit|emission|how much|total|2025/.test(words) ? 'sea'
            : /freight|shipment|transport|sea leg/.test(words) ? 'freight' : '';
      ask(questions.find(([id]) => id === key), text);
      return true;
    }
    if (form.id === 'studio-review-form') {
      const note = new FormData(form).get('note').trim();
      if (!note || !reviewTopic) return true;
      reviewState[reviewTopic] = { note, at: new Date().toISOString() };
      persist();
      render();
      document.querySelector('#drawer').close();
      return true;
    }
    return false;
  }
  return { overview, inventoryPreview, pathways, risk, nature, copilot, handle, change, submit };
}

