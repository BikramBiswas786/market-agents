const { handle } = require("../lib/runtime");
module.exports = (req, res) => handle(req, res, "clip");
module.exports.config = { api: { bodyParser: false } };
