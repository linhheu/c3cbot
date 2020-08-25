/*
  mirai tuổi lồn 
    
    -UIRI 2020
*/

let fs = require("fs");
let path = require("path");
let semver = require("semver");

const moduleDir = path.join(process.cwd(), ".data", "node_modules_plugins");
const tempDir = path.join(process.cwd(), ".data", "temp_npm_pack");
global.ensureExists(moduleDir);
global.ensureExists(tempDir);


let downloadPackage = async function downloadPackage(packageName, versionRange) {

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
                if (semver.satisfies(version, versionRange)) return true;
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
    let packageExists = await checkPackageExists(packageName, versionRange);
    if (!packageExists) downloadPackage(packageName, versionRange);
    
    
}