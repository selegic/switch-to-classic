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
 *   pnpm sync-version          # copy the manifest version everywhere
 *   pnpm sync-version -- 1.4   # set the version everywhere
 *
 * Chrome accepts 1-4 dot-separated numbers; npm requires exactly three.
 * A manifest version of 1.4 is written to package.json as 1.4.0.
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
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const version = args[0] || manifest.version;

  if (!/^\d+(\.\d+){0,3}$/.test(version)) {
    console.error(`Invalid version "${version}". Expected 1-4 dot-separated numbers, e.g. 1.4`);
    process.exit(1);
  }

  const packageVersion = version.split('.').concat(['0', '0']).slice(0, 3).join('.');

  manifest.version = version;
  writeJson(paths.manifest, manifest);

  const pkg = readJson(paths.packageJson);
  pkg.version = packageVersion;
  writeJson(paths.packageJson, pkg);

  console.log(
    `Version set to ${version} in public/manifest.json and ${packageVersion} in package.json.`,
  );
}

main();
