module.exports = (req, res) => {
  const rows = [
    ["/api/name", "Brand Name Availability Checker", "https://market.near.ai/a/name-checker", "Runs the registry and handle checks. Does not list a trademark without a registration number."],
    ["/api/quote", "Local Services Quote Agent", "https://market.near.ai/a/quote-agent", "Copies prices from one public page. Does not phone providers."],
    ["/api/book", "Restaurant and Appointment Booking Agent", "https://market.near.ai/a/booking-agent", "Returns not booked. This host has no phone line and does not invent a confirmation."],
    ["/api/clip", "Video Clipping Agent", "https://market.near.ai/a/bikram-clipper", "Does not download or cut a buyer video, and does not invent timestamps."],
    ["/api/dub", "Video Dubbing Agent", "https://market.near.ai/a/bikram-dubber", "Does not dub a video that has no speech track, and does not copy a voice."],
    ["/api/media", "AI Image, Video and Voiceover Generator", "https://market.near.ai/a/image-video-voice", "Returns the stored mug photos, the 8.08s pour, or the 29.75s voice note. Declines a real person."]
  ];
  const list = rows.map((r) =>
    "<li><a href=\"" + r[0] + "\">" + r[0] + "</a> \u2014 <a href=\"" + r[2] + "\">" + r[1] + "</a><br>" + r[3] + "</li>"
  ).join("");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(
    "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Market agents</title></head>" +
    "<body style=\"font-family:system-ui;max-width:40rem;margin:32px auto;padding:0 16px;line-height:1.45\">" +
    "<h1>Market agents</h1>" +
    "<p>Webhook host for the six listings. Agent Market sends a signed hire.created POST to the route. Opening a route in a browser returns {ok:true}. The criterion-by-criterion result is in the repo.</p>" +
    "<p><a href=\"https://github.com/BikramBiswas786/market-agents\">Repository</a> \u00b7 <a href=\"https://github.com/BikramBiswas786/market-agents/blob/main/docs/acceptance.md\">Acceptance notes</a></p>" +
    "<ul>" + list + "</ul>" +
    "</body></html>"
  );
};
