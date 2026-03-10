import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  vaultPath: string;
  searchFolders: string;
  newBookmarkFolder: string;
  enableChrome: boolean;
  enableSafari: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Returns the list of search folder paths (relative to vault root).
 * If empty/blank, returns an empty array meaning "search entire vault".
 */
export function getSearchFolders(prefs: Preferences): string[] {
  if (!prefs.searchFolders || prefs.searchFolders.trim() === "") {
    return [];
  }
  return prefs.searchFolders
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}
