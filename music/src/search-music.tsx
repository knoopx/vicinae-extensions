import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { basename } from "path";
import { ReleaseData } from "./types";
import { StarredManager } from "./starred";
import { CollectionManager } from "./collections";
import { MusicFilter, FilterState } from "./filtering";
import { loadReleasesFromCache } from "./cache";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function SearchMusic() {
  const [releases, setReleases] = useCachedState<ReleaseData[]>("releases", []);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");

  const [starredManager] = useState(() => new StarredManager());
  const [collectionManager] = useState(() => new CollectionManager());
  const [musicFilter] = useState(
    () => new MusicFilter(starredManager, collectionManager),
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);

    try {
      const cachedReleases = loadReleasesFromCache();
      
      if (cachedReleases.length > 0) {
        setReleases(cachedReleases);
        showToast({
          style: Toast.Style.Success,
          title: `Loaded ${cachedReleases.length} releases from cache`,
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No releases found in cache",
          message: "Please run the 'Scan Library' command first",
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load music library",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function playRelease(release: ReleaseData) {
    try {
      await execAsync(`amberol "${release.path}"`);
      showToast({
        style: Toast.Style.Success,
        title: `Playing: ${release.title}`,
      });
    } catch (error) {
      try {
        await execAsync(`xdg-open "${release.path}"`);
        showToast({
          style: Toast.Style.Success,
          title: `Opening: ${release.title}`,
        });
      } catch (fallbackError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open release",
          message: "Could not open with amberol or system default",
        });
      }
    }
  }

  async function openInFinder(release: ReleaseData) {
    try {
      await execAsync(`xdg-open "${release.path}"`);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open in file manager",
      });
    }
  }

  function toggleStar(release: ReleaseData) {
    const newStarred = starredManager.toggle(release.path);
    showToast({
      style: Toast.Style.Success,
      title: newStarred
        ? `Starred: ${release.title}`
        : `Unstarred: ${release.title}`,
    });
  }

  const collectionNames = collectionManager.keys();

  // Filter releases using the MusicFilter class
  const filteredReleases = useMemo(() => {
    const filterState: FilterState = {
      query,
      starFilter: starredOnly,
      collectionFilter: selectedCollection,
    };
    return musicFilter.filter(releases, filterState);
  }, [releases, query, starredOnly, selectedCollection, musicFilter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search music..."
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Collection"
          value={selectedCollection}
          onChange={setSelectedCollection}
        >
          <List.Dropdown.Item title="All" value="" />
          {collectionNames.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Filters">
            <Action
              title={starredOnly ? "Show All Releases" : "Show Starred Only"}
              icon={starredOnly ? Icon.EyeSlash : Icon.Eye}
              onAction={() => {
                setStarredOnly((prev) => !prev);
                showToast({
                  style: Toast.Style.Success,
                  title: starredOnly
                    ? "Showing all releases"
                    : "Showing starred only",
                });
              }}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            />
            <Action
              title="Clear Filters"
              icon={Icon.XMarkCircle}
              onAction={() => {
                setQuery("");
                setStarredOnly(false);
                setSelectedCollection("");
                showToast({
                  style: Toast.Style.Success,
                  title: "Filters cleared",
                });
              }}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {filteredReleases.slice(0, 100).map((release) => (
        <List.Item
          key={release.path}
          icon={Icon.Music}
          title={release.title}
          subtitle=""
          accessories={[
            ...(starredManager.isStarred(release.path)
              ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]
              : []),
            { text: `${release.track_count} tracks` },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Playback">
                <Action
                  title="Play"
                  onAction={() => playRelease(release)}
                  icon={Icon.Play}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Management">
                <Action
                  title={
                    starredManager.isStarred(release.path)
                      ? "Remove Star"
                      : "Add Star"
                  }
                  onAction={() => toggleStar(release)}
                  icon={
                    starredManager.isStarred(release.path)
                      ? Icon.StarDisabled
                      : Icon.Star
                  }
                  shortcut={Keyboard.Shortcut.Common.Pin}
                />
                <Action
                  title="Reveal in File Manager"
                  onAction={() => openInFinder(release)}
                  icon={Icon.Finder}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Filters">
                <Action
                  title={
                    starredOnly ? "Show All Releases" : "Show Starred Only"
                  }
                  icon={starredOnly ? Icon.EyeSlash : Icon.Eye}
                  onAction={() => {
                    setStarredOnly((prev) => !prev);
                    showToast({
                      style: Toast.Style.Success,
                      title: starredOnly
                        ? "Showing all releases"
                        : "Showing starred only",
                    });
                  }}
                  shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                />
                <Action
                  title="Clear Filters"
                  icon={Icon.XMarkCircle}
                  onAction={() => {
                    setQuery("");
                    setStarredOnly(false);
                    setSelectedCollection("");
                    showToast({
                      style: Toast.Style.Success,
                      title: "Filters cleared",
                    });
                  }}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
