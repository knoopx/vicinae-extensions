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

describe("Bug Fix Verification: No Releases Displayed", () => {
  let starredManager: StarredManager
  let collectionManager: CollectionManager
  let musicFilter: MusicFilter

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

  beforeEach(() => {
    vi.clearAllMocks()
    starredManager = new StarredManager()
    collectionManager = new CollectionManager()
    musicFilter = new MusicFilter(starredManager, collectionManager)
  })

  describe("Main Bug Scenarios", () => {
    it("should display all releases when no filters are applied", () => {
      const filterState: FilterState = {
        query: "",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(3)
      expect(filtered).toEqual(mockReleases)
    })

    it("should find releases when searching by title", () => {
      const filterState: FilterState = {
        query: "abbey",  // Search for text in title
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Abbey Road")
    })

    it("should find releases when searching by title", () => {
      const filterState: FilterState = {
        query: "thriller",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Thriller")
    })

    it("should work with starred filtering", () => {
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

    it("should work with collection filtering", () => {
      // This was broken before: collection path matching was incorrect
      const collection = collectionManager.getOrCreate("Favorites")
      collection.add("/music/Pink Floyd/Dark Side of the Moon")
      
      const filterState: FilterState = {
        query: "",
        starFilter: false,
        collectionFilter: "Favorites",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Dark Side of the Moon")
    })

    it("should return empty when filters don't match anything", () => {
      const filterState: FilterState = {
        query: "nonexistent",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(0)
    })

    it("should return empty when starred filter is on but nothing is starred", () => {
      // This could be why user saw no releases - starred filter was accidentally active
      const filterState: FilterState = {
        query: "",
        starFilter: true,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(0)
    })

    it("should return empty when collection filter is set to non-existent collection", () => {
      const filterState: FilterState = {
        query: "",
        starFilter: false,
        collectionFilter: "NonExistent",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(0)
    })
  })

  describe("Edge Cases", () => {
    it("should handle partial matches in title search", () => {
      const filterState: FilterState = {
        query: "dark",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Dark Side of the Moon")
    })

    it("should handle case insensitive search", () => {
      const filterState: FilterState = {
        query: "ABBEY",
        starFilter: false,
        collectionFilter: "",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Abbey Road")
    })

    it("should handle combined filtering correctly", () => {
      // Star and add to collection
      starredManager.toggle("/music/Beatles/Abbey Road")
      const collection = collectionManager.getOrCreate("Rock")
      collection.add("/music/Beatles/Abbey Road")
      
      const filterState: FilterState = {
        query: "",
        starFilter: true,
        collectionFilter: "Rock",
      }

      const filtered = musicFilter.filter(mockReleases, filterState)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe("Abbey Road")
    })
  })
})