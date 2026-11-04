#!/usr/bin/env node
/**
 * Keeps the extension version in sync across:
 *   - angular/src/manifest.json   (source of truth)
 *   - package.json
 *   - package-lock.json
 *
 * Usage:
 *   npm run sync-version            # copy the manifest version everywhere
 *   npm run sync-version -- 1.4.0   # set the version everywhere
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const paths = {
  manifest: path.join(root, 'angular', 'src', 'manifest.json'),
  packageJson: path.join(root, 'package.json'),
  packageLock: path.join(root, 'package-lock.json')
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function main() {
  const manifest = readJson(paths.manifest);
  const version = process.argv[2] || manifest.version;

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Invalid version "${version}". Expected three dot-separated numbers, e.g. 1.4.0`);
    process.exit(1);
  }

  manifest.version = version;
  writeJson(paths.manifest, manifest);

  const pkg = readJson(paths.packageJson);
  pkg.version = version;
  writeJson(paths.packageJson, pkg);

  if (fs.existsSync(paths.packageLock)) {
    const lock = readJson(paths.packageLock);
    const before = lock.version;
    lock.version = version;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = version;
    }
    writeJson(paths.packageLock, lock);
    console.log(`package-lock.json: ${before} -> ${version}`);
  }

  console.log(`Version set to ${version} in angular/src/manifest.json, package.json and package-lock.json.`);
}

main();
