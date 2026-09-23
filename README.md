# HOST portal design preview

A small, offline-ready browser interface for the HOST device. Every horizontal book spine represents both a file and its conversation. The shelf scrolls natively through spaced, tactile books with a gentle depth response around the viewport centre. Selecting a book reveals its file details, comments, and a place to reply. The interface uses the same dark ground and typography as the HOST teaser.

Run `npm ci` and `npm run dev`, then open http://localhost:5176. `npm run build` creates the static site in `dist/` with relative asset URLs so it can be served from a device or a nested preview path.

This is a **design prototype**, not the ESP32 service. The sixteen sample books have no downloadable files attached. Files added through the picker or drop zone stay in this browser session; downloading one keeps it in the library. Comments on sample books are stored in this browser. No information is sent to another device or visitor.

The simulated library holds 500 MB of file data. When an addition would exceed that limit, books with the fewest downloads plus comments leave first; the oldest book breaks a tie. A file larger than the whole library is rejected. Book files, comments, and activity must live together in the future device service so an eviction removes all three atomically. The browser prototype does not persist uploaded file bytes across reloads, and its download count records a triggered local download rather than confirmed transfer completion.

`?embed=1&view=shelf` and `?embed=1&view=board` render compact, deterministic views of books and a book's conversation for the teaser. When the app runs beside `Host site` in the HOST workspace, `npm run export:teaser` builds and copies those same assets to `Host site/public/portal-preview/`. The teaser loads that versioned static copy in one iframe and switches its view as the story scrolls. The standalone site repository therefore remains buildable without a sibling portal checkout.

`npm run deploy:preview` publishes the full design preview as a Cloudflare Worker. The preview is browser-local, with no upload or message backend.

The production step is to replace the preview data with a small local device API for listing, uploading, and downloading books and for reading and posting each book's comments. The front end should remain a static bundle served over the ESP32-S3’s temporary Wi-Fi. The device must count completed downloads, enforce its real storage capacity, and remove a book with its conversation when the library needs room.
