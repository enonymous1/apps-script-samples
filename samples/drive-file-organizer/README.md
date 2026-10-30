# Drive File Organizer

Moves files from one Drive folder into subfolders by type:
Documents, Spreadsheets, Presentations, Images, PDFs, Other.

## Setup

1. Create a script project and copy in `Code.gs` and `appsscript.json`.
2. Set these Script Properties (Project Settings > Script Properties):
   - `SOURCE_FOLDER_ID` — required, from the folder URL
   - `DRY_RUN` — `true` by default; set to `false` to move files
3. Run `organizeDriveFolder()` and authorise the Drive scope.
4. Only set `DRY_RUN` to `false` when the dry-run log looks right.

## Notes

- Only the top level of the source folder is scanned, so files already
  sorted into subfolders are left alone.
- Subfolders are created inside the source folder on first use.
- No folder ID is hardcoded in the code.
- The full Drive scope is the honest scope for moving files; a
  `drive.file` variant would only see files this script created.
