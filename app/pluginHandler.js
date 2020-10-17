let fs = require("fs");
let Logger = require("./logging");
let logger = new Logger("PluginHandler");
let log = logger.log.bind(logger);


class LoadPluginError extends Error {
    constructor(str, obj) {
        super(str);
        Object.assign(this, obj);
    }
}

async function readFirstNBytes(path, n) {
    const chunks = [];
    for await (let chunk of fs.createReadStream(path, { start: 0, end: n })) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

if (global.getType(global.plugins) != "Object")
    global.plugins = {
        loadedPlugins: [],
        pluginScope: {},
        zipHandler: {},
        tempLoadPass2: []
    };

if (global.getType(global.commandMapping) != "Object")
    global.commandMapping = {
        cmdList: [],
        aliases: {},
        hook: {}
    };

let sortPass2 = function sortPass2() {
    let wait = global.plugins.tempLoadPass2;
    let waitx = [];
    for (let p of wait) {
        for (let pl in p.depends) {
            let index = waitx.findIndex(v => v.name === pl);
            let depIndex = wait.findIndex(v => v.name === pl)
            if (!(index + 1)) {
                if (!(depIndex + 1)) {
                    if (global.plugins.loadedPlugins.findIndex(v => v.name === pl) + 1) continue;
                    break;
                }
                waitx.push(wait[depIndex]);
            }
        }
        waitx.push(p);
    }
    waitx = waitx.filter((v, i, a) => {
        return a.indexOf(v) == i;
    });
}

let loadPluginTypeA = require("./pluginTypeHandler/A");

let loadPlugin = async function loadPlugin(fileDir, loadAll) {
    if (fs.existsSync(fileDir)) {
        let fileInfo = await fs.promises.stat(fileDir);
        if (fileInfo.isDirectory()) {
            // Type B
            throw new LoadPluginError("Type B (directory) plugin is currently not supported.");
        } else if (fileInfo.isFile()) {
            let header = (await readFirstNBytes(fileDir, 512)).toString("utf8");
            if (header.startsWith("\x04\x03\x4b\x50")) {
                // Type A
                return await loadPluginTypeA(fileDir, loadAll);
            }

            if (header.startsWith("C3CBot Encrypted Plugin - Type C (public)\0\r\n")) {
                // Type C
                throw new LoadPluginError("Type C (encrypted) plugin is currently not supported.");
            }

            if (header.startsWith("C3CBot Encrypted Plugin - Type D (machine-specific)\0\r\n")) {
                throw new LoadPluginError("Type D (encrypted machine-specific) plugin is currently not supported.");
            }
        }
    }
}

let unloadPlugin = async function unloadPlugin(name) {
    let index = global.plugins.loadedPlugins.findIndex(v => v.name === name);
    if (index + 1) {
        let scopeName = global.plugins.loadedPlugins[index].scopeName;
        let scope = global.plugins.pluginScope[scopeName];
        if (
            global.getType(scope.onUnload) === "Function" ||
            global.getType(scope.onUnload) === "AsyncFunction"
        ) {
            try {
                await scope.onUnload();
            } catch (_) { }
        }
        // Command removing by ID
        for (let id in global.commandMapping.cmdList) {
            if (global.commandMapping.cmdList[id].scope === scopeName) {
                delete global.commandMapping.cmdList[id];
            }
        }
        // Alias removing
        for (let alias in global.commandMapping.aliases) {
            let cID = global.commandMapping.aliases[alias].pointTo;
            if (global.getType(global.commandMapping.cmdList[cID]) !== "Object") {
                log(`Alias "${alias}" no longer point to a valid command ID (${cID}). Deleting...`);
                delete global.commandMapping.aliases[alias];
            }
        }
        // Resolve command conflict again.
        let resolveAgain1 = Object.entries(global.commandMapping.aliases);
        let resolveAgain2 = resolveAgain1.map(x => x[0].split(":")[1]);
        for (let i in resolveAgain2) {
            let otherIDs = resolveAgain2.indexOf(resolveAgain2[i]);
            if (otherIDs + 1) {
                let commandID = resolveAgain1[otherIDs][1].pointTo;
                global.commandMapping.cmdList[commandID].conflict = true;
            }
            let currentCommandID = resolveAgain1[i][1].pointTo;
            global.commandMapping.cmdList[currentCommandID].conflict = Boolean(otherIDs + 1);
        }

        for (let pl of global.plugins.loadedPlugins) {
            if (pl.dep[name]) await unloadPlugin(pl.name);
        }
        delete global.plugins.pluginScope[scopeName];
        delete global.plugins.loadedPlugins[index];
        delete global.plugins.zipHandler[scopeName];
        log("Unloaded plugin:", name);
    } else {
        throw new LoadPluginError("There's no plugin with that name.", { errorCode: 15 });
    }
}

let loadAllPlugin = async function loadAllPlugin(path) {
    if (fs.existsSync(path)) {
        // Finding Type A plugin
        let pluginList = global.findFromDir(path, /^.*\.zip$/, true, false);

        for (let p of pluginList) {
            try {
                await loadPlugin(p, true);
            } catch (e) {
                log("Error while loading", p + ":", e);
            }
        }
        sortPass2();
        for (let p2 of global.plugins.tempLoadPass2) {
            try {
                await loadPlugin(p2.url, false);
            } catch (e) {
                log("Error while loading", p2.url + ":", e);
            }
        }
        global.plugins.tempLoadPass2 = [];
    } else throw new LoadPluginError("No such directory exist.", { errorCode: 16 });
}

let unloadAllPlugin = async function unloadAllPlugin() {
    for (let p of global.plugins.loadedPlugins) {
        await unloadPlugin(p.name);
    }
}

module.exports = {
    loadPlugin,
    loadAllPlugin,
    unloadPlugin,
    unloadAllPlugin,
    LoadPluginError
}
