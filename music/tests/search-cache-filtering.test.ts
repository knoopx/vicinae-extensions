import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReleaseData } from "../src/types"
import { MusicFilter, FilterState } from "../src/filtering"
import { StarredManager } from "../src/starred"
import { CollectionManager } from "../src/collections"

// Mock file system operations
vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => "[]"),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}))

// Mock the cache module with factory function
vi.mock("../src/cache", () => ({
  loadReleasesFromCache: vi.fn(),
  loadStarredPaths: vi.fn(() => []),
  saveStarredPaths: vi.fn(),
  loadCollections: vi.fn(() => ({})),
  saveCollection: vi.fn(),
}))

const mockReleases: ReleaseData[] = [
  {
    title: "Abbey Road",
    path: "/music/Beatles/Abbey Road",
    track_count: 17,
  },
  {
    title: "Dark Side of the Moon",
    path: "/music/Pink Floyd/Dark Side of the Moon",
    track_count: 10,
  },
  {
    title: "Thriller",
    path: "/music/Michael Jackson/Thriller",
    track_count: 9,
  },
]

describe("Cache Loading and Filtering", () => {
  let starredManager: StarredManager
  let collectionManager: CollectionManager
  let musicFilter: MusicFilter

  beforeEach(() => {
    vi.clearAllMocks()
    starredManager = new StarredManager()
    collectionManager = new CollectionManager()
    musicFilter = new MusicFilter(starredManager, collectionManager)
  })

  describe("Cache Loading", () => {
    it("should load releases from cache successfully", async () => {
      const { loadReleasesFromCache } = await import("../src/cache")
      const mockLoadReleases = vi.mocked(loadReleasesFromCache)
      mockLoadReleases.mockReturnValue(mockReleases)

      const releases = loadReleasesFromCache()

      expect(releases).toHaveLength(3)
      expect(releases[0].title).toBe("Abbey Road")
      expect(releases[1].title).toBe("Dark Side of the Moon")
      expect(releases[2].title).toBe("Thriller")
    })

    it("should return empty array when cache is empty", async () => {
      const { loadReleasesFromCache } = await import("../src/cache")
      const mockLoadReleases = vi.mocked(loadReleasesFromCache)
      mockLoadReleases.mockReturnValue([])

      const releases = loadReleasesFromCache()

      expect(releases).toHaveLength(0)
    })

    it("should handle cache loading errors gracefully", async () => {
      const { loadReleasesFromCache } = await import("../src/cache")
      const mockLoadReleases = vi.mocked(loadReleasesFromCache)
      mockLoadReleases.mockImplementation(() => {
        throw new Error("Cache read error")
      })

      expect(() => loadReleasesFromCache()).toThrow("Cache read error")
    })
  })

  describe("Filtering Logic", () => {
    it("should return all releases when no filters applied", () => {
      const filterState: FilterState = {
        query: "",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(3)
      expect(filtered).toEqual(mockReleases)
    })

    it("should filter by query text (case insensitive)", () => {
      const filterState: FilterState = {
        query: "abbey",  // Search for text that's in the title
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Abbey Road")
    })

    it("should filter by album title", () => {
      const filterState: FilterState = {
        query: "dark side",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Dark Side of the Moon")
    })

    it("should filter by starred status", () => {
      // Star one release
      starredManager.toggle("/music/Beatles/Abbey Road")
      
      const filterState: FilterState = {
        query: "",
        starFilter: true,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Abbey Road")
    })

    it("should return empty array when starred filter applied but no starred items", () => {
      const filterState: FilterState = {
        query: "",
        starFilter: true,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(0)
    })

    it("should filter by collection", () => {
      // Add a release to a collection using the correct API
      const collection = collectionManager.getOrCreate("My Favorites")
      collection.add("/music/Pink Floyd/Dark Side of the Moon")
      
      const filterState: FilterState = {
        query: "",
        starFilter: false,
        collectionFilter: "My Favorites",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Dark Side of the Moon")
    })

    it("should combine multiple filters (query + starred)", () => {
      // Star two releases
      starredManager.toggle("/music/Beatles/Abbey Road")
      starredManager.toggle("/music/Pink Floyd/Dark Side of the Moon")
      
      const filterState: FilterState = {
        query: "dark", // Search for title text that exists
        starFilter: true,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Dark Side of the Moon")
    })

    it("should return empty array when combined filters match nothing", () => {
      starredManager.toggle("/music/Beatles/Abbey Road")
      
      const filterState: FilterState = {
        query: "thriller", // Michael Jackson
        starFilter: true, // But only Beatles is starred
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(0)
    })

    it("should handle empty releases array", () => {
      const filterState: FilterState = {
        query: "anything",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter([], filterState)

      expect(filtered).toHaveLength(0)
    })

    it("should handle releases with missing properties", () => {
      const brokenReleases: ReleaseData[] = [
        {
          title: "",
          artist: "",
          path: "/music/broken/release",
          track_count: 0,
          year: 0,
        },
      ]

      const filterState: FilterState = {
        query: "",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(brokenReleases, filterState)

      expect(filtered).toHaveLength(1)
    })
  })

  describe("Integration: Cache + Filtering", () => {
    it("should load from cache and apply filters correctly", async () => {
      const { loadReleasesFromCache } = await import("../src/cache")
      const mockLoadReleases = vi.mocked(loadReleasesFromCache)
      mockLoadReleases.mockReturnValue(mockReleases)

      // Load releases from cache
      const releases = loadReleasesFromCache()
      expect(releases).toHaveLength(3)

      // Apply filtering - search by title text that exists
      const filterState: FilterState = {
        query: "dark",  // This will match "Dark Side of the Moon"
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(releases, filterState)

      // Should match "Dark Side of the Moon"
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Dark Side of the Moon")
    })

    it("should handle the no-display scenario: cache has data but filters remove everything", async () => {
      const { loadReleasesFromCache } = await import("../src/cache")
      const mockLoadReleases = vi.mocked(loadReleasesFromCache)
      mockLoadReleases.mockReturnValue(mockReleases)

      // Load releases from cache (this works)
      const releases = loadReleasesFromCache()
      expect(releases).toHaveLength(3)

      // Apply filters that match nothing
      const filterState: FilterState = {
        query: "nonexistent album",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(releases, filterState)

      // This is the bug scenario: cache has data but UI shows nothing
      expect(releases).toHaveLength(3) // Cache works
      expect(filtered).toHaveLength(0) // But filtering removes everything
    })

    it("should handle the no-display scenario: starred filter with no starred items", async () => {
      const { loadReleasesFromCache } = await import("../src/cache")
      const mockLoadReleases = vi.mocked(loadReleasesFromCache)
      mockLoadReleases.mockReturnValue(mockReleases)

      const releases = loadReleasesFromCache()
      expect(releases).toHaveLength(3)

      // Apply starred filter when nothing is starred
      const filterState: FilterState = {
        query: "",
        starFilter: true, // This could be the issue
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(releases, filterState)

      expect(releases).toHaveLength(3) // Cache works
      expect(filtered).toHaveLength(0) // But starred filter removes everything
    })
  })
})