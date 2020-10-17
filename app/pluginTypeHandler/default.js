let sanitizer = require("sanitize-filename");
let loadPackage = require("../npmHandler");
let semver = require("semver");
let path = require("path");
/** @class */
let LoadPluginError = global.LoadPluginError;
let Logger = require("./logging");
let fs = require("fs");
let logger = new Logger("PluginHandler");
let log = logger.log.bind(logger);

module.exports = async function resolveData(file, pInfo, getPFile, getPDir, pDir, loadAll) {
    // Check for plugin parameters
    if (global.getType(pInfo.name) !== "String")
        throw new LoadPluginError("Plugin name must be a string.", { errorCode: 101 });
    if (sanitizer(pInfo.name).length === 0)
        throw new LoadPluginError("Plugin name containing only invalid character.", { errorCode: 101 });
    if (global.getType(pInfo.execFile) !== "String")
        throw new LoadPluginError("Executable file path must be a string.", { errorCode: 102 });
    if (global.getType(pInfo.scopeName) !== "String")
        throw new LoadPluginError("Plugin scope name must be a string.", { errorCode: 103 });
    if (global.getType(pInfo.version) !== "String")
        throw new LoadPluginError("Version must be a string that are parsable using SemVer.", { errorCode: 104 });
    let pVersion = semver.parse(pInfo.version);
    if (!pVersion)
        throw new LoadPluginError("Version must be a string that are parsable using SemVer.", { errorCode: 104 });

    if (pInfo.name.toLocaleUpperCase() === "INTERNAL")
        throw new LoadPluginError("Plugin name cannot be INTERNAL.", {
            errorCode: 1000
        });

    if (pInfo.scopeName.toLocaleUpperCase() === "INTERNAL")
        throw new LoadPluginError("Plugin scope cannot be INTERNAL.", {
            errorCode: 1000
        });

    let existingPluginIndex = global.plugins.loadedPlugins.findIndex(v => v.name === pInfo.name);
    if (existingPluginIndex + 1)
        throw new LoadPluginError("Plugin name conflicts with loaded plugins.", {
            errorCode: 105,
            existingPluginPath: global.plugins.loadedPlugins[existingPluginIndex].url
        });
    existingPluginIndex = global.plugins.loadedPlugins.findIndex(v => v.scopeName === pInfo.scopeName);
    if (existingPluginIndex + 1)
        throw new LoadPluginError("Plugin scope name conflicts with loaded plugins.", {
            errorCode: 105,
            existingPluginPath: global.plugins.loadedPlugins[existingPluginIndex].url
        });

    // Check for depends, if missing then add to pass 2
    if (global.getType(pInfo.depends) === "Object") {
        for (let dPlName in pInfo.depends) {
            let indexDPlName = global.plugins.loadedPlugins.findIndex(v => v.name === dPlName);
            let version = pInfo.depends[dPlName];
            if (indexDPlName + 1) {
                let lVersion = global.plugins.loadedPlugins[indexDPlName].version;
                // Plugin found, check the version next
                if (!semver.satisfies(lVersion, String(version)))
                    throw new LoadPluginError(
                        `Expected version range ${String(version)} of "${dPlName}", instead got version ${lVersion}`,
                        {
                            errorCode: 106,
                            loadedVersion: lVersion,
                            requiredVersionRange: String(version),
                            pluginName: dPlName
                        }
                    );
            } else {
                // Plugin isn't loaded or not found
                if (loadAll) {
                    if (global.tempLoadPass2.findIndex(v => v.url !== file) === -1) {
                        global.tempLoadPass2.push({
                            url: file,
                            name: pInfo.name,
                            depends: pInfo.depends
                        });
                    }
                    return { status: 1 };
                } else {
                    throw new LoadPluginError(
                        `A required dependency for this plugin was not found. (${dPlName} [${version}])`,
                        {
                            errorCode: 107,
                            requiredVersionRange: String(version),
                            pluginName: dPlName
                        }
                    );
                }
            }
        }
    }

    // Great, now execute the executable
    let executable = await getPFile(pInfo.execFile, true);
    if (global.getType(executable) === "String") {
        let onLoad = null;
        try {
            onLoad = global.requireFromString(executable, pDir);
            if (
                global.getType(onLoad) !== "Function" &&
                global.getType(onLoad) !== "AsyncFunction"
            ) throw new LoadPluginError("module.exports of executable code is not a Function/AsyncFunction", {
                errorCode: 108
            });
        } catch (ex) {
            throw new LoadPluginError("Malformed JavaScript code in executable file.", {
                errorCode: 109,
                error: ex
            })
        }

        // Creating a folder to store plugin's data
        let pluginDataPath = path.join(process.cwd(), process.env.PLUGIN_DATA_PATH, sanitizer(pInfo.name));
        global.ensureExists(pluginDataPath, 0o666);

        let returnData = null;
        try {
            let logger = new Logger(pInfo.name, true);
            returnData = await onLoad({
                log: logger.log.bind(logger),
                getPluginFile: async function getFileInsidePlugin(filePath) {
                    if (global.getType(filePath) !== "String") return null;
                    let absoluteFilePath = path.posix.join("/", filePath);
                    return await getPFile(absoluteFilePath, false);
                },
                getPluginDirectory: async function getPluginDirectory(dir, recursive) {
                    if (global.getType(dir) !== "String") return null;
                    let absoluteFilePath = path.posix.join("/", dir);
                    let zipListing = await getPDir(absoluteFilePath, recursive);
                    return zipListing;
                },
                readPluginDataFile: (function (rootData) {
                    return function readPluginDataFile(filePath, encoding) {
                        if (global.getType(filePath) !== "String") return null;
                        let relativeFilePath = path.join("/", filePath);
                        let absoluteFilePath = path.join(rootData, relativeFilePath);
                        try {
                            return fs.readFileSync(absoluteFilePath, {
                                encoding
                            });
                        } catch (e) {
                            return null;
                        }
                    }
                })(pluginDataPath),
                writePluginDataFile: (function (rootData) {
                    return function writePluginDataFile(filePath, data, encoding) {
                        if (global.getType(filePath) !== "String") return null;
                        let relativeFilePath = path.join("/", filePath);
                        let absoluteFilePath = path.join(rootData, relativeFilePath);
                        return fs.writeFileSync(absoluteFilePath, data, {
                            encoding
                        });
                    }
                })(pluginDataPath),
                removePluginDataFile: (function (rootData) {
                    return function writePluginDataFile(filePath) {
                        if (global.getType(filePath) !== "String") return null;
                        let relativeFilePath = path.join("/", filePath);
                        let absoluteFilePath = path.join(rootData, relativeFilePath);
                        return fs.unlinkSync(absoluteFilePath);
                    }
                })(pluginDataPath),
                dataPath: pluginDataPath,
                require: (pkgList => {
                    return async function pluginRequire(pkgName) {
                        if (require("module").builtinModules.indexOf(pkgName) + 1) {
                            return require(pkgName);
                        } else if (Object.prototype.hasOwnProperty.call(pkgList, pkgName)) {
                            return loadPackage(pkgName, pkgList[pkgName]);
                        }
                        throw new Error("Requested module not added to plugins.json::npmPackageList");
                    }
                })(pInfo.npmPackageList || {}),
                getPlugin: function getPluginExport(name) {
                    let plInfo = global.plugins.loadedPlugins.find(v => v.name === name);
                    if (!plInfo) {
                        throw new Error("Requested plugin is not loaded");
                    }

                    return global.plugins.pluginScope[plInfo.scopeName];
                },
                checkPermission: global.checkPermission
            });
            global.plugins.pluginScope[pInfo.scopeName] = returnData;
        } catch (ex) {
            throw new LoadPluginError("Malformed JavaScript code in executable file.", {
                errorCode: 109,
                error: ex
            });
        }

        if (
            global.getType(returnData) === "Object" &&
            global.getType(pInfo.defineCommand) === "Object"
        ) {
            for (let cmd in pInfo.defineCommand) {
                if (global.getType(pInfo.defineCommand[cmd].scope) !== "String") {
                    log(`${pInfo.name}: Command "${cmd}" is missing a parameter ("scope")`);
                    continue;
                }
                if (global.getType(pInfo.defineCommand[cmd].compatibly) !== "Array") {
                    log(`${pInfo.name}: Command "${cmd}" is missing a parameter ("compatibly")`);
                    continue;
                }
                if (
                    global.getType(global.plugins.pluginScope[pInfo.scopeName]) !== "Object" || (
                        global.getType(global.plugins.pluginScope[pInfo.scopeName][pInfo.defineCommand[cmd].scope]) !== "Function" &&
                        global.getType(global.plugins.pluginScope[pInfo.scopeName][pInfo.defineCommand[cmd].scope]) !== "AsyncFunction"
                    )
                ) {
                    log(`${pInfo.name}: Command "${cmd}" reference to non-existing function in scope ("${pInfo.defineCommand[cmd].scope}")`);
                    continue;
                }
                let conflictID = global.commandMapping.cmdList.findIndex(v => v === cmd);
                let isConflict = Boolean(conflictID + 1);
                let commandID = global.commandMapping.cmdList.push({
                    originalCMD: cmd,
                    namespacedCMD: `${pInfo.scopeName}:${cmd}`,
                    conflict: isConflict,
                    supportedPlatform: pInfo.defineCommand[cmd].compatibly,
                    scope: pInfo.scopeName,
                    exec: global.plugins.pluginScope[pInfo.scopeName][pInfo.defineCommand[cmd].scope],
                    helpArgs: pInfo.defineCommand[cmd].helpArgs,
                    helpDesc: pInfo.defineCommand[cmd].helpDesc,
                    example: pInfo.defineCommand[cmd].example,
                    showDefault: pInfo.defineCommand[cmd].showDefault ? Boolean(pInfo.defineCommand[cmd].showDefault) : true,
                    execDefault: pInfo.defineCommand[cmd].execDefault ? Boolean(pInfo.defineCommand[cmd].execDefault) : true
                }) - 1;
                if (!isConflict) {
                    global.commandMapping.aliases[cmd] = {
                        pointTo: commandID,
                        scope: pInfo.scopeName
                    };
                } else {
                    global.commandMapping.cmdList[conflictID].conflict = true;
                }
                global.commandMapping.aliases[`${pInfo.scopeName}:${cmd}`] = {
                    pointTo: commandID,
                    scope: pInfo.scopeName
                };
            }
        }
        return { status: 0 };
    } else throw new LoadPluginError(
        `Executable file not found (${pInfo.execFile})`,
        {
            errorCode: 110,
            resolvedExecPath: pInfo.execFile
        }
    );
}