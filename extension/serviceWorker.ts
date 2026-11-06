import { getClassicTarget, type ClassicTarget } from './classicUrl';

type SupportedTarget = Exclude<ClassicTarget, { type: 'unsupported' }>;
type OnCompletedListener = Parameters<typeof chrome.webNavigation.onCompleted.addListener>[0];

chrome.runtime.onMessage.addListener((message) => {
  if (message === 'route-to-classic' || message?.type === 'route-to-classic') {
    const keyPrefix =
      message !== null && typeof message === 'object' ? message.keyPrefix : undefined;

    getCurrentTab()
      .then((urlString) => {
        if (urlString === null || urlString === undefined) {
          return;
        }

        const target = getClassicTarget(urlString, keyPrefix);

        if (target.type === 'unsupported') {
          // Not a record, list, or home page; nothing sensible to open in Classic.
          return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const currentTab = tabs[0];
          if (!currentTab?.id) {
            return;
          }

          openInCurrentTab(currentTab.id, target);
        });
      })
      .catch((e) => {
        console.error(e);
      });
  }
});

/**
 * Navigate the current tab to the Classic target. For records and list views,
 * the switcher first lands on Classic home, so follow up with the specific
 * Classic path once the tab has loaded.
 */
function openInCurrentTab(tabId: number, target: SupportedTarget) {
  const followUpPath = getFollowUpPath(target);

  if (followUpPath) {
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
        if (current.pathname === followUpPath) {
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

  chrome.tabs.update(tabId, { url: target.url });
}

function getFollowUpPath(target: SupportedTarget): string | null {
  if (target.type === 'record') {
    return `/${target.recordId}`;
  }
  if (target.type === 'list') {
    return target.classicPath;
  }
  return null;
}

async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const tabs = await chrome.tabs.query(queryOptions);
  return tabs[0]?.url;
}
