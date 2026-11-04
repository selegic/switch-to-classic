/**
 * Pure URL logic for turning a Lightning URL into the equivalent
 * Salesforce Classic URL. Kept free of `chrome.*` APIs so it can be
 * unit tested in Node (see tests/classic-url.test.mjs).
 */

/** Pathnames that map to the Classic home page. */
const HOME_PATHS = new Set(['/lightning/setup/SetupOneHome/home', '/lightning/page/home']);

/** /lightning/<object>/<action>/<salesforceId>/... */
const RECORD_PATH =
  /\/lightning\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+\/([a-zA-Z0-9]{15,18})\/[a-zA-Z0-9]+/;

const SWITCHER_URL = '/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome';

/**
 * Extract the Salesforce record id from a Lightning record URL.
 *
 * @returns the 15 or 18 character record id, or null when the URL is not a
 *   record page (list view, setup, home, tab, ...).
 */
export function getRecordId(url: URL): string | null {
  const match = url.pathname.match(RECORD_PATH);
  return match ? match[1] : null;
}

/** True when the URL is one of the Lightning home/setup pages. */
export function isHomePage(url: URL): boolean {
  return HOME_PATHS.has(url.pathname);
}

/** The Classic URL for the org home page, e.g. `https://x.lightning.force.com/ltng/switcher?...`. */
export function toClassicUrl(url: URL): string {
  return `${url.protocol}//${url.host}${SWITCHER_URL}`;
}

/**
 * Describe what the extension should open for a given current tab URL.
 *
 * - `classic`: open the Classic home page.
 * - `record`: open the Classic home page, then navigate to the record once
 *   loaded (the service worker handles the second step).
 * - `unsupported`: the page is not a Lightning record or home page.
 */
export type ClassicTarget =
  | { type: 'classic'; url: string }
  | { type: 'record'; url: string; recordUrl: string; recordId: string }
  | { type: 'unsupported' };

export function getClassicTarget(rawUrl: string | null | undefined): ClassicTarget {
  if (!rawUrl) {
    return { type: 'unsupported' };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { type: 'unsupported' };
  }

  const classicUrl = toClassicUrl(url);

  if (isHomePage(url)) {
    return { type: 'classic', url: classicUrl };
  }

  const recordId = getRecordId(url);
  if (recordId) {
    return {
      type: 'record',
      url: classicUrl,
      recordUrl: `${url.protocol}//${url.host}/${recordId}`,
      recordId
    };
  }

  return { type: 'unsupported' };
}
