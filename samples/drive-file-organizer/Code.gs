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

/**
 * Organizes the top level of the configured folder by file type.
 *
 * @throws {Error} If SOURCE_FOLDER_ID is not set.
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
  // Cache subfolder lookups for the run: the old code called
  // getFoldersByName() for every file, which is one Drive query per
  // file even when every file lands in the same category.
  var subfolders = {};
  var moved = 0;
  while (files.hasNext()) {
    var file = files.next();
    var category = categoryForMimeType(file.getMimeType());
    if (dryRun) {
      Logger.log('[DRY RUN] Would move "' + file.getName() + '" to ' + category);
    } else {
      var target = getOrCreateSubfolder(folder, category, subfolders);
      file.moveTo(target);
    }
    moved++;
  }
  Logger.log('Done. Files considered: ' + moved + '. Dry run: ' + dryRun);
}

/**
 * Maps a MIME type to a subfolder category.
 *
 * @param {string} mimeType The file's MIME type, e.g. "application/pdf".
 * @return {string} One of Documents, Spreadsheets, Presentations,
 *   Images, PDFs, or Other for anything unrecognized.
 */
function categoryForMimeType(mimeType) {
  if (mimeType === MimeType.GOOGLE_DOCS) return 'Documents';
  if (mimeType === MimeType.GOOGLE_SHEETS) return 'Spreadsheets';
  if (mimeType === MimeType.GOOGLE_SLIDES) return 'Presentations';
  if (mimeType === MimeType.PDF) return 'PDFs';
  if (typeof mimeType === 'string' && mimeType.indexOf('image/') === 0) return 'Images';
  return 'Other';
}

/**
 * Returns the named subfolder, creating it on first use.
 *
 * @param {Object} folder The parent Drive folder.
 * @param {string} name The subfolder name.
 * @param {Object} [cache] Optional per-run cache (category -> folder)
 *   so repeated lookups for the same category do not re-query Drive.
 * @return {Object} The subfolder.
 */
function getOrCreateSubfolder(folder, name, cache) {
  if (cache && cache[name]) {
    return cache[name];
  }
  var existing = folder.getFoldersByName(name);
  var subfolder = existing.hasNext() ? existing.next() : folder.createFolder(name);
  if (cache) {
    cache[name] = subfolder;
  }
  return subfolder;
}
