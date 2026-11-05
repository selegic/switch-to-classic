import { Component, OnInit, computed, signal } from '@angular/core';
import { getClassicTarget, isClassicPage, type ClassicTarget } from '../../../shared/classicUrl';
import type { RouteToClassicMessage } from '../../../shared/messages';
import {
  DEFAULT_SETTINGS,
  applyTheme,
  getSettings,
  type ExtensionSettings,
} from '../../../shared/settings';

type StatusTone = 'ready' | 'muted' | 'warning';

@Component({
  selector: 'app-popup',
  styleUrl: './popup.scss',
  templateUrl: './popup.html',
})
export class Popup implements OnInit {
  readonly target = signal<ClassicTarget | null>(null);
  readonly isClassic = signal(false);
  readonly loading = signal(false);
  readonly url = signal('');
  readonly tabId = signal<number | undefined>(undefined);
  readonly settings = signal<ExtensionSettings>(DEFAULT_SETTINGS);
  readonly version =
    typeof chrome !== 'undefined' && chrome.runtime?.getManifest
      ? chrome.runtime.getManifest().version
      : 'dev';

  readonly canSwitch = computed(() => {
    const target = this.target();
    return !this.isClassic() && target !== null && target.type !== 'unsupported';
  });

  readonly statusLabel = computed(() => {
    if (this.isClassic()) {
      return 'Salesforce Classic';
    }

    const target = this.target();
    if (!target) {
      return 'Checking page…';
    }

    switch (target.type) {
      case 'record':
        return 'Record page';
      case 'list':
        return 'List view';
      case 'classic':
        return 'Lightning home';
      case 'unsupported':
        return 'Not a Lightning page';
    }
  });

  readonly statusDetail = computed(() => {
    if (this.isClassic()) {
      return 'This tab is already in Classic.';
    }

    const target = this.target();
    if (!target) {
      return 'Checking the current tab.';
    }

    switch (target.type) {
      case 'record':
        return 'The same record opens in Classic.';
      case 'list':
        return 'The list opens in Classic.';
      case 'classic':
        return 'The Classic home opens.';
      case 'unsupported':
        return 'Open a Lightning record, list, or home page.';
    }
  });

  readonly statusTone = computed<StatusTone>(() => {
    if (this.isClassic()) {
      return 'muted';
    }

    const target = this.target();
    if (!target) {
      return 'muted';
    }

    return target.type === 'unsupported' ? 'warning' : 'ready';
  });

  ngOnInit(): void {
    void this.init();
  }

  async onSwitch(): Promise<void> {
    const url = this.url();
    const tabId = this.tabId();

    if (!url || tabId === undefined || !this.canSwitch() || this.loading()) {
      return;
    }

    this.loading.set(true);

    const message: RouteToClassicMessage = { type: 'route-to-classic', url, tabId };

    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      // The tab usually navigates and closes the popup; nothing else to do.
    }

    setTimeout(() => this.loading.set(false), 6000);
  }

  openSettings(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  }

  private async init(): Promise<void> {
    try {
      const settings = await getSettings();
      this.settings.set(settings);
      applyTheme(settings.theme);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url ?? '';
      this.url.set(url);
      this.tabId.set(tab?.id);
      this.target.set(getClassicTarget(url));
      this.isClassic.set(isClassicPage(url));
    } catch {
      this.target.set({ type: 'unsupported' });
    }
  }
}
