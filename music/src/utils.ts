import { basename } from "path";

/**
 * Normalizes a file path to match the stored format used in starred and collection data.
 * Extracts the folder name from the path and converts it to lowercase with underscores.
 * 
 * @param path - Full file path or folder name
 * @returns Normalized folder name (lowercase, spaces replaced with underscores)
 * 
 * @example
 * normalizePath("/path/to/Artist Name - Album Title") // "artist_name_-_album_title"
 * normalizePath("Artist Name - Album Title") // "artist_name_-_album_title"
 */
export function normalizePath(path: string): string {
  const folderName = basename(path);
  return folderName.toLowerCase().replace(/\s+/g, "_");
}

/**
 * Checks if two paths represent the same release by comparing their normalized forms.
 * 
 * @param path1 - First path to compare
 * @param path2 - Second path to compare
 * @returns True if the paths represent the same release
 */
export function pathsMatch(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2);
}