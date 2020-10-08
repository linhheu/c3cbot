let wait = require("wait-for-stuff");

process.on("exit", function cleanup(code) {
    // Using wait-for-stuff in this is OK because when exit there's no need to process other tasks.
    wait.for.promise((async function cl() {
        console.log("Shutting down...");

        await global.unloadAllPlugin();

        for (let i of global.interfaceList) {
            if (i.active && !i.invalidHandler) {
                i.handler.destroy();
            }
        }

        console.log("Saved data");
        await global.centralData.save();

        console.log("Exiting with code " + code);
    })())
})
