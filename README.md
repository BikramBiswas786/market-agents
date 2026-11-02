# market-agents

Webhook host for six agents listed on NEAR Agent Market, account `bikram-biswas` / Bikram Build.

The site root is https://bikram-market-agents.vercel.app/
The code is this repository. Secrets (`MARKET_WEBHOOK_SECRET`, `AGENT_TOKENS`) are set on the Vercel project. They are not in git.

## How a hire is handled

1. Agent Market POSTs `hire.created` to the route below.
2. `lib/runtime.js` reads the raw body and checks `x-market-signature` (HMAC-SHA256 over `timestamp.body`, 5 minute window). A bad signature gets HTTP 401 and no work is done.
3. The route runs only its own job, then `POST /v1/assignments/{id}/submit` with markdown.
4. A GET on a route returns `{"ok":true,"service":"..."}`. Open `/` for the index. The marketplace test is a signed POST. Both must return HTTP 200.

| Listing | Route | Category | Price |
|---|---|---|---|
| [Brand Name Availability Checker](https://market.near.ai/a/name-checker) | [/api/name](https://bikram-market-agents.vercel.app/api/name) | Research | $1 / call |
| [Local Services Quote Agent](https://market.near.ai/a/quote-agent) | [/api/quote](https://bikram-market-agents.vercel.app/api/quote) | Research | $1 / call |
| [Restaurant and Appointment Booking Agent](https://market.near.ai/a/booking-agent) | [/api/book](https://bikram-market-agents.vercel.app/api/book) | Automation | $1 / call |
| [Video Clipping Agent](https://market.near.ai/a/bikram-clipper) | [/api/clip](https://bikram-market-agents.vercel.app/api/clip) | Creative | $1 / call |
| [Video Dubbing Agent](https://market.near.ai/a/bikram-dubber) | [/api/dub](https://bikram-market-agents.vercel.app/api/dub) | Creative | $1 / call |
| [AI Image, Video and Voiceover Generator](https://market.near.ai/a/image-video-voice) | [/api/media](https://bikram-market-agents.vercel.app/api/media) | Creative | $1 / call |

Signed webhook tests from the marketplace, 2026-11-02: all six returned HTTP 200 in 100 to 237 ms.

## What the briefs actually require

Each job's "What You Deliver" is three things:

1. A working agent, hosted by the builder, listed in the named category.
2. A listing description that says what it does, what the buyer sends, and a short FAQ.
3. Behavior that passes the acceptance criteria.

Item 1 and item 2 are done for all six. Item 3 is not. The criterion-by-criterion result is in [docs/acceptance.md](docs/acceptance.md).

| Agent | Passes its acceptance test today? | Why |
|---|---|---|
| Name checker | Partially | Registry and handle checks are real. US trademarks are not: no registration number is returned, so no mark is listed. TikTok is "could not confirm". |
| Quotes | No | Prices that were copied are real. Providers were not contacted, so the comparison the brief asks for does not exist. |
| Booking | No | There is no phone line. The report says not booked. It does not invent a confirmation. |
| Clipping | No | A buyer video is not downloaded or cut. Timestamps are not invented. |
| Dubbing | No | There is no source speech, so there is no dubbed video and no subtitle file. |
| Media | Partially, for the stored sample only | The mug photos, the 8.08 s pour, and the 29.75 s voice note exist and match that one brief. A different subject is not generated. A celebrity request is declined. |

## Layout

```
api/name.js    route -> lib/runtime.js kind "name"
api/quote.js
api/book.js
api/clip.js
api/dub.js
api/media.js
api/home.js    HTML for /
lib/runtime.js signature check, the six jobs, submit
vercel.json    rewrite / to /api/home
docs/acceptance.md
```

## What a buyer sends

Name checker: a line `name: nike`. Default checks are .com, .io, .ai, X, Instagram, TikTok, the Apple App Store exact name, and US trademarks.

Quotes: service and city. The only page the code fetches is `https://www.urbancompany.com/kolkata-ac-service-repair`.

Booking: business, date, time window, party size, name. The handler records the brief and returns not booked.

Clipping: a video URL. The handler reports whether a URL was present. It does not fetch the file.

Dubbing: a video with speech, a language, and whether a stock voice or the speaker's voice was requested. Without a file, it returns the refusal.

Media: type, subject, shape, length. Stored files are returned only when the text matches the mug, the pour, or the voice note. A real identifiable person is declined.
