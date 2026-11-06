export const labels = { freight: 'Freight', supplier: 'Suppliers', farm: 'Farms', purchasing: 'Purchasing' };
export const statusLabels = { input: 'Needs input', waiting: 'Waiting', review: 'Ready for review', done: 'Reviewed' };
export const owners = { freight: 'Logistics', supplier: 'Procurement', farm: 'Farm advisory', purchasing: 'Procurement' };
export const period = 'October 2026';
export const baseline = [2986, 2854, 2942, 2668, 2720, 2486];
export const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

const exampleRecords = [
  {
    id: 'FR-2048', category: 'freight', title: 'Vessel distance missing', subject: 'Baltic rapeseed intake',
    status: 'input', source: 'Demo carrier manifest · CM-2048', description: 'The road leg has a distance. The vessel leg has a port pair and cargo weight, but its distance is missing.',
    weight: 1850, factor: 0.013, suggestion: 305, ports: 'Baltic Terminal A → Finnish Terminal B',
  },
  {
    id: 'SU-0138', category: 'supplier', title: 'Supplier footprint needs a method', subject: 'Packaging supplier',
    status: 'waiting', source: 'Demo supplier declaration · SD-138', description: 'The declaration gives a footprint, but leaves out its reporting period and which activities it covers.',
  },
  {
    id: 'FA-0072', category: 'farm', title: 'Check the updated fertiliser record', subject: 'Contract grower · Field 72',
    status: 'review', source: 'Demo grower submission · GS-072', description: 'The grower supplied a corrected input quantity for the October inventory.',
    original: { value: '1,320 kg', reference: 'Grower submission GS-072, version 1', basis: 'Source document' },
    evidence: { value: '1,230 kg', reference: 'Grower submission GS-072, version 2', basis: 'Source document', note: 'Corrected a transposed digit against the grower record.' },
  },
  {
    id: 'PU-0431', category: 'purchasing', title: 'Purchase quantities disagree', subject: 'Pea delivery · Intake 431',
    status: 'input', source: 'Demo intake log · IL-431', description: 'The purchase order and intake log use different quantities. Check the delivery note before including the record.',
    original: { value: '14,900 kg', reference: 'Purchase order PO-431', basis: 'Source document' },
  },
];

export const scenarios = {
  fuel: { name: 'Renewable diesel', description: 'Switch a share of standard inbound trucks to HVO.', reduction: 0.69, cost: 73000, timing: '3–6 months', benefit: 'Can keep the existing routes and delivery schedule.', tradeoff: 'Confirm fuel origin and availability with the carrier.' },
  rail: { name: 'Road to rail', description: 'Move a share of eligible long-haul road freight to rail.', reduction: 0.47, cost: 46500, timing: '6–12 months', benefit: 'Could reduce long-haul truck trips.', tradeoff: 'Confirm terminal capacity and allow for longer lead times.' },
};
export const scenarioBaseline = 280;

const key = 'apetit-climate-workspace-1';
export function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved?.records) && Array.isArray(saved?.events)) return saved;
  } catch { /* The demo is usable when browser storage is unavailable. */ }
  return { records: structuredClone(exampleRecords), events: [] };
}

export function saveWorkspace(workspace) {
  try { localStorage.setItem(key, JSON.stringify(workspace)); return true; }
  catch { return false; }
}

export function log(workspace, record, title, detail = {}) {
  workspace.events.unshift({ record: record.id, title, at: new Date().toISOString(), ...detail });
}

export function freightEffect(record, evidence = record.evidence) {
  return record.category === 'freight' && evidence && record.weight && record.factor
    ? record.weight * Number(evidence.value) * record.factor / 1000 : 0;
}

export function scenarioResult(key, share) {
  const option = scenarios[key];
  return { saved: scenarioBaseline * option.reduction * share / 100, cost: option.cost * share / 100 };
}
