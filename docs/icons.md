# Icons

`button_128.png` is the extension icon referenced by `public/manifest.json`,
injected into Lightning pages by the content script, and exposed through
`web_accessible_resources`.

The manifest declares it under the key `"128"`, matching the file's 128×128 px
size. If you replace it, keep the filename or update the `icons` map and
`web_accessible_resources` together.

Chrome expects these sizes for full coverage:

| Size    | File                       |
| ------- | -------------------------- |
| 16×16   | `icon_16.png`              |
| 32×32   | `icon_32.png`              |
| 48×48   | `icon_48.png`              |
| 128×128 | `button_128.png` (current) |

When adding sizes, update the `icons` map in `public/manifest.json` to list each
size explicitly, and keep `button_128.png` as the 128px entry (or rename it).

Source artwork is not versioned here. If you replace the icon, add the original
source file (SVG/AI) so it can be re-exported.
