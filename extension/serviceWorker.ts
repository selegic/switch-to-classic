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

interface CachedRecent {
  fcf: string;
  keyPrefix?: string;
}

function recentCacheKey(url: URL, object: string): string {
  return `fcf:${toClassicBase(url)}:${object}:__Recent`;
}

async function getCachedRecent(url: URL, object: string): Promise<ListContext | null> {
  if (typeof chrome.storage?.session === 'undefined') {
    return null;
  }

  const key = recentCacheKey(url, object);
  const stored = await chrome.storage.session.get(key);
  const value = stored[key] as CachedRecent | undefined;

  if (value?.fcf) {
    return {
      keyPrefix: value.keyPrefix ?? getObjectKeyPrefix(object),
      listViewId: value.fcf,
    };
  }

  return null;
}

async function cacheRecent(
  url: URL,
  object: string,
  keyPrefix: string | undefined,
  fcf: string,
): Promise<void> {
  if (typeof chrome.storage?.session === 'undefined') {
    return;
  }

  const key = recentCacheKey(url, object);
  await chrome.storage.session.set({ [key]: { fcf, keyPrefix } });
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
  if (filterName === '__Recent') {
    const cached = await getCachedRecent(url, object);
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
  return promise;
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

  const resolved = await resolveListContext(message.url);
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
    chrome.tabs.create({ url: target.url, active: true, openerTabId: tabId }, (tab) => {
      if (tab?.id !== undefined) {
        setupFollowUp(tab.id, target);
      }
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

function shouldKeepCurrent(target: SupportedTarget, current: URL, followUpPath: string): boolean {
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

function setupFollowUp(tabId: number, target: SupportedTarget): void {
  const followUpPath = getFollowUpPath(target);
  if (!followUpPath) {
    return;
  }

  let handled = false;

  const listener: OnCompletedListener = (details) => {
    if (details.tabId !== tabId) {
      return;
    }

    chrome.webNavigation.onCompleted.removeListener(listener);
    handled = true;

    chrome.tabs.get(tabId, (tab) => {
      if (!tab.url) {
        return;
      }

      const current = new URL(tab.url);

      if (target.type === 'list' && target.filterName === '__Recent' && target.keyPrefix) {
        const fcf = current.searchParams.get('fcf');
        if (fcf) {
          void cacheRecent(current, target.object, target.keyPrefix, fcf);
        }
      }

      if (shouldKeepCurrent(target, current, followUpPath)) {
        return;
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
