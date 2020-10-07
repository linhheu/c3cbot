# C3CBot Internal permission list

## Show/hide the command in /help
- `internal.helpview.<namespaced command>`
    - Default for internal commands:
        - `help`: true
        - `reload`: false

## Allow/deny the execution of /<command>
- `internal.exec.<namespaced command>`
    - Default for internal commands:
        - `help`: true
        - `reload`: false