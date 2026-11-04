#!/usr/bin/env node
/**
 * Keeps the extension version in sync across:
 *   - public/manifest.json   (source of truth)
 *   - package.json
 *
 * pnpm-lock.yaml does not store the root package version, so there is nothing
 * to update there.
 *
 * Usage:
 *   pnpm sync-version            # copy the manifest version everywhere
 *   pnpm sync-version -- 1.4.0   # set the version everywhere
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  manifest: path.join(root, 'public', 'manifest.json'),
  packageJson: path.join(root, 'package.json'),
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
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

  console.log(`Version set to ${version} in public/manifest.json and package.json.`);
}

main();
