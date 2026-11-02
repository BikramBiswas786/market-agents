# market-agents

Self-hosted webhooks for six agents on [NEAR Agent Market](https://market.near.ai), built for the jobs posted 2 November 2026. The account is Bikram Build (`bikram-biswas`).

Open the host: https://bikram-market-agents.vercel.app/

Secrets are not in this repo. `MARKET_WEBHOOK_SECRET` and `AGENT_TOKENS` live on the Vercel project `bikram-market-agents`.

The criterion checklist, one row per rule in the briefs, is [docs/acceptance.md](docs/acceptance.md). This file is the operating note: what a hire sends, what comes back, and where the evidence is.

## Listings

| Agent | Category | Listing | Webhook |
|---|---|---|---|
| Brand Name Availability Checker | Research | https://market.near.ai/a/name-checker | https://bikram-market-agents.vercel.app/api/name |
| Local Services Quote Agent | Research | https://market.near.ai/a/quote-agent | https://bikram-market-agents.vercel.app/api/quote |
| Restaurant and Appointment Booking Agent | Automation | https://market.near.ai/a/booking-agent | https://bikram-market-agents.vercel.app/api/book |
| Video Clipping Agent | Creative | https://market.near.ai/a/bikram-clipper | https://bikram-market-agents.vercel.app/api/clip |
| Video Dubbing Agent | Creative | https://market.near.ai/a/bikram-dubber | https://bikram-market-agents.vercel.app/api/dub |
| AI Image, Video and Voiceover Generator | Creative | https://market.near.ai/a/image-video-voice | https://bikram-market-agents.vercel.app/api/media |

Price on every listing is $1 per call. Stated delivery is under a minute, because that is what this host actually does. A signed webhook test from the marketplace on 2026-11-02 returned HTTP 200 for all six, between 100 ms and 237 ms.

## What the jobs asked for

Each brief's "What You Deliver" is the same shape:

1. A working agent, hosted by the builder, listed in a named category.
2. A listing description that says what it does, what the buyer sends, and a short FAQ.
3. Behavior that passes the acceptance criteria and avoids the fail signals.

(1) and (2) are done. The descriptions are on the listing pages, not only here. (3) is not done for the jobs that need a phone call, a buyer video, a fluent-speaker review, or a trademark registration number. Those handlers return the limit in the first message. They do not fill the gap with a made-up booking, a made-up price, a made-up timestamp, or a made-up registration number. The briefs list those as fail signals.

## Webhook contract

Agent Market POSTs JSON to the route.

Headers:

- `x-market-timestamp` — unix seconds
- `x-market-signature` — `sha256=` plus HMAC-SHA256 of `timestamp + "." + raw body`, keyed with `MARKET_WEBHOOK_SECRET`

`lib/runtime.js` reads the raw body before any parse. The timestamp must be within 300 seconds. A bad signature is HTTP 401 and the body is not treated as a hire.

Event that does work:

```json
{
  "event": "hire.created",
  "assignment_id": "...",
  "title": "...",
  "description": "..."
}
```

On that event the route builds markdown and POSTs it to `https://market.near.ai/v1/assignments/{assignment_id}/submit` with `Authorization: Bearer` one of the agent tokens, field `deliverableMarkdown`. Tokens are tried in order. A token for the wrong agent is skipped.

A GET is a status page for a person. It is not the hire. The marketplace test is the signed POST.

`vercel.json` rewrites `/` to `/api/home`.

## Brand Name Availability Checker

Buyer sends one or more lines `name: the-name`. The handler takes up to three names. For each name, in parallel:

| Check | Call |
|---|---|
| `.com` | `https://rdap.verisign.com/com/v1/domain/{name}.com` |
| `.io` | `https://rdap.org/domain/{name}.io` |
| `.ai` | `https://rdap.org/domain/{name}.ai` |
| X | `https://x.com/{name}` |
| Instagram | `https://www.instagram.com/{name}/` |
| App Store | iTunes search, `entity=software`, exact `trackName` only |
| TikTok | not called |
| US trademark | not called |

A domain object with `ldhName` is taken. Verisign 404 on `.com` is not registered. `rdap.org` 404 titled "Object not found" is not registered. "No RDAP service" is could not confirm, not free. HTTP 429 is could not confirm. TikTok is could not confirm. A trademark row is "no mark listed" unless a registration number is in the response. There is no registration number, because no trademark database is queried. Nothing is registered.

Run at 2026-11-02T14:59:05Z: `nike.com` and `nike.ai` taken, `nike.io` could not confirm, `bramblequartz.com` not registered, `bramblequartz.ai` "Object not found", Instagram HTTP 429. The report says trademark results are a starting point, not legal advice. Saved at https://market.near.ai/files/fb4680e3729e27100ffc7023bc87dd72fe952448a912a89109b177e6f969c0c7/brand-name-check.md

Not done: Google Play, suggesting free variations, a trademark hit with a number and a status.

## Local Services Quote Agent

One GET: `https://www.urbancompany.com/kolkata-ac-service-repair`. Rupee amounts in the HTML are copied, up to eight lines. No second site. No email. No phone. No quote is accepted. No customer number is sent.

Read on 2026-11-02: installation "starts at ₹1,099" and a second line ₹1,699; compressor 1.5 ton ₹8,500 and "Replacement Compressor (1.5 Ton)" ₹4,500; gas charging ₹2,800, which is not a machine replacement. The page does not state one price for replacing the air conditioner in a 3-bedroom house. Those lines are kept apart.

That fails the brief's rule that every provider is contacted and that non-replies are listed. There is no outreach, so there is no non-reply row to hide, and no invented second company.

## Restaurant and Appointment Booking Agent

Input the brief asks for: business, date, time window, party size or service, booking name, acceptable alternatives.

Output today: status not booked, attempts none, the brief echoed back. No recording, because no call was placed. No card number is requested or stored. The text says that if a person asks whether this is an AI, the answer is yes. No third-party booking site is called.

This does not satisfy "books a time inside the window". It does satisfy the fail signals that forbid a fake confirmation, a fake time, a denied AI, and a card number.

## Video Clipping Agent

The handler looks for an `https://` URL in the brief. It does not download it, does not read a "most replayed" graph, and does not emit clip in/out points.

The only moving image measured on this host is the pour file: 720x1280, 8.08 seconds, a pour from a black kettle into a light cup for the whole file. Frames at 2s, 5s, and 8s show the pour. It is not a clip from a 45-minute YouTube video.

https://market.near.ai/files/2b1edab0c70b8477ef0928231678a9920f8ae82f21a9fd5b777b80470b599244/coffee-pour.mp4

## Video Dubbing Agent

No talking-head file is attached to a hire on this route, so there is no line to translate, no SRT, no mix, and no speaker voice. Criterion 8 (do not use the speaker's voice without consent) holds because no voice is used. Criteria 1 through 7 do not hold, because there is no dubbed video.

## AI Image, Video and Voiceover Generator

This route does not call a model when the hire arrives. It returns files made on 2026-11-02 when the brief text matches them.

| File | Measure | Provider |
|---|---|---|
| mug-straight.jpg | 1408x1408, one mug, wood table, no person, no text | Imagine text-to-image |
| mug-angle.jpg | 1408x1408, three-quarter | Imagine text-to-image |
| mug-above.jpg | 1408x1408, from above | Imagine text-to-image |
| coffee-pour.mp4 | 720x1280, 8.08 s, pour visible | Imagine text-to-video, ffmpeg trim |
| mug-note.mp3 | Ara, female, 29.75 s | Voice connector |

The script that was read, and nothing else:

> This is a product note for a plain ceramic mug on a wooden table. The mug has no logo and no printed text. The wood grain shows around the base. It holds coffee or tea. Wash it by hand with warm water. Dry the outside before you put it away. Set it down on the wood, not on a wet cloth. If the mug is hot, hold the handle. Leave the mug empty when you are not using it, and keep it away from the edge of the table. Do not read anything into this note that is not written here. The sentence you are hearing is the last sentence of the script.

A brief that names a celebrity or another real identifiable person gets a refusal and no file. A subject other than the mug, the pour, or that script gets no new file. A revision that should change one file and leave the others is not implemented.

## Files

```
api/home.js     HTML for /
api/name.js     delegates to lib/runtime.js with kind "name"
api/quote.js
api/book.js
api/clip.js
api/dub.js
api/media.js
lib/runtime.js  signature, the six jobs, submit
vercel.json     rewrite / to /api/home
docs/acceptance.md
```

Each `api/*.js` route except `home.js` sets `bodyParser: false` so the HMAC is over the bytes Agent Market signed.

## Deploy

Production is the `main` branch on Vercel project `bikram-market-agents`. Vercel Authentication was turned off, because the team hostname was sending visitors to a login page. Password protection is off. A push to `main` does not by itself move the production alias; the alias is updated when that commit is deployed.
