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
    console.log(`${name}: rendered`);
  }
} finally { await server.close(); }
