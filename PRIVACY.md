# Privacy

This extension **does not collect, transmit, store, or share any data**.

- No analytics, no tracking, no remote servers, no external requests.
- No cookies are read or written.
- No page content, Salesforce record IDs, or URLs leave your browser.
- Nothing is persisted besides what Chrome itself stores for the extension.

The only network activity comes from the Salesforce pages you are already
visiting. The extension navigates your current tab to the Classic version of the page
you are on; it never sends that URL anywhere else.

This matches the disclosure on the Chrome Web Store listing ("The developer
has disclosed that it will not collect or use your data").

## Permissions

| Permission      | Why it is needed                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `tabs`          | Read the current tab URL so the extension can build the Classic URL, and navigate the current tab to Classic |
| `webNavigation` | Detect when the Classic tab has finished loading so it can navigate to the specific record                   |

The content script only runs on `https://*.lightning.force.com/*` pages, and
no host permissions for other sites are requested.

## Reporting a concern

If you believe the extension does something not described here, open an issue
please open an issue so the maintainers can investigate.
