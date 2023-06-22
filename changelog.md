# Changelog

## [4.3.0] - UNRELEASED - 2023-06-22

- added `x-request-id` support when available. This will prevent processing out
  of order responses.
  [#43](https://github.com/thehappycheese/nickmap-bi/issues/43)
- no longer show blank tooltips when no columns in field well
  [#49](https://github.com/thehappycheese/nickmap-bi/issues/49)
- Better explanation for why rows cannot be mapped
  [#28](https://github.com/thehappycheese/nickmap-bi/issues/28)
- added setting to hide the number of mapped features in the status bar
- added setting to hide warnings about unmapped rows
  [#50](https://github.com/thehappycheese/nickmap-bi/issues/50)
- reduced size of status bar
- top-left controls are now collapsed by default since this seems to be the
  preference of most users.

## [4.2.0] - 2023-04-12

### Changed

- [#9](https://github.com/thehappycheese/nickmap-bi/issues/9) Tooltips now show on hover.
- Minor improvements to controls style. Moved scale bar to top right.

### Fixed

- [#44](https://github.com/thehappycheese/nickmap-bi/issues/44); Tooltips now have formatting applied.
- [#43](https://github.com/thehappycheese/nickmap-bi/issues/43); simultaneous requests are prevented using an abort signal to prevent out-of-order response processing
- Goto will now work with non capitalised road numbers
- Possibly fixed minor compatibility issue by removing unnecessary use of `AbortSignal.timeout()`
- Goto will now work on any submit event including enter, but there are
  outstanding problems with focus being annoyingly lost
- Improve labels for brightness, contrast and saturation
  - By adding percentage unit (%)
  - Adding the default value to the tooltip

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
