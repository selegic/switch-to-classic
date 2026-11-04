// Unit tests for chrome/src/classicUrl.ts.
//
// Run with: npm test
//
// The module is transpiled with the project's TypeScript dependency and
// imported from a data URL, so the tests need no bundler, no browser, and no
// experimental Node loader hooks. Works on Node 18+.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = readFileSync(new URL('../chrome/src/classicUrl.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020
  }
});

const { getRecordId, isHomePage, getClassicTarget, toClassicUrl } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
);

const ORG = 'https://example.lightning.force.com';

test('classic switcher URL is built from the org host', () => {
  const url = new URL(`${ORG}/lightning/page/home`);
  assert.equal(
    toClassicUrl(url),
    `${ORG}/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome`
  );
});

test('lightning home page resolves to the classic home page', () => {
  assert.deepEqual(getClassicTarget(`${ORG}/lightning/page/home`), {
    type: 'classic',
    url: `${ORG}/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome`
  });
});

test('setup home page resolves to the classic home page', () => {
  const target = getClassicTarget(`${ORG}/lightning/setup/SetupOneHome/home`);
  assert.equal(target.type, 'classic');
});

test('record page resolves to a classic record URL', () => {
  const target = getClassicTarget(`${ORG}/lightning/Account/view/0015g00001AAAAA/view`);

  assert.deepEqual(target, {
    type: 'record',
    url: `${ORG}/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome`,
    recordUrl: `${ORG}/0015g00001AAAAA`,
    recordId: '0015g00001AAAAA'
  });
});

test('record page with 18 character and custom object ids', () => {
  const target = getClassicTarget(
    `${ORG}/lightning/My_Custom_Object__c/view/5005g00001AAAAABBB/view`
  );
  assert.equal(target.type, 'record');
  assert.equal(target.recordId, '5005g00001AAAAABBB');
});

test('getRecordId returns null for non-record pages', () => {
  const cases = [
    `${ORG}/lightning/o/Account/list`,
    `${ORG}/lightning/page/home`,
    `${ORG}/lightning/setup/SetupOneHome/home`,
    `${ORG}/lightning/n/Account`,
    `${ORG}/lightning/Account/view/0015g00001AAA/view` // id too short
  ];

  for (const value of cases) {
    assert.equal(getRecordId(new URL(value)), null, value);
  }
});

test('isHomePage only matches the two home/setup paths', () => {
  assert.equal(isHomePage(new URL(`${ORG}/lightning/page/home`)), true);
  assert.equal(isHomePage(new URL(`${ORG}/lightning/setup/SetupOneHome/home`)), true);
  assert.equal(isHomePage(new URL(`${ORG}/lightning/Account/view/0015g00001AAAAA/view`)), false);
});

test('non-record pages are unsupported', () => {
  const cases = [
    `${ORG}/lightning/o/Account/list`,
    `${ORG}/lightning/n/Account`,
    `${ORG}/lightning/search?q=Account`,
    'https://www.google.com/'
  ];

  for (const value of cases) {
    assert.deepEqual(getClassicTarget(value), { type: 'unsupported' }, value);
  }
});

test('empty and invalid urls are unsupported', () => {
  assert.deepEqual(getClassicTarget(null), { type: 'unsupported' });
  assert.deepEqual(getClassicTarget(undefined), { type: 'unsupported' });
  assert.deepEqual(getClassicTarget(''), { type: 'unsupported' });
  assert.deepEqual(getClassicTarget('not a url'), { type: 'unsupported' });
});
