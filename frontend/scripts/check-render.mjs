import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';

const server = await createServer({ server:{middlewareMode:true}, appType:'custom' });
try {
  for (const name of ['App','Overview','Inventory','Freight','Pathways','Climate','Nature','Review']) {
    const path = name === 'App' ? '/src/App.jsx' : `/src/screens/${name}.jsx`;
    const {default:Screen} = await server.ssrLoadModule(path);
    const html = renderToStaticMarkup(React.createElement(Screen,{scenario:'ssp245',year:2040}));
    assert.ok(html.length > 1000,`${name} renders content`);
    assert.ok(!/<sc-|<dc-import|<x-dc|\{\{/.test(html),`${name} has no design-runtime markup`);
    if (name === 'Freight') {
      const { REFERENCE_PLACES, placeLookup } = await import('../src/lib/freight-locations.js');
      const { readFile } = await import('node:fs/promises');
      const backend = JSON.parse(await readFile(new URL('../../backend/weatherlens_backend/navigator_models.json', import.meta.url), 'utf8'));
      assert.deepEqual(REFERENCE_PLACES,backend.routing.places,'offline choices match the server-supported locations');
      const screen = new Screen({});
      screen.state = {...screen.state,preset:'custom'};
      const custom = renderToStaticMarkup(screen.render());
      assert.ok(custom.includes('id="fr-o"') && custom.includes('id="fr-d"'),'both endpoint menus render');
      assert.equal((custom.match(/<optgroup/g) || []).length,6,'each menu groups all three regions');
      const lookup = placeLookup(REFERENCE_PLACES);
      for (const place of REFERENCE_PLACES) {
        assert.equal((custom.match(new RegExp(`value="${place.id}"`,'g')) || []).length,2,`${place.id} appears in both menus`);
        assert.ok(lookup[place.id],`${place.id} can be resolved by the offline calculator`);
      }
      const empty = screen.viewModel();
      assert.equal(empty.n.total,'—','an unselected route has no calculated total');
      screen.state = {...screen.state,preset:'lv',mass:100};
      assert.ok(Math.abs(screen.calc(screen.legsNow(),100).kg-925.2)<1e-8,'known two-leg calculation agrees with independent arithmetic');
      assert.ok(renderToStaticMarkup(screen.render()).includes('100 t × 48 km × 0.092 kg CO₂e/tkm'),'per-leg calculation is visible');
      screen.state = {...screen.state,preset:'se',modes:[]};
      const alternatives = screen.viewModel().compare;
      assert.equal(alternatives[0].v,alternatives[1].v,'HVO substitution does not remove refrigerated transport');
      screen.state = {...screen.state,cO:'sakyla',cD:'sakyla'};
      screen.setState = update => { screen.state = {...screen.state,...update}; };
      screen.findRoute();
      assert.match(screen.state.err,/different/,'same endpoints are rejected');
      console.log('Freight: location catalogue, menus, calculation and refrigerated-mode checks passed');
    }
    console.log(`${name}: rendered`);
  }
} finally { await server.close(); }
