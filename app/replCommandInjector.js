let fs = require("fs");
let path = require("path");

let Logging = require("./logging");
let loggerCMD = new Logging("InterfaceHandler");

const RED = "\x1B[91m";
const GRAY = "\x1B[90m";
const GREEN = "\x1B[92m";
const YELLOW = "\x1B[93m";
const WHITE = "\x1B[97m";

module.exports = {
    addinterface: {
        help: "Add a new interface (but not activate it) {.addinterface <handler> [extra info]}",
        action: function (setting) {
            // Fooling ESLint, lol
            setting;
            this.output.write(RED + "ERROR! This build of C3C doesn't have this command yet..." + "\n");
        }
    },
    removeinterface: {
        help: "Remove an interface {.removeinterface <id>}",
        action: function (id) {
            /** @type array */
            let interfaceList = global.interfaceList;

            let accountDataPath = path.join(process.cwd(), ".data", "accountData.json");
            let accountData = [];
            if (!fs.existsSync(accountDataPath)) {
                fs.writeFileSync(accountDataPath, "[]");
            } else {
                let rawAccountData = fs.readFileSync(accountDataPath, { encoding: "utf8" });
                try {
                    let parsedAccountData = JSON.parse(rawAccountData);
                    if (global.getType(parsedAccountData) !== "Array") throw null;
                    if (!parsedAccountData.every(v => global.getType(v) === "Object")) throw null;
                    accountData = parsedAccountData;
                } catch (_) {
                    fs.writeFileSync(accountDataPath, "[]");
                }
            }

            id = parseInt(id, 10);
            if (isNaN(id)) {
                this.output.write(RED + "ERROR! You need to specify interface ID." + "\n");
                return;
            }

            if (!accountData[id]) {
                this.output.write(RED + "ERROR! Interface ID not found." + "\n");
                return;
            }

            if (accountData[id].removed) {
                this.output.write(RED + "ERROR! That interface was removed." + "\n");
                return;
            }

            if (interfaceList[id].active) {
                interfaceList[id].handler.destroy();
            }
            accountData[id] = {
                removed: true
            }
            fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
            this.output.write(GREEN + `Removed interface ID ${id}.` + "\n");
        }
    },
    activeinterface: {
        help: "Activate an interface {.activateinterface <id>}",
        action: function (id) {
            /** @type array */
            let interfaceList = global.interfaceList;

            let accountDataPath = path.join(process.cwd(), ".data", "accountData.json");
            let accountData = [];
            if (!fs.existsSync(accountDataPath)) {
                fs.writeFileSync(accountDataPath, "[]");
            } else {
                let rawAccountData = fs.readFileSync(accountDataPath, { encoding: "utf8" });
                try {
                    let parsedAccountData = JSON.parse(rawAccountData);
                    if (global.getType(parsedAccountData) !== "Array") throw null;
                    if (!parsedAccountData.every(v => global.getType(v) === "Object")) throw null;
                    accountData = parsedAccountData;
                } catch (_) {
                    fs.writeFileSync(accountDataPath, "[]");
                }
            }

            id = parseInt(id, 10);
            if (isNaN(id)) {
                this.output.write(RED + "ERROR! You need to specify interface ID." + "\n");
                return;
            }

            if (!accountData[id]) {
                this.output.write(RED + "ERROR! Interface ID not found." + "\n");
                return;
            }

            if (!accountData[id].active) {
                interfaceList[id].active = true;

                // Load that interface
                try {
                    let Resolver = require(path.join(process.cwd(), "app", "interface", String(accountData[id].handler)));
                    global.interfaceList.push({
                        active: true,
                        handlerName: accountData[id].handler,
                        handler: new Resolver(async function commandHandler(eventType, data) {
                            switch (eventType) {
                                case "interfaceUpdate":
                                    if (data.ready) {
                                        loggerCMD.log(`Interface ${data.id} logged in as ${data.rawClient.accountName} (${data.rawClient.accountID})`);
                                    }
                                    loggerCMD.log(`Interface ${data.id} is ${data.ready ? "now ready." : "no longer ready."}`);
                                    for (let s of global.plugins.pluginScope) {
                                        if (
                                            global.getType(s.onInterfaceUpdate) === "Function" ||
                                            global.getType(s.onInterfaceUpdate) === "AsyncFunction"
                                        ) {
                                            try {
                                                s.onInterfaceUpdate({
                                                    id: data.id,
                                                    type: data.rawClient.type,
                                                    ready: data.ready,
                                                    interfaceList: global.interfaceList
                                                });
                                            } catch (_) { }
                                        }
                                    }
                                    break;
                                case "commandExec":
                                    break;
                                default:
                                    loggerCMD.log(`Interface ${data.id} return an invalid event "${eventType}" (data: ${data.data}).`);
                            }
                        }, id, accountData[id].loginInfo),
                        invalidHandler: false
                    });

                    for (let s of global.plugins.pluginScope) {
                        if (
                            global.getType(s.onInterfaceUpdate) === "Function" ||
                            global.getType(s.onInterfaceUpdate) === "AsyncFunction"
                        ) {
                            try {
                                s.onInterfaceUpdate({
                                    id: id,
                                    type: global.interfaceList[id].type,
                                    ready: global.interfaceList[id].ready,
                                    interfaceList: global.interfaceList
                                });
                            } catch (_) { }
                        }
                    }
                } catch (_) {
                    this.output.write(RED + "ERROR! Unknown handler name. Please remove this interface or check the version you are using." + "\n");
                    return;
                }

                accountData[id].active = true;
                fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
                this.output.write(GREEN + `Activated interface ID ${id}.` + "\n");
            } else {
                this.output.write(RED + "ERROR! That interface is already activated." + "\n");
            }
        }
    },
    deactiveinterface: {
        help: "Deactivate an interface {.deactivateinterface <id>}",
        action: function (id) {
            /** @type array */
            let interfaceList = global.interfaceList;

            let accountDataPath = path.join(process.cwd(), ".data", "accountData.json");
            let accountData = [];
            if (!fs.existsSync(accountDataPath)) {
                fs.writeFileSync(accountDataPath, "[]");
            } else {
                let rawAccountData = fs.readFileSync(accountDataPath, { encoding: "utf8" });
                try {
                    let parsedAccountData = JSON.parse(rawAccountData);
                    if (global.getType(parsedAccountData) !== "Array") throw null;
                    if (!parsedAccountData.every(v => global.getType(v) === "Object")) throw null;
                    accountData = parsedAccountData;
                } catch (_) {
                    fs.writeFileSync(accountDataPath, "[]");
                }
            }

            id = parseInt(id, 10);
            if (isNaN(id)) {
                this.output.write(RED + "ERROR! You need to specify interface ID." + "\n");
                return;
            }

            if (!accountData[id]) {
                this.output.write(RED + "ERROR! Interface ID not found." + "\n");
                return;
            }

            if (accountData[id].active && interfaceList[id].active) {
                try {
                    interfaceList[id].handler.destroy();
                    interfaceList[id].active = false;
                } catch (_) { }
                accountData[id].active = false;
                fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
                this.output.write(GREEN + `Deactivated interface ID ${id}.` + "\n");
            } else {
                this.output.write(RED + "ERROR! That interface is already deactivated." + "\n");
            }
        }
    },
    listinterface: {
        help: "Show interface list",
        action: function () {
            /** @type array */
            let interfaceList = global.interfaceList;
            let generatedOutput = "\n";

            let stats = {
                invalid: 0,
                notready: 0,
                ready: 0,
                deactivated: 0
            };
            for (let id in interfaceList) {
                if (interfaceList[id].removed) continue;

                if (interfaceList[id].invalidHandler) {
                    generatedOutput += GRAY + `(ID ${id}) invalid - unknown handler ${interfaceList[id].handler}` + "\n";
                    stats.invalid++;
                    continue;
                }

                if (interfaceList[id].active) {
                    if (interfaceList[id].handler.ready) {
                        generatedOutput += GREEN + `(ID ${id}) ${interfaceList[id].handler} - ready` + "\n";
                        stats.ready++;
                    } else {
                        generatedOutput += YELLOW + `(ID ${id}) ${interfaceList[id].handler} - not ready` + "\n";
                        stats.notready++;
                    }
                } else {
                    generatedOutput += RED + `(ID ${id}) ${interfaceList[id].handler} - deactivated` + "\n";
                    stats.deactivated++;
                }
            }
            generatedOutput += "\n" + WHITE + "(" + 
                GRAY + stats.invalid + " invalid" +
                WHITE + "/" + 
                RED + stats.deactivated + " deactivated" + 
                WHITE + "/" + 
                YELLOW + stats.notready + " not ready" + 
                WHITE + "/" + 
                GREEN + stats.ready + " ready" + 
                WHITE + ")" + "\n";

            this.output.write(generatedOutput);
        }
    }
}
