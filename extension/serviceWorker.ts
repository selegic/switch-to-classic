import { getClassicTarget } from './classicUrl';

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
          // Not a record or home page; nothing sensible to open in Classic.
          return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const currentTab = tabs[0];
          if (!currentTab) {
            return;
          }

          chrome.tabs.create(
            {
              url: target.url,
              index: currentTab.index + 1,
            },
            (newTab) => {
              if (target.type !== 'record' || !newTab?.id) {
                return;
              }

              const recordUrl = target.recordUrl;
              chrome.webNavigation.onCompleted.addListener(function updateTabUrl(details) {
                if (details.tabId === newTab.id) {
                  chrome.tabs.update(details.tabId, { url: recordUrl });
                  chrome.webNavigation.onCompleted.removeListener(updateTabUrl);
                }
              });
            },
          );
        });
      })
      .catch((e) => {
        console.error(e);
      });
  }
});

async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const tabs = await chrome.tabs.query(queryOptions);
  return tabs[0]?.url;
}
