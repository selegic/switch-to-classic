chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "add-switch-to-classic-button") {
    const onUpdatedListener = (tabId, changeInfo) => {
      if (changeInfo.status === "complete" && tabId === sender.tab?.id) {
        chrome.tabs.onUpdated.removeListener(onUpdatedListener);
        sendResponse({ pageLoaded: true });
      } else {
        sendResponse({ pageLoaded: false });
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdatedListener);

    return true;
  }

  if (message === "route-to-classic") {
    getCurrentTab()
      .then((urlString) => {
        if (urlString === null || urlString === undefined) {
          return;
        }

        const fullURL = new URL(urlString);

        const classicURL = `${fullURL.protocol}${fullURL.host}/ltng/switcher?destination=classic&amp;referrer=%2Flightning%2Fpage%2Fhome`;

        if (
          fullURL.pathname === "/lightning/setup/SetupOneHome/home" ||
          fullURL.pathname === "/lightning/page/home"
        ) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let currentTab = tabs[0];
            chrome.tabs.create({
              url: classicURL,
              index: currentTab.index + 1,
            });
          });
        } else {
          let salesforceId;

          const idRegex =
            /\/lightning\/([a-zA-Z0-9_]+)\/([a-zA-Z0-9_]+)\/([a-zA-Z0-9]{15,18})\/([a-zA-Z0-9]+)/;
          const match = fullURL.pathname.match(idRegex);
          salesforceId = match ? match[3] : null;

          if (salesforceId) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              let currentTab = tabs[0];
              chrome.tabs.create(
                {
                  url: classicURL,
                  index: currentTab.index + 1,
                },
                (newTab) => {
                  chrome.webNavigation.onCompleted.addListener(
                    function updateTabUrl(details) {
                      if (details.tabId === newTab.id) {
                        chrome.tabs.update(details.tabId, {
                          url: `${fullURL.protocol}${fullURL.host}/${salesforceId}`,
                        });
                        chrome.webNavigation.onCompleted.removeListener(
                          updateTabUrl
                        );
                      }
                    }
                  );
                }
              );
            });
          } else {
          }
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }
});

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  let tabs = await chrome.tabs.query(queryOptions);
  return tabs[0].url;
}
