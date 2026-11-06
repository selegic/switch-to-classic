import { getClassicTarget, type ClassicTarget } from '../shared/classicUrl';
import type { RouteToClassicMessage } from '../shared/messages';
import { getSettings } from '../shared/settings';

type SupportedTarget = Exclude<ClassicTarget, { type: 'unsupported' }>;
type OnCompletedListener = Parameters<typeof chrome.webNavigation.onCompleted.addListener>[0];

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

  const target = getClassicTarget(message.url, {
    keyPrefix: message.keyPrefix,
    listViewId: message.listViewId,
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
      if (`${current.pathname}${current.search}` === followUpPath) {
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
