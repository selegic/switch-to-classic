import {
  getClassicTarget,
  getListObject,
  getObjectKeyPrefix,
  toClassicBase,
  type ClassicTarget,
} from '../shared/classicUrl';
import type { ListContext, RouteToClassicMessage } from '../shared/messages';
import { getSettings } from '../shared/settings';

type SupportedTarget = Exclude<ClassicTarget, { type: 'unsupported' }>;
type OnCompletedListener = Parameters<typeof chrome.webNavigation.onCompleted.addListener>[0];

interface ApiContext {
  base: string;
  version: string;
}

interface DescribeResponse {
  keyPrefix?: string;
}

interface ListViewsResponse {
  listviews?: Array<{ id: string; developerName: string }>;
}

const apiContextCache = new Map<string, Promise<ApiContext | null>>();
const listContextCache = new Map<string, Promise<ListContext>>();

interface CachedListView {
  fcf: string;
  keyPrefix?: string;
}

function listViewCacheKey(url: URL, object: string, filterName: string): string {
  return `fcf:${toClassicBase(url)}:${object}:${filterName}`;
}

async function getCachedListView(
  url: URL,
  object: string,
  filterName: string,
): Promise<ListContext | null> {
  if (typeof chrome.storage?.session === 'undefined') {
    return null;
  }

  try {
    const key = listViewCacheKey(url, object, filterName);
    const stored = await chrome.storage.session.get(key);
    const value = stored[key] as CachedListView | undefined;

    if (value?.fcf) {
      return {
        keyPrefix: value.keyPrefix ?? getObjectKeyPrefix(object),
        listViewId: value.fcf,
      };
    }
  } catch {
    // Session storage is an optimization; never block the switch on it.
  }

  return null;
}

async function cacheListView(
  url: URL,
  object: string,
  filterName: string,
  keyPrefix: string | undefined,
  fcf: string,
): Promise<void> {
  if (typeof chrome.storage?.session === 'undefined') {
    return;
  }

  try {
    const key = listViewCacheKey(url, object, filterName);
    await chrome.storage.session.set({ [key]: { fcf, keyPrefix } });
  } catch {
    // Session storage is an optimization; ignore failures.
  }
}

async function fetchJsonFrom<T>(base: string, path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${base}${path}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getApiContext(url: URL): Promise<ApiContext | null> {
  const cacheKey = url.origin;
  const cached = apiContextCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async (): Promise<ApiContext | null> => {
    const candidates = [...new Set([toClassicBase(url), url.origin])];

    for (const base of candidates) {
      const versions = await fetchJsonFrom<Array<{ version?: string }>>(base, '/services/data/');
      const version = Array.isArray(versions) ? versions[versions.length - 1]?.version : undefined;

      if (version) {
        return { base, version };
      }
    }

    return null;
  })();

  apiContextCache.set(cacheKey, promise);

  const context = await promise;
  if (!context) {
    apiContextCache.delete(cacheKey);
  }
  return context;
}

async function resolveListContext(rawUrl: string): Promise<ListContext> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {};
  }

  const object = getListObject(url);
  if (!object) {
    return {};
  }

  const filterName = url.searchParams.get('filterName') ?? undefined;
  if (filterName) {
    const cached = await getCachedListView(url, object, filterName);
    if (cached) {
      return cached;
    }
  }

  const cacheKey = `${url.origin}:${object}:${filterName ?? ''}`;
  const cached = listContextCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async (): Promise<ListContext> => {
    const api = await getApiContext(url);
    if (!api) {
      return {};
    }

    const [describe, listViews] = await Promise.all([
      fetchJsonFrom<DescribeResponse>(
        api.base,
        `/services/data/${api.version}/sobjects/${object}/describe`,
      ),
      filterName && filterName !== '__Recent'
        ? fetchJsonFrom<ListViewsResponse>(
            api.base,
            `/services/data/${api.version}/sobjects/${object}/listviews`,
          )
        : Promise.resolve(null),
    ]);

    return {
      keyPrefix: describe?.keyPrefix ?? getObjectKeyPrefix(object),
      listViewId: filterName
        ? listViews?.listviews?.find((view) => view.developerName === filterName)?.id
        : undefined,
    };
  })();

  listContextCache.set(cacheKey, promise);

  const context = await promise;
  if (context.listViewId && filterName) {
    void cacheListView(url, object, filterName, context.keyPrefix, context.listViewId);
  }
  if (!context.keyPrefix && !context.listViewId) {
    listContextCache.delete(cacheKey);
  }
  return context;
}

export function handleMessage(
  message: RouteToClassicMessage,
  sender: chrome.runtime.MessageSender,
  _sendResponse: (response?: unknown) => void,
): boolean | void {
  if (message?.type === 'route-to-classic') {
    void routeToClassic(message, sender).catch((error) => console.error(error));
  }
  return false;
}

async function routeToClassic(
  message: RouteToClassicMessage,
  sender: chrome.runtime.MessageSender,
): Promise<void> {
  const tabId = sender.tab?.id ?? message.tabId;
  if (tabId === undefined) {
    return;
  }

  let resolved: ListContext = {};
  try {
    resolved = await resolveListContext(message.url);
  } catch {
    // Fall back to the key prefix supplied by the content script.
  }

  const target = getClassicTarget(message.url, {
    keyPrefix: resolved.keyPrefix ?? message.keyPrefix,
    listViewId: resolved.listViewId ?? message.listViewId,
  });

  if (target.type === 'unsupported') {
    return;
  }

  const settings = await getSettings();
  openTarget(tabId, target, settings.openInNewTab);
}

/** Navigate the tab (or a new tab) to the Classic target. */
export function openTarget(tabId: number, target: SupportedTarget, openInNewTab: boolean): void {
  if (openInNewTab) {
    chrome.tabs.create({ url: 'about:blank', active: true, openerTabId: tabId }, (tab) => {
      if (tab?.id === undefined) {
        return;
      }
      setupFollowUp(tab.id, target);
      chrome.tabs.update(tab.id, { url: target.url });
    });
    return;
  }

  setupFollowUp(tabId, target);
  chrome.tabs.update(tabId, { url: target.url });
}

/** The Classic path to navigate to after the switcher lands on Classic. */
export function getFollowUpPath(target: SupportedTarget): string | null {
  if (target.type === 'record') {
    return `/${target.recordId}`;
  }
  if (target.type === 'list') {
    return target.classicPath;
  }
  return null;
}

function readFcfOptionsOnce(tabId: number): Promise<Array<{ value: string; label: string }>> {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const select = document.querySelector('#fcf');
          if (!(select instanceof HTMLSelectElement)) {
            return [];
          }
          return [...select.options].map((option) => ({
            value: option.value,
            label: option.textContent?.trim() ?? '',
          }));
        },
      },
      (results) => {
        const result = results?.[0]?.result;
        resolve(Array.isArray(result) ? result : []);
      },
    );
  });
}

async function readFcfOptions(
  tabId: number,
  attempts = 3,
): Promise<Array<{ value: string; label: string }>> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const options = await readFcfOptionsOnce(tabId);
    if (options.length > 0) {
      return options;
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return [];
}

function normalizeListName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function findFcfOption(
  options: Array<{ value: string; label: string }>,
  filterName: string | undefined,
): { value: string; label: string } | undefined {
  if (!filterName || filterName === '__Recent') {
    return options.find((option) => /recently viewed/i.test(option.label));
  }

  const wanted = normalizeListName(filterName);
  if (!wanted) {
    return undefined;
  }

  return (
    options.find((option) => normalizeListName(option.label) === wanted) ??
    options.find((option) => {
      const label = normalizeListName(option.label);
      return label.length > 0 && (label.includes(wanted) || wanted.includes(label));
    })
  );
}

async function navigateToListView(
  tabId: number,
  target: Extract<SupportedTarget, { type: 'list' }>,
  current: URL,
): Promise<void> {
  if (!target.keyPrefix || !target.filterName) {
    return;
  }

  const options = await readFcfOptions(tabId);
  const option = findFcfOption(options, target.filterName);
  if (!option || !/^00B[a-zA-Z0-9]{12,15}$/.test(option.value)) {
    return;
  }

  await cacheListView(current, target.object, target.filterName, target.keyPrefix, option.value);
  chrome.tabs.update(tabId, {
    url: `${current.origin}/${target.keyPrefix}?fcf=${option.value}`,
  });
}

export function shouldKeepCurrent(
  target: SupportedTarget,
  current: URL,
  followUpPath: string,
): boolean {
  if (target.type === 'record') {
    return current.pathname === followUpPath;
  }

  if (target.type === 'list' && target.keyPrefix) {
    const path = current.pathname.replace(/\/$/, '');

    if (path === `/${target.keyPrefix}` && current.searchParams.has('fcf')) {
      return true;
    }

    if (followUpPath === `/${target.keyPrefix}/o` && path === followUpPath) {
      return true;
    }
  }

  return `${current.pathname}${current.search}` === followUpPath;
}

function setupFollowUp(tabId: number, target: SupportedTarget, hop = 0): void {
  const followUpPath = getFollowUpPath(target);
  if (!followUpPath) {
    return;
  }

  let handled = false;

  const listener: OnCompletedListener = (details) => {
    if (details.tabId !== tabId || details.frameId !== 0) {
      return;
    }

    chrome.webNavigation.onCompleted.removeListener(listener);
    handled = true;

    chrome.tabs.get(tabId, (tab) => {
      if (!tab.url) {
        return;
      }

      const current = new URL(tab.url);

      if (target.type === 'list' && target.filterName && target.keyPrefix) {
        const fcf = current.searchParams.get('fcf');
        if (fcf) {
          void cacheListView(current, target.object, target.filterName, target.keyPrefix, fcf);
        }
      }

      if (shouldKeepCurrent(target, current, followUpPath)) {
        if (target.type === 'list' && !current.searchParams.has('fcf')) {
          void navigateToListView(tabId, target, current);
        }
        return;
      }

      if (hop < 2) {
        setupFollowUp(tabId, target, hop + 1);
      }
      chrome.tabs.update(tabId, { url: `${current.origin}${followUpPath}` });
    });
  };

  chrome.webNavigation.onCompleted.addListener(listener);

  // Do not leave the listener behind if the navigation never completes.
  setTimeout(() => {
    if (!handled) {
      chrome.webNavigation.onCompleted.removeListener(listener);
    }
  }, 15000);
}

chrome.runtime.onMessage.addListener(handleMessage);
