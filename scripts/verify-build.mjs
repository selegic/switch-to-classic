#!/usr/bin/env node
/**
 * Verifies that every file referenced by the built extension manifest exists
 * in the output directory (or in the packaged zip when one is present).
 *
 * This guards against drift between `public/manifest.json` and the
 * Angular/Vite build output, e.g. a missing service worker or a `styles.css`
 * reference that the production build hashed.
 *
 * Usage: pnpm verify-build
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist', 'extension');
const zipPath = path.join(root, 'extension-build.zip');

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`✗ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function collectReferencedFiles(manifest) {
  const files = new Set();

  const add = (value) => {
    if (typeof value === 'string' && !value.startsWith('http') && value !== '') {
      files.add(value);
    }
  };

  const walk = (value) => {
    if (typeof value === 'string') {
      add(value);
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };

  for (const section of ['content_scripts', 'web_accessible_resources', 'background']) {
    if (manifest[section]) {
      walk(manifest[section]);
    }
  }

  if (manifest.action) {
    add(manifest.action.default_popup);
  }
  if (manifest.icons) {
    walk(manifest.icons);
  }

  return [...files].filter((file) => /\.(js|css|json|png|html)$/.test(file));
}

function main() {
  if (!fs.existsSync(distDir)) {
    fail(`build output not found: ${distDir}. Run "pnpm build" first.`);
    process.exit(1);
  }

  const manifestPath = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail(`manifest.json not found in build output: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const referenced = collectReferencedFiles(manifest);

  console.log(
    `Checking ${referenced.length} files referenced by manifest.json in ${path.relative(root, distDir)}/`,
  );

  for (const file of referenced) {
    if (fs.existsSync(path.join(distDir, file))) {
      ok(file);
    } else {
      fail(`${file} is referenced by manifest.json but missing from the build output`);
    }
  }

  for (const [label, page] of [
    ['popup', manifest.action && manifest.action.default_popup],
    ['options', manifest.options_ui && manifest.options_ui.page],
  ]) {
    if (!page) {
      continue;
    }

    const file = page.split(/[?#]/)[0];
    if (fs.existsSync(path.join(distDir, file))) {
      ok(`${file} (${label})`);
    } else {
      fail(`${file} (${label}) is missing from the build output`);
    }
  }

  if (fs.existsSync(zipPath)) {
    console.log(`\nChecking zip: ${path.basename(zipPath)}`);
    let listing;
    try {
      listing = execSync(`unzip -l ${JSON.stringify(zipPath)}`, { encoding: 'utf8' });
    } catch {
      console.log('(skipping zip check: unzip not available)');
      listing = null;
    }
    if (listing) {
      for (const file of referenced) {
        if (listing.includes(file)) {
          ok(`${file} in zip`);
        } else {
          fail(`${file} is missing from ${path.basename(zipPath)}`);
        }
      }
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} problem(s) found.`);
    process.exit(1);
  }

  console.log('\nBuild output looks consistent with manifest.json.');
}

main();
