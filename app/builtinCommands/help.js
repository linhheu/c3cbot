module.exports = {
    originalCMD: "help",
    namespacedCMD: "internal:help",
    conflict: false,
    supportedPlatform: ["*"],
    scope: "internal",
    showDefault: true,
    execDefault: true,
    exec: async function getHelp(cmdData) {
        function format(str, cmd) {
            str = str
                .replace("$@$", cmdData.prefix)
                .replace("$!$", cmd);
            let r = str.replace(/\$\$INTMSG{(.+?)}\$\$/g, function replacer(_, t) {
                return global.languageHandler(cmdData.language, t);
            });
            return r;
        }

        async function printCMDList(page = 1) {
            let v = global.languageHandler(cmdData.language, "HELP_CMD_LIST") + "\n";
            let cmdPerPage = 50;
            let cmdListObject = global.commandMapping.cmdList.filter(x => x != null);
            for (let i in cmdListObject) {
                // Check permission to view
                let pr = await global.checkPermission(cmdData.senderID, `internal.viewhelp.${cmdListObject[i].namespacedCMDs}`);
                if (
                    (pr === 0 && !cmdListObject[i].showDefault) || 
                    pr === -1 ||
                    pr === -2
                ) {
                    delete cmdListObject[i];
                }
            }
            cmdListObject = cmdListObject.filter(x => x != null);

            v += cmdListObject.map(x => x.conflict ? x.namespacedCMD : x.originalCMD).join(" | ").slice(cmdPerPage * (page - 1), cmdPerPage * page);
            v += `\n\n(${global.languageHandler(cmdData.language, "PAGE")} ${page}/${Math.ceil(cmdListObject.length / cmdPerPage)})`;
            return v;
        }

        async function printCMDInfo(cmdName = "") {
            if (global.commandMapping.aliases[cmdName]) {
                let id = global.commandMapping.aliases[cmdName].pointTo;
                let c = global.commandMapping.cmdList[id];

                let pr = await global.checkPermission(cmdData.senderID, `internal.viewhelp.${c.namespacedCMDs}`);
                if (
                    (pr === 0 && !c.showDefault) || 
                    pr === -1 ||
                    pr === -2
                ) {
                    return global.languageHandler(cmdData.language, "HELP_NO_PERM_VIEW").replace("${perm}", `internal.viewhelp.${c.namespacedCMDs}`);
                }

                let aliases = Object.entries(global.commandMapping.aliases).filter(v => v[1].pointTo === id).map(v => v[0]);
                return "\n"
                    + cmdData.prefix + cmdName + (c.helpArgs == null ? "" : " " + (
                        global.getType(c.helpArgs) === "Object" ?
                            format(c.helpArgs[cmdData.language], cmdName) || format(c.helpArgs["en_US"], cmdName) :
                            format(c.helpArgs, cmdName)
                    )) + "\n"
                    + (c.helpDesc == null ? global.languageHandler(cmdData.language, "HELP_NO_DESC") : (
                        global.getType(c.helpDesc) === "Object" ?
                            format(c.helpDesc[cmdData.language], cmdName) || format(c.helpDesc["en_US"], cmdName) :
                            format(c.helpDesc, cmdName)
                    )) + "\n"
                    + "\n"
                    + global.languageHandler(cmdData.language, "HELP_EXAMPLE") + " " + (
                        global.getType(c.example) === "Array" ?
                        c.example.reduce((a, v) => a + "- " + format(v, cmdName) + "\n", "\n") :
                        global.languageHandler(cmdData.language, "HELP_NONE")
                    ) + "\n"
                    + global.languageHandler(cmdData.language, "HELP_ALIAS") + " " + aliases.join(", ");
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
