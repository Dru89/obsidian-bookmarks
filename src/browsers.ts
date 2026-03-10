import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import type { Bookmark } from "./types";

// ─── Chrome ──────────────────────────────────────────────────────────────────

interface ChromeBookmarkNode {
  type: string;
  name: string;
  url?: string;
  date_added?: string;
  children?: ChromeBookmarkNode[];
}

interface ChromeBookmarkFile {
  roots: Record<string, ChromeBookmarkNode>;
}

function flattenChromeNode(
  node: ChromeBookmarkNode,
  folderPath: string,
): Bookmark[] {
  const results: Bookmark[] = [];
  const currentPath = folderPath ? `${folderPath} > ${node.name}` : node.name;

  if (node.type === "url" && node.url) {
    results.push({
      id: `chrome:${node.url}:${currentPath}`,
      title: node.name || node.url,
      url: node.url,
      source: "chrome",
      tags: [],
      folder: folderPath || undefined,
      created: node.date_added ? chromeTimeToDate(node.date_added) : undefined,
    });
  }

  if (node.children) {
    for (const child of node.children) {
      results.push(
        ...flattenChromeNode(
          child,
          node.type === "folder" ? currentPath : folderPath,
        ),
      );
    }
  }

  return results;
}

/**
 * Chrome stores timestamps as microseconds since 1601-01-01.
 * Convert to ISO date string.
 */
function chromeTimeToDate(chromeTime: string): string {
  try {
    const microseconds = BigInt(chromeTime);
    // Microseconds between 1601-01-01 and 1970-01-01
    const epochDiff = BigInt("11644473600000000");
    const unixMicroseconds = microseconds - epochDiff;
    const unixMilliseconds = Number(unixMicroseconds / BigInt(1000));
    return new Date(unixMilliseconds).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function readChromeBookmarks(): Bookmark[] {
  const home = os.homedir();
  // Check for common Chrome profile locations
  const possiblePaths = [
    path.join(
      home,
      "Library",
      "Application Support",
      "Google",
      "Chrome",
      "Default",
      "Bookmarks",
    ),
    path.join(
      home,
      "Library",
      "Application Support",
      "Google",
      "Chrome",
      "Profile 1",
      "Bookmarks",
    ),
  ];

  for (const bookmarksPath of possiblePaths) {
    try {
      if (!fs.existsSync(bookmarksPath)) continue;
      const raw = fs.readFileSync(bookmarksPath, "utf-8");
      const data = JSON.parse(raw) as ChromeBookmarkFile;
      const results: Bookmark[] = [];
      for (const root of Object.values(data.roots)) {
        if (root && typeof root === "object") {
          results.push(...flattenChromeNode(root, ""));
        }
      }
      return results;
    } catch {
      continue;
    }
  }

  return [];
}

// ─── Safari ──────────────────────────────────────────────────────────────────

/**
 * Safari bookmarks are stored in a binary plist file.
 * We use `plutil` to convert to JSON, then parse.
 */

interface SafariBookmarkNode {
  WebBookmarkType: string;
  Title?: string;
  URLString?: string;
  URIDictionary?: { title?: string };
  Children?: SafariBookmarkNode[];
}

function flattenSafariNode(
  node: SafariBookmarkNode,
  folderPath: string,
): Bookmark[] {
  const results: Bookmark[] = [];

  const title = node.URIDictionary?.title || node.Title || "";
  const currentFolder =
    node.WebBookmarkType === "WebBookmarkTypeList"
      ? folderPath
        ? `${folderPath} > ${title}`
        : title
      : folderPath;

  if (node.WebBookmarkType === "WebBookmarkTypeLeaf" && node.URLString) {
    results.push({
      id: `safari:${node.URLString}:${folderPath}`,
      title: title || node.URLString,
      url: node.URLString,
      source: "safari",
      tags: [],
      folder: folderPath || undefined,
    });
  }

  if (node.Children) {
    for (const child of node.Children) {
      results.push(...flattenSafariNode(child, currentFolder));
    }
  }

  return results;
}

export function readSafariBookmarks(): Bookmark[] {
  const home = os.homedir();
  const plistPath = path.join(home, "Library", "Safari", "Bookmarks.plist");

  try {
    if (!fs.existsSync(plistPath)) return [];

    // Convert binary plist to JSON using plutil
    const jsonStr = execSync(`plutil -convert json -o - "${plistPath}"`, {
      encoding: "utf-8",
      timeout: 5000,
    });

    const data = JSON.parse(jsonStr) as SafariBookmarkNode;
    return flattenSafariNode(data, "");
  } catch {
    return [];
  }
}
