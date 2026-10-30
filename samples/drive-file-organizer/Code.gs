/**
 * Drive File Organizer.
 *
 * Moves files from one folder into subfolders by type:
 * Documents, Spreadsheets, Presentations, Images, PDFs, Other.
 *
 * Script Properties (Project Settings > Script Properties):
 *   SOURCE_FOLDER_ID - Drive folder ID to organize (required)
 *   DRY_RUN          - "true" (default) logs only; "false" moves files
 *
 * Subfolders are created inside the source folder on first use.
 * Files already in a subfolder are left alone: only the top level
 * of the source folder is scanned.
 */

function organizeDriveFolder() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('SOURCE_FOLDER_ID');
  if (!folderId) {
    throw new Error('Set the SOURCE_FOLDER_ID Script Property first.');
  }
  var dryRun = props.getProperty('DRY_RUN') !== 'false';

  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var moved = 0;
  while (files.hasNext()) {
    var file = files.next();
    var category = categoryForMimeType(file.getMimeType());
    if (dryRun) {
      Logger.log('[DRY RUN] Would move "' + file.getName() + '" to ' + category);
    } else {
      var target = getOrCreateSubfolder(folder, category);
      file.moveTo(target);
    }
    moved++;
  }
  Logger.log('Done. Files considered: ' + moved + '. Dry run: ' + dryRun);
}

function categoryForMimeType(mimeType) {
  if (mimeType === MimeType.GOOGLE_DOCS) return 'Documents';
  if (mimeType === MimeType.GOOGLE_SHEETS) return 'Spreadsheets';
  if (mimeType === MimeType.GOOGLE_SLIDES) return 'Presentations';
  if (mimeType === MimeType.PDF) return 'PDFs';
  if (mimeType.indexOf('image/') === 0) return 'Images';
  return 'Other';
}

function getOrCreateSubfolder(folder, name) {
  var existing = folder.getFoldersByName(name);
  if (existing.hasNext()) {
    return existing.next();
  }
  return folder.createFolder(name);
}
