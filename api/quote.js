const { handle } = require("../lib/runtime");
module.exports = (req, res) => handle(req, res, "quote");
module.exports.config = { api: { bodyParser: false } };
