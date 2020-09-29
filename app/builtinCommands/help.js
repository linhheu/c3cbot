module.exports = {
    originalCMD: "help",
    namespacedCMD: "internal:help",
    conflict: false,
    supportedPlatform: ["*"],
    scope: "internal",
    exec: async function getHelp(cmdData) {
        async function printCMDList(page = 1) {
            let v = "";
            let cmdCount = 0;
            let cmdPerPage = 50;
            let cmdListObject = global.commandMapping.cmdList.filter(x => x != null);
            for (let i = cmdPerPage * (page - 1); i < cmdPerPage; i++) {
                let c = cmdListObject[i];
                if (c == null) break;
                v += (v !== "" ? " | " : "");
                v += c.conflict ? c.namespacedCMD : c.originalCMD;
                cmdCount++;
                if (cmdCount >= cmdPerPage) break;
            }
            v += "\n";
            v += `(${page}/${Math.ceil(cmdListObject.length / cmdPerPage)})`;
            return v;
        }

        async function printCMDInfo(cmdName = "") {
            if (global.commandMapping.aliases[cmdName]) {
                return {
                    handler: "default",
                    data: {
                        content: "WIP. Coming soon."
                    }
                }
            } else {
                return {
                    handler: "default",
                    data: {
                        content: global.languageHandler(cmdData.language, "HELP_COMMAND_NOT_FOUND")
                    }
                }
            }
        }

        if (cmdData.args.length === 1) {
            return {
                handler: "default",
                data: {
                    content: await printCMDList(1)
                }
            }
        } else {
            let page = parseInt(cmdData.args[1], 10);
            if (!isNaN(page) && /^\d*$/.test(page)) {
                return {
                    handler: "default",
                    data: {
                        content: await printCMDList(page)
                    }
                }
            } else {
                // Check for command help
                return {
                    handler: "default",
                    data: {
                        content: await printCMDInfo(cmdData.args[1])
                    }
                }
            }
        }
    },
    helpArgs: "$$INTMSG{HELP_ARGUMENTS}$$",
    helpDesc: "$$INTMSG{HELP_DESCRIPTION}$$",
    example: [
        "$@$help",
        "$@$help 2",
        "$@$help help"
    ]
}
