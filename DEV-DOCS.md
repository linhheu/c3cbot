# C3CBot Plugin Developer DOCS

DOCS version: `1.0.0-beta` / Last modified: `30/09/2020`

<strong>Index:</strong>
- [Plugin structure](#pluginstruct)
- [plugins.json](#pjson)
- [JS executable](#jsexec)
- [Valid interface types](#interfaceType)
- [Storing plugin's data](#pldata)

<span name="pluginstruct"></span>
### Plugin structure

A plugin is just a ZIP file that contain the following:
- `plugins.json` ([see below](#pjson))
- A/Some JavaScript executeable file (ex. `index.js`) ([see below](#jsexec))
- (Optional) Files required for plugin to work (ex. image, video, etc...)

<span name="pjson"></span>
### plugins.json

plugins.json is a mandatory JSON file. Without it, the framework cannot understand what's inside and won't load the plugin.
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
- [Array<string>] `compatibly`: Contain a list of chat platform that the command can resolve. Items' value are strings which are interface type or `*` (every interface type) (see valid interface type [below](#interfaceType))
- (not required) [string/Object] `helpArgs`: Add information to /help. If the type is `object`, it must follow this structure: `<ISO 639-1 code_ISO 3166-1 alpha-2 code>: <arguments>`
- (not required) [string/Object] `helpDesc`: Add the command's description to /help. If the type is `object`, it must follow this structure: `<ISO 639-1 code_ISO 3166-1 alpha-2 code>: <arguments>`
- (not required) [Array] `example`: Add examples on how to use the command. Items is strings (printing prefix: "$@$").

<span name="jsexec"></span>
### JS executable

The entry JavaScript executable must set the `module.exports` to a Function or AsyncFunction (recommended using `AsyncFunction` so that you can use `await`) that act as `onLoad`.
Everything the plugin needed will pass to `onLoad` as an argument (let's name it `pluginReq`).

`pluginReq` is an object which has the following item:
- [Function] `log(...args): void`: Log things to console, log file (and SSH)
- [Function] `getPluginFile(string filePath): Buffer`: Get file data inside plugin's ZIP file
- [Function] `getPluginDirectory(string dir, bool recursive): Array<string FilePath>`: List file contain in `dir`
- [Function] `readPluginDataFile(string fileName, string encoding): string/Buffer`: Get plugin's data file
- [Function] `writePluginDataFile(string fileName, string/Buffer data, string encoding): void`: Write to plugin's data file
- [Function] `removePluginDataFile(string fileName): void`: Delete plugin's data file
- [string] `dataPath`: Plugin's data path
- [Function] `require(string moduleName): Promise<any>`: Get NPM package's `module.exports`. Note: You must add the package to `npmPackageList` in [`plugins.json`](#pjson) to use this! (not for built-in modules through)
- [Function] `getPlugin(string pluginName): any`: Get the data returned from `onLoad()` in `pluginName`
- [Function] `checkPermission(string userID, string permission): number`: Check if user has permissions.
  * If value = 0: Permission key is not defined.
  * If value = 1: The user has permission.
  * If value = 2: The user has permission from *.
  * Negative value is the same as positive value, but with permission denied.

`onLoad()` should return an object containing command resolvers. It could return nothing, but doing so will result in the plugin not providing any commands.
Command resolver will be called when the command that the command resolver to be in charge of is received, and will be called with an argument (let's call it `msgData`)

`msgData` is an object which has the following item:
- [Array<string>] `args`: Command arguments (contain command call at 0!)
- [string] `cmdName`: Command name
- [string] `senderID`: Sender/Author ID
- [string] `threadID`: Thread/Channel ID
- [string] `serverID`: Server ID
- [bool] `configAtServer`: Config is at server level (true) or thread level (false)?
- [string] `messageID`: Message ID
- [number] `interfaceID`: Interface ID which receives the command
- [Object] `rawData`: Raw data from Interface. You shouldn't use this unless it's necessary (this could change over time).
  - [number] `id`: The same as `interfaceID`
  - [Interface] `rawClient`: Interface which receives the command
  - [Object] `rawMessage`: Message from the underlying library
- [string] `language`: User/thread language. Plugin should return the message in this language.
- [string] `content`: Message content

Command resolver should return an object containing what to send to the user that has this structure:
- [string] `handler`: The handler which you want to resolve your message (`default`, `internal` or any value other plugins provided (TODO))
- [Object] `data`: If `handler` is not `default` or `internal` then it's plugin-specific, otherwise it has this structure:
  - [string] `content`: Response message to the user
  - (not required) [Array] `attachments`: Items inside array could be `Buffer`, `ReadableStream` or an object following this structure:
    - [string] `name`: Filename
    - [Buffer/ReadableStream] `attachment`: File data
  - (not required) [Object] `extraData`: Platform-specific. Usually anything that only the current platform can understand and resolve.
    - If the platform is `Discord`, this can be set to [discord.js MessageOptions](https://discord.js.org/#/docs/main/stable/typedef/MessageOptions)

<span name="interfaceType"></span>
### Valid interface type list
- `Discord`

<span name="pldata"></span>
### Storing plugin's data

There are 2 ways to save your plugin's data: Using `global.centralData` or save data as a file (when the data you want to store is too large, usually images)

Using `global.centralData` is pretty much straightforward. In the `centralData` there are:
- [Function] `get(string table, string key): Promise<any>`: Get the data stored in the table
- [Function] `set(string table, string key, data): Promise<void>`: Store the data to the table
- [Function] `remove(string table, string key): Promise<bool>`: Delete the data in the table
- [Function] `removeTable(string table): Promise<bool>`: Delete the table and data inside it
- [Function] `getTable(string table): Promise<Object>`: Get the table and data inside it

For data that is too large (images, audio, etc...) you might want to use `readPluginDataFile()`, `writePluginDataFile()`, `removePluginDataFile()` provided when the framework call `onLoad()`. In some rare circumstances, you can use `fs` module with `dataPath` also provided in `onLoad()`.


<hr>
More things coming soon... Happy coding!
