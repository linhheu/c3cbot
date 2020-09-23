if (
    global.getType(global.responseResolver.internal) !== "Function" &&
    global.getType(global.responseResolver.internal) !== "AsyncFunction"
) {
    global.responseResolver.internal = async function internalResolver(data) {
        return {
            content: data.content,
            attachments: (data.attachments === "")
        }
    }
}

// Top-level await isn't here yet... node 12 ffs
module.exports = async () => {
    if (global.getType(await global.centralData.get("default", "customPrefix")) !== "Array") 
        await global.centralData.set("default", "customPrefix", []);

    if (global.getType(await global.centralData.get("default", "customLang")) !== "Array") 
        await global.centralData.set("default", "customLang", []);

    return async function commandResolver(cmdData) {
        // TODO: insert chathook handler here

        /** @type {Array<>} */
        let prefixList = await global.centralData.get("default", "customPrefix");
        /** @type {Array<>} */
        let languageList = await global.centralData.get("default", "customLang");
        /** @type {string} */
        let thisThreadPrefix = (prefixList[cmdData.id] || [])[
            cmdData.rawClient.constructor.configAtServer ? cmdData.data.serverID : cmdData.data.threadID
        ] || process.env.DEFAULT_COMMAND_PREFIX;

        let thisUserLang = 
            (languageList[cmdData.id] || [])[cmdData.data.author] || 
            (languageList[cmdData.id] || [])[
                cmdData.rawClient.constructor.configAtServer ? cmdData.data.serverID : cmdData.data.threadID
            ] ||
            process.env.DEFAULT_LANGUAGE;

        if (cmdData.data.content.startsWith(thisThreadPrefix)) {
            // internal command resolver
            let args = global.splitArgs(cmdData.data.content);
            let command = args[0].substr(thisThreadPrefix.length);

            if (global.commandMapping.aliases[command]) {
                // TODO: command found
            } else {
                let returnLang = global.languageHandler(thisUserLang, "COMMAND_NOT_FOUND");

                cmdData.rawClient.sendMsg({
                    content: returnLang,
                    replyTo: {
                        user: cmdData.data.author,
                        message: cmdData.data.messageID
                    },
                    threadID: cmdData.data.threadID,
                    serverID: cmdData.data.serverID
                });
            }
        }
    }
}
