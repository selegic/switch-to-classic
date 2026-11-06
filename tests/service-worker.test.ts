import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassicTarget } from '../shared/classicUrl';

type CompletedListener = (details: { tabId: number; frameId: number; url?: string }) => void;

const completedListeners: CompletedListener[] = [];

const update = vi.fn();
const get = vi.fn();
const create = vi.fn();

const chromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({
        openInNewTab: false,
        showHeaderButton: true,
        theme: 'system',
      }),
    },
  },
  tabs: {
    update,
    get,
    create,
  },
  scripting: {
    executeScript: vi.fn(),
  },
  webNavigation: {
    onCompleted: {
      addListener: vi.fn((listener: CompletedListener) => {
        completedListeners.push(listener);
      }),
      removeListener: vi.fn((listener: CompletedListener) => {
        const index = completedListeners.indexOf(listener);
        if (index >= 0) {
          completedListeners.splice(index, 1);
        }
      }),
    },
  },
};

vi.stubGlobal('chrome', chromeMock);

const { findFcfOption, getFollowUpPath, openTarget, shouldKeepCurrent } =
  await import('../extension/serviceWorker');

const recordTarget: ClassicTarget = {
  type: 'record',
  url: 'https://example.lightning.force.com/ltng/switcher?destination=classic',
  recordUrl: 'https://example.lightning.force.com/0015g00001AAAAA',
  recordId: '0015g00001AAAAA',
};

const listTarget: ClassicTarget = {
  type: 'list',
  url: 'https://example.my.salesforce.com/ltng/switcher?destination=classic',
  classicPath: '/006/o',
  object: 'Opportunity',
  keyPrefix: '006',
};

const classicTarget: ClassicTarget = {
  type: 'classic',
  url: 'https://example.lightning.force.com/ltng/switcher?destination=classic',
};

const recentTarget: ClassicTarget = {
  ...listTarget,
  filterName: '__Recent',
};

describe('service worker navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    completedListeners.length = 0;
    update.mockClear();
    get.mockReset();
    create.mockReset();
    chromeMock.scripting.executeScript.mockReset();
    get.mockImplementation(
      (tabId: number, callback: (tab: { id: number; url: string }) => void) => {
        callback({ id: tabId, url: 'https://example.my.salesforce.com/home/home.jsp' });
      },
    );
    create.mockImplementation(
      (details: { url: string }, callback: (tab: { id: number; url: string }) => void) => {
        callback({ id: 2, url: details.url });
      },
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('derives the follow-up path for records and lists', () => {
    expect(getFollowUpPath(recordTarget)).toBe('/0015g00001AAAAA');
    expect(getFollowUpPath(listTarget)).toBe('/006/o');
    expect(getFollowUpPath(classicTarget)).toBeNull();
  });

  it('keeps a Classic URL that already has fcf', () => {
    const current = new URL('https://example.my.salesforce.com/006?fcf=00B5g00000ABCDE');
    expect(shouldKeepCurrent(listTarget, current, '/006/o')).toBe(true);
  });

  it('keeps the object home for recently viewed', () => {
    const current = new URL('https://example.my.salesforce.com/006/o');
    expect(shouldKeepCurrent(listTarget, current, '/006/o')).toBe(true);
  });

  it('navigates from the object home to a named list view', () => {
    const namedTarget = {
      ...listTarget,
      classicPath: '/006?fcf=00B5g00000ABCDE',
    };
    const current = new URL('https://example.my.salesforce.com/006/o');
    expect(shouldKeepCurrent(namedTarget, current, '/006?fcf=00B5g00000ABCDE')).toBe(false);
  });

  it('keeps a record URL that already landed on the record', () => {
    const current = new URL('https://example.my.salesforce.com/0015g00001AAAAA');
    expect(shouldKeepCurrent(recordTarget, current, '/0015g00001AAAAA')).toBe(true);
  });

  it('matches a Lightning filter name to a Classic list-view label', () => {
    const options = [
      { value: '00B5g00000AAAA1', label: 'Closing This Month' },
      { value: '00B5g00000AAAA2', label: 'My Opportunities' },
      { value: '00B5g00000AAAA3', label: 'Recently Viewed Opportunities' },
    ];

    expect(findFcfOption(options, 'ClosingThisMonth')?.value).toBe('00B5g00000AAAA1');
    expect(findFcfOption(options, 'My_Opportunities')?.value).toBe('00B5g00000AAAA2');
    expect(findFcfOption(options, '__Recent')?.value).toBe('00B5g00000AAAA3');
    expect(findFcfOption(options, 'NoSuchView')).toBeUndefined();
  });

  it('updates the current tab and follows up with the record path', () => {
    openTarget(1, recordTarget, false);

    expect(update).toHaveBeenCalledWith(1, { url: recordTarget.url });
    expect(completedListeners).toHaveLength(1);

    completedListeners[0]?.({ tabId: 1, frameId: 0 });

    expect(get).toHaveBeenCalledWith(1, expect.any(Function));
    expect(update).toHaveBeenLastCalledWith(1, {
      url: 'https://example.my.salesforce.com/0015g00001AAAAA',
    });
  });

  it('follows up with the Classic object home for a list view', () => {
    openTarget(1, listTarget, false);

    completedListeners[0]?.({ tabId: 1, frameId: 0 });

    expect(update).toHaveBeenLastCalledWith(1, {
      url: 'https://example.my.salesforce.com/006/o',
    });
  });

  it('does not navigate again when the switcher already landed on the path', () => {
    get.mockImplementation(
      (tabId: number, callback: (tab: { id: number; url: string }) => void) => {
        callback({ id: tabId, url: 'https://example.my.salesforce.com/006/o' });
      },
    );

    openTarget(1, listTarget, false);
    completedListeners[0]?.({ tabId: 1, frameId: 0 });

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('ignores subframe completion events', () => {
    openTarget(1, recordTarget, false);
    completedListeners[0]?.({ tabId: 1, frameId: 1 });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('opens a new tab when configured', () => {
    openTarget(1, recordTarget, true);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'about:blank', openerTabId: 1 }),
      expect.any(Function),
    );
    expect(update).toHaveBeenCalledWith(2, { url: recordTarget.url });
    expect(completedListeners).toHaveLength(1);

    completedListeners[0]?.({ tabId: 2, frameId: 0 });

    expect(update).toHaveBeenLastCalledWith(2, {
      url: 'https://example.my.salesforce.com/0015g00001AAAAA',
    });
  });

  it('re-arms after the switcher lands on Classic home', async () => {
    const urls = [
      'https://example.my.salesforce.com/home/home.jsp',
      'https://example.my.salesforce.com/006/o',
    ];
    get.mockImplementation(
      (tabId: number, callback: (tab: { id: number; url: string }) => void) => {
        callback({ id: tabId, url: urls.shift() ?? 'https://example.my.salesforce.com/006/o' });
      },
    );
    chromeMock.scripting.executeScript.mockImplementation(
      (
        _details: unknown,
        callback: (results: Array<{ result: Array<{ value: string; label: string }> }>) => void,
      ) => {
        callback([
          { result: [{ value: '00B5g00000ABCDE', label: 'Recently Viewed Opportunities' }] },
        ]);
      },
    );

    openTarget(1, recentTarget, false);

    completedListeners[0]?.({ tabId: 1, frameId: 0 });
    expect(update).toHaveBeenCalledWith(1, { url: 'https://example.my.salesforce.com/006/o' });
    expect(completedListeners).toHaveLength(1);

    completedListeners[0]?.({ tabId: 1, frameId: 0 });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(update).toHaveBeenLastCalledWith(1, {
      url: 'https://example.my.salesforce.com/006?fcf=00B5g00000ABCDE',
    });
  });

  it('resolves Recently Viewed from the Classic fcf selector', async () => {
    get.mockImplementation(
      (tabId: number, callback: (tab: { id: number; url: string }) => void) => {
        callback({ id: tabId, url: 'https://example.my.salesforce.com/006/o' });
      },
    );
    chromeMock.scripting.executeScript.mockImplementation(
      (
        _details: unknown,
        callback: (results: Array<{ result: Array<{ value: string; label: string }> }>) => void,
      ) => {
        callback([
          { result: [{ value: '00B5g00000ABCDE', label: 'Recently Viewed Opportunities' }] },
        ]);
      },
    );

    openTarget(1, recentTarget, false);
    completedListeners[0]?.({ tabId: 1, frameId: 0 });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(chromeMock.scripting.executeScript).toHaveBeenCalled();
    expect(update).toHaveBeenLastCalledWith(1, {
      url: 'https://example.my.salesforce.com/006?fcf=00B5g00000ABCDE',
    });
  });

  it('does not set up a follow-up for the Classic home', () => {
    openTarget(1, classicTarget, false);

    expect(update).toHaveBeenCalledWith(1, { url: classicTarget.url });
    expect(completedListeners).toHaveLength(0);
  });
});
