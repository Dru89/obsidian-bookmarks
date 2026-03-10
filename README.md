# Obsidian Bookmarks

A [Raycast](https://www.raycast.com/) extension for searching and managing bookmarks stored in your [Obsidian](https://obsidian.md/) vault — plus Chrome and Safari bookmarks.

## Features

### Search Bookmarks

Search across all your bookmarks from a single Raycast command:

- **Obsidian vault** — Indexes markdown files with URLs in frontmatter (`url` or `source` fields). Supports both Readwise highlights and manually created weblinks.
- **Chrome bookmarks** — Reads your local Chrome bookmarks file.
- **Safari bookmarks** — Reads your local Safari bookmarks via `plutil`.
- **Full-text matching** — Files without a frontmatter URL are still searchable by their body content when you type a query. Results appear in a separate "Full-Text Matches" section below the primary results.

#### Actions

| Action | Shortcut | Description |
|---|---|---|
| Open in Browser | `Enter` | Opens the bookmark URL in your default browser |
| Copy URL | `Cmd+Shift+C` | Copies the URL to your clipboard |
| Open in Obsidian | `Cmd+Enter` | Opens the Obsidian note (Obsidian bookmarks only) |
| Show in Finder | `Cmd+Shift+F` | Reveals the file in Finder (Obsidian bookmarks only) |
| Save to Obsidian | `Cmd+Shift+S` | Saves a Chrome/Safari bookmark to your vault |

### Add Bookmark

Quickly add a new bookmark to your Obsidian vault with a simple form:

- **URL** (required)
- **Title** (defaults to the hostname if left blank)
- **Tags** (comma-separated)
- **Notes** (optional)

New bookmarks are saved as markdown files using the Obsidian Weblink format:

```yaml
---
type: weblink
url: https://example.com
title: "Example Page"
tags:
  - tag1
  - tag2
created: 2026-03-10
---
## Notes
Your notes here.
```

## Configuration

All preferences are configured in Raycast's extension settings.

| Preference | Type | Required | Default | Description |
|---|---|---|---|---|
| Obsidian Vault Path | Directory | Yes | — | Path to your Obsidian vault |
| Search Folders | Text | No | `Highlights,Weblinks` | Comma-separated list of folders to search. Leave blank to search the entire vault. |
| New Bookmark Folder | Text | No | `Weblinks` | Folder where new bookmarks are saved |
| Search Chrome Bookmarks | Checkbox | No | `true` | Include Chrome bookmarks in search |
| Search Safari Bookmarks | Checkbox | No | `true` | Include Safari bookmarks in search |

### Obsidian File Format

The extension reads frontmatter from `.md` files. It supports two schemas:

**Weblinks** — files with `type: weblink` and a `url` field:

```yaml
---
type: weblink
url: https://example.com
title: "Page Title"
tags:
  - tag1
created: 2026-01-01
---
```

**Highlights** (e.g. from [Readwise](https://readwise.io/)) — files with `type: highlight` and a `source` field:

```yaml
---
type: highlight
title: "Article Title"
source: "https://example.com/article"
author: "Author Name"
tags: ["readwise", "articles"]
created: 2026-01-01
---
```

Both formats are supported out of the box. The extension falls back to the filename as the title if no `title` field is present.

## Installation

```bash
git clone https://github.com/Dru89/obsidian-bookmarks.git
cd obsidian-bookmarks
npm install
npm run dev
```

Then open Raycast, search for "Search Bookmarks" or "Add Bookmark", and configure the vault path when prompted.

## Development

```bash
npm run dev       # Start in development mode with hot reload
npm run build     # Build the extension
npm run lint      # Run linter
npm run fix-lint  # Auto-fix lint issues
```

## License

MIT
