import { writeFile } from 'node:fs/promises';
import { build } from 'vite';

const { output } = await build({
  configFile: false,
  base: './',
  build: {
    write: false,
    assetsInlineLimit: Infinity,
    modulePreload: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

const page = output.find((asset) => asset.fileName === 'index.html').source;
const script = output.find((asset) => asset.type === 'chunk').code;
const styles = output.find((asset) => asset.fileName.endsWith('.css')).source;
const scriptTag = /<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/;
const stylesheetTag = /<link\b[^>]*\brel="stylesheet"[^>]*>/;
if (!scriptTag.test(page) || !stylesheetTag.test(page)) {
  throw new Error('Could not find the Vite entry script and stylesheet.');
}

const standalone = page
  .replace(/((?:src|href)=")\.\/(assets\/[^"]+)"/g, (reference, prefix, filename) => {
    if (!filename.endsWith('.svg')) return reference;
    const asset = output.find((item) => item.fileName === filename);
    return `${prefix}data:image/svg+xml;base64,${Buffer.from(asset.source).toString('base64')}"`;
  })
  .replace(scriptTag, () => `<script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace(stylesheetTag, () => `<style>${styles}</style>`);

for (const filename of ['Apetit-Decision-Studio.html', 'Apetit-Freight-Prototype.html']) {
  await writeFile(new URL('./' + filename, import.meta.url), standalone);
}
console.log('Open Apetit-Decision-Studio.html in your browser.');
