class ResolvedData {
    constructor(data) {
        Object.assign(this, data);
        this.type = "ResolvedData";
    }
}

global.ResolvedData = ResolvedData;

if (
    global.getType(global.responseResolver.internal) !== "Function" &&
    global.getType(global.responseResolver.internal) !== "AsyncFunction"
) {
    global.responseResolver.internal = async function internalResolver(data) {
        return new ResolvedData({
            content: data.content,
            attachments: (data.attachments === "")
        });
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

            let returnLang = "";
            if (global.commandMapping.aliases[command]) {
                let r = global.commandMapping.cmdList[global.commandMapping.aliases[command].pointTo];
                if (r.supportedPlatform.includes("*") || r.supportedPlatform.includes(cmdData.rawClient.type)) {
                    try {
                        // TODO: Send data to command and then resolve the data returned from the command.
                        let executedCMD = await r.exec();
                    } catch (e) {
                        returnLang = global.languageHandler(thisUserLang, "COMMAND_CRASHED").replace("${error}", e.stack);
                    }
                } else {
                    returnLang = global.languageHandler(thisUserLang, "UNSUPPORTED_PLATFORM_CMD").replace("${interfaceType}", cmdData.rawClient.type);
                }
            } else {
                returnLang = global.languageHandler(thisUserLang, "COMMAND_NOT_FOUND");
            }
            cmdData.rawClient.sendMsg({
                content: returnLang,
                replyTo: {
                    user: cmdData.data.author,
                    message: cmdData.data.messageID
                },
                threadID: cmdData.data.threadID,
                serverID: cmdData.data.serverID
            }, {});
        }
    }
}
