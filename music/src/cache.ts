import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, renameSync, readdirSync } from "fs";
import { ReleaseData } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "net.knoopx.music");
const CACHE_DIR = join(homedir(), ".cache", "net.knoopx.music");
const RELEASES_CACHE_FILE = join(CACHE_DIR, "releases.json");
const STARRED_FILE = join(CONFIG_DIR, "starred.json");
const COLLECTIONS_DIR = join(CONFIG_DIR, "collections");

export function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  if (!existsSync(COLLECTIONS_DIR)) {
    mkdirSync(COLLECTIONS_DIR, { recursive: true });
  }
}

export function loadReleasesFromCache(): ReleaseData[] {
  ensureConfigDir();
  if (!existsSync(RELEASES_CACHE_FILE)) return [];

  try {
    const data = readFileSync(RELEASES_CACHE_FILE, "utf-8");
    const rawReleases = JSON.parse(data);

    // Convert from legacy format to TypeScript interface
    return rawReleases.map(
      (release: any): ReleaseData => ({
        title: release.title || "",
        path: release.path || "",
        track_count: release.track_count || release.trackCount || 0,
      }),
    );
  } catch (error) {
    console.error("Failed to load releases from cache:", error);
    return [];
  }
}

export function saveReleasesToCache(releases: ReleaseData[]) {
  ensureConfigDir();
  try {
    const tempFile = RELEASES_CACHE_FILE + ".tmp";
    writeFileSync(tempFile, JSON.stringify(releases, null, 2), "utf-8");
    // Atomic replace
    if (existsSync(RELEASES_CACHE_FILE)) {
      unlinkSync(RELEASES_CACHE_FILE);
      renameSync(tempFile, RELEASES_CACHE_FILE);
    } else {
      renameSync(tempFile, RELEASES_CACHE_FILE);
    }
  } catch (error) {
    console.error("Failed to save releases to cache:", error);
  }
}

export function loadStarredPaths(): string[] {
  ensureConfigDir();
  if (!existsSync(STARRED_FILE)) return [];

  try {
    const data = readFileSync(STARRED_FILE, "utf-8");
    const starred = JSON.parse(data);
    return starred.paths || [];
  } catch (error) {
    console.error("Failed to load starred paths:", error);
    return [];
  }
}

export function saveStarredPaths(paths: string[]) {
  ensureConfigDir();
  try {
    const data = { paths };
    writeFileSync(STARRED_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save starred paths:", error);
  }
}

export function loadCollections(): { [name: string]: string[] } {
  ensureConfigDir();
  const collections: { [name: string]: string[] } = {};

  try {
    const files = readdirSync(COLLECTIONS_DIR);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const collectionName = file.slice(0, -5); // Remove .json
        const collectionPath = join(COLLECTIONS_DIR, file);

        try {
          const data = readFileSync(collectionPath, "utf-8");
          const paths = JSON.parse(data);
          collections[collectionName] = Array.isArray(paths) ? paths : [];
        } catch (error) {
          console.error(`Failed to load collection ${collectionName}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Failed to load collections:", error);
  }

  return collections;
}

export function saveCollection(name: string, paths: string[]) {
  ensureConfigDir();

  try {
    const collectionPath = join(COLLECTIONS_DIR, `${name}.json`);
    writeFileSync(collectionPath, JSON.stringify(paths, null, 2), "utf-8");
  } catch (error) {
    console.error(`Failed to save collection ${name}:`, error);
  }
}
