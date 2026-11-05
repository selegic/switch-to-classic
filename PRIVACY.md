# Privacy

This extension **does not collect, transmit, store, or share any data** with
Selegic or any third party.

- No analytics, no tracking, no external servers.
- No cookies are read or written.
- Nothing is persisted except your extension settings, which Chrome stores with
  `chrome.storage.sync`.
- No page content, Salesforce record IDs, or URLs are sent to Selegic or any
  other service.

The only network activity is to the Salesforce org you are already using. When
you switch a list view, the content script calls that org's own REST API
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
| `storage`       | Save your settings (new tab, header button, theme)                                                      |
| `webNavigation` | Detect when the Classic tab has finished loading so it can navigate to the specific record or list view |

The extension also requests host permissions for `https://*.lightning.force.com/*`,
`https://*.my.salesforce.com/*`, and `https://*.salesforce.com/*` so it can
inject the button, read Salesforce REST metadata, and navigate to the Classic
domain. It does not request access to any other site.

## Reporting a concern

If you believe the extension does something not described here, open an issue
please open an issue so the maintainers can investigate.
