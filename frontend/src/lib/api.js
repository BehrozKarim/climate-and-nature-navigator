/** Browser API client. Credentials, when needed, stay in memory. */
export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(item => item.msg || String(item)).join('; ') : JSON.stringify(detail));
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NavigatorApi {
  constructor({ base = '/v1', fetcher = (...args) => fetch(...args), token = '' } = {}) {
    this.base = base.replace(/\/$/, '');
    this.fetcher = fetcher;
    this.token = token;
  }

  async request(path, { body, signal, method = body === undefined ? 'GET' : 'POST' } = {}) {
    const response = await this.fetcher(this.base + path, {
      method, signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, data.detail || data.error || response.statusText);
    return data;
  }

  async dataset() {
    if (!this.datasetPromise) this.datasetPromise = this.request('/datasets').then(({ datasets }) => {
      const selected = datasets?.[0]?.dataset_id;
      if (!selected) throw new Error('No dataset imported. Import the local challenge package using the backend README, then retry.');
      return selected;
    }).catch(error => { this.datasetPromise = null; throw error; });
    return this.datasetPromise;
  }

  async calculate(path, inputs = {}, options = {}) {
    return this.request('/navigator/' + path, { ...options, body: { dataset_id: await this.dataset(), ...inputs } });
  }
  async datasetRequest(path, options) {
    return this.request(`/navigator/datasets/${encodeURIComponent(await this.dataset())}/${path}`, options);
  }
  inventory(year = 2024, restated = false) { return this.calculate('inventory', { year, restated }); }
  preview(screen, inputs, options) { return this.calculate(`${screen}/preview`, inputs, options); }
  save(screen, inputs) { return this.calculate(`${screen}/runs`, inputs); }
  lookup(origin, destination) { return this.calculate('freight/lookup', { origin, destination }); }
  trip(inputs, save = false, options) { return this.calculate(save ? 'freight/trips' : 'freight/preview', inputs, options); }
  prepare() { return this.calculate('prepare'); }
  reviews() { return this.datasetRequest('reviews?limit=500'); }
  review(id, input) { return this.datasetRequest(`reviews/${encodeURIComponent(id)}/actions`, { body: input }); }
  reviewExport(id) { return this.datasetRequest(`reviews/${encodeURIComponent(id)}/export`); }
  audit() { return this.datasetRequest('audit?limit=100'); }
  search(query, options) { return this.datasetRequest(`search?q=${encodeURIComponent(query)}&limit=20`, options); }
  disposition(finding, outcome, note) {
    return this.datasetRequest(`findings/${encodeURIComponent(finding.id)}/disposition`, { body: { expected_version: finding.version, outcome, note } });
  }
  async ask(question) {
    if (!this.conversation) this.conversation = await this.calculate('conversations');
    const updated = await this.request(`/navigator/conversations/${this.conversation.id}/messages`, {
      body: { expected_version: this.conversation.version, question },
    });
    this.conversation = updated;
    return updated.messages;
  }
}

export const api = new NavigatorApi();
export const backendMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'backend';

/** Backend route coordinates are latitude/longitude; NavMap uses longitude/latitude. */
export function routeToMap(leg) {
  return {
    kind: ['ship-bulk', 'ship-reefer', 'ropax'].includes(leg.mode) ? 'sea' : 'road',
    from: leg.origin, to: leg.destination, km: leg.distance_km, mode: leg.mode,
    pts: (leg.points || []).map(([lat, lon]) => [lon, lat]),
    est: true,
  };
}

export function mapToRoute(leg) {
  return {
    origin: leg.from, destination: leg.to, distance_km: leg.km, mode: leg.mode,
    points: leg.pts.map(([lon, lat]) => [lat, lon]),
    distance_basis: leg.est ? 'great_circle_estimate' : 'prototype_preset_estimate',
  };
}

export function sourceTrace(record) {
  const source = record.source || {};
  return {
    title: record.record_id || source.record_id || source.table || 'Source record',
    value: source.row_number ? `Row ${source.row_number}` : 'Source', unit: '', status: 'draft',
    note: 'Original snapshot record. Imported data is subject to expert review.',
    steps: [
      { k: 'Source', t: source.file || source.table || 'Dataset snapshot', id: source.dataset_id || '', d: source.file_sha256 || '' },
      ...Object.entries(record.values || {}).map(([k, v]) => ({ k: 'Source', t: k, id: String(v ?? 'Unavailable'), d: '' })),
    ],
  };
}
