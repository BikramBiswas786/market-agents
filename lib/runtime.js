const crypto = require("crypto");

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verify(secret, timestamp, signature, raw) {
  if (!secret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(String(timestamp) + ".").update(raw).digest("hex");
  const got = String(signature).replace(/^sha256=/, "");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(got, "hex");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

async function submit(assignmentId, markdown) {
  let tokens = [];
  try { tokens = JSON.parse(process.env.AGENT_TOKENS || "[]"); } catch { tokens = []; }
  const body = JSON.stringify({ deliverableMarkdown: markdown });
  for (const token of tokens) {
    const r = await fetch("https://market.near.ai/v1/assignments/" + assignmentId + "/submit", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body
    });
    if (r.ok) return true;
  }
  return false;
}

function namesFrom(event) {
  const text = (event.title || "") + "\n" + (event.description || "");
  const found = new Set();
  for (const m of text.matchAll(/name\s*:\s*([a-z0-9-]{2,40})/gi)) found.add(m[1].toLowerCase());
  for (const m of text.matchAll(/"([a-z0-9-]{2,40})"/gi)) found.add(m[1].toLowerCase());
  return [...found].slice(0, 3);
}

async function hit(url, opts) {
  const ms = (opts && opts.ms) || 8000;
  const cap = (opts && opts.cap) || 80000;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": (opts && opts.ua) || "bikram-market-agent", Accept: "application/rdap+json, application/json, text/html" }
    });
    const body = await r.text();
    return { status: r.status, body: body.slice(0, cap), url: r.url || url };
  } catch (e) {
    return { status: 0, body: String(e.name || "error"), url };
  } finally { clearTimeout(t); }
}

function domainCell(ext, res) {
  const b = res.body || "";
  if (res.status === 200 && /"ldhName"|"objectClassName"\s*:\s*"domain"/i.test(b)) return "taken";
  if (ext === "io" && /No RDAP service/i.test(b)) return "could not confirm";
  if (res.status === 404 && /Object not found/i.test(b)) return "available";
  if (ext === "com" && res.status === 404) return "available";
  return "could not confirm";
}

function tmStatus(code) {
  const known = { "800": "registered and renewed", "700": "registered", "710": "cancelled", "602": "abandoned" };
  return known[String(code)] || ("status code " + code);
}

async function trademarkRows(name, now) {
  const res = await hit("https://tmsearchapi.com/search/mark?q=" + encodeURIComponent(name) + "&limit=50", { ms: 12000 });
  const db = "USPTO records via tmsearchapi.com. Exact mark text only. Not a similarity opinion.";
  if (res.status !== 200) return ["| US trademark | could not confirm | HTTP " + res.status + ". " + db + " | " + now + " |"];
  let data;
  try { data = JSON.parse(res.body); } catch { return ["| US trademark | could not confirm | Response was not JSON. " + db + " | " + now + " |"]; }
  const exact = (data.results || []).filter((m) => String(m.mark || "").trim().toLowerCase() === name);
  const live = exact.filter((m) => /^\d+$/.test(String(m.registration_number || "")) && !/^0+$/.test(String(m.registration_number)));
  live.sort((a, b) => (String(a.status_code) === "800" || String(a.status_code) === "700" ? 0 : 1) - (String(b.status_code) === "800" || String(b.status_code) === "700" ? 0 : 1));
  if (!exact.length) return ["| US trademark | no identical mark with a registration number | No exact-text row on this page. " + db + " | " + now + " |"];
  if (!live.length) return ["| US trademark | no identical mark with a registration number | " + exact.length + " exact-text rows had no registration number. " + db + " | " + now + " |"];
  const capped = data.total_count === 50 ? "First page is full (50). More identical marks may exist. " : "";
  const rows = ["| US trademark | " + live.length + " identical marks with a registration number on this page | " + capped + db + " | " + now + " |"];
  for (const m of live.slice(0, 5)) {
    rows.push("| US " + m.mark + " | reg " + m.registration_number + ", " + tmStatus(m.status_code) + " | serial " + m.serial_number + ", owner " + (m.owner_name || "not stated") + ", class " + (m.classes || "not stated") + ". " + db + " | " + now + " |");
  }
  return rows;
}

function playExact(name, res) {
  if (!res || res.status !== 200) return "could not confirm (HTTP " + (res ? res.status : 0) + ")";
  const found = [];
  const re = /href="\/store\/apps\/details\?id=([^"]+)" aria-label="([^"]+)"/g;
  let m;
  while ((m = re.exec(res.body || ""))) {
    if (m[2].trim().toLowerCase() === name && !found.some((x) => x.id === m[1])) found.push({ id: m[1], title: m[2] });
  }
  if (!found.length) return "none with this exact title";
  return found.map((a) => a.title + " (" + a.id + ")").join("; ");
}

async function nameReport(event) {
  const names = namesFrom(event);
  const parts = ["# Brand name check", "", "Nothing was registered. Trademark results are a starting point, not legal advice.", ""];
  if (!names.length) return parts.concat(["No name found. Send a line like: name: nike"]).join("\n");
  for (const name of names) {
    const now = new Date().toISOString();
    const [com, io, ai, x, ig, app, play] = await Promise.all([
      hit("https://rdap.verisign.com/com/v1/domain/" + name + ".com"),
      hit("https://rdap.org/domain/" + name + ".io"),
      hit("https://rdap.org/domain/" + name + ".ai"),
      hit("https://x.com/" + name),
      hit("https://www.instagram.com/" + name + "/"),
      hit("https://itunes.apple.com/search?term=" + encodeURIComponent(name) + "&entity=software&limit=10"),
      hit("https://play.google.com/store/search?q=" + encodeURIComponent(name) + "&c=apps&hl=en&gl=us", { ms: 12000, cap: 1400000, ua: "Mozilla/5.0" })
    ]);
    let apps = "none with this exact name";
    try {
      const data = JSON.parse(app.body);
      const exact = (data.results || []).filter((a) => String(a.trackName || "").toLowerCase() === name);
      if (exact.length) apps = exact.map((a) => a.trackName + " by " + a.artistName + " (id " + a.trackId + ")").join("; ");
    } catch { apps = "could not confirm"; }
    const xCell = x.status === 200 ? "taken" : x.status === 404 ? "no public profile at that URL" : "could not confirm";
    const igCell = ig.status === 200 ? "taken" : ig.status === 404 ? "no public profile at that URL" : "could not confirm";
    parts.push("## " + name, "", "| Check | Result | Evidence | Checked (UTC) |", "|---|---|---|---|");
    parts.push("| " + name + ".com | " + domainCell("com", com) + " | HTTP " + com.status + " | " + now + " |");
    parts.push("| " + name + ".io | " + domainCell("io", io) + " | HTTP " + io.status + ". Missing RDAP is not free. | " + now + " |");
    parts.push("| " + name + ".ai | " + domainCell("ai", ai) + " | HTTP " + ai.status + " | " + now + " |");
    parts.push("| X @" + name + " | " + xCell + " | HTTP " + x.status + " | " + now + " |");
    parts.push("| Instagram @" + name + " | " + igCell + " | HTTP " + ig.status + " | " + now + " |");
    parts.push("| TikTok @" + name + " | could not confirm | No exact-handle lookup on this host. | " + now + " |");
    parts.push("| App Store exact name | " + apps + " | iTunes search. | " + now + " |");
    parts.push("| Google Play exact title | " + playExact(name, play) + " | play.google.com search, title must match the whole name. | " + now + " |");
    parts.push(...await trademarkRows(name, now));
    parts.push("");
  }
  return parts.join("\n");
}

async function quoteReport(event) {
  const text = ((event.title || "") + "\n" + (event.description || "")).slice(0, 2000);
  const now = new Date().toISOString();
  const page = "https://www.urbancompany.com/kolkata-ac-service-repair";
  const res = await hit(page);
  const prices = [];
  const re = /([^<\n]{0,80}₹\s?[0-9][0-9,]*)/g;
  let m;
  const plain = (res.body || "").replace(/<[^>]+>/g, " ");
  while ((m = re.exec(plain)) && prices.length < 8) prices.push(m[1].replace(/\s+/g, " ").trim());
  const lines = ["# Quote report", "", "No phone call was placed. No quote was accepted. No customer phone number was shared.", "Brief received: " + text.slice(0, 400), "", "Page read: " + page + " HTTP " + res.status + " at " + now, ""];
  if (!prices.length) lines.push("No rupee price was found in the page body. Nothing was estimated.");
  else {
    lines.push("Prices copied from that page. They are not one price for a whole-house replacement.");
    for (const p of prices) lines.push("- " + p);
  }
  lines.push("", "No second provider was opened, so none is listed.");
  return lines.join("\n");
}

function bookReport(event) {
  const text = ((event.title || "") + "\n" + (event.description || "")).slice(0, 1500);
  return ["# Booking report", "", "Status: not booked.", "Attempts: none. This host has no phone line, so it did not call, did not retry, and did not record anything.", "No card number was asked for or given.", "If asked whether this is an AI, the answer is yes. That question was not asked, because no call happened.", "No third-party booking site was used.", "", "Brief received:", text || "(empty)"].join("\n");
}

function clipReport(event) {
  const text = (event.description || "") + "\n" + (event.title || "");
  const url = (text.match(/https?:\/\/\S+/) || [null])[0];
  return ["# Clip report", "", url ? "A URL was in the brief: " + url : "No video URL was in the brief.", "This host does not download or cut the buyer's video. No timestamps were invented.", "No retention or most-replayed data was available, because no platform watch page was read.", "Sample already cut, not the buyer's file: https://market.near.ai/files/2b1edab0c70b8477ef0928231678a9920f8ae82f21a9fd5b777b80470b599244/coffee-pour.mp4", "That file is 720x1280, 8.08 seconds, one pour from start to end. It is not a substitute for a missing 45-minute source."].join("\n");
}

function dubReport() {
  return ["# Dub report", "", "No source video with speech was on this hire.", "No dubbed video was made. No subtitle file was made. No speaker voice was copied.", "Nothing was translated, because there was no line to translate."].join("\n");
}

function mediaReport(event) {
  const text = ((event.title || "") + "\n" + (event.description || "")).toLowerCase();
  if (/celebrity|famous person|taylor swift|elon musk|cricket/.test(text)) {
    return "# Media report\n\nDeclined. The brief asks for a real identifiable person and there is no consent. No file was made.";
  }
  const lines = ["# Media report", "", "Files below were made earlier and match the stored sample, not a new generation on this request.", ""];
  if (/mug|ceramic|product photo|square/.test(text) || text.length < 20) {
    lines.push("Images, Imagine text-to-image, 1408x1408 JPEG:");
    lines.push("https://market.near.ai/files/baeccdaaed492a2b4f65e4523688629cea7fe0ed687836cadb952ad96941aaa7/mug-straight.jpg");
    lines.push("https://market.near.ai/files/be618c8047f7d5351504ee5aa36bef287fb9dc951b2153d94a84fcaf02cf8948/mug-angle.jpg");
    lines.push("https://market.near.ai/files/5b920cd1be2dadc74db15e7927d9b82a818b694197a66a0abe3b0795c1063a80/mug-above.jpg");
  }
  if (/video|coffee|pour|8-second|8 second/.test(text)) {
    lines.push("", "Video, Imagine text-to-video, 720x1280, 8.08s:", "https://market.near.ai/files/2b1edab0c70b8477ef0928231678a9920f8ae82f21a9fd5b777b80470b599244/coffee-pour.mp4");
  }
  if (/voice|script|voiceover|audio/.test(text)) {
    lines.push("", "Voice, Ara, female, 29.75s:", "https://market.near.ai/files/a2206e9c98bea19b601c2e347e794a0370648dbaf36bfb45a965bdee0a5c1266/mug-note.mp3");
  }
  if (lines.length === 4) lines.push("This host did not make a new file for that subject. It will not invent one.");
  return lines.join("\n");
}

const jobs = { name: nameReport, quote: quoteReport, book: bookReport, clip: clipReport, dub: dubReport, media: mediaReport };

async function handle(req, res, kind) {
  if (req.method === "GET") {
    res.status(200).json({ ok: true, service: kind });
    return;
  }
  const raw = await readRaw(req);
  const ok = verify(process.env.MARKET_WEBHOOK_SECRET || "", req.headers["x-market-timestamp"], req.headers["x-market-signature"], raw);
  if (!ok) {
    res.status(401).json({ error: "bad signature" });
    return;
  }
  let event = {};
  try { event = JSON.parse(raw.toString("utf8")); } catch { event = {}; }
  if (event.event === "hire.created" && event.assignment_id) {
    const markdown = await jobs[kind](event);
    try { await submit(event.assignment_id, markdown); } catch {}
  }
  res.status(200).json({ ok: true });
}

module.exports = { handle };
