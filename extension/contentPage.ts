import { getClassicTarget } from '../shared/classicUrl';
import type { RouteToClassicMessage } from '../shared/messages';
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

  async function clicked() {
    if (busy) {
      return;
    }

    busy = true;
    buttonMain.disabled = true;
    buttonMain.setAttribute('aria-busy', 'true');
    buttonMain.classList.add('buttontool-busy');

    try {
      const message: RouteToClassicMessage = {
        type: 'route-to-classic',
        url: location.href,
        keyPrefix: getKeyPrefixFromPage(),
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

  void init();
}
