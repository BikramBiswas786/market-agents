const { handle } = require("../lib/runtime");
module.exports = (req, res) => handle(req, res, "media");
module.exports.config = { api: { bodyParser: false } };
