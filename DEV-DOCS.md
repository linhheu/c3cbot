# C3CBot Plugin Developer DOCS

DOCS version: 1.0.0-beta
Last modified: 27/09/2020

<strong>Index:</strong>
- [Plugin structure](#pluginstruct)
- [plugins.json](#pluginstruct)
- [JS executable](#jsexec)

<span name="pluginstruct"></span>
### Plugin structure

A plugin is just a ZIP file that contain the following:
- `plugins.json` ([see below](#pjson))
- A/Some JavaScript executeable file (ex. `index.js`) ([see below](#jsexec))
- (Optional) Files required for plugin to work (ex. image, video, etc...)

<span name="pjson"></span>
### plugins.json

plugins.json is a mandatory JSON file. Without it, the framework cannot understand what's inside and won't load plugin.
It has the following structure:
- [string] `name`: Plugin name. Should not contain invalid character that FS marked as unsafe. (Note: This plugin's name can conflict with other plugin's name)
- [string] `execFile`: Filename of the entry JavaScript executable. (ex. `index.js`)
- [string] `scopeName`: Short plugin name, this will be used for namespace for commands (ex. `/scope:test`) and a key to put every data returned from onLoad (`global.plugins.pluginScope[scopeName]`).
- [string] `version`: Plugin version. Must be SemVer-parsable. 
- (not required) [Object] `depends`: Specify your plugin's dependency (not npm module! don't confuse with it). Structure: `<plugin name (key)>: <version range (value) - SemVer parsable>`
- (not required) [string] `author`: Author of that plugin.
- (not required) [Object] `npmPackageList`: Specify NPM packages that your plugin required in order to run. Structure: `<package name (key)>: <version range (value) - SemVer parsable>`
- (not required) [Object] `defineCommand`: List the command that your plugin provides. Structure: `<command name (key)>: <command data (value)>`. (see structure of command data below)

Command data is an object which has the following structure:
- [string] `scope`: The command's resolver function inside the object returned from onLoad (See [example plugin 1](https://github.com/c3cbot/c3cbot_example_plugin_1/)).
- [Array] `compatibly`: Contain a list of chat platform that the command can resolve. Items' value are strings which are interface type or `*` (every interface type)
- (not required) [string] helpArgs: Add information to /help. (ex. `/test <args>` if set, `/test` if not set)
- (not required) [string] helpDesc: Add the command's description to /help.
- (not required) [Array] example: Add examples on how to use the command. Items is strings.

<span name="jsexec"></span>
### JS executable

<hr>
More things coming soon...
