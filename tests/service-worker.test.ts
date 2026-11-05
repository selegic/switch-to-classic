import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClassicTarget } from '../shared/classicUrl';

type CompletedListener = (details: { tabId: number; url?: string }) => void;

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

const { getFollowUpPath, openTarget, shouldKeepCurrent } =
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

  it('updates the current tab and follows up with the record path', () => {
    openTarget(1, recordTarget, false);

    expect(update).toHaveBeenCalledWith(1, { url: recordTarget.url });
    expect(completedListeners).toHaveLength(1);

    completedListeners[0]?.({ tabId: 1 });

    expect(get).toHaveBeenCalledWith(1, expect.any(Function));
    expect(update).toHaveBeenLastCalledWith(1, {
      url: 'https://example.my.salesforce.com/0015g00001AAAAA',
    });
  });

  it('follows up with the Classic object home for a list view', () => {
    openTarget(1, listTarget, false);

    completedListeners[0]?.({ tabId: 1 });

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
    completedListeners[0]?.({ tabId: 1 });

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('opens a new tab when configured', () => {
    openTarget(1, recordTarget, true);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ url: recordTarget.url, openerTabId: 1 }),
      expect.any(Function),
    );
    expect(completedListeners).toHaveLength(1);

    completedListeners[0]?.({ tabId: 2 });

    expect(update).toHaveBeenLastCalledWith(2, {
      url: 'https://example.my.salesforce.com/0015g00001AAAAA',
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
    completedListeners[0]?.({ tabId: 1 });

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
