function pResolver(ref = "", perm = "") {
    if (global.getType(ref) !== "String" || global.getType(perm) !== "String")
        throw new Error("Permission must be a string.");

    let neg = ref.startsWith("-");
    if (perm.startsWith("-")) perm = perm.substr(1);
    if (neg) ref = ref.substr(1);
    let splitedPerm = perm.split(".");
    let splitedRef = ref.split(".");
    if (splitedRef.length <= splitedPerm.length) {
        for (let i in splitedRef) {
            if (splitedRef[i] === "*") return neg ? -2 : 2;
            if (splitedRef[i] !== splitedPerm[i]) return 0;
        }
        if (splitedRef.length === splitedPerm.length) return neg ? -1 : 1;
        return 0;
    } else return 0;
}

module.exports = async function load() {
    let pm = await global.centralStorage.get("default", "permissionManager");
    if (global.getType(pm) !== "Object") {
        pm = {
            group: {
                default: {
                    permissions: [],
                    default: true
                },
                operator: {
                    permissions: [
                        "*"
                    ]
                }
            },
            user: {
                /* 
                "0": {
                    permissions: [],
                    group: ["operator"]
                }
                */
            }
        }
        await global.centralStorage.set("default", "permissionManager", pm);
    }

    return {
        /**
         * Check if user has permissions.
         * If value = 0: Permission key is not defined.
         * If value = 1: The user has permission.
         * If value = 2: The user has permission from *.
         * Negative value is the same as positive value, but with permission denied.
         * 
         * @param {string} user User ID
         * @param {string} perm Permission key
         * 
         * @returns {number} value
         */
        checkPermission: async function checkPermission(user = "null", perm = "null") {
            let pm = await global.centralStorage.get("default", "permissionManager");
            let user = pm.user[user];
            let returnedValue = 0;

            // Check default group
            for (let groupName in pm.group) {
                if (pm.group[groupName].default && global.getType(pm.group[groupName].permissions) === "Array") {
                    for (let p of pm.group[groupName].permissions) {
                        let pV = pResolver(p, perm);
                        if (pV !== 0) {
                            returnedValue = pV;
                        }
                    }
                }
            }

            // Check user-specific permissions
            if (global.getType(user) === "Object") {
                if (global.getType(user.group) === "Array") {
                    for (let groupName of user.group) {
                        if (global.getType(pm.group[groupName]) === "Object" &&
                            global.getType(pm.group[groupName].permissions) === "Array"
                        ) {
                            for (let p of pm.group[groupName].permissions) {
                                let pV = pResolver(p, perm);
                                if (pV !== 0) {
                                    returnedValue = pV;
                                }
                            }
                        }
                    }
                }
                if (global.getType(user.permissions) === "Array") {
                    for (let p of user.permissions) {
                        let pV = pResolver(p, perm);
                        if (pV !== 0) {
                            returnedValue = pV;
                        }
                    }
                }
            }

            return returnedValue;
        }
    }
}
