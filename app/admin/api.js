let os = require("os");

module.exports = async function callAPI(jsonData) {
    switch (jsonData.opcode) {
        case 0x01: // Get system information
            let totalRam = os.totalmem();
            let freeRam = os.freemem();
            return {
                ramUsage: (totalRam - freeRam).toString(10),
                ramTotal: totalRam,
                ramFree: freeRam
            }
    }
}