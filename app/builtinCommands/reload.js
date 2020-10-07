module.exports = {
    originalCMD: "reload",
    namespacedCMD: "internal:reload",
    conflict: false,
    supportedPlatform: ["*"],
    scope: "internal",
    showDefault: false,
    execDefault: false,
    exec: async function reloadPlugin(cmdData) {
        let plugin = cmdData.args[1];
        if (global.getType(plugin) === "String" && plugin !== "*") {
            // Reload a plugin
            return {
                handler: "default",
                data: {
                    content: "WIP."
                }
            }
        } else {
            // Reload all plugins
            await global.unloadAllPlugins();
            await global.loadAllPlugins();
            return {
                handler: "default",
                data: {
                    content: "🆗✅"
                }
            }
        }
    },
    helpArgs: "$$INTMSG{RELOAD_ARGUMENTS}$$",
    helpDesc: "$$INTMSG{RELOAD_DESCRIPTION}$$",
    example: [
        "$@$$!$",
        "$@$$!$ Example Plugin 1",
        "$@$$!$ *"
    ]
}
