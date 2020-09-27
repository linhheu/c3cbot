# C3CBot Plugin Developer DOCS

DOCS version: 1.0.0-beta
Last modified: 27/09/2020

<strong>Index:</strong>
- [Plugin structure](#pluginstruct)
- [plugins.json](#pluginstruct)

<span name="pluginstruct"></span>
### Plugin structure

A plugin is just a ZIP file that contain the following:
- `plugins.json` ([see below](#pjson))
- A/Some JavaScript executeable file (ex. `index.js`) ([see below](#))
- (Optional) Files required for plugin to work (ex. image, video, etc...)

<span name="pjson"></span>
### plugins.json

plugins.json is a mandatory JSON file. Without it, the framework cannot understand what's inside and won't load plugin.
It has the following structure:
- [string] `name`: Plugin name. Should not contain invalid character that FS marked as unsafe. (Note: This plugin's name can conflict with other plugin's name)
- [string] `execFile`: Filename of the entry JavaScript executable. (ex. `index.js`)
- [string] `scopeName`: Short plugin name, this will be used for namespace for commands (ex. `/scope:test`) and a key to put every data returned from onLoad (`global.plugins.pluginScope[scopeName]`).
- [string] `version`: Plugin version. Must be SemVer-parsable. 
- (not required) [Object] `depends`: Specify your plugin's dependency (not npm module! don't confuse with it). Key in this object is plugin name, and value is required version range.
- (not required) [string] `author`: Author of that plugin.
<hr>
More things coming soon...
