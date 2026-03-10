import * as fs from "fs";
import * as path from "path";
import type { Preferences } from "./preferences";

/**
 * Create a new Weblink bookmark file in the Obsidian vault.
 */
export function createBookmarkFile(
  prefs: Preferences,
  title: string,
  url: string,
  tags: string[],
  notes?: string,
): string {
  const folder = path.join(
    prefs.vaultPath,
    prefs.newBookmarkFolder || "Weblinks",
  );

  // Ensure folder exists
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  // Sanitize filename: remove characters not allowed in file names
  const sanitizedTitle = title
    .replace(/[/\\:*?"<>|#^[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const fileName = `${sanitizedTitle}.md`;
  let filePath = path.join(folder, fileName);

  // Handle duplicates by appending a number
  let counter = 1;
  while (fs.existsSync(filePath)) {
    filePath = path.join(folder, `${sanitizedTitle} ${counter}.md`);
    counter++;
  }

  const today = new Date().toISOString().split("T")[0];
  const tagsYaml =
    tags.length > 0 ? tags.map((t) => `  - ${t}`).join("\n") : "";

  const frontmatter = [
    "---",
    "type: weblink",
    `url: ${url}`,
    `title: "${title.replace(/"/g, '\\"')}"`,
    tags.length > 0 ? `tags:\n${tagsYaml}` : "tags:",
    `created: ${today}`,
    "---",
  ].join("\n");

  const body = notes ? `## Notes\n${notes}\n` : "## Notes\n";

  const content = `${frontmatter}\n${body}`;

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}
