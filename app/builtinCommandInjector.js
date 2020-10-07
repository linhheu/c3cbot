if (global.getType(global.commandMapping) !== "Object")
    global.commandMapping = {
        cmdList: [],
        aliases: {},
        hook: {}
    };

let internalCMDList = ["help", "reload"];

for (let cmd of internalCMDList) {
    let obj = require(path.join(process.cwd(), "app", "builtinCommands", cmd));
    let id = global.commandMapping.cmdList.push(obj) - 1;
    global.commandMapping.aliases[cmd] = {
        pointTo: id,
        scope: "internal"
    }
    global.commandMapping.aliases["internal:" + cmd] = {
        pointTo: id,
        scope: "internal"
    }
}
