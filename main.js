(async () => {  
    let fs = require("fs");
    let path = require("path");

    global.languageHandler = require("./app/languageHandler");

    Object.assign(global, require("./app/classModifier"));

    if (!fs.existsSync(path.join(__dirname, ".env"))) {
        fs.copyFileSync(path.join(__dirname, ".env.example"), path.join(__dirname, ".env"), fs.constants.COPYFILE_EXCL);
    }

    require("dotenv").config();
    ////let customEnv = require("custom-env");
    ////customEnv.env("");

    global.ensureExists(path.join(__dirname, ".data"));

    let centralData = new (require("./app/storage/" + process.env.CENTRAL_STORAGE_TYPE))(__dirname);
    global.centralData = centralData;

    // Get a logger
    let Logging = require("./app/logging");
    let logger = new Logging();
    console.original = {
        log: console.log.clone(),
        error: console.error.clone()
    };
    console.log = logger.log.bind(logger);
    let cError = new Logging("INTERNAL-ERROR");
    console.error = cError.log.bind(cError);

    // Output header
    logger.log("C3CBot v1.0.0-beta  Copyright (C) 2020  BadAimWeeb/UIRI");
    logger.log("This program comes with ABSOLUTELY NO WARRANTY.");
    logger.log("This is free software, and you are welcome to redistribute it under certain conditions.");
    logger.log("This program is licensed using GNU GPL version 3, see the LICENSE file for details.");

    // Start REPL console
    logger.log("Starting REPL console...");
    require("./app/replConsole");

    // Start SSH server
    if (parseInt(process.env.SSH_ENABLE)) {
        require("./app/sshSupport");
    }

    // Load built-in commands
    require("./app/builtinCommandInjector");

    // Creating an empty plugin folder
    let pluginPath = path.join(process.cwd(), process.env.PLUGIN_PATH);
    global.ensureExists(pluginPath);

    // Required before load plugins
    if (global.getType(global.responseResolver) !== "Object") global.responseResolver = {};

    // Load plugins
    global.pluginHandler = require("./app/pluginHandler");
    logger.log("Loading plugins...");
    let loadPluginStartTime = Date.now();
    await global.pluginHandler.loadAllPlugin(pluginPath);
    let loadPluginEndTime = Date.now();
    logger.log(`Plugin loading finished. (${(loadPluginEndTime - loadPluginStartTime) / 1000}s)`);

    // Uhh.... get command resolver?
    global.cmdResolver = await require("./app/commandResolver.js")();

    // Load interface?
    require("./app/interfaceHandler.js");

    // Get REPL custom command + inject 
    global.replCustomCMD = require("./app/replCommandInjector");
    global.replConsole.commands = {
        ...global.replConsole.commands,
        ...global.replCustomCMD
    }
})();
