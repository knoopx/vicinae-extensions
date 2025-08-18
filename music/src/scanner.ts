import { homedir } from "os";
import { join } from "path";
import { readdirSync, statSync } from "fs";
import { parseFile } from "music-metadata";
import { ReleaseData } from "./types";

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".flac",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wma",
  ".ape",
  ".alac",
];

export function isAudioFile(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return AUDIO_EXTENSIONS.includes(ext);
}

export function cleanReleaseTitle(title: string): string {
  return title
    .replace(/\[.*?\]/g, "") // Remove bracketed text like [2021], [FLAC]
    .replace(/\(.*?\)/g, "") // Remove parenthetical text like (Deluxe Edition)
    .replace(/ - .*$/g, "") // Remove text after " - " like " - Remastered"
    .replace(/\.(zip|rar|tar\.gz|7z|gz|bz2)$/i, "") // Remove file extensions
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\-+/g, "-") // Normalize multiple dashes
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim(); // Trim whitespace
}

export async function scanMusicDirectory(
  musicDir: string = join(homedir(), "Music"),
): Promise<ReleaseData[]> {
  const releases: ReleaseData[] = [];
  const foundReleases = new Set<string>();

  async function walk(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      const audioFiles: string[] = [];

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories
          if (entry.name.startsWith(".")) continue;

          // Skip very deep directories (more than 10 levels)
          const depth = fullPath.split("/").length - musicDir.split("/").length;
          if (depth > 10) continue;

          await walk(fullPath);
        } else if (entry.isFile() && isAudioFile(entry.name)) {
          audioFiles.push(fullPath);
        }
      }

      // If this directory is not the root music directory, treat it as a potential release
      if (dir !== musicDir) {
        const pathStr = dir;
        if (!foundReleases.has(pathStr)) {
          foundReleases.add(pathStr);

          const release: ReleaseData = {
            title: cleanReleaseTitle(dir.split("/").pop() || dir),
            path: pathStr,
            track_count: audioFiles.length,
          };

          releases.push(release);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  await walk(musicDir);
  return releases.sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
  );
}
