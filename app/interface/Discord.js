let Discord = require("discord.js");
let Logger = require("../logging");

module.exports = class DiscordInterface {
    #log = () => { };
    #commandHandler = () => { };
    ready = false;
    type = "Discord";
    static get type() {
        return "Discord";
    }
    accountID = "0";
    accountName = "null#0000";
    static get idHeader() {
        return {
            user: "DC?U",
            message: "DC?M",
            thread: "DC?C",
            server: "DC?S"
        };
    }
    destroyed = false;
    lastError = null;
    lastErrorTimestamp = 0;

    static get configAtServer() {
        return true;
    }

    static configParser(args, ifWeb) {
        if (ifWeb) {
            if (args["bot_token"] && args["bot_token"].length) {
                return {
                    token: args["bot_token"]
                }
            } else throw "Missing bot_token";
        } else {
            if (args[1] && args[1].length) {
                return {
                    token: args[1]
                }
            } else throw "Invalid extra data. Please pass bot token to the extra data argument.";
        }
    }

    static configList = {
        bot_token: "string"
    };

    constructor(commandHandler, id, loginInfo) {
        let logger = new Logger(`Discord | ${Number(id)}`);
        let log = logger.log.bind(logger);
        this.#log = logger.log.bind(logger);
        this.#commandHandler = commandHandler;
        this.id = Number(id);
        this.client = new Discord.Client();
        this.client.login(loginInfo.token);

        this.client.on("ready", () => {
            this.ready = true;
            log(`Logged in as ${this.client.user.tag}${this.client.user.verified ? " (Verified)" : ""}`);
            this.accountID = this.client.user.id;
            this.accountName = this.client.user.tag;

            commandHandler("interfaceUpdate", { id, ready: true, rawClient: this });
        });

        this.client.on("message", msg => {
            commandHandler("commandExec", {
                id,
                rawClient: this,
                rawMessage: msg,
                data: {
                    content: msg.content,
                    mentions: msg.mentions,
                    attachments: msg.attachments,
                    author: this.constructor.idHeader.user + "$@$" + msg.author.id,
                    messageID: this.constructor.idHeader.message + "$@$" + msg.id,
                    isBot: msg.author.bot,
                    noResolve: msg.author.bot || msg.system,
                    threadID: this.constructor.idHeader.thread + "$@$" + msg.channel.id,
                    serverID: this.constructor.idHeader.server + "$@$" + msg.guild.id
                }
            });
        });

        this.client.on("error", e => {
            this.lastError = e;
            this.lastErrorTimestamp = Date.now();
            log("Error:", e);
            this.ready = false;

            commandHandler("interfaceUpdate", { id, ready: false, rawClient: this });
        });
    }

    destroy() {
        this.client.removeAllListeners();
        this.client.destroy();
        if (this.ready) {
            this.ready = false;
            this.#commandHandler("interfaceUpdate", { id: this.id, ready: false, rawClient: this });
        }
    }

    async sendMsg(data, rawContent) {
        let channel = await this.client.channels.fetch(data.threadID);
        return await channel.send(data.content || "", {
            reply: data.replyTo.user,
            split: true, 
            files: data.attachments,
            ...rawContent
        });
    }
}