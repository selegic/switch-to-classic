{
  const tool = document.createElement('li');
  tool.id = 'buttontool';

  const buttonMain = document.createElement('div');
  buttonMain.className = 'buttontool-buttonMain';
  buttonMain.textContent = 'Switch to Classic Experience';
  buttonMain.onclick = clicked;

  const img = document.createElement('img');
  img.id = 'image-button';
  img.src = chrome.runtime.getURL('assets/images/button_128.png');

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
    const headerElement = findHeader();

    if (headerElement !== null && !document.getElementById('buttontool')) {
      buttonMain.appendChild(img);
      tool.appendChild(buttonMain);
      headerElement.prepend(tool);
    }
  }

  function getKeyPrefix() {
    const link = document.querySelector<HTMLAnchorElement>('a[href*="/lightning/r/"]');
    const href = link?.getAttribute('href') ?? '';
    const match = href.match(/\/lightning\/r\/[^/]+\/([a-zA-Z0-9]{15,18})\//);
    return match ? match[1].slice(0, 3) : undefined;
  }

  function clicked() {
    chrome.runtime.sendMessage({ type: 'route-to-classic', keyPrefix: getKeyPrefix() });
  }

  // The content script runs at document_idle, so the Lightning header is
  // usually present already. Retry briefly in case the header renders later.
  function startWithRetry(attempts = 20) {
    start();
    if (!document.getElementById('buttontool') && attempts > 0) {
      setTimeout(() => startWithRetry(attempts - 1), 500);
    }
  }

  startWithRetry();

  // Salesforce is a SPA; re-inject the button if the header re-renders.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled || document.getElementById('buttontool')) {
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
