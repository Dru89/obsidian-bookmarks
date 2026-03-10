/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Obsidian Vault Path - Path to your Obsidian vault */
  "vaultPath": string,
  /** Search Folders - Comma-separated list of folders to search within the vault (e.g. Highlights,Weblinks). Leave empty to search the entire vault. */
  "searchFolders": string,
  /** New Bookmark Folder - Folder within the vault where new bookmarks are saved */
  "newBookmarkFolder": string,
  /** Browser Bookmarks - Include Chrome bookmarks in search results */
  "enableChrome": boolean,
  /**  - Include Safari bookmarks in search results */
  "enableSafari": boolean,
  /**  - Automatically save browser bookmarks to your Obsidian vault when opened */
  "autoSaveOnOpen": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-bookmarks` command */
  export type SearchBookmarks = ExtensionPreferences & {}
  /** Preferences accessible in the `add-bookmark` command */
  export type AddBookmark = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-bookmarks` command */
  export type SearchBookmarks = {}
  /** Arguments passed to the `add-bookmark` command */
  export type AddBookmark = {}
}

