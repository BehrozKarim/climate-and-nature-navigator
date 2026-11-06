import sample from './sample.js';

export const purchase = '4500006364';
export const seaId = 'SH0007925';
export const roadId = 'SH0007924';
export const dieselId = 'EF-TKM-TRUCK';
export const renewableId = 'EF-TKM-TRUCK-HVO';
export const factors = sample.factors;
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
export const seaLeg = findLeg(seaId);
export const roadLeg = findLeg(roadId);

export function freight(dataset, restored) {
  const missing = dataset === 'rehearsal' && !restored;
  const received = missing ? legs.filter((leg) => leg.id !== seaId) : legs;
  const occurrences = new Map();
  for (const leg of received) occurrences.set(leg.id, (occurrences.get(leg.id) ?? 0) + 1);
  const held = [];
  const included = [];
  for (const leg of received) {
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
  const totals = Object.fromEntries(Object.keys(modes).map((key) => [key,
    included.filter((leg) => leg.group === key).reduce((sum, leg) => sum + leg.kg, 0)]));
  return { missing, held, included, totals, kg: Object.values(totals).reduce((a, b) => a + b, 0) };
}

export function fuelComparison(included) {
  const eligible = included.filter((leg) => leg.factor === dieselId);
  const activity = eligible.reduce((sum, leg) => sum + leg.activity, 0);
  return {
    count: eligible.length,
    diesel: activity * factors[dieselId].rate,
    renewable: activity * factors[renewableId].rate,
  };
}
