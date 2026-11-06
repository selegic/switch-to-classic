export type ThemePreference = 'system' | 'light' | 'dark';

export interface ExtensionSettings {
  openInNewTab: boolean;
  showHeaderButton: boolean;
  theme: ThemePreference;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  openInNewTab: false,
  showHeaderButton: true,
  theme: 'system',
};

function hasStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync);
}

export async function getSettings(): Promise<ExtensionSettings> {
  if (!hasStorage()) {
    return { ...DEFAULT_SETTINGS };
  }

  const stored = await chrome.storage.sync.get();
  return { ...DEFAULT_SETTINGS, ...stored } as ExtensionSettings;
}

export async function saveSettings(patch: Partial<ExtensionSettings>): Promise<void> {
  if (!hasStorage()) {
    return;
  }

  await chrome.storage.sync.set(patch);
}

/** Apply the theme preference to the extension page document. */
export function applyTheme(theme: ThemePreference): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset['theme'] = theme;
}
