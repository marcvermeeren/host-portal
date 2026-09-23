# HOST portal design preview

A small, offline-ready browser interface for the HOST device. The shelf presents each file as a horizontal book spine; selecting one opens its details. The message board presents pinned notes and a simple composer. Both views use the same type and colours as the HOST teaser.

Run `npm ci` and `npm run dev`, then open http://localhost:5176. `npm run build` creates the static site in `dist/` with relative asset URLs so it can be served from a device or a nested preview path.

This is a **design prototype**, not the ESP32 service. The six sample file-books are visual examples. Taking one shows a preview notice. Files added through the picker or drop zone stay in this browser session; taking one downloads that local file and removes it from the shelf. New notes live in this browser’s local storage. No information is sent to another device or visitor.

`?embed=1&view=shelf` and `?embed=1&view=board` render compact, deterministic views for the teaser. When the app runs beside `Host site` in the HOST workspace, `npm run export:teaser` builds and copies those same assets to `Host site/public/portal-preview/`. The teaser loads that versioned static copy in one iframe and switches its view as the story scrolls. The standalone site repository therefore remains buildable without a sibling portal checkout.

`npm run deploy:preview` publishes the full design preview as a Cloudflare Worker. The preview is browser-local, with no upload or message backend.

The production step is to replace the preview data with a small local device API for listing, uploading, taking, and deleting files, plus reading and posting notes. The front end should remain a static bundle served over the ESP32-S3’s temporary Wi-Fi. In particular, a real “take” must only remove a file after the download has completed; the current prototype does not make that claim for sample files.
