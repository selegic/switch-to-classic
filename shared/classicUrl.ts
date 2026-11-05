/**
 * Pure URL logic for turning a Lightning URL into the equivalent
 * Salesforce Classic URL. Kept free of `chrome.*` APIs so it can be
 * unit tested with Vitest (see tests/classic-url.test.ts).
 */

/** Pathnames that map to the Classic home page. */
const HOME_PATHS = new Set(['/lightning/setup/SetupOneHome/home', '/lightning/page/home']);

/** /lightning/<object>/<action>/<salesforceId>/... */
const RECORD_PATH = /\/lightning\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+\/([a-zA-Z0-9]{15,18})\/[a-zA-Z0-9]+/;

/** /lightning/o/<Object>/list */
const LIST_PATH = /^\/lightning\/o\/([a-zA-Z0-9_]+)\/list\/?$/;

/** Classic list-view ids start with 00B. */
const LIST_VIEW_ID = /^00B[a-zA-Z0-9]{12,15}$/;

const SWITCHER_URL = '/ltng/switcher?destination=classic&referrer=%2Flightning%2Fpage%2Fhome';

/**
 * Standard object API name -> Classic key prefix. Classic URLs identify
 * objects by key prefix (`/006/o`), not API name.
 */
const OBJECT_KEY_PREFIXES: Record<string, string> = {
  Account: '001',
  Asset: '02i',
  Campaign: '701',
  Case: '500',
  Contact: '003',
  Contract: '800',
  Event: '00U',
  Lead: '00Q',
  Opportunity: '006',
  OpportunityContactRole: '00K',
  OpportunityLineItem: '00k',
  Order: '801',
  Pricebook2: '01s',
  PricebookEntry: '01u',
  Product2: '01t',
  Quote: '0Q0',
  Task: '00T',
  User: '005',
};

export interface ClassicTargetOptions {
  keyPrefix?: string;
  listViewId?: string;
}

export type PageKind = 'record' | 'list' | 'home' | 'classic' | 'unsupported';

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

/** The object API name for a Lightning list view, or null. */
export function getListObject(url: URL): string | null {
  const match = url.pathname.match(LIST_PATH);
  return match ? match[1] : null;
}

/** The Classic key prefix for a standard object, or undefined. */
export function getObjectKeyPrefix(objectApiName: string): string | undefined {
  return OBJECT_KEY_PREFIXES[objectApiName];
}

/** The Classic URL for the org home page, e.g. `https://x.lightning.force.com/ltng/switcher?...`. */
export function toClassicUrl(url: URL): string {
  return `${url.protocol}//${url.host}${SWITCHER_URL}`;
}

/**
 * The Classic host for a Lightning host. Sandbox and production both use the
 * same replacement: `*.lightning.force.com` -> `*.my.salesforce.com`.
 */
export function toClassicBase(url: URL): string {
  const host = url.host.replace(/\.lightning\.force\.com$/i, '.my.salesforce.com');
  return `${url.protocol}//${host}`;
}

/**
 * Open the switcher on the Classic host and send it to a Classic path via
 * `retURL`. Used for pages that have a direct Classic equivalent, such as a
 * list view's object home or a specific list view.
 */
export function toClassicUrlWithRetUrl(url: URL, retUrl: string): string {
  return `${toClassicBase(url)}/ltng/switcher?destination=classic&retURL=${encodeURIComponent(retUrl)}`;
}

/**
 * Describe what the extension should open for a given current tab URL.
 *
 * - `classic`: open the Classic home page.
 * - `record`: open the Classic home page, then navigate to the record once
 *   loaded (the service worker handles the second step).
 * - `list`: open the Classic object home or a specific Classic list view.
 * - `unsupported`: the page is not a Lightning record, list, or home page.
 */
export type ClassicTarget =
  | { type: 'classic'; url: string }
  | { type: 'record'; url: string; recordUrl: string; recordId: string }
  | {
      type: 'list';
      url: string;
      classicPath: string;
      object: string;
      keyPrefix?: string;
      filterName?: string;
    }
  | { type: 'unsupported' };

export function getClassicTarget(
  rawUrl: string | null | undefined,
  options: ClassicTargetOptions = {},
): ClassicTarget {
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
      recordId,
    };
  }

  const listObject = getListObject(url);
  if (listObject) {
    const validKeyPrefix =
      options.keyPrefix && /^[a-zA-Z0-9]{3}$/.test(options.keyPrefix)
        ? options.keyPrefix
        : undefined;
    const prefix = validKeyPrefix ?? getObjectKeyPrefix(listObject);
    const validListViewId =
      options.listViewId && LIST_VIEW_ID.test(options.listViewId) ? options.listViewId : undefined;
    const retUrl = prefix
      ? validListViewId
        ? `/${prefix}?fcf=${validListViewId}`
        : `/${prefix}/o`
      : '/home/home.jsp';

    return {
      type: 'list',
      url: toClassicUrlWithRetUrl(url, retUrl),
      classicPath: retUrl,
      object: listObject,
      keyPrefix: prefix,
      filterName: url.searchParams.get('filterName') ?? undefined,
    };
  }

  return { type: 'unsupported' };
}

/** True when the URL is a Salesforce Classic page, not a Lightning page. */
export function isClassicPage(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  const host = url.host.toLowerCase();
  const isClassicHost =
    host === 'salesforce.com' ||
    host.endsWith('.salesforce.com') ||
    host.endsWith('.my.salesforce.com');

  return isClassicHost && !url.pathname.startsWith('/lightning/');
}

/** A coarse classification for popup status and tests. */
export function getPageKind(rawUrl: string | null | undefined): PageKind {
  if (isClassicPage(rawUrl)) {
    return 'classic';
  }

  const target = getClassicTarget(rawUrl);
  if (target.type === 'record') {
    return 'record';
  }
  if (target.type === 'list') {
    return 'list';
  }
  if (target.type === 'classic') {
    return 'home';
  }
  return 'unsupported';
}
