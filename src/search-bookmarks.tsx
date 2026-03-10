import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import type { Bookmark } from "./types";
import type { Preferences } from "./preferences";
import { getSearchFolders } from "./preferences";
import { indexObsidianBookmarks } from "./obsidian";
import { readChromeBookmarks, readSafariBookmarks } from "./browsers";
import { createBookmarkFile } from "./create-bookmark";

async function loadAllBookmarks(): Promise<{
  metadataBookmarks: Bookmark[];
  fullTextBookmarks: Bookmark[];
}> {
  const prefs = getPreferenceValues<Preferences>();
  const folders = getSearchFolders(prefs);

  const { metadataResults, fullTextResults } = indexObsidianBookmarks(
    prefs.vaultPath,
    folders,
  );

  const metadataBookmarks: Bookmark[] = [...metadataResults];
  const fullTextBookmarks: Bookmark[] = [...fullTextResults];

  // Add browser bookmarks to metadata (they're always "structured" data)
  if (prefs.enableChrome) {
    metadataBookmarks.push(...readChromeBookmarks());
  }
  if (prefs.enableSafari) {
    metadataBookmarks.push(...readSafariBookmarks());
  }

  return { metadataBookmarks, fullTextBookmarks };
}

function sourceIcon(source: Bookmark["source"]): {
  source: Icon;
  tintColor?: Color;
} {
  switch (source) {
    case "obsidian":
      return { source: Icon.Document, tintColor: Color.Purple };
    case "chrome":
      return { source: Icon.Globe, tintColor: Color.Blue };
    case "safari":
      return { source: Icon.Globe, tintColor: Color.Orange };
  }
}

function sourceLabel(source: Bookmark["source"]): string {
  switch (source) {
    case "obsidian":
      return "Obsidian";
    case "chrome":
      return "Chrome";
    case "safari":
      return "Safari";
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function BookmarkItem({
  bookmark,
  onSaveToObsidian,
}: {
  bookmark: Bookmark;
  onSaveToObsidian?: (bookmark: Bookmark) => void;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (bookmark.tags.length > 0) {
    accessories.push({ tag: bookmark.tags[0] });
  }
  if (bookmark.noteType) {
    accessories.push({
      tag: { value: bookmark.noteType, color: Color.SecondaryText },
    });
  }
  accessories.push({
    icon: sourceIcon(bookmark.source),
    tooltip: sourceLabel(bookmark.source),
  });

  const domain = getDomain(bookmark.url);
  const subtitleParts = [
    bookmark.author || bookmark.folder || "",
    domain,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");

  // Break the URL into searchable parts: full URL, hostname, and
  // individual domain segments (e.g. "confluence" from "confluence.disney.com")
  const domainParts = domain.split(".").filter((p) => p.length > 1);

  return (
    <List.Item
      key={bookmark.id}
      title={bookmark.title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={[
        bookmark.url,
        domain,
        ...domainParts,
        ...bookmark.tags,
        bookmark.author || "",
        bookmark.noteType || "",
        bookmark.folder || "",
        bookmark.description || "",
        bookmark.bodySnippet || "",
      ].filter(Boolean)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={bookmark.url} />
            {bookmark.source === "obsidian" && bookmark.filePath && (
              <Action.Open
                title="Open in Obsidian"
                target={`obsidian://open?path=${encodeURIComponent(bookmark.filePath)}`}
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
            )}
            <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
          </ActionPanel.Section>
          {bookmark.source === "obsidian" && bookmark.filePath && (
            <ActionPanel.Section title="Obsidian">
              <Action.ShowInFinder path={bookmark.filePath} />
            </ActionPanel.Section>
          )}
          {bookmark.source !== "obsidian" && onSaveToObsidian && (
            <ActionPanel.Section title="Obsidian">
              <Action
                title="Save to Obsidian"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={() => onSaveToObsidian(bookmark)}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, revalidate } = useCachedPromise(
    loadAllBookmarks,
    [],
    {
      keepPreviousData: true,
    },
  );

  const metadataBookmarks = data?.metadataBookmarks ?? [];
  const fullTextBookmarks = data?.fullTextBookmarks ?? [];

  // Combine: metadata first, then full-text (already deduped by the indexer)
  const allBookmarks = useMemo(() => {
    return [...metadataBookmarks, ...fullTextBookmarks];
  }, [metadataBookmarks, fullTextBookmarks]);

  async function handleSaveToObsidian(bookmark: Bookmark) {
    try {
      const prefs = getPreferenceValues<Preferences>();
      createBookmarkFile(prefs, bookmark.title, bookmark.url, []);
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Obsidian",
        message: bookmark.title,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(error),
      });
    }
  }

  // Group bookmarks by source for sectioned display
  const obsidianBookmarks = allBookmarks.filter(
    (b) => b.source === "obsidian" && !b.isFullTextMatch,
  );
  const fullTextObsidianBookmarks = allBookmarks.filter(
    (b) => b.source === "obsidian" && b.isFullTextMatch,
  );
  const chromeBookmarks = allBookmarks.filter((b) => b.source === "chrome");
  const safariBookmarks = allBookmarks.filter((b) => b.source === "safari");

  // Only show full-text matches when the user has typed a search query
  const showFullText = searchText.trim().length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
      filtering={true}
      onSearchTextChange={setSearchText}
    >
      {obsidianBookmarks.length > 0 && (
        <List.Section
          title="Obsidian Bookmarks"
          subtitle={`${obsidianBookmarks.length} bookmarks`}
        >
          {obsidianBookmarks.map((b) => (
            <BookmarkItem key={b.id} bookmark={b} />
          ))}
        </List.Section>
      )}
      {chromeBookmarks.length > 0 && (
        <List.Section
          title="Chrome Bookmarks"
          subtitle={`${chromeBookmarks.length} bookmarks`}
        >
          {chromeBookmarks.map((b) => (
            <BookmarkItem
              key={b.id}
              bookmark={b}
              onSaveToObsidian={handleSaveToObsidian}
            />
          ))}
        </List.Section>
      )}
      {safariBookmarks.length > 0 && (
        <List.Section
          title="Safari Bookmarks"
          subtitle={`${safariBookmarks.length} bookmarks`}
        >
          {safariBookmarks.map((b) => (
            <BookmarkItem
              key={b.id}
              bookmark={b}
              onSaveToObsidian={handleSaveToObsidian}
            />
          ))}
        </List.Section>
      )}
      {showFullText && fullTextObsidianBookmarks.length > 0 && (
        <List.Section
          title="Full-Text Matches"
          subtitle={`${fullTextObsidianBookmarks.length} additional results`}
        >
          {fullTextObsidianBookmarks.map((b) => (
            <BookmarkItem key={b.id} bookmark={b} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
