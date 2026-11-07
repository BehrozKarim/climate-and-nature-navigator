import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigatorApi, ApiError, routeToMap, mapToRoute } from '../src/lib/api.js';

const response = (body, status = 200) => ({ok:status < 400,status,json:async () => body});

test('route handoff reverses coordinate order exactly once', () => {
  const route = {origin:'Riga',destination:'Kantvik',mode:'ship-bulk',distance_km:372,points:[[56.99,24.07],[60.084,24.383]]};
  const map = routeToMap(route);
  assert.deepEqual(map.pts,[[24.07,56.99],[24.383,60.084]]);
  assert.equal(map.kind,'sea');
  assert.deepEqual(mapToRoute(map).points,route.points);
  assert.equal(mapToRoute(map).distance_basis,'great_circle_estimate');
});

test('previews use selected dataset and never persist a run', async () => {
  const calls = [];
  const client = new NavigatorApi({fetcher:async (url, options) => {
    calls.push({url,...options});
    return response(url.endsWith('/datasets') ? {datasets:[{dataset_id:'ds_local'}]} : {persisted:false,output:{total_tco2e:null}});
  }});
  const result = await client.preview('pathways',{year:2040,action_ids:[]});
  assert.equal(calls[1].url,'/v1/navigator/pathways/preview');
  assert.deepEqual(JSON.parse(calls[1].body),{dataset_id:'ds_local',year:2040,action_ids:[]});
  assert.equal(result.output.total_tco2e,null);
  assert.ok(!calls.some(c => c.url.includes('/runs')));
});

test('conflicts retain status and never retry a review write automatically', async () => {
  let writes = 0;
  const client = new NavigatorApi({fetcher:async url => {
    if (url.endsWith('/datasets')) return response({datasets:[{dataset_id:'ds_local'}]});
    writes++;
    return response({detail:'Review item changed; reload before retrying'},409);
  }});
  await assert.rejects(client.review('review_1',{expected_version:1,outcome:'approve',reviewer:'Demo',notes:'Checked'}),e => e instanceof ApiError && e.status === 409);
  assert.equal(writes,1);
});

test('an empty backend never falls back to fabricated design data or imports files', async () => {
  const calls = [];
  const client = new NavigatorApi({fetcher:async url => { calls.push(url); return response({datasets:[]}); }});
  await assert.rejects(client.dataset(),/No dataset imported/);
  assert.deepEqual(calls,['/v1/datasets']);
});

test('failed dataset discovery is retryable and credentials stay in request headers', async () => {
  let n = 0;
  const client = new NavigatorApi({token:'test-only',fetcher:async (_url, options) => {
    assert.equal(options.headers.Authorization,'Bearer test-only');
    return ++n === 1 ? response({detail:'offline'},503) : response({datasets:[{dataset_id:'ds_retry'}]});
  }});
  await assert.rejects(client.dataset());
  assert.equal(await client.dataset(),'ds_retry');
});
