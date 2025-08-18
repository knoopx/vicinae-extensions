import { ReleaseData } from "./types";
import { StarredManager } from "./starred";
import { CollectionManager } from "./collections";
import { normalizePath } from "./utils";

export interface FilterState {
  query: string;
  starFilter: boolean;
  collectionFilter: string;
}

export class MusicFilter {
  private starredManager: StarredManager;
  private collectionManager: CollectionManager;

  constructor(
    starredManager: StarredManager,
    collectionManager: CollectionManager,
  ) {
    this.starredManager = starredManager;
    this.collectionManager = collectionManager;
  }

  filter(releases: ReleaseData[], filterState: FilterState): ReleaseData[] {
    let filtered = releases;

    // Apply text search (only on title)
    if (filterState.query.trim()) {
      const queryLower = filterState.query.toLowerCase();
      filtered = filtered.filter((release) =>
        release.title.toLowerCase().includes(queryLower),
      );
    }

    // Apply star filter
    if (filterState.starFilter) {
      filtered = filtered.filter((release) =>
        this.starredManager.isStarred(release.path),
      );
    }

    // Apply collection filter
    if (filterState.collectionFilter) {
      const collection = this.collectionManager.get(
        filterState.collectionFilter,
      );
       if (collection) {
         filtered = filtered.filter((release) => {
           // Simple path matching - check if the release path is in the collection
           return collection.contains(release.path);
         });
       } else {
         // If collection doesn't exist, show all releases (no filter)
         // This prevents the UI from ever showing zero releases unless a filter is actually applied
         filtered = releases;
       }
    }

    return filtered;
  }

  // Advanced search with field-specific queries
  advancedSearch(releases: ReleaseData[], query: string): ReleaseData[] {
    if (!query.trim()) return releases;

    // Parse field-specific queries like "title:radiohead"
    const fieldMatches = query.match(/(\w+):(\S+)/g);
    if (fieldMatches) {
      let filtered = releases;

      for (const match of fieldMatches) {
        const [field, value] = match.split(":");
        const valueLower = value.toLowerCase();

          filtered = filtered.filter((release) => {
            switch (field.toLowerCase()) {
              case "title":
                return release.title.toLowerCase().includes(valueLower);
              default:
                return true;
            }
          });
      }

      return filtered;
    }

    // Regular text search (only on title)
    const queryLower = query.toLowerCase();
    return releases.filter((release) =>
      release.title.toLowerCase().includes(queryLower),
    );
  }

  // Fuzzy search implementation
  fuzzySearch(
    releases: ReleaseData[],
    query: string,
    threshold: number = 0.3,
  ): ReleaseData[] {
    if (!query.trim()) return releases;

    const queryLower = query.toLowerCase();

    return releases.filter((release) => {
      const titleScore = this.fuzzyScore(
        release.title.toLowerCase(),
        queryLower,
      );

      return titleScore >= threshold;
    });
  }

  private fuzzyScore(str1: string, str2: string): number {
    // If one string is contained in the other, give it a high score
    if (str1.includes(str2) || str2.includes(str1)) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      return shorter.length / longer.length;
    }

    // Otherwise use levenshtein distance
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize the matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
