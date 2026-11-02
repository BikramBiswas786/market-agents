# Acceptance criteria, checked against the code

Checked 2026-11-02. "Met" means the current handler does that thing. "Not met" means it does not, and the report says so instead of inventing the result. The fail signals in the briefs treat an invented booking, price, timestamp, or trademark number as a failure.

## Brand Name Availability Checker

Route: `/api/name`. Listing: https://market.near.ai/a/name-checker
Sample report: https://market.near.ai/files/fb4680e3729e27100ffc7023bc87dd72fe952448a912a89109b177e6f969c0c7/brand-name-check.md

What the code does (`nameReport` in `lib/runtime.js`): for each `name: ...` in the brief, it calls Verisign RDAP for `.com`, `rdap.org` for `.io` and `.ai`, `https://x.com/{name}`, `https://www.instagram.com/{name}/`, and the iTunes search API. It writes one table with the HTTP status and the UTC time. It does not register a domain or a handle.

| # | Criterion | Result |
|---|---|---|
| 1 | Domain says available or taken, and matches a registrar lookup at that time | Met for `.com` and `.ai` when RDAP returns a domain object or "Object not found". `.io` often returns "No RDAP service". That cell is "could not confirm", not "available". |
| 2 | Exact handle taken or not, or "could not confirm" | Met for X (200 vs 404). Instagram often returns 429, which is "could not confirm". TikTok is always "could not confirm" because this host does not call TikTok. |
| 3 | Apps with the exact same name | Met for the Apple App Store via iTunes. Google Play is not queried. |
| 4 | Trademarks with registration number, status, and the database name | Not met. No trademark API is called. The row says "no mark listed" because no registration number came back. A famous mark is not written in from memory. |
| 5 | Every result has a check time | Met. One UTC timestamp per row. |
| 6 | Suggested variations are free on every requested domain and platform | Not met. The handler does not suggest variations. |
| 7 | The builder does not register a searched name | Met. There is no register call. |
| 8 | Report says trademark results are not legal advice | Met. The first lines of the report say that. |

Checked at 2026-11-02T14:59:05Z: `nike.com` and `nike.ai` taken, `nike.io` could not confirm, `bramblequartz.com` not registered, `bramblequartz.ai` "Object not found".

## Local Services Quote Agent

Route: `/api/quote`. Listing: https://market.near.ai/a/quote-agent
Sample: https://market.near.ai/files/133b23356c4fd5e5b0fc6aeacb321cd9047143769a2de0bff29a8f06414a023f/quote-report.md

What the code does: one GET of Urban Company's Kolkata AC page. Rupee amounts found in the HTML are copied. No email, no phone, no second site.

| # | Criterion | Result |
|---|---|---|
| 1 | Every contacted provider offers the service in the area, and all are listed | Not met. Nobody was contacted. One public page was read. |
| 2 | Every price is exactly what a provider stated | Met for the lines copied off that page. Two 1.5 ton compressor lines are both copied because the page lists both: ₹8,500 and ₹4,500. They are not merged. |
| 3 | Providers who did not reply are included | Not met as outreach. The report says no second provider was opened, so none is hidden and none is padded. |
| 4 | Different coverage is pointed out | Met. Installation at "starts at ₹1,099" and ₹1,699 are different lines. Gas charging is not called a machine replacement. |
| 5 | Says it is on behalf of a customer; does not accept, book, or share contact details | The second half is met: nothing is accepted or shared. The first half is not met, because no message is sent. |
| 6 | Delivered at the end of the collection window | Not met. The handler replies when the hire arrives. The listing says under a minute, which is not a multi-day collection window. |

## Restaurant and Appointment Booking Agent

Route: `/api/book`. Listing: https://market.near.ai/a/booking-agent
Sample: https://market.near.ai/files/91f6aca0b9cbff67360ff13566b3674db9a274481fe94d9e788531b1073e4134/booking-report.md

What the code does: records the brief and returns status not booked. There is no telephone integration.

| # | Criterion | Result |
|---|---|---|
| 1 | Books a time inside the window, and the report matches the call | Not met. No call, no booking. |
| 2 | Does not book outside the buyer's alternatives | Met, because it books nothing. |
| 3 | Tells the truth if asked whether it is an AI, and keeps no recording | The report states the answer would be yes. No recording exists because no call exists. |
| 4 | Declines a card or a deposit and reports it | Met as a refusal. No card is asked for or stored. |
| 5 | Retries a busy line no more than the listing says, and lists attempts | Attempts listed: none. Nothing dials. |
| 6 | Status, details, attempts, alternatives | Status and attempts are in the report. There are no booking details and no alternatives from a business. |
| 7 | Online booking only on the business's own site | Not offered. No third-party booker is called. |

## Video Clipping Agent

Route: `/api/clip`. Listing: https://market.near.ai/a/bikram-clipper

What the code does: looks for an https URL in the brief and says whether one was there. It does not download the video, does not read retention data, and does not write clip timestamps.

The pour file is 720x1280, 8.08 seconds, coffee pouring for the whole file. It is not a clip of a 45-minute YouTube video. The handler links it and says that.

| # | Criterion | Result |
|---|---|---|
| 1 | The requested number of clips, in every requested format | Not met. |
| 2 | An explanation that matches the clip | Met only for that one pour file: the pour runs from the first frame to the last, so the file is not split. |
| 3 | Retention data, or an explicit statement that none was read | The report says no watch-page retention data was read. |
| 4 | No cut in the middle of a word | Not applicable. The source has no speech, and no cut was made. |
| 5 | Captions when requested | Not met. None are made. |
| 6 | A missing format is explained | The report says this host does not cut the buyer's file. |
| 7 | A revision changes only the named clips | Not met. There is no clip set to revise. |

## Video Dubbing Agent

Route: `/api/dub`. Listing: https://market.near.ai/a/bikram-dubber

What the code does: if the hire has no speech track, it submits that fact. It does not synthesize a voice, does not write an SRT, and does not copy a speaker.

| # | Criterion | Result |
|---|---|---|
| 1 | One video and one subtitle file per language | Not met. |
| 2 | Every spoken line is dubbed, or the omission is listed | Not met as a dub. There is no source line. |
| 3 | Start within one second, no overlap | Not met. There is no dubbed line to time. |
| 4 | Music and effects remain | Not met. There is no mix. |
| 5 | Protected terms stay unchanged | Not exercised. |
| 6 | A fluent speaker confirms the meaning | Not met. |
| 7 | Subtitles match the dubbed audio | Not met. No subtitle file. |
| 8 | No speaker voice without consent | Met. No voice is copied. |

## AI Image, Video and Voiceover Generator

Route: `/api/media`. Listing: https://market.near.ai/a/image-video-voice

What the code does: it does not call an image model at hire time. It returns files made on 2026-11-02 if the brief text matches them, and it declines a real person.

| File | What was measured |
|---|---|
| mug-straight.jpg, mug-angle.jpg, mug-above.jpg | 1408x1408. One ceramic mug, wooden table, no text, no person. |
| coffee-pour.mp4 | 720x1280, 8.08 s. Pour visible at 2 s, 5 s, and 8 s. |
| mug-note.mp3 | Voice id Ara, female. 29.75 s. Script is in the media report, read as written. |

Providers: stills are Imagine text-to-image. The video is Imagine text-to-video, then ffmpeg trim. The voice is the Voice connector, voice id Ara.

| # | Criterion | Result |
|---|---|---|
| 1 | The requested count, inside the stated delivery time | Met for the stored sample. Not met for any other subject. |
| 2 | Size, aspect, and length within one second | Met for those files. Square stills. Video 8.08 s against 8 s. Voice 29.75 s against 30 s. |
| 3 | Named subjects are visible or audible | Met for mug, table, and the pour. |
| 4 | Voiceover is the script, word for word | Met for the stored script. A different script is not read. |
| 5 | Provider and model named | Met as Imagine text-to-image, Imagine text-to-video, and Voice / Ara. |
| 6 | A real person without consent is declined, with the reason | Met. No file, and the report says there is no consent. |
| 7 | A change touches only the named files | Not met. A new hire returns the stored set or a refusal. |
