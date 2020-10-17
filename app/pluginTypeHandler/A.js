let AdmZip = require("adm-zip");
let defaultFunc = require("./default");

module.exports = async function loadPluginTypeA(file, loadAll) {
    if (fs.existsSync(file)) {
        let zip = null;
        try {
            zip = new AdmZip(file);
        } catch (_) {
            throw new LoadPluginError("Invalid format (not a ZIP-compatible file)", { errorCode: 1 });
        }
        let pluginInfo = zip.readAsText("plugins.json");
        let newRootDIR = "";
        if (global.getType(pluginInfo) !== "String" || !pluginInfo.length) {
            let zipEntries = zip.getEntries();
            newRootDIR = zipEntries.reduce((a, v) => {
                let r = v.entryName.split("/")[0];
                if (r.length === 0) return 9;
                if (!a) return r;
                if (a === r) return r;
                return 9;
            }, null);
            if (newRootDIR === 9) throw new LoadPluginError("plugins.json file not found", { errorCode: 2 });
            pluginInfo = zip.readAsText(`${newRootDIR}/plugins.json`);
            if (global.getType(pluginInfo) !== "String")
                throw new LoadPluginError("plugins.json file not found", { errorCode: 2 });
        }
        let pInfo = null;
        try {
            pInfo = JSON.parse(pluginInfo);
        } catch (e) {
            throw new LoadPluginError("Malformed JSON data in plugins.json.", { errorCode: 3 });
        }

        // Trigger default plugin loading routine
        let r = await defaultFunc(file, pInfo, function getPFile(file, isText) {
            if (isText) {
                return zip.readAsText(`${newRootDIR}/${file}`);
            } else {
                return zip.readFile(`${newRootDIR}/${file}`);
            }
        }, function getPDir(path, recursive) {
            return zip.getEntries()
                .filter(v => {
                    let n = v.entryName;
                    let pass1 = n.startsWith(path);
                    let pass2 = recursive || (n.split("/").length == dir.split("/").length);
                    return pass1 && pass2;
                })
                .map(v => v.entryName);
        }, loadAll);
        if (r.status === 0) {
            global.plugins.loadedPlugins.push({
                name: pInfo.name,
                scopeName: pInfo.scopeName,
                version: pInfo.version,
                author: pInfo.author,
                dep: pInfo.depends || {},
                type: "A"
            });
            log("Loaded plugin (type A):", pInfo.name);
        }
        return r;
    } else {
        throw new LoadPluginError("File doesn't exist on that location.", { errorCode: 15 });
    }
}
