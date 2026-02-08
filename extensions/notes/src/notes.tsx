import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  showToast,
} from "@vicinae/api";
import { homedir } from "os";
import { basename, extname, join, relative } from "path";
import { readdir, readFile, rm, stat } from "fs/promises";
import { useCallback, useEffect, useMemo, useState } from "react";

type Preferences = {
  rootDirectory?: string;
};

type FrontmatterEntry = {
  key: string;
  value: string;
};

type NoteFile = {
  path: string;
  relativePath: string;
  name: string;
  content: string;
  modifiedAt: Date;
  size: number;
  frontmatterEntries: FrontmatterEntry[];
};

export default function NotesCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const rootDirectory = useMemo(
    () => resolveHomePath(preferences.rootDirectory || "~/Documents/"),
    [preferences.rootDirectory],
  );

  const [notes, setNotes] = useState<NoteFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const markdownFiles = await findMarkdownFiles(rootDirectory);
      const loaded = await Promise.all(
        markdownFiles.map((filePath) => toNoteFile(rootDirectory, filePath)),
      );
      loaded.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      setNotes(loaded);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load notes";
      setError(message);
      setNotes([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load notes",
        message,
      });
    }

    setIsLoading(false);
  }, [rootDirectory]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const deleteNote = useCallback(async (note: NoteFile) => {
    const confirmed = await confirmAlert({
      title: "Delete Note",
      message: `Delete ${note.relativePath}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) {
      return;
    }

    try {
      await rm(note.path);
      setNotes((previous) =>
        previous.filter((item) => item.path !== note.path),
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Note deleted",
        message: note.name,
      });
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete note";
      await showToast({
        style: Toast.Style.Failure,
        title: "Delete failed",
        message,
      });
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search markdown notes"
      navigationTitle="Notes"
    >
      {error ? (
        <List.EmptyView
          title="Unable to load notes"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.RotateClockwise}
                onAction={loadNotes}
              />
            </ActionPanel>
          }
        />
      ) : notes.length === 0 ? (
        <List.EmptyView
          title="No markdown files found"
          description={`Checked ${rootDirectory}`}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.RotateClockwise}
                onAction={loadNotes}
              />
            </ActionPanel>
          }
        />
      ) : (
        notes.map((note) => (
          <List.Item
            key={note.path}
            title={note.name}
            subtitle={note.relativePath}
            icon={Icon.Document}
            detail={
              <List.Item.Detail
                markdown={note.content || "*(Empty file)*"}
                metadata={
                  note.frontmatterEntries.length > 0 ? (
                    <List.Item.Detail.Metadata>
                      {note.frontmatterEntries.map((entry) => (
                        <List.Item.Detail.Metadata.Label
                          key={entry.key}
                          title={entry.key}
                          text={entry.value}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  ) : null
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Edit Note"
                  icon={Icon.Pencil}
                  onAction={() => open(note.path)}
                />
                <Action.CopyToClipboard title="Copy Path" content={note.path} />
                <Action
                  title="Delete Note"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteNote(note)}
                />
                <Action
                  title="Reload"
                  icon={Icon.RotateClockwise}
                  onAction={loadNotes}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

async function findMarkdownFiles(rootDirectory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(rootDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(rootDirectory, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await findMarkdownFiles(fullPath);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isMarkdownFile(fileName: string): boolean {
  const extension = extname(fileName).toLowerCase();
  return extension === ".md" || extension === ".markdown";
}

async function toNoteFile(
  rootDirectory: string,
  filePath: string,
): Promise<NoteFile> {
  const [content, fileStat] = await Promise.all([
    readFile(filePath, "utf8"),
    stat(filePath),
  ]);
  const frontmatterEntries = parseFrontmatter(content);

  return {
    path: filePath,
    relativePath: relative(rootDirectory, filePath),
    name: basename(filePath),
    content,
    modifiedAt: fileStat.mtime,
    size: fileStat.size,
    frontmatterEntries,
  };
}

function parseFrontmatter(content: string): FrontmatterEntry[] {
  if (!content.startsWith("---\n")) {
    return [];
  }

  const endMarkerIndex = content.indexOf("\n---", 4);
  if (endMarkerIndex === -1) {
    return [];
  }

  const rawFrontmatter = content.slice(4, endMarkerIndex).trim();
  if (!rawFrontmatter) {
    return [];
  }

  return rawFrontmatter
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return { key: line, value: "" };
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      return { key: key || "field", value };
    });
}

function resolveHomePath(inputPath: string): string {
  const trimmedPath = inputPath.trim();
  if (!trimmedPath.startsWith("~")) {
    return trimmedPath;
  }

  return join(homedir(), trimmedPath.slice(1));
}
