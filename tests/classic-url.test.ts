import { describe, expect, it } from 'vitest';
import {
  getClassicTarget,
  getListObject,
  getObjectKeyPrefix,
  getRecordId,
  isHomePage,
  toClassicBase,
  toClassicUrl,
  toClassicUrlWithRetUrl,
} from '../extension/classicUrl';

const ORG = 'https://example.lightning.force.com';
const CLASSIC_ORG = 'https://example.my.salesforce.com';
const SWITCHER = `${ORG}/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome`;

describe('classicUrl', () => {
  it('builds the switcher URL from the org host', () => {
    expect(toClassicUrl(new URL(`${ORG}/lightning/page/home`))).toBe(SWITCHER);
  });

  it('maps a Lightning host to its Classic host', () => {
    expect(toClassicBase(new URL(`${ORG}/lightning/page/home`))).toBe(CLASSIC_ORG);
    expect(toClassicBase(new URL('https://acme--dev.sandbox.lightning.force.com/x'))).toBe(
      'https://acme--dev.sandbox.my.salesforce.com',
    );
    expect(toClassicBase(new URL('https://acme.my.salesforce.com/x'))).toBe(
      'https://acme.my.salesforce.com',
    );
  });

  it('builds a switcher URL with a Classic retURL', () => {
    expect(toClassicUrlWithRetUrl(new URL(`${ORG}/lightning/o/Opportunity/list`), '/006/o')).toBe(
      `${CLASSIC_ORG}/ltng/switcher?destination=classic&retURL=%2F006%2Fo`,
    );
  });

  it('resolves the Lightning home page to the Classic home page', () => {
    expect(getClassicTarget(`${ORG}/lightning/page/home`)).toEqual({
      type: 'classic',
      url: SWITCHER,
    });
  });

  it('resolves the Setup home page to the Classic home page', () => {
    expect(getClassicTarget(`${ORG}/lightning/setup/SetupOneHome/home`).type).toBe('classic');
  });

  it('resolves a record page to a Classic record URL', () => {
    expect(getClassicTarget(`${ORG}/lightning/Account/view/0015g00001AAAAA/view`)).toEqual({
      type: 'record',
      url: SWITCHER,
      recordUrl: `${ORG}/0015g00001AAAAA`,
      recordId: '0015g00001AAAAA',
    });
  });

  it('handles 18 character ids and custom objects', () => {
    const target = getClassicTarget(
      `${ORG}/lightning/My_Custom_Object__c/view/5005g00001AAAAABBB/view`,
    );
    expect(target.type).toBe('record');
    expect(target.recordId).toBe('5005g00001AAAAABBB');
  });

  it('resolves an Opportunity list view to the Classic object home', () => {
    expect(getClassicTarget(`${ORG}/lightning/o/Opportunity/list?filterName=__Recent`)).toEqual({
      type: 'list',
      url: `${CLASSIC_ORG}/ltng/switcher?destination=classic&retURL=%2F006%2Fo`,
      object: 'Opportunity',
      keyPrefix: '006',
    });
  });

  it('uses a key prefix supplied by the content script for custom objects', () => {
    const target = getClassicTarget(`${ORG}/lightning/o/My_Object__c/list`, 'a0X');
    expect(target.type).toBe('list');
    expect(target.url).toBe(`${CLASSIC_ORG}/ltng/switcher?destination=classic&retURL=%2Fa0X%2Fo`);
    expect(target.keyPrefix).toBe('a0X');
  });

  it('falls back to the Classic home for an unknown list object', () => {
    const target = getClassicTarget(`${ORG}/lightning/o/My_Object__c/list`);
    expect(target.type).toBe('list');
    expect(target.url).toBe(
      `${CLASSIC_ORG}/ltng/switcher?destination=classic&retURL=%2Fhome%2Fhome.jsp`,
    );
    expect(target.keyPrefix).toBeUndefined();
  });

  it('ignores an invalid key prefix', () => {
    const target = getClassicTarget(`${ORG}/lightning/o/Opportunity/list`, 'not-a-prefix');
    expect(target.type).toBe('list');
    expect(target.keyPrefix).toBe('006');
  });

  it('exposes list objects and standard prefixes', () => {
    expect(getListObject(new URL(`${ORG}/lightning/o/Opportunity/list`))).toBe('Opportunity');
    expect(getListObject(new URL(`${ORG}/lightning/Account/view/0015g00001AAAAA/view`))).toBeNull();
    expect(getObjectKeyPrefix('Opportunity')).toBe('006');
    expect(getObjectKeyPrefix('My_Object__c')).toBeUndefined();
  });

  it('returns null for non-record pages', () => {
    const cases = [
      `${ORG}/lightning/o/Account/list`,
      `${ORG}/lightning/page/home`,
      `${ORG}/lightning/setup/SetupOneHome/home`,
      `${ORG}/lightning/n/Account`,
      `${ORG}/lightning/Account/view/0015g00001AAA/view`,
    ];

    for (const value of cases) {
      expect(getRecordId(new URL(value))).toBeNull();
    }
  });

  it('only matches the two home/setup paths', () => {
    expect(isHomePage(new URL(`${ORG}/lightning/page/home`))).toBe(true);
    expect(isHomePage(new URL(`${ORG}/lightning/setup/SetupOneHome/home`))).toBe(true);
    expect(isHomePage(new URL(`${ORG}/lightning/Account/view/0015g00001AAAAA/view`))).toBe(false);
  });

  it('marks non-record, non-list pages as unsupported', () => {
    const cases = [
      `${ORG}/lightning/n/Account`,
      `${ORG}/lightning/search?q=Account`,
      'https://www.google.com/',
    ];

    for (const value of cases) {
      expect(getClassicTarget(value)).toEqual({ type: 'unsupported' });
    }
  });

  it('marks empty and invalid urls as unsupported', () => {
    expect(getClassicTarget(null)).toEqual({ type: 'unsupported' });
    expect(getClassicTarget(undefined)).toEqual({ type: 'unsupported' });
    expect(getClassicTarget('')).toEqual({ type: 'unsupported' });
    expect(getClassicTarget('not a url')).toEqual({ type: 'unsupported' });
  });
});
