import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the cache module
vi.mock('../src/cache', () => ({
  loadCollections: vi.fn(() => ({})),
  saveCollection: vi.fn(),
}))

import { Collection, CollectionManager } from '../src/collections'
import { loadCollections, saveCollection } from '../src/cache'

describe('Collection', () => {
  let collection: Collection

  beforeEach(() => {
    vi.clearAllMocks()
    collection = new Collection('test-collection', ['/test/path1', '/test/path2'])
  })

  describe('constructor', () => {
    it('should initialize with name and paths', () => {
      expect(collection.name).toBe('test-collection')
      expect(collection.getPaths()).toEqual(['/test/path1', '/test/path2'])
    })

    it('should initialize with empty paths if none provided', () => {
      const emptyCollection = new Collection('empty-collection')
      expect(emptyCollection.getPaths()).toEqual([])
    })
  })

  describe('add', () => {
    it('should add a new path', () => {
      collection.add('/test/path3')
      
      expect(collection.contains('/test/path3')).toBe(true)
      expect(saveCollection).toHaveBeenCalledWith('test-collection', [
        '/test/path1',
        '/test/path2',
        '/test/path3'
      ])
    })

    it('should not duplicate existing paths', () => {
      collection.add('/test/path1')
      
      expect(collection.getPaths()).toEqual(['/test/path1', '/test/path2'])
      expect(saveCollection).toHaveBeenCalledWith('test-collection', [
        '/test/path1',
        '/test/path2'
      ])
    })
  })

  describe('remove', () => {
    it('should remove an existing path', () => {
      collection.remove('/test/path1')
      
      expect(collection.contains('/test/path1')).toBe(false)
      expect(saveCollection).toHaveBeenCalledWith('test-collection', ['/test/path2'])
    })

    it('should handle removing non-existent paths gracefully', () => {
      collection.remove('/test/non-existent')
      
      expect(collection.getPaths()).toEqual(['/test/path1', '/test/path2'])
      expect(saveCollection).toHaveBeenCalledWith('test-collection', [
        '/test/path1',
        '/test/path2'
      ])
    })
  })

  describe('contains', () => {
    it('should return true for existing paths', () => {
      expect(collection.contains('/test/path1')).toBe(true)
      expect(collection.contains('/test/path2')).toBe(true)
    })

    it('should return false for non-existing paths', () => {
      expect(collection.contains('/test/path3')).toBe(false)
    })
  })

  describe('getPaths', () => {
    it('should return array of all paths', () => {
      expect(collection.getPaths()).toEqual(['/test/path1', '/test/path2'])
    })
  })
})

describe('CollectionManager', () => {
  let collectionManager: CollectionManager

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadCollections).mockReturnValue({
      'collection1': ['/test/path1', '/test/path2'],
      'collection2': ['/test/path3', '/test/path4']
    })
    collectionManager = new CollectionManager()
  })

  describe('constructor', () => {
    it('should load collections on initialization', () => {
      expect(loadCollections).toHaveBeenCalledOnce()
    })
  })

  describe('get', () => {
    it('should return existing collection', () => {
      const collection = collectionManager.get('collection1')
      
      expect(collection).toBeDefined()
      expect(collection!.name).toBe('collection1')
      expect(collection!.getPaths()).toEqual(['/test/path1', '/test/path2'])
    })

    it('should return undefined for non-existing collection', () => {
      const collection = collectionManager.get('non-existent')
      
      expect(collection).toBeUndefined()
    })
  })

  describe('getOrCreate', () => {
    it('should return existing collection', () => {
      const collection = collectionManager.getOrCreate('collection1')
      
      expect(collection.name).toBe('collection1')
      expect(collection.getPaths()).toEqual(['/test/path1', '/test/path2'])
    })

    it('should create new collection if it does not exist', () => {
      const collection = collectionManager.getOrCreate('new-collection')
      
      expect(collection.name).toBe('new-collection')
      expect(collection.getPaths()).toEqual([])
    })
  })

  describe('keys', () => {
    it('should return all collection names', () => {
      const keys = collectionManager.keys()
      
      expect(keys).toEqual(['collection1', 'collection2'])
    })
  })

  describe('lookup', () => {
    it('should return collections containing the path', () => {
      const collections = collectionManager.lookup('/test/path1')
      
      expect(collections).toHaveLength(1)
      expect(collections[0].name).toBe('collection1')
    })

    it('should return empty array for paths not in any collection', () => {
      const collections = collectionManager.lookup('/test/path5')
      
      expect(collections).toEqual([])
    })

    it('should return multiple collections if path exists in multiple', () => {
      // Add path1 to collection2
      const collection2 = collectionManager.get('collection2')!
      collection2.add('/test/path1')
      
      const collections = collectionManager.lookup('/test/path1')
      
      expect(collections).toHaveLength(2)
      expect(collections.map(c => c.name)).toContain('collection1')
      expect(collections.map(c => c.name)).toContain('collection2')
    })
  })

  describe('createAutoCollections', () => {
    it('should create genre-based collections', () => {
      const mockReleases = [
        { path: '/test/rock1', genre: 'rock' },
        { path: '/test/rock2', genre: 'Rock' },
        { path: '/test/jazz1', genre: 'jazz' },
        { path: '/test/no-genre', genre: null }
      ]
      
      collectionManager.createAutoCollections(mockReleases)
      
      const rockCollection = collectionManager.get('Rock')
      const jazzCollection = collectionManager.get('Jazz')
      
      expect(rockCollection).toBeDefined()
      expect(jazzCollection).toBeDefined()
      expect(rockCollection!.getPaths()).toContain('/test/rock1')
      expect(rockCollection!.getPaths()).toContain('/test/rock2')
      expect(jazzCollection!.getPaths()).toContain('/test/jazz1')
    })

    it('should handle releases without genre', () => {
      const mockReleases = [
        { path: '/test/no-genre1' },
        { path: '/test/no-genre2', genre: null },
        { path: '/test/no-genre3', genre: '' }
      ]
      
      expect(() => {
        collectionManager.createAutoCollections(mockReleases)
      }).not.toThrow()
    })
  })
})