# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
semantic versioning.

## [1.4.0]

### Added

- Open-source project files: `LICENSE`, `PRIVACY.md`, `CONTRIBUTING.md`,
  `TRADEMARKS.md`, and `docs/architecture.md`.
- Vitest tests for the Salesforce Classic URL logic (`pnpm test`).
- Build verification script (`pnpm verify-build`) that checks every file
  referenced by the manifest is present in the built output.
- Version sync helper (`pnpm sync-version`).
- Issue/PR templates and Dependabot.

### Changed

- Upgraded to **Angular 22** with standalone components, zoneless change
  detection, and the `@angular/build:application` builder.
- Replaced webpack and `ngx-build-plus` with **Vite 8** for the content script
  and service worker, built as self-contained IIFEs.
- Moved to **Node.js 24** and **pnpm 12** (matching the rest of the Selegic
  tooling), with `devEngines` and `packageManager` pinned.
- Replaced the Node test runner with **Vitest 5**.
- Reorganized the repository into `src/` (Angular popup), `extension/`
  (content script and service worker), and `public/` (manifest and icons).
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
