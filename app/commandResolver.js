const stream = require("stream");

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
        if (global.getType(data.data) !== "Object") throw new Error(`InternalResolver: Cannot resolve data type "${global.getType(data.data)}"`);
        return new ResolvedData({
            content: String(data.data.content),
            attachments: global.getType(data.data.attachments) === "Array" ?
                (await Promise.all(data.data.attachments.map(item => {
                    if (item instanceof stream.Readable || item instanceof stream.Duplex || item instanceof stream.Transfrom) {
                        // Converting stream to buffer
                        return new Promise((resolve, reject) => {
                            let d = [];
                            item.on("data", c => {
                                d.push(c);
                            });

                            item.on("end", () => {
                                let resolved = d.map(c => {
                                    if (c instanceof Buffer) return c;
                                    return Buffer.from(c);
                                });
                                resolve({
                                    attachment: Buffer.from(new Uint8Array(resolved.map(x => [...x]).flat(Infinity))),
                                    name: item.name || (Math.round(Math.random() * Math.pow(2 * 16)).toString(16) + ".png")
                                });
                            });
                        });
                    }

                    if (item instanceof Buffer) {
                        return Promise.resolve({
                            attachment: item,
                            name: Math.round(Math.random() * Math.pow(2 * 16)).toString(16) + ".png"
                        });
                    }

                    if (global.getType(item) == "Object") {
                        if (item.attachment instanceof stream.Readable || item.attachment instanceof stream.Duplex || item.attachment instanceof stream.Transfrom) {
                            // Converting stream to buffer
                            return new Promise((resolve, reject) => {
                                let d = [];
                                item.attachment.on("data", c => {
                                    d.push(c);
                                });

                                item.attachment.on("end", () => {
                                    let resolved = d.map(c => {
                                        if (c instanceof Buffer) return c;
                                        return Buffer.from(c);
                                    });
                                    resolve({
                                        attachment: Buffer.from(new Uint8Array(resolved.map(x => [...x]).flat(Infinity))),
                                        name: item.name || item.attachment.name || (Math.round(Math.random() * Math.pow(2 * 16)).toString(16) + ".png")
                                    });
                                });

                                item.attachment.on("error", reject);
                            });
                        }

                        if (item.attachment instanceof Buffer) {
                            return Promise.resolve({
                                attachment: item.attachment,
                                name: item.name || (Math.round(Math.random() * Math.pow(2 * 16)).toString(16) + ".png")
                            });
                        }
                    }
                    return Promise.resolve(null);
                }))).filter(x => x != null) :
                []
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
                        let executedCMD = await r.exec({
                            args: JSON.parse(JSON.stringify(args)),
                            cmdName: command,
                            senderID: cmdData.data.author,
                            threadID: cmdData.data.threadID,
                            serverID: cmdData.data.serverID,
                            configAtServer: cmdData.rawClient.constructor.configAtServer,
                            messageID: cmdData.data.messageID,
                            interfaceID: cmdData.rawClient.id,
                            rawData: cmdData
                        });

                        if (global.getType(executedCMD) === "Object" && global.getType(executedCMD.handler) === "String") {
                            let comingFrom = [];
                            let previousData = {};
                            for (; ;) {
                                let resolver = global.responseResolver[
                                    (previousData.handler || executedCMD.handler) === "default" ?
                                        process.env.DEFAULT_MESSAGE_RESOLVER :
                                        (previousData.handler || executedCMD.handler)
                                ];
                                if (global.getType(resolver) !== "Function" && global.getType(resolver) !== "AsyncFunction")
                                    throw new Error(`There's no resolver named ${previousData.handler || executedCMD.handler}`);
                                let returnedData = await resolver({
                                    handler: previousData.handler || executedCMD.handler,
                                    data: previousData.data || executedCMD.data,
                                    comingFrom
                                });
                                if (returnedData instanceof ResolvedData) {
                                    cmdData.rawClient.sendMsg({
                                        content: returnedData.content,
                                        attachments: returnedData.attachments,
                                        replyTo: {
                                            user: cmdData.data.author,
                                            message: cmdData.data.messageID
                                        },
                                        threadID: cmdData.data.threadID,
                                        serverID: cmdData.data.serverID
                                    }, {});
                                    return null;
                                } else if (global.getType(returnedData) === "Object" && global.getType(returnedData.handler) === "String") {
                                    // Passthrough (Plugin -> Handler 1 -> Handler 2...)
                                    previousData = {
                                        handler: executedCMD.handler,
                                        data: executedCMD.data
                                    }
                                    continue;
                                }
                                throw new Error(`Invalid data returned from resolver ${previousData.handler || executedCMD.handler}`);
                            }
                        } else {
                            return;
                        }
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
