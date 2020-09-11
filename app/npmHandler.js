let fs = require("fs");
let path = require("path");
let semver = require("semver");
let childProcess = require("child_process");

const moduleDir = path.join(process.cwd(), ".data", "node_modules_plugins");
const tempDir = path.join(process.cwd(), ".data", "temp_npm_pack");
const emptyPKGJSON = "{\
  \"name\": \"c3cplnpm\",\
  \"version\": \"1.0.0\",\
  \"description\": \"\",\
  \"main\": \"index.js\",\
  \"scripts\": {\
    \"test\": \"exit 0\"\
  },\
  \"author\": \"\",\
  \"license\": \"GPL-3.0\"\
}";
global.ensureExists(moduleDir);
global.ensureExists(tempDir);

let downloadPackage = async function downloadPackage(packageName, versionRange) {
    await fs.promises.writeFile(path.join(tempDir, "package.json"), emptyPKGJSON);
    try {
        await new Promise((resolve, reject) => {
            let p = childProcess.spawn("npm", ["install", `${packageName}@${versionRange}`], {
                cwd: tempDir,
                shell: true
            });
            p.once("exit", async (code, signal) => {
                if (code !== 0 && signal !== null) {
                    return reject([code, signal]);
                }

                // Uh..
                global.ensureExists(path.join(
                    moduleDir,
                    packageName
                ));
                await fs.promises.rename(
                    path.join(tempDir, "node_modules", packageName), 
                    path.join(
                        moduleDir,
                        packageName,
                        JSON.parse(await fs.promises.readFile(path.join(tempDir, "node_modules", packageName, "package.json"), {
                            encoding: "utf8"
                        })).version
                    )
                )
                try {
                    await fs.promises.rmdir(path.join(tempDir, "node_modules"), {
                        recursive: true
                    });
                    await fs.promises.unlink(path.join(tempDir, "package.json"));
                } catch (_) {
                    return reject([null, null, _]);
                }
                resolve();
            });
        });
    } catch (ex) {
        throw new Error("No such package exists.");
    }
}

let checkPackageExists = async function checkPackageExists(packageName, versionRange) {
    if (fs.existsSync(path.join(moduleDir, packageName))) {
        if ((await fs.promises.lstat(path.join(moduleDir, packageName))).isDirectory()) {
            let packageDir = await fs.promises.readdir(path.join(moduleDir, packageName), {
                withFileTypes: true
            });

            for (let v of packageDir.filter(v => v.isFile())) {
                await fs.promises.unlink(path.join(moduleDir, packageName, v.name));
            }

            let versionList = packageDir
                .filter(v => v.isDirectory()).map(v => v.name)
                .sort((vA, vB) => semver.compare(vA, vB))
                .reverse();

            for (let version of versionList) {
                if (semver.satisfies(version, versionRange)) return version;
            }

            return false;
        } else {
            await fs.promises.unlink(path.join(moduleDir, packageName));
            return false;
        }
    } else return false;
}

/**
 * Download a NPM package if not exists, then load that package.
 * 
 * @param {string} packageName Package name
 * @param {string} versionRange Version page
 * 
 * @returns {Promise<any>} module.exports of that package
 */
module.exports = async function loadPackage(packageName, versionRange) {
    for (; ;) {
        let version = await checkPackageExists(packageName, versionRange);
        if (!version) {
            try {
                await downloadPackage(packageName, versionRange);
            } catch (_) {
                throw new Error("No such package exists on NPM registry.");
            }
        }
        let rtData;
        try {
            rtData = require(path.join(moduleDir, packageName, version));
        } catch (_) {
            await fs.promises.rmdir(path.join(moduleDir, packageName, version), { recursive: true });
            continue;
        }
        return rtData;
    }
}
