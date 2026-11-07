import sample from './sample.js';

export const dieselId = 'EF-TKM-TRUCK';
export const renewableId = 'EF-TKM-TRUCK-HVO';
export const factors = sample.factors;
export const issues = sample.issues;
export const version = sample.version;
export const studioData = sample.studio;
export const modes = {
  Truck: ['truck', 'truck-reefer'],
  Ship: ['ship-bulk', 'ship-reefer'],
  Ferry: ['ropax'],
};
const expectedFactors = {
  truck: dieselId,
  'truck-reefer': 'EF-TKM-TRUCK-REEFER',
  'ship-bulk': 'EF-TKM-SHIP-BULK',
  'ship-reefer': 'EF-TKM-SHIP-REEFER',
  ropax: 'EF-TKM-ROPAX',
};
const legs = sample.legs.map(([id, ref, mode, factor, mass, distance, activity]) => ({
  id, ref, mode, factor, mass, distance, activity,
  group: Object.keys(modes).find((key) => modes[key].includes(mode)),
  kg: activity * factors[factor]?.rate,
}));

export const findLeg = (id) => legs.find((leg) => leg.id === id);
export const issueId = (issue) => issue.key + '/' + issue.type;
export const estimateKg = (issue, km = issue.km) => issue.mass * km * factors[issue.factor].rate;

export function freight(decisions = {}) {
  const occurrences = new Map();
  for (const leg of legs) occurrences.set(leg.id, (occurrences.get(leg.id) ?? 0) + 1);
  const held = [];
  const included = [];
  for (const leg of legs) {
    const duplicate = occurrences.get(leg.id) > 1;
    const validNumbers = [leg.mass, leg.distance, leg.activity, leg.kg]
      .every((value) => Number.isFinite(value) && value > 0);
    const consistent = Math.abs(leg.activity - leg.mass * leg.distance)
      <= 0.05 * leg.mass + 0.0005 * leg.distance + 0.0051;
    if (duplicate || !validNumbers || !consistent || leg.factor !== expectedFactors[leg.mode]
      || factors[leg.factor]?.unit !== 'tkm') {
      held.push(leg);
    } else {
      included.push(leg);
    }
  }
  const recordedKg = included.reduce((sum, leg) => sum + leg.kg, 0);
  const adjustments = issues.filter((issue) => issue.factor && decisions[issueId(issue)]?.kind === 'approve')
    .map((issue) => {
      const { km, basis, source } = decisions[issueId(issue)];
      const mode = Object.keys(expectedFactors).find((mode) => expectedFactors[mode] === issue.factor);
      return {
        id: issue.key, ref: issue.record, mode, factor: issue.factor, mass: issue.mass,
        distance: km, activity: issue.mass * km, kg: estimateKg(issue, km), basis, source,
        group: Object.keys(modes).find((key) => modes[key].includes(mode)),
      };
    });
  const adjusted = [...included, ...adjustments];
  const totals = Object.fromEntries(Object.keys(modes).map((key) => [key,
    adjusted.filter((leg) => leg.group === key).reduce((sum, leg) => sum + leg.kg, 0)]));
  return { held, included, adjustments, adjusted, totals, recordedKg, kg: Object.values(totals).reduce((a, b) => a + b, 0) };
}

export function fuelComparison(included) {
  const eligible = included.filter((leg) => leg.factor === dieselId);
  const activity = eligible.reduce((sum, leg) => sum + leg.activity, 0);
  return {
    count: eligible.length,
    activity,
    diesel: activity * factors[dieselId].rate,
    renewable: activity * factors[renewableId].rate,
  };
}
