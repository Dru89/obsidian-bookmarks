/**
 * Represents a single bookmark from any source.
 */
export interface Bookmark {
  /** Unique identifier (file path for Obsidian, generated for browser) */
  id: string;
  /** Display title */
  title: string;
  /** URL of the bookmark */
  url: string;
  /** Source of the bookmark */
  source: "obsidian" | "chrome" | "safari";
  /** Tags associated with the bookmark */
  tags: string[];
  /** Author, if known */
  author?: string;
  /** Date the bookmark was created/added */
  created?: string;
  /** Description or summary */
  description?: string;
  /** The Obsidian note type (e.g. "highlight", "weblink") */
  noteType?: string;
  /** Full file path for Obsidian bookmarks */
  filePath?: string;
  /** The folder path within Chrome/Safari (e.g. "Bookmarks Bar > Dev") */
  folder?: string;
  /** Whether this result came from full-text search (appended after metadata results) */
  isFullTextMatch?: boolean;
  /** Snippet of body content for full-text keyword matching */
  bodySnippet?: string;
}
