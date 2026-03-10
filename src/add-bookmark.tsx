import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import type { Preferences } from "./preferences";
import { createBookmarkFile } from "./create-bookmark";

export default function AddBookmark() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>();

  function validateUrl(value: string) {
    if (!value) {
      setUrlError("URL is required");
    } else if (!/^https?:\/\/.+/.test(value)) {
      setUrlError("Must be a valid URL starting with http:// or https://");
    } else {
      setUrlError(undefined);
    }
  }

  async function handleSubmit() {
    if (!url) {
      setUrlError("URL is required");
      return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
      setUrlError("Must be a valid URL starting with http:// or https://");
      return;
    }

    const resolvedTitle = title.trim() || new URL(url).hostname;
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      const prefs = getPreferenceValues<Preferences>();
      createBookmarkFile(
        prefs,
        resolvedTitle,
        url,
        tagList,
        notes.trim() || undefined,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark saved",
        message: resolvedTitle,
      });
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save bookmark",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Bookmark"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/article"
        value={url}
        onChange={(value) => {
          setUrl(value);
          validateUrl(value);
        }}
        error={urlError}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Page title (leave blank to use hostname)"
        value={title}
        onChange={setTitle}
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2, tag3"
        value={tags}
        onChange={setTags}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Optional notes about this bookmark..."
        value={notes}
        onChange={setNotes}
      />
    </Form>
  );
}
