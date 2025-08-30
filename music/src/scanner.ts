import { homedir } from "os";
import { join } from "path";
import { readdirSync, statSync, realpathSync } from "fs";
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

export class MusicScanner {
  private musicDir: string;
  private scanCancelled = false;
  private scanTotalEstimated = 0;
  private scanGenerator: Generator<ReleaseData | [string, number] | null, void, unknown> | null = null;
  private scanProgress = 0.0;

  constructor(musicDir: string = join(homedir(), "Music")) {
    this.musicDir = musicDir;
  }

  cancelScan(): void {
    this.scanCancelled = true;
  }

  initializeScanning(): void {
    this.scanGenerator = null;
    this.scanCancelled = false;
    this.scanProgress = 0.0;
  }

  startIncrementalScan(): Generator<ReleaseData | [string, number] | null, void, unknown> {
    this.scanGenerator = this.scanMusicDirectory();
    return this.scanGenerator;
  }

  continueScanning(): [ReleaseData | [string, number] | null, boolean] {
    if (!this.scanGenerator || this.scanCancelled) {
      return [null, true];
    }

    try {
      const result = this.scanGenerator.next();
      if (result.done) {
        return [null, true];
      }

      if (result.value && Array.isArray(result.value) && result.value[0] === "progress") {
        this.scanProgress = result.value[1];
        return [result.value, false];
      } else if (result.value) {
        return [result.value, false];
      } else {
        return [null, false];
      }
    } catch (error) {
      console.error("Error during scanning:", error);
      return [null, true];
    }
  }

  private *scanMusicDirectory(): Generator<ReleaseData | [string, number] | null, void, unknown> {
    try {
      const foundReleases = new Set<string>();
      let dirsProcessed = 0;
      let totalDirsEstimated = 0;

      // First pass: estimate total directories
      const visitedCountPaths = new Set<string>();

      function countDirectories(dir: string): void {
        try {
          // Resolve symlinks to avoid infinite loops
          const resolvedDir = realpathSync(dir);

          // Skip if we've already visited this path (handles symlink loops)
          if (visitedCountPaths.has(resolvedDir)) return;
          visitedCountPaths.add(resolvedDir);

          const entries = readdirSync(dir, { withFileTypes: true });
          totalDirsEstimated++;
          if (totalDirsEstimated > 10000) return;

          for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              countDirectories(fullPath);
            } else if (entry.isSymbolicLink()) {
              try {
                const linkTarget = realpathSync(fullPath);
                const linkStat = statSync(linkTarget);

                if (linkStat.isDirectory() && !entry.name.startsWith(".")) {
                  countDirectories(linkTarget);
                }
              } catch (error) {
                // Ignore broken symlinks during counting
              }
            }
          }
        } catch (error) {
          // Ignore errors during counting
        }
      }

      countDirectories(this.musicDir);
      this.scanTotalEstimated = totalDirsEstimated;

      // Second pass: actual scanning
      const visitedPaths = new Set<string>();

      function* walk(dir: string): Generator<ReleaseData | [string, number] | null, void, unknown> {
        if (this.scanCancelled) return;

        try {
          // Resolve symlinks to avoid infinite loops
          const resolvedDir = realpathSync(dir);

          // Skip if we've already visited this path (handles symlink loops)
          if (visitedPaths.has(resolvedDir)) return;
          visitedPaths.add(resolvedDir);

          const entries = readdirSync(dir, { withFileTypes: true });
          const audioFiles: string[] = [];

          for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
              // Skip hidden directories
              if (entry.name.startsWith(".")) continue;

              // Skip very deep directories (more than 10 levels)
              const depth = fullPath.split("/").length - this.musicDir.split("/").length;
              if (depth > 10) continue;

              yield* walk.call(this, fullPath);
            } else if (entry.isSymbolicLink()) {
              // Handle symlinks
              try {
                const linkTarget = realpathSync(fullPath);
                const linkStat = statSync(linkTarget);

                if (linkStat.isDirectory()) {
                  // Skip hidden directories
                  if (entry.name.startsWith(".")) continue;

                  // Skip very deep directories (more than 10 levels)
                  const depth = linkTarget.split("/").length - this.musicDir.split("/").length;
                  if (depth > 10) continue;

                  yield* walk.call(this, linkTarget);
                } else if (linkStat.isFile() && isAudioFile(entry.name)) {
                  audioFiles.push(fullPath);
                }
              } catch (error) {
                // Ignore broken symlinks
                console.warn(`Broken symlink: ${fullPath}`);
              }
            } else if (entry.isFile() && isAudioFile(entry.name)) {
              audioFiles.push(fullPath);
            }
          }

          // If this directory is not the root music directory, treat it as a potential release
          if (dir !== this.musicDir) {
            const pathStr = dir;
            if (!foundReleases.has(pathStr)) {
              foundReleases.add(pathStr);

              const release: ReleaseData = {
                title: cleanReleaseTitle(dir.split("/").pop() || dir),
                path: pathStr,
                track_count: audioFiles.length,
              };

              yield release;
            }
          }

          dirsProcessed++;
          if (dirsProcessed % 10 === 0 && this.scanTotalEstimated > 0) {
            const progress = Math.min(dirsProcessed / this.scanTotalEstimated, 1.0);
            yield ["progress", progress];
            yield null; // Allow UI to update
          }
        } catch (error) {
          console.error(`Error scanning directory ${dir}:`, error);
        }
      }

      yield* walk.call(this, this.musicDir);
    } catch (error) {
      console.error("Error in scanMusicDirectory:", error);
    }
  }

  getProgress(): number {
    return this.scanProgress;
  }
}

// Legacy function for backward compatibility
export async function scanMusicDirectory(
  musicDir: string = join(homedir(), "Music"),
): Promise<ReleaseData[]> {
  const scanner = new MusicScanner(musicDir);
  const releases: ReleaseData[] = [];

  const generator = scanner.startIncrementalScan();
  let result = generator.next();

  while (!result.done) {
    if (result.value && !Array.isArray(result.value)) {
      releases.push(result.value);
    }
    result = generator.next();
  }

  return releases.sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
  );
}
