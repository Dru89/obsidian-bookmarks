import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import type { Bookmark } from "./types";

/**
 * Recursively find all .md files in a directory.
 */
function findMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    // Skip hidden directories (like .obsidian, .trash)
    if (entry.name.startsWith(".")) continue;
    // Skip Templates folder
    if (entry.name === "Templates") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract tags from frontmatter. Handles both array formats:
 *   tags: ["a", "b"]       (inline)
 *   tags:\n  - a\n  - b    (list)
 * Also handles a single string value.
 */
function extractTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(",").map((t) => t.trim());
  return [];
}

/**
 * Parse a single markdown file into a Bookmark, or null if it has no URL.
 */
function parseObsidianFile(filePath: string): Bookmark | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch {
    return null;
  }

  const data = parsed.data as Record<string, unknown>;

  // The URL can be in 'url' (weblinks) or 'source' (highlights)
  const url = (data.url as string) || (data.source as string) || "";
  if (!url) return null;

  const title = (data.title as string) || path.basename(filePath, ".md");

  const tags = extractTags(data.tags);
  const noteType = (data.type as string) || "";
  const author = (data.author as string) || undefined;
  const created = data.created ? String(data.created) : undefined;
  const description = (data.description as string) || undefined;

  // Extract a snippet of body content for full-text keyword matching
  const bodySnippet = parsed.content
    .replace(/!\[.*?\]\(.*?\)/g, "") // strip images
    .replace(/\[.*?\]\(.*?\)/g, "") // strip links
    .replace(/[#*_~`>]/g, "") // strip markdown formatting
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  return {
    id: filePath,
    title,
    url,
    source: "obsidian",
    tags,
    author,
    created,
    description,
    noteType,
    filePath,
    bodySnippet,
  };
}

/**
 * Index all Obsidian bookmarks from the vault.
 * Returns two arrays:
 *   - metadataResults: bookmarks found via frontmatter parsing (have a URL)
 *   - fullTextResults: additional bookmarks found by searching body text for URLs
 *     (these are NOT in metadataResults — already deduped)
 */
export function indexObsidianBookmarks(
  vaultPath: string,
  searchFolders: string[],
): { metadataResults: Bookmark[]; fullTextResults: Bookmark[] } {
  const metadataResults: Bookmark[] = [];
  const fullTextResults: Bookmark[] = [];
  const seenPaths = new Set<string>();

  // Determine which directories to scan
  const dirsToScan: string[] =
    searchFolders.length > 0
      ? searchFolders.map((f) => path.join(vaultPath, f))
      : [vaultPath];

  const allFiles: string[] = [];
  for (const dir of dirsToScan) {
    allFiles.push(...findMarkdownFiles(dir));
  }

  // Phase 1: Metadata (frontmatter) parse
  for (const filePath of allFiles) {
    const bookmark = parseObsidianFile(filePath);
    if (bookmark) {
      metadataResults.push(bookmark);
      seenPaths.add(filePath);
    }
  }

  // Phase 2: Index remaining files for full-text keyword matching.
  // These files don't have a frontmatter URL, so they won't appear in
  // the default (unfiltered) list — but Raycast's keyword filtering can
  // still surface them when the user types a query that matches their
  // body content, title, tags, etc.
  for (const filePath of allFiles) {
    if (seenPaths.has(filePath)) continue;

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch {
      continue;
    }

    const data = parsed.data as Record<string, unknown>;
    const title = (data.title as string) || path.basename(filePath, ".md");
    const tags = extractTags(data.tags);

    const bodySnippet = parsed.content
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/[#*_~`>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    // Skip files with no useful body content
    if (!bodySnippet && tags.length === 0) continue;

    fullTextResults.push({
      id: filePath,
      title,
      url: "", // no known URL for these
      source: "obsidian",
      tags,
      author: (data.author as string) || undefined,
      created: data.created ? String(data.created) : undefined,
      noteType: (data.type as string) || "",
      filePath,
      isFullTextMatch: true,
      bodySnippet,
    });
  }

  return { metadataResults, fullTextResults };
}

/**
 * Full-text search across all indexed files. Returns bookmarks whose
 * file body matches the query (case-insensitive). Only returns files
 * that are NOT already in `existingIds`.
 */
export function fullTextSearch(
  vaultPath: string,
  searchFolders: string[],
  query: string,
  existingIds: Set<string>,
): Bookmark[] {
  if (!query || query.trim().length < 2) return [];

  const results: Bookmark[] = [];
  const lowerQuery = query.toLowerCase();

  const dirsToScan: string[] =
    searchFolders.length > 0
      ? searchFolders.map((f) => path.join(vaultPath, f))
      : [vaultPath];

  const allFiles: string[] = [];
  for (const dir of dirsToScan) {
    allFiles.push(...findMarkdownFiles(dir));
  }

  for (const filePath of allFiles) {
    if (existingIds.has(filePath)) continue;

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    if (!raw.toLowerCase().includes(lowerQuery)) continue;

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch {
      continue;
    }

    const data = parsed.data as Record<string, unknown>;
    const url = (data.url as string) || (data.source as string) || "";
    if (!url) {
      // Try to find a URL in the body
      const urlMatch = parsed.content.match(/https?:\/\/[^\s)>\]"']+/);
      if (!urlMatch) continue;
    }

    const resolvedUrl =
      (data.url as string) ||
      (data.source as string) ||
      (parsed.content.match(/https?:\/\/[^\s)>\]"']+/) || [""])[0];

    if (!resolvedUrl) continue;

    const title = (data.title as string) || path.basename(filePath, ".md");
    const tags = extractTags(data.tags);

    results.push({
      id: filePath,
      title,
      url: resolvedUrl,
      source: "obsidian",
      tags,
      author: (data.author as string) || undefined,
      created: data.created ? String(data.created) : undefined,
      noteType: (data.type as string) || "",
      filePath,
      isFullTextMatch: true,
    });
  }

  return results;
}
