const { handle } = require("../lib/runtime");
module.exports = (req, res) => handle(req, res, "name");
module.exports.config = { api: { bodyParser: false } };
