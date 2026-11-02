const { handle } = require("../lib/runtime");
module.exports = (req, res) => handle(req, res, "book");
module.exports.config = { api: { bodyParser: false } };
