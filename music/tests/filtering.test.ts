import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MusicFilter, FilterState } from '../src/filtering'
import { ReleaseData } from '../src/types'

// Mock the cache module before imports
vi.mock('../src/cache', () => ({
  loadStarredPaths: vi.fn(() => [
    'radiohead_-_ok_computer',
    'pink_floyd_-_dark_side_of_the_moon'
  ]),
  saveStarredPaths: vi.fn(),
  loadCollections: vi.fn(() => ({
    'rock': ['radiohead_-_ok_computer', 'pink_floyd_-_dark_side_of_the_moon'],
    'jazz': ['miles_davis_-_kind_of_blue']
  })),
  saveCollection: vi.fn(),
  loadReleasesFromCache: vi.fn(() => []),
}))

// Now import the classes that depend on cache
import { StarredManager } from '../src/starred'
import { CollectionManager } from '../src/collections'

describe('MusicFilter', () => {
  let musicFilter: MusicFilter
  let starredManager: StarredManager
  let collectionManager: CollectionManager
  let testReleases: ReleaseData[]

  beforeEach(() => {
    vi.clearAllMocks()
    
    starredManager = new StarredManager()
    collectionManager = new CollectionManager()
    musicFilter = new MusicFilter(starredManager, collectionManager)

    testReleases = [
      { title: 'Radiohead - OK Computer', path: '/music/Radiohead - OK Computer', track_count: 12 },
      { title: 'Pink Floyd - Dark Side of the Moon', path: '/music/Pink Floyd - Dark Side of the Moon', track_count: 10 },
      { title: 'Miles Davis - Kind of Blue', path: '/music/Miles Davis - Kind of Blue', track_count: 5 },
      { title: 'The Beatles - Abbey Road', path: '/music/The Beatles - Abbey Road', track_count: 17 },
      { title: 'Led Zeppelin - IV', path: '/music/Led Zeppelin - IV', track_count: 8 },
      { title: 'Nirvana - Nevermind', path: '/music/Nirvana - Nevermind', track_count: 12 },
    ]
  })

  describe('filter', () => {
    it('should return all releases when no filters applied', () => {
      const filterState: FilterState = {
        query: '',
        starFilter: false,
        collectionFilter: ''
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(6)
      expect(result).toEqual(testReleases)
    })

    it('should filter by query text', () => {
      const filterState: FilterState = {
        query: 'Radiohead',
        starFilter: false,
        collectionFilter: ''
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Radiohead - OK Computer')
    })

    it('should filter by query text case insensitively', () => {
      const filterState: FilterState = {
        query: 'radiohead',
        starFilter: false,
        collectionFilter: ''
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Radiohead - OK Computer')
    })

    it('should filter by starred status', () => {
      const filterState: FilterState = {
        query: '',
        starFilter: true,
        collectionFilter: ''
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.title)).toContain('Radiohead - OK Computer')
      expect(result.map(r => r.title)).toContain('Pink Floyd - Dark Side of the Moon')
    })

    it('should filter by collection', () => {
      const filterState: FilterState = {
        query: '',
        starFilter: false,
        collectionFilter: 'rock'
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(2)
      expect(result.map(r => r.title)).toContain('Radiohead - OK Computer')
      expect(result.map(r => r.title)).toContain('Pink Floyd - Dark Side of the Moon')
    })

    it('should combine multiple filters (AND logic)', () => {
      // Test combining starred filter with query filter
      const filterState: FilterState = {
        query: 'Radiohead',
        starFilter: true,
        collectionFilter: ''
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Radiohead - OK Computer')
    })

    it('should return empty array when no releases match filters', () => {
      const filterState: FilterState = {
        query: 'NonExistentArtist',
        starFilter: false,
        collectionFilter: ''
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(0)
    })

    it('should handle non-existent collection gracefully', () => {
      const filterState: FilterState = {
        query: '',
        starFilter: false,
        collectionFilter: 'non-existent-collection'
      }

      const result = musicFilter.filter(testReleases, filterState)
      expect(result).toHaveLength(0)
    })
  })

  describe('advancedSearch', () => {
    it('should perform regular text search when no field-specific queries', () => {
      const result = musicFilter.advancedSearch(testReleases, 'Beatles')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('The Beatles - Abbey Road')
    })

    it('should handle field-specific title search', () => {
      const result = musicFilter.advancedSearch(testReleases, 'title:abbey')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('The Beatles - Abbey Road')
    })

    it('should handle multiple field-specific queries', () => {
      const result = musicFilter.advancedSearch(testReleases, 'title:radiohead title:ok')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Radiohead - OK Computer')
    })

    it('should return empty array when field-specific query does not match', () => {
      const result = musicFilter.advancedSearch(testReleases, 'title:nonexistent')
      expect(result).toHaveLength(0)
    })

    it('should return all releases when query is empty', () => {
      const result = musicFilter.advancedSearch(testReleases, '')
      expect(result).toEqual(testReleases)
    })

    it('should ignore unknown field names', () => {
      const result = musicFilter.advancedSearch(testReleases, 'unknown:field')
      expect(result).toEqual(testReleases)
    })
  })

  describe('fuzzySearch', () => {
    it('should find exact matches', () => {
      const result = musicFilter.fuzzySearch(testReleases, 'Radiohead', 0.3)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Radiohead - OK Computer')
    })

    it('should find partial matches based on threshold', () => {
      const result = musicFilter.fuzzySearch(testReleases, 'Radio', 0.2)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.some(r => r.title.includes('Radiohead'))).toBe(true)
    })

    it('should return empty array when no matches meet threshold', () => {
      const result = musicFilter.fuzzySearch(testReleases, 'xyz', 0.8)
      expect(result).toHaveLength(0)
    })

    it('should return all releases when query is empty', () => {
      const result = musicFilter.fuzzySearch(testReleases, '', 0.6)
      expect(result).toEqual(testReleases)
    })

    it('should respect threshold parameter', () => {
      const lowThresholdResult = musicFilter.fuzzySearch(testReleases, 'Beat', 0.1)
      const highThresholdResult = musicFilter.fuzzySearch(testReleases, 'Beat', 0.9)
      
      expect(lowThresholdResult.length).toBeGreaterThanOrEqual(highThresholdResult.length)
    })
  })
})