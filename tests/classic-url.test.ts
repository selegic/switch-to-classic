import { describe, expect, it } from 'vitest';
import { getClassicTarget, getRecordId, isHomePage, toClassicUrl } from '../extension/classicUrl';

const ORG = 'https://example.lightning.force.com';
const SWITCHER = `${ORG}/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome`;

describe('classicUrl', () => {
  it('builds the switcher URL from the org host', () => {
    expect(toClassicUrl(new URL(`${ORG}/lightning/page/home`))).toBe(SWITCHER);
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

  it('marks non-record pages as unsupported', () => {
    const cases = [
      `${ORG}/lightning/o/Account/list`,
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
