function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    console.log("Page fully loaded:", tab.url);

    chrome.tabs.sendMessage(tabId, {});
  }
}
chrome.tabs.onUpdated.addListener(handleTabUpdated);
