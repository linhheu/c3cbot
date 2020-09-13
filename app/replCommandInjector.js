let os = require("os");
let fs = require("fs");
let path = require("path");

const RED = "";
const GRAY = "";
const GREEN = "";
const YELLOW = "";

module.exports = {
    addinterface: {
        help: "Add a new interface (but not activate it) {.addinterface <handler> [extra info]}",
        action: () => { }
    },
    removeinterface: {
        help: "Remove an interface {.removeinterface <id>}",
        action: () => { }
    },
    activeinterface: {
        help: "Activate an interface {.activateinterface <id>}",
        action: () => { }
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

            if (accountData[id].active) {
                // TODO: deactivate that interface
                try {
                    interfaceList[id].handler.destroy();
                    interfaceList[id].active = false;
                } catch (_) {}
                accountData[id].active = false;
                fs.writeFileSync(accountDataPath, JSON.stringify(accountData, null, 2));
                this.output.write(GREEN + `Deactivated interface ID ${id}`);
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
