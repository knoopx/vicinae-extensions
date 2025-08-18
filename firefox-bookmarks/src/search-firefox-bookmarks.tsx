import { existsSync, readdirSync, readFile } from "fs";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";

import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import ini from "ini";
import { useEffect, useMemo, useState } from "react";
import initSqlJs, { Database } from "sql.js";

const read = promisify(readFile);

const FIREFOX_FOLDER = path.join(homedir(), ".mozilla", "firefox");

const folderNames = {
  menu: "Bookmark Menu",
  mobile: "Mobile Bookmarks",
  tags: "Tags",
  toolbar: "Toolbar",
  unfiled: "Other Bookmarks",
};

async function getFirefoxProfiles() {
  if (!existsSync(`${FIREFOX_FOLDER}/profiles.ini`)) {
    return { profiles: [], defaultProfile: "" };
  }
  const file = await read(`${FIREFOX_FOLDER}/profiles.ini`, "utf-8");
  const iniFile = ini.parse(file);
  const profiles = Object.keys(iniFile)
    .filter((key) => {
      if (key.startsWith("Profile")) {
        const pathStr = iniFile[key].Path;
        const profileDirPath = `${FIREFOX_FOLDER}/${pathStr}`;
        if (!existsSync(profileDirPath)) return false;
        const profileDirectory = readdirSync(profileDirPath);
        return profileDirectory.includes("places.sqlite");
      }
      return false;
    })
    .map((key) => ({ name: iniFile[key].Name, path: iniFile[key].Path }));
  const installKey = Object.keys(iniFile).find((key) =>
    key.startsWith("Install")
  );
  let defaultProfile = "";
  if (installKey && iniFile[installKey]?.Default) {
    defaultProfile = iniFile[installKey].Default;
  } else if (profiles.length > 0) {
    defaultProfile = profiles[0].path;
  }
  profiles.sort((a, b) => a.name?.localeCompare(b.name));
  return { profiles, defaultProfile };
}

function getFirefoxFolders(db: Database) {
  const folders = [];
  const statement = db.prepare(
    `SELECT moz_bookmarks.id AS id, moz_bookmarks.parent AS parentId, moz_bookmarks.title AS title, moz_bookmarks.guid AS guid FROM moz_bookmarks WHERE moz_bookmarks.type = 2 AND moz_bookmarks.title IS NOT NULL AND moz_bookmarks.title <> '' AND moz_bookmarks.fk IS NULL;`
  );
  while (statement.step()) {
    const row = statement.getAsObject();
    folders.push(row);
  }
  statement.free();
  return folders;
}

function getFirefoxBookmarks(db: Database) {
  const bookmarks = [];
  const statement = db.prepare(
    `SELECT moz_places.id AS id, moz_bookmarks.parent AS parentId, moz_bookmarks.title AS title, moz_places.url AS urlString, moz_bookmarks.dateAdded AS dateAdded FROM moz_bookmarks LEFT JOIN moz_places ON moz_bookmarks.fk = moz_places.id WHERE moz_bookmarks.type = 1 AND moz_bookmarks.title IS NOT NULL AND moz_places.url IS NOT NULL;`
  );
  while (statement.step()) {
    const row = statement.getAsObject();
    bookmarks.push(row);
  }
  statement.free();
  return bookmarks;
}

interface Preferences {
  showDomain: boolean;
  openBookmarkBrowser?: boolean;
}

type Bookmark = {
  id: string;
  title: string;
  url: string;
  folder: string;
  domain: string;
  dateAdded: number;
};
type Folder = { id: string; icon: string; title: string };

export default function Command() {
  const { showDomain } = getPreferenceValues<Preferences>();
  type Profile = { name: string; path: string };
  const [, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const { profiles, defaultProfile } = await getFirefoxProfiles();
        if (profiles.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Firefox profiles found",
            message: "No Firefox profiles detected on this system.",
          });
        }
        setProfiles(profiles);
        setCurrentProfile(defaultProfile);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading profiles",
          message: String(error),
        });
        setProfiles([]);
        setCurrentProfile("");
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!currentProfile) return;
    (async () => {
      setIsLoading(true);
      try {
        const dbPath = `${FIREFOX_FOLDER}/${currentProfile}/places.sqlite`;
        console.log("[DEBUG] Loading profile:", currentProfile);

        if (!existsSync(dbPath)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "places.sqlite not found",
            message: `No Firefox bookmarks database found for profile: ${currentProfile}`,
          });
          setFolders([]);
          setBookmarks([]);
          setIsLoading(false);
          return;
        }
        const bufferRaw = await read(dbPath);
        console.log("[DEBUG] Read places.sqlite, length:", bufferRaw.length);
        const SQL = await initSqlJs({
          locateFile: () => path.resolve(__dirname, "assets/sql-wasm.wasm"),
        });

        const db = new SQL.Database(new Uint8Array(bufferRaw));

        const rawFolders = getFirefoxFolders(db);

        const rawBookmarks = getFirefoxBookmarks(db);

        const folders = rawFolders.map((folder) => {
          const hierarchy = [
            folder.parentId === 1 &&
            typeof folder.title === "string" &&
            Object.hasOwn(folderNames, folder.title)
              ? folderNames[folder.title as keyof typeof folderNames]
              : typeof folder.title === "string"
                ? folder.title
                : "",
          ];
          let parentId = folder.parentId;
          while (parentId !== 1) {
            const parent = rawFolders.find((f) => f.id === parentId);
            if (parent) {
              hierarchy.push(
                parent.parentId === 1 &&
                  typeof parent.title === "string" &&
                  Object.hasOwn(folderNames, parent.title)
                  ? folderNames[parent.title as keyof typeof folderNames]
                  : typeof parent.title === "string"
                    ? parent.title
                    : ""
              );
              parentId = parent.parentId;
            } else {
              break;
            }
          }
          return {
            ...folder,
            id: `${folder.id}`,
            title: hierarchy.reverse().join("/"),
            icon: "firefox.png",
          };
        });
        setFolders(folders);

        const bookmarks = rawBookmarks.map((bookmark) => {
          const folder = folders.find(
            (folder) => folder.id === `${bookmark.parentId}`
          );
          let domain = "";
          try {
            if (typeof bookmark.urlString === "string") {
              domain = new URL(bookmark.urlString).hostname;
            }
          } catch {
            // Ignore invalid URLs
          }

          return {
            id: `${bookmark.id}`,
            title: typeof bookmark.title === "string" ? bookmark.title : "",
            url:
              typeof bookmark.urlString === "string" ? bookmark.urlString : "",
            folder: folder ? folder.title : "",
            domain,
            dateAdded:
              typeof bookmark.dateAdded === "number" ? bookmark.dateAdded : 0,
          };
        });
        // Sort by dateAdded descending (most recent first)
        bookmarks.sort((a, b) => b.dateAdded - a.dateAdded);
        setBookmarks(bookmarks);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading bookmarks",
          message: String(error),
        });
        setFolders([]);
        setBookmarks([]);
      }
      setIsLoading(false);
    })();
  }, [currentProfile]);

  const folderBookmarks = useMemo(() => {
    return bookmarks.filter((item) => {
      if (selectedFolderId === "") return true;
      const folder = folders.find((folder) => folder.id === selectedFolderId);
      if (!folder) return true;
      return item.folder.includes(folder.title);
    });
  }, [bookmarks, selectedFolderId, folders]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Firefox bookmarks"
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Folder" onChange={setSelectedFolderId}>
          <List.Dropdown.Item icon={Icon.Globe} title="All" value="" />
          {folders.map((folder) => (
            <List.Dropdown.Item
              key={folder.id}
              icon={folder.icon}
              title={folder.title}
              value={folder.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      {folderBookmarks
        .filter((item) =>
          item.title.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 100)
        .map((item) => (
          <List.Item
            key={item.id}
            icon={Icon.Bookmark}
            title={item.title}
            subtitle={showDomain ? item.domain : ""}
            accessories={
              item.folder ? [{ icon: Icon.Folder, tag: item.folder }] : []
            }
            actions={
              <ActionPanel>
                {getPreferenceValues<Preferences>().openBookmarkBrowser ? (
                  <Action
                    title="Open in Firefox"
                    icon={Icon.Globe}
                    onAction={async () => {
                      try {
                        await showToast({
                          style: Toast.Style.Animated,
                          title: "Opening in Firefox...",
                        });
                        const firefoxCmd = "firefox";
                        const { exec } = require("child_process");
                        exec(
                          `"${firefoxCmd}" "${item.url}"`,
                          (err: Error | null) => {
                            if (err) {
                              showToast({
                                style: Toast.Style.Failure,
                                title: "Failed to open in Firefox",
                                message: String(err),
                              });
                            }
                          }
                        );
                      } catch (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to open in Firefox",
                          message: String(error),
                        });
                      }
                    }}
                  />
                ) : (
                  <Action.OpenInBrowser url={item.url} />
                )}
                <Action.CopyToClipboard title="Copy Link" content={item.url} />
              </ActionPanel>
            }
          />
        ))}
      <List.EmptyView
        title="No Firefox bookmarks found"
        description="No bookmarks available in Firefox."
        icon={Icon.Bookmark}
      />
    </List>
  );
}
