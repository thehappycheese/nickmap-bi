# Changelog

## [Unreleased]

## [4.1.4] - 2023-03-13

### Fixed

- Fix flickering / crash problems when visual does not have any columns populated into field wells
- Improved status bar style and messages
- Improved support when no data is present

## [4.1.3] - 2023-03-09

### Fixed

- Brightness and contrast settings regression fixed
- Improved version number display

## [4.1.2] - 2023-03-09

### Changed

- `slk_from` and `slk_to` can now be swapped without error (the columns can be swapped, or individual rows can be swapped without issue)
- road and psp colours now update as expected
- "Pan To" Button relabelled to "Go"
- Added `brightness`, `contrast`, `saturation` sliders to raster layers
- internal refactoring to improve maintainability
- minor performance improvements to drag box selection. Selecting large numbers of features still causes the visual to freeze (See [Issue 24](https://github.com/thehappycheese/nickmap-bi/issues/24) ). 

### Fixed

- Auto Zoom now triggers properly on update
- When filters remove all features the visual now updates as expected
- Map feature selection is now properly synchronised with PowerBI's filters and Selections


## [4.2.1] - 2023-03-02

First major release of nickmap bi

### Added

- WKT is no longer required to be embedded in the data, lookup happens at runtime
- Repository was rebuilt from scratch to ensure clean start and latest `pbiviz` tool and custom visual api version was used
