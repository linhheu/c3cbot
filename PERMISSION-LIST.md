# C3CBot Internal permission list

Last updated: `10/08/2020` @ `1.0.0-beta`

## Show/hide the command in /help
- `internal.helpview.<namespaced command>`
    - Default for internal commands:
        - `internal:help`: true
        - `internal:reload`: false

## Allow/deny the execution of /<command>
- `internal.exec.<namespaced command>`
    - Default for internal commands:
        - `internal:help`: true
        - `internal:reload`: false