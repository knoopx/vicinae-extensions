import { loadCollections, saveCollection } from "./cache";

export class Collection {
  private paths: Set<string>;

  constructor(
    public name: string,
    paths: string[] = [],
  ) {
    this.paths = new Set(paths);
  }

  add(path: string): void {
    this.paths.add(path);
    this.save();
  }

  remove(path: string): void {
    this.paths.delete(path);
    this.save();
  }

  contains(path: string): boolean {
    return this.paths.has(path);
  }

  getPaths(): string[] {
    return Array.from(this.paths);
  }

  private save(): void {
    saveCollection(this.name, this.getPaths());
  }
}

export class CollectionManager {
  private collections: Map<string, Collection>;

  constructor() {
    this.collections = new Map();
    this.loadCollections();
  }

  private loadCollections(): void {
    const collectionsData = loadCollections();

    for (const [name, paths] of Object.entries(collectionsData)) {
      this.collections.set(name, new Collection(name, paths));
    }
  }

  get(name: string): Collection | undefined {
    return this.collections.get(name);
  }

  getOrCreate(name: string): Collection {
    let collection = this.collections.get(name);
    if (!collection) {
      collection = new Collection(name);
      this.collections.set(name, collection);
    }
    return collection;
  }

  keys(): string[] {
    return Array.from(this.collections.keys());
  }

  lookup(path: string): Collection[] {
    const result: Collection[] = [];

    for (const collection of this.collections.values()) {
      if (collection.contains(path)) {
        result.push(collection);
      }
    }

    return result;
  }

  createAutoCollections(releases: any[]): void {
    // Create genre-based collections
    const genreMap = new Map<string, string[]>();

    for (const release of releases) {
      if (release.genre) {
        const genre = release.genre.toLowerCase();
        if (!genreMap.has(genre)) {
          genreMap.set(genre, []);
        }
        genreMap.get(genre)!.push(release.path);
      }
    }

    // Save genre collections
    for (const [genre, paths] of genreMap) {
      const capitalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);
      const collection = this.getOrCreate(capitalizedGenre);
      for (const path of paths) {
        collection.add(path);
      }
    }
  }
}
