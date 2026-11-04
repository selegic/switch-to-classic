import {
  getClassicTarget,
  getListObject,
  getObjectKeyPrefix,
  toClassicBase,
} from '../shared/classicUrl';
import type { ListContext, RouteToClassicMessage } from '../shared/messages';
import { getSettings } from '../shared/settings';

{
  const tool = document.createElement('li');
  tool.id = 'buttontool';

  const buttonMain = document.createElement('button');
  buttonMain.type = 'button';
  buttonMain.className = 'buttontool-buttonMain';
  buttonMain.textContent = 'Switch to Classic Experience';
  buttonMain.setAttribute('aria-label', 'Switch to Salesforce Classic');
  buttonMain.title = 'Switch to Salesforce Classic';
  buttonMain.addEventListener('click', (event) => {
    event.stopPropagation();
    void clicked();
  });
  buttonMain.addEventListener('contextmenu', (event) => {
    event.stopPropagation();
  });

  const img = document.createElement('img');
  img.id = 'image-button';
  img.src = chrome.runtime.getURL('assets/images/button_128.png');
  img.alt = '';
  img.draggable = false;

  let headerButtonEnabled = true;
  let busy = false;
  let observer: MutationObserver | null = null;

  function findHeader() {
    return (
      document.querySelector(
        '#oneHeader > div.slds-global-header.slds-grid.slds-grid_align-spread > span > div.slds-global-header__item > ul',
      ) ??
      document.querySelector('#oneHeader .slds-global-header__item ul') ??
      document.querySelector('header .slds-global-header__item ul')
    );
  }

  function start() {
    if (getClassicTarget(location.href).type === 'unsupported') {
      removeButton();
      return;
    }

    const headerElement = findHeader();

    if (headerElement !== null && !document.getElementById('buttontool')) {
      buttonMain.appendChild(img);
      tool.appendChild(buttonMain);
      headerElement.prepend(tool);
    }
  }

  function startWithRetry(attempts = 20) {
    if (!headerButtonEnabled) {
      return;
    }
    start();
    if (!document.getElementById('buttontool') && attempts > 0) {
      setTimeout(() => startWithRetry(attempts - 1), 500);
    }
  }

  function removeButton() {
    document.getElementById('buttontool')?.remove();
  }

  function ensureObserver() {
    if (observer || !headerButtonEnabled) {
      return;
    }

    let scheduled = false;
    observer = new MutationObserver(() => {
      if (!headerButtonEnabled || scheduled || document.getElementById('buttontool')) {
        return;
      }
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        start();
      }, 250);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function getKeyPrefixFromPage(): string | undefined {
    const link = document.querySelector<HTMLAnchorElement>('a[href*="/lightning/r/"]');
    const href = link?.getAttribute('href') ?? '';
    const match = href.match(/\/lightning\/r\/[^/]+\/([a-zA-Z0-9]{15,18})\//);
    return match ? match[1].slice(0, 3) : undefined;
  }

  interface DescribeResponse {
    keyPrefix?: string;
  }

  interface ListViewsResponse {
    listviews?: Array<{ id: string; developerName: string }>;
  }

  interface ApiContext {
    base: string;
    version: string;
  }

  const listContextCache = new Map<string, Promise<ListContext>>();
  let apiContextPromise: Promise<ApiContext | null> | null = null;

  async function fetchJsonFrom<T>(base: string, path: string): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${base}${path}`, {
        credentials: 'include',
        mode: 'cors',
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

  async function getApiContext(): Promise<ApiContext | null> {
    if (!apiContextPromise) {
      apiContextPromise = (async (): Promise<ApiContext | null> => {
        const page = new URL(location.href);
        const candidates = [...new Set([toClassicBase(page), page.origin])];

        for (const base of candidates) {
          const versions = await fetchJsonFrom<Array<{ version?: string }>>(
            base,
            '/services/data/',
          );
          const version = Array.isArray(versions)
            ? versions[versions.length - 1]?.version
            : undefined;

          if (version) {
            return { base, version };
          }
        }

        return null;
      })();
    }

    const context = await apiContextPromise;
    if (!context) {
      apiContextPromise = null;
    }
    return context;
  }

  async function getListContext(): Promise<ListContext> {
    const object = getListObject(new URL(location.href));
    if (!object) {
      return {};
    }

    const filterName = new URLSearchParams(location.search).get('filterName') ?? undefined;
    const cacheKey = `${object}:${filterName ?? ''}`;
    const cached = listContextCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const contextPromise = (async (): Promise<ListContext> => {
      const api = await getApiContext();
      if (!api) {
        return { keyPrefix: getKeyPrefixFromPage() ?? getObjectKeyPrefix(object) };
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

      const keyPrefix = describe?.keyPrefix ?? getKeyPrefixFromPage() ?? getObjectKeyPrefix(object);
      const listViewId = filterName
        ? listViews?.listviews?.find((view) => view.developerName === filterName)?.id
        : undefined;

      return { keyPrefix, listViewId };
    })().catch(() => ({
      keyPrefix: getKeyPrefixFromPage() ?? getObjectKeyPrefix(object),
    }));

    listContextCache.set(cacheKey, contextPromise);
    return contextPromise;
  }

  async function clicked() {
    if (busy) {
      return;
    }

    busy = true;
    buttonMain.disabled = true;
    buttonMain.setAttribute('aria-busy', 'true');
    buttonMain.classList.add('buttontool-busy');

    try {
      const context = await getListContext();
      const message: RouteToClassicMessage = {
        type: 'route-to-classic',
        url: location.href,
        ...context,
      };
      try {
        chrome.runtime.sendMessage(message);
      } catch {
        // The extension may have been reloaded; refresh the page to re-inject.
      }
    } finally {
      setTimeout(() => {
        busy = false;
        buttonMain.disabled = false;
        buttonMain.removeAttribute('aria-busy');
        buttonMain.classList.remove('buttontool-busy');
      }, 1500);
    }
  }

  async function init() {
    const settings = await getSettings();
    headerButtonEnabled = settings.showHeaderButton;

    if (headerButtonEnabled) {
      startWithRetry();
      ensureObserver();
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes['showHeaderButton']) {
      return;
    }

    headerButtonEnabled = changes['showHeaderButton'].newValue !== false;
    if (headerButtonEnabled) {
      startWithRetry();
      ensureObserver();
    } else {
      removeButton();
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'get-list-context') {
      void getListContext().then((context) => sendResponse(context));
      return true;
    }
    return false;
  });

  void init();
}
