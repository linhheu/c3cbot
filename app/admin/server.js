const path = require("path");

const express = require("express");
const app = express();
const port = process.env.PORT || process.env.ACI_PORT || 3000;
const cookieParser = require("cookie-parser");
var expressWs = require('express-ws')(app);

let Logger = require("../logging");
let logger = new Logger("ACInterface");
/** @type {Function} */
let log = logger.log.bind(logger);

let apiHandler = require("./api");

let validToken = [];

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("./app/admin/public"));
app.get("/", function indexPage(req, res) {
    if (validToken.indexOf(req.cookies.authToken) + 1) {
        // Go to control panel
        res.redirect("/control/");
    } else {
        res.cookie("authToken", "", {
            expires: new Date(1)
        });
        res.sendFile(path.join(process.cwd(), "app", "admin", "default", "login.html"));
    }
});
app.post("/", function checkLogin(req, res) {
    if (
        process.env.ACI_PASSWORD !== "<not set>" &&
        req.body.password === process.env.ACI_PASSWORD
    ) {
        let token = Math.random().toString(36).replace(/[^a-z]+/g, "")
            + Math.random().toString(36).replace(/[^a-z]+/g, "")
            + Math.random().toString(36).replace(/[^a-z]+/g, "")
            + Math.random().toString(36).replace(/[^a-z]+/g, "")
            + Math.random().toString(36).replace(/[^a-z]+/g, "")

        validToken.push(token);
        res.cookie("authToken", token);
        log(`${req.ip} logged in (token=${token})`)
        res.redirect("/control/");
    } else {
        res.status(400);
        res.sendFile(path.join(process.cwd(), "app", "admin", "default", "login-failed.html"));
    }
});

app.use("/control", function checkCookie(req, res, next) {
    if (validToken.indexOf(req.cookies.authToken) + 1) {
        next();
    } else {
        res.cookie("authToken", "", {
            expires: new Date(1)
        });
        res.redirect("/");
    }
});
app.use("/control", express.static(path.join(process.cwd(), "./app/admin/default/control")));

// WebSocket. Interesting... 
app.ws('/', function (ws, req) {
    if (validToken.indexOf(req.cookies.authToken) + 1) {
        ws.send(JSON.stringify({
            msgtype: "welcome",
            botname: process.env.BOT_NAME,
            version: "1.0.0-beta" // constant, will change later
        }));
        ws.on('message', async function apiCall(msg) {
            let jdata;
            try {
                jdata = JSON.parse(msg);
            } catch (_) {
                ws.terminate();
                return;
            }

            if (validToken.indexOf(jdata.authToken) + 1) {
                switch (jdata.opcode) {
                    case 0x00: // Ping
                        ws.send(JSON.stringify({
                            msgtype: "response",
                            nonce: jdata.nonce,
                            ping: true
                        }));
                        break;
                    default:
                        ws.send(apiHandler(jdata));
                }
            } else {
                ws.send(JSON.stringify({
                    msgtype: "error",
                    error: "authToken not found.",
                    errorCode: 1,
                    nonce: jdata.nonce
                }));
            }
        });
    } else {
        ws.terminate();
    }
});

app.on("upgrade", (request, socket, head) => {
    let cookie = cookieParser.JSONCookie(request.headers.cookie || "");
    if (validToken.indexOf(cookie.authToken) + 1) {
        wsServer.handleUpgrade(request, socket, head, socket => {
            wsServer.emit("connection", socket, request);
        });
    } else {
        socket.write(`HTTP/${request.httpVersion} 401 Unauthorized\n\n`);
        socket.end();
    }
});

app.listen(port, process.env.ACI_HOST, () => {
    log("Listening at " + (process.env.ACI_HOST || "0.0.0.0") + ":" + port);
});
