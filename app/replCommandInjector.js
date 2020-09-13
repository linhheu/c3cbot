let os = require("os");
let fs = require("fs");
let path = require("path");

let Logging = require("./logging");
let loggerCMD = new Logging("InterfaceHandler");

const RED = "";
const GRAY = "";
const GREEN = "";
const YELLOW = "";

module.exports = {
    addinterface: {
        help: "Add a new interface (but not activate it) {.addinterface <handler> [extra info]}",
        action: setting => {

        }
    },
    removeinterface: {
        help: "Remove an interface {.removeinterface <id>}",
        action: id => {
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
                this.output.write(RED + "ERROR! You need to specify interface ID.");
                return;
            }

            if (!accountData[id]) {
                this.output.write(RED + "ERROR! Interface ID not found.");
                return;
            }

            if (accountData[id].removed) {
                this.output.write(RED + "ERROR! That interface was removed.");
                return;
            }

            if (interfaceList[id].active) {
                interfaceList[id].handler.destroy();
            }
            accountData[id] = {
                removed: true
            }
            fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
            this.output.write(GREEN + `Removed interface ID ${id}.`);
        }
    },
    activeinterface: {
        help: "Activate an interface {.activateinterface <id>}",
        action: id => {
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
                this.output.write(RED + "ERROR! You need to specify interface ID.");
                return;
            }

            if (!accountData[id]) {
                this.output.write(RED + "ERROR! Interface ID not found.");
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
                    this.output.write(RED + "ERROR! Unknown handler name. Please remove this interface or check the version you are using.");
                    return;
                }

                accountData[id].active = true;
                fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
                this.output.write(GREEN + `Activated interface ID ${id}.`);
            } else {
                this.output.write(RED + "ERROR! That interface is already activated.");
            }
        }
    },
    deactiveinterface: {
        help: "Deactivate an interface {.deactivateinterface <id>}",
        action: id => {
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
                this.output.write(RED + "ERROR! You need to specify interface ID.");
                return;
            }

            if (!accountData[id]) {
                this.output.write(RED + "ERROR! Interface ID not found.");
                return;
            }

            if (accountData[id].active && interfaceList[id].active) {
                try {
                    interfaceList[id].handler.destroy();
                    interfaceList[id].active = false;
                } catch (_) {}
                accountData[id].active = false;
                fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
                this.output.write(GREEN + `Deactivated interface ID ${id}.`);
            } else {
                this.output.write(RED + "ERROR! That interface is already deactivated.");
            }
        }
    },
    listinterface: {
        help: "Show interface list",
        action: () => {
            /** @type array */
            let interfaceList = global.interfaceList;
            let generatedOutput = os.EOL;

            for (let id in interfaceList) {
                if (interfaceList[id].removed) continue;

                if (interfaceList[id].invalidHandler) {
                    generatedOutput += GRAY + `(ID ${id}) invalid - unknown handler ${interfaceList[id].handler}` + os.EOL;
                    continue;
                }

                if (interfaceList[id].active) {
                    if (interfaceList[id].handler.ready) {
                        generatedOutput += GREEN + `(ID ${id}) ${interfaceList[id].handler} - ready` + os.EOL;
                    } else {
                        generatedOutput += YELLOW + `(ID ${id}) ${interfaceList[id].handler} - not ready` + os.EOL;
                    }
                } else {
                    generatedOutput += RED + `(ID ${id}) ${interfaceList[id].handler} - deactivated` + os.EOL;
                }
            }

            this.output.write(generatedOutput);
        }
    }
}
