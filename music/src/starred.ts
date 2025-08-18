import { loadStarredPaths, saveStarredPaths } from "./cache";
import { normalizePath } from "./utils";

export class StarredManager {
  private starredPaths: Set<string>;

  constructor() {
    this.starredPaths = new Set(loadStarredPaths());
  }

  isStarred(path: string): boolean {
    const normalizedPath = normalizePath(path);
    return this.starredPaths.has(normalizedPath);
  }

  add(path: string): void {
    const normalizedPath = normalizePath(path);
    this.starredPaths.add(normalizedPath);
    this.save();
  }

  remove(path: string): void {
    const normalizedPath = normalizePath(path);
    this.starredPaths.delete(normalizedPath);
    this.save();
  }

  toggle(path: string): boolean {
    const normalizedPath = normalizePath(path);
    if (this.starredPaths.has(normalizedPath)) {
      this.remove(path);
      return false;
    } else {
      this.add(path);
      return true;
    }
  }

  contains(path: string): boolean {
    return this.isStarred(path);
  }

  getPaths(): string[] {
    return Array.from(this.starredPaths);
  }

  private save(): void {
    saveStarredPaths(Array.from(this.starredPaths));
  }
}
