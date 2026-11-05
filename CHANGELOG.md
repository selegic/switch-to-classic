# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
semantic versioning.

## [1.4.0]

### Added

- Open-source project files: `LICENSE`, `PRIVACY.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `TRADEMARKS.md`, and
  `docs/architecture.md`.
- Vitest tests for the Salesforce Classic URL logic and service-worker
  navigation (`pnpm test`).
- Exact named list views: the service worker resolves `filterName` to a
  Classic list-view id with the org's REST API and opens `?fcf=…`.
- “Recently Viewed” resolves the Classic `#fcf` selector after switching and
  opens the exact org-specific list view.
- Custom-object key prefixes from `sobjects/{Object}/describe`, with a
  row-link and static-map fallback.
- Popup status feedback for record, list, home, Classic, and unsupported pages.
- Options page: current/new tab, header button visibility, and theme.
- Build verification script (`pnpm verify-build`) that checks every file
  referenced by the manifest is present in the built output.
- Version sync helper (`pnpm sync-version`).
- Issue/PR templates, CODEOWNERS, Dependabot, and CI/release workflows.

### Changed

- Upgraded to **Angular 22** with standalone components, zoneless change
  detection, and the `@angular/build:application` builder.
- Replaced webpack and `ngx-build-plus` with **Vite 8** for the content script
  and service worker, built as self-contained IIFEs.
- Moved to **Node.js 24** and **pnpm 12** (matching the rest of the Selegic
  tooling), with `devEngines` and `packageManager` pinned.
- Replaced the Node test runner with **Vitest 5**.
- Reorganized the repository into `src/` (Angular popup and options),
  `extension/` (content script and service worker), `shared/` (pure URL logic,
  settings, messages), and `public/` (manifest, content CSS, icons).
- Switched to the current tab by default, with an option for a new tab.
- Replaced the broad `tabs` permission with `activeTab`, `storage`, and
  Salesforce host permissions.
- Refreshed the popup and added an options page with light, dark, and system
  themes.
- Removed unused Angular packages: Material, CDK, animations, forms, and
  `platform-browser-dynamic`.

### Fixed

- The production build no longer omits the service worker.
- The production build no longer emits a hashed `styles.<hash>.css` while the
  manifest references `styles.css` (`outputHashing: "none"` keeps the
  stylesheet name stable).
- Disabled critical-CSS inlining so the popup does not rely on an inline
  script blocked by the extension CSP.
- `pnpm install` works from a clean checkout; the unused
  `awesome-typescript-loader` and undeclared `webpack`/`webpack-merge`
  dependencies are gone.
- Aligned `package.json` and `manifest.json` on a single version number.
- Fixed the switcher URL, which contained a literal `&amp;` instead of `&`
  between `destination=classic` and `referrer`.
- The content script now retries for the Lightning header instead of racing
  `tabs.onUpdated`.
- List views now open the exact named Classic list view when the REST API can
  resolve it, or the Classic object home for “Recently Viewed” and unknown
  objects.
- Switching navigates the current tab by default instead of always opening a
  new tab.
- The content script now retries for the Lightning header, re-injects after
  SPA re-renders, and respects the header-button setting.

## [1.3.0]

- Classic tab opens in the tab immediately after the current one.
- Salesforce Setup and home pages redirect to Classic.
- Small fixes.

## [1.2.0]

- Popup fixes.
- Performance improvements.

## [1.1.0]

- Fixes for switching back and forth between Lightning and Classic.
- Custom object support.

## [1.0.0]

- Initial release: a "Switch to Classic" button in the Lightning header and
  a popup button that opens the current record in Salesforce Classic.
