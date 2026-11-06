import { Component, OnInit, signal } from '@angular/core';
import {
  DEFAULT_SETTINGS,
  applyTheme,
  getSettings,
  saveSettings,
  type ExtensionSettings,
  type ThemePreference,
} from '../../../shared/settings';

@Component({
  selector: 'app-options',
  styleUrl: './options.scss',
  templateUrl: './options.html',
})
export class Options implements OnInit {
  readonly settings = signal<ExtensionSettings>(DEFAULT_SETTINGS);
  readonly saved = signal(false);
  readonly version =
    typeof chrome !== 'undefined' && chrome.runtime?.getManifest
      ? chrome.runtime.getManifest().version
      : 'dev';
  readonly themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  private savedTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    void this.init();
  }

  async update(patch: Partial<ExtensionSettings>): Promise<void> {
    this.settings.set({ ...this.settings(), ...patch });

    if (patch.theme) {
      applyTheme(patch.theme);
    }

    await saveSettings(patch);
    this.flashSaved();
  }

  async setTheme(theme: ThemePreference): Promise<void> {
    await this.update({ theme });
  }

  async reset(): Promise<void> {
    this.settings.set(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
    await saveSettings(DEFAULT_SETTINGS);
    this.flashSaved();
  }

  private async init(): Promise<void> {
    const settings = await getSettings();
    this.settings.set(settings);
    applyTheme(settings.theme);
  }

  private flashSaved(): void {
    this.saved.set(true);
    if (this.savedTimer) {
      clearTimeout(this.savedTimer);
    }
    this.savedTimer = setTimeout(() => this.saved.set(false), 1600);
  }
}
