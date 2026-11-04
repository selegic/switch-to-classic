# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project uses
semantic versioning.

## [Unreleased]

### Added

- Open-source project files: `LICENSE`, `PRIVACY.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `TRADEMARKS.md`, and
  `docs/architecture.md`.
- Unit tests for the Salesforce Classic URL logic (`npm test`).
- Build verification script (`npm run verify-build`) that checks every file
  referenced by the manifest is present in the built output.
- Version sync helper (`npm run sync-version`).

### Fixed

- The production build no longer omits the service worker
  (`chrome/webpack.config.prod.js` now bundles `serviceWorker.js`, which the
  manifest requires).
- The production build no longer emits a hashed `styles.<hash>.css` while the
  manifest references `styles.css` (`outputHashing: "none"` keeps the
  stylesheet name stable).
- `npm ci` works without `--legacy-peer-deps`: removed
  `awesome-typescript-loader`, which required TypeScript `^2.7 || ^3`, and
  declared the `webpack` and `webpack-merge` dependencies the build actually
  uses.
- Aligned `package.json`, `package-lock.json`, and `manifest.json` on a single
  version number.
- Removed a reference to a non-existent `angular/src/favicon.ico`.
- Fixed the switcher URL, which contained a literal `&amp;` instead of `&`
  between `destination=classic` and `referrer`.

### Changed

- Moved `ngx-build-plus` from `dependencies` to `devDependencies`.
- Added `engines.node >= 18` and a `.nvmrc`.

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
