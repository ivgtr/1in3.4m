import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBundle } from '../scripts/bundle-budget.mjs';

test('initial payload budgets follow shared imports and reject an eager engine dependency', () => {
  const chunk = (fileName, sources, imports = [], isEntry = false) => ({ type: 'chunk', fileName, code: 'x'.repeat(40), imports, isEntry, modules: Object.fromEntries(sources.map(source => [`/project/src/${source}`, {}])) });
  const entry = chunk('entry.js', ['main.jsx'], ['shared.js'], true);
  const page = chunk('page.js', ['pages/GamePage.jsx'], ['shared.js']);
  const shared = chunk('shared.js', ['components/Button.jsx']);
  const engine = chunk('engine.js', ['domain/model.js']);
  const check = { name: 'welcome', sources: ['pages/GamePage.jsx'], bytes: 120, gzip: 200, exclude: ['domain/model.js'] };
  const output = [entry, page, shared, engine];
  assert.equal(checkBundle(output, [check])[0].bytes, 120);
  shared.imports.push('engine.js');
  assert.throws(() => checkBundle(output, [check]), /welcome: eagerly includes domain\/model.js/);
  assert.throws(() => checkBundle(output, [{ ...check, exclude: [] }]), /budget 120\/200/);
});
