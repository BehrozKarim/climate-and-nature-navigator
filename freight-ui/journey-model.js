import { factors, freight } from './freight.js';

export const journeyModes = {
  truck: { label: 'Truck', factor: 'EF-TKM-TRUCK', alternative: 'EF-TKM-TRUCK-HVO', alternativeLabel: 'HVO100', inputLabel: 'Road distance' },
  vessel: { label: 'Vessel', factor: 'EF-TKM-SHIP-BULK', alternative: 'EF-TKM-RAIL', alternativeLabel: 'Electric rail', inputLabel: 'Port-to-port distance' },
};
export const journeySteps = ['Transport', 'Load', 'Distance', 'Evidence', 'Review'];
export const blankDraft = () => ({
  mode: '', mass: '', unit: 't', distance: '', basis: 'Recorded', reference: '', note: '', reviewer: '', stage: 0,
});

export function journeyResult(draft) {
  const mode = journeyModes[draft.mode];
  const rawMass = Number(draft.mass);
  const mass = rawMass / (draft.unit === 'kg' ? 1000 : 1);
  const distance = Number(draft.distance);
  const validMass = draft.mass !== '' && ['kg', 't'].includes(draft.unit) && Number.isFinite(mass) && mass > 0 && mass <= 1000000;
  const validDistance = draft.distance !== '' && Number.isFinite(distance) && distance > 0 && distance <= 50000;
  const hasEvidence = (draft.reference?.trim().length ?? 0) >= 3 && ['Recorded', 'Estimate'].includes(draft.basis)
    && (draft.basis !== 'Estimate' || Boolean(draft.note?.trim()));
  const valid = Boolean(mode && validMass && validDistance && hasEvidence);
  const completed = !mode ? 0 : !validMass ? 1 : !validDistance ? 2 : !hasEvidence ? 3 : 4;
  const factor = mode && factors[mode.factor];
  const activity = validMass && validDistance ? mass * distance : 0;
  const kg = mode && activity ? activity * factor.rate : 0;
  return { mode, mass, distance, factor, activity, kg, valid, validMass, validDistance, hasEvidence, completed,
    calculated: Boolean(mode && validMass && validDistance) };
}

export function recordSnapshot(draft, acknowledged, now = new Date()) {
  const result = journeyResult(draft);
  if (!result.valid || !acknowledged || !draft.reviewer?.trim()) return null;
  return {
    id: 'J-' + now.getTime().toString(36).toUpperCase(),
    at: now.toISOString(), mode: draft.mode, enteredMass: Number(draft.mass), enteredUnit: draft.unit,
    massTonnes: result.mass, distanceKm: result.distance,
    activityTkm: result.activity, kg: result.kg, factorId: result.mode.factor,
    factorRate: result.factor.rate, factorVersion: result.factor.version, factorSource: result.factor.source,
    basis: draft.basis, reference: draft.reference.trim(), note: draft.note.trim(),
    reviewer: draft.reviewer.trim(), review: 'Reviewed in demo',
  };
}

export function sampleShipment(mode) {
  const id = journeyModes[mode]?.factor;
  return freight().included.find((leg) => leg.factor === id);
}
