module.exports = {
    originalCMD: "help",
    namespacedCMD: "internal:help",
    conflict: false,
    supportedPlatform: ["*"],
    scope: "internal",
    exec: async function getHelp(cmdData) {
        function format(str) {
            str = str.replace("$@$", cmdData.prefix);
            let r = str.replace(/\$\$INTMSG{(.+?)}\$\$/g, function replacer(_, t) {
                return global.languageHandler(cmdData.language, t);
            });
            return r;
        }

        async function printCMDList(page = 1) {
            let v = "\n";
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
                let id = global.commandMapping.aliases[cmdName].pointTo;
                let c = global.commandMapping.cmdList[id];
                let aliases = Object.entries(global.commandMapping.aliases).filter(v => v[1].pointTo === id).map(v => v[0]);
                return "\n"
                    + cmdName + (c.helpArgs == null ? "" : (
                        global.getType(c.helpArgs) === "Object" ?
                            format(c.helpArgs[cmdData.language]) || format(c.helpArgs["en_US"]) :
                            format(c.helpArgs)
                    )) + "\n"
                    + "\n"
                    + (c.helpDesc == null ? global.languageHandler(cmdData.language, "HELP_NO_DESC") : (
                        global.getType(c.helpDesc) === "Object" ?
                            format(c.helpDesc[cmdData.language]) || format(c.helpDesc["en_US"]) :
                            format(c.helpDesc)
                    )) + "\n"
                    + "\n"
                    + global.languageHandler(cmdData.language, "HELP_EXAMPLE") + " " + (
                        global.getType(c.example) === "Array" ?
                        c.example.reduce((a, v) => a + "- " + format(v) + "\n", "") :
                        global.languageHandler(cmdData.language, "HELP_NONE")
                    ) + "\n"
                    + global.languageHandler(cmdData.language, "HELP_ALIASES") + " " + aliases.join(", ");
            } else {
                return global.languageHandler(cmdData.language, "HELP_COMMAND_NOT_FOUND")
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
