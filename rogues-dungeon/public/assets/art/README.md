# Art asset layout

`custom/` contains art created for this project. Place particle frames in `custom/particles/<effect-name>/`.

`vendors/` contains one folder for each third-party asset pack. Keep each pack's delivered directory structure intact inside its vendor folder. Record the pack name, source, license, and required attribution in `documentation/asset-provenance.md` when adding a pack.

The current `dungeons-and-pixels-v1.4` folder retains its original `Characters`, `Enemies`, `Items`, `Props`, `Tilesets`, and `tiled-examples` folders. Do not move files between those folders because the Tiled examples use their relative paths.
