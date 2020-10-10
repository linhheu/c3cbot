const express = require("express");
const app = express();
const port = process.env.PORT || process.env.ACI_PORT || 3000;

let Logger = require("../logging");
let logger = new Logger("ACInterface");
/** @type {Function} */
let log = logger.log.bind(logger);

app.use(express.static("./public"));

app.listen(port, process.env.ACI_HOST, () => {
    log("Listening at " + (process.env.ACI_HOST || "0.0.0.0") + port);
});
