# Privacy

This extension **does not collect, transmit, store, or share any data** with
Selegic or any third party.

- No analytics, no tracking, no external servers.
- The extension does not read or write cookies itself. Its requests to your
  Salesforce org use your existing Salesforce session, as the browser does for
  any page on that site.
- Settings are stored with `chrome.storage.sync`. Resolved Classic list-view IDs
  are cached in `chrome.storage.session`, which Chrome clears when the browser
  closes. Neither is sent to Selegic or any other service. If Chrome Sync is on,
  your settings sync across your own signed-in Chrome profiles through Chrome's
  sync service.
- No page content, Salesforce record IDs, or URLs are sent to Selegic or any
  other service.

The only network activity is to the Salesforce org you are already using. When
you switch a list view, the extension's background service worker calls that org's own REST API
(`/services/data/`) to resolve the object key prefix and, for named list views,
the Classic list-view ID. Those requests stay inside your Salesforce org; they
are not sent to Selegic or a third party.

This matches the disclosure on the Chrome Web Store listing ("The developer
has disclosed that it will not collect or use your data").

## Permissions

| Permission      | Why it is needed                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `activeTab`     | Read the current tab URL after you invoke the extension                                                 |
| `scripting`     | Read the Classic list-view selector after switching, to resolve “Recently Viewed” exactly               |
| `storage`       | Save your settings (new tab, header button, theme) and cache list-view IDs for the session              |
| `webNavigation` | Detect when the Classic tab has finished loading so it can navigate to the specific record or list view |

The extension also requests host permissions for `https://*.lightning.force.com/*`,
`https://*.my.salesforce.com/*`, and `https://*.salesforce.com/*` so it can
inject the button, read Salesforce REST metadata, and navigate to the Classic
domain. It does not request access to any other site.

## Reporting a concern

If you believe the extension does something not described here, please open an
issue so the maintainers can investigate.
