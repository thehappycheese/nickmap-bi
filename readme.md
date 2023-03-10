# NickMapBI

A custom PowerBI visual for the Main Roads Western Australia Road Network


Link to releases: [Releases](https://github.com/thehappycheese/nickmap-bi/releases)

See full change log: [Change Log](./changelog.md)

## Required Data Format

This visual is designed to map data in the following format over the Main Roads western Australia Road Network.

Note the column definitions are given below.

| Road Number | Carriageway | SLK From | SLK To | Offset (Metres) | Colour   | Tooltip (1) | Tooltip (2)          | ... |
| ----------- | ----------- | -------- | ------ | --------------- | -------- | ----------- | -------------------- | --- |
| H001        | LS          | 0.00     | 1.2    | 0.0             | "green"  | "low"       | "Some comment"       |     |
| H001        | LS          | 0.00     | 1.2    | 0.0             | "yellow" | "medium"    | "Some other comment" |     |


| Column Name     | Optional | Description |
| --------------- | :------: | ----------- |
| Road Number     |    No    | 
| Carriageway     |    No    |
| SLK From        |    No    |
| SLK To          |    No    |
| Offset (Metres) |   Yes    |
| Toolip (1)      |   Yes    |
| Toolip (2)      |   Yes    |
| Toolip (...)    |   Yes    |
