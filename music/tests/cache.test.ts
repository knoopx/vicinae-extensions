import { describe, it, expect, beforeEach, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import {
  ensureConfigDir,
  loadReleasesFromCache,
  loadStarredPaths,
  loadCollections,
  saveCollection
} from '../src/cache'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(),
}))

// Mock os module
vi.mock('os', () => ({
  homedir: () => '/home/test'
}))

// Mock path module
vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/')
}))

describe('Cache Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ensureConfigDir', () => {
    it('should create config directories if they do not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.config/net.knoopx.music', { recursive: true })
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.cache/net.knoopx.music', { recursive: true })
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.config/net.knoopx.music/collections', { recursive: true })
    })

    it('should not create directories if they already exist', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).not.toHaveBeenCalled()
    })

    it('should selectively create only missing directories', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // config dir exists
        .mockReturnValueOnce(false) // cache dir doesn't exist
        .mockReturnValueOnce(true)  // collections dir exists

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.config/net.knoopx.music', { recursive: true })
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.cache/net.knoopx.music', { recursive: true })
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.config/net.knoopx.music/collections', { recursive: true })
    })

    it('should not create directories if they already exist', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).not.toHaveBeenCalled()
    })

    it('should selectively create only missing directories', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // config dir exists
        .mockReturnValueOnce(false) // cache dir doesn't exist
        .mockReturnValueOnce(true)  // collections dir exists

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.cache/net.knoopx.music', { recursive: true })
    })
  })

  describe('loadReleasesFromCache', () => {
    it('should return empty array when cache file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = loadReleasesFromCache()

      expect(result).toEqual([])
    })

    it('should load and transform releases from cache file', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // cache file exists

      const mockReleases = [
        { title: 'Album 1', path: '/test/path1', track_count: 10 },
        { title: 'Album 2', path: '/test/path2', trackCount: 12 }, // legacy format
        { title: 'Album 3', path: '/test/path3' }, // missing track count
      ]
      
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockReleases))

      const result = loadReleasesFromCache()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ title: 'Album 1', path: '/test/path1', track_count: 10 })
      expect(result[1]).toEqual({ title: 'Album 2', path: '/test/path2', track_count: 12 })
      expect(result[2]).toEqual({ title: 'Album 3', path: '/test/path3', track_count: 0 })
    })

    it('should handle malformed JSON gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // cache file exists

      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadReleasesFromCache()

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load releases from cache:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle missing properties in release objects', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // cache file exists

      const mockReleases = [
        {}, // completely empty object
        { title: 'Partial Album' }, // missing path and track_count
        { path: '/test/path' }, // missing title and track_count
      ]
      
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockReleases))

      const result = loadReleasesFromCache()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ title: '', path: '', track_count: 0 })
      expect(result[1]).toEqual({ title: 'Partial Album', path: '', track_count: 0 })
      expect(result[2]).toEqual({ title: '', path: '/test/path', track_count: 0 })
    })
  })

  describe('loadStarredPaths', () => {
    it('should return empty array when starred file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = loadStarredPaths()

      expect(result).toEqual([])
    })

    it('should load starred paths from file', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // starred file exists

      const mockStarred = { paths: ['/test/starred1', '/test/starred2'] }
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockStarred))

      const result = loadStarredPaths()

      expect(result).toEqual(['/test/starred1', '/test/starred2'])
    })

    it('should handle missing paths property', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // starred file exists

      const mockStarred = {} // missing paths property
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockStarred))

      const result = loadStarredPaths()

      expect(result).toEqual([])
    })

    it('should handle malformed JSON gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // starred file exists

      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadStarredPaths()

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load starred paths:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('loadCollections', () => {
    it('should return empty object when collections directory has no files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue([])

      const result = loadCollections()

      expect(result).toEqual({})
    })

    it('should load collections from JSON files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue(['rock.json', 'jazz.json', 'not-json.txt'])
      
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(['/path1', '/path2']))  // rock.json
        .mockReturnValueOnce(JSON.stringify(['/path3']))            // jazz.json

      const result = loadCollections()

      expect(result).toEqual({
        rock: ['/path1', '/path2'],
        jazz: ['/path3']
      })
    })

    it('should handle malformed JSON in collection files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue(['rock.json', 'jazz.json'])
      
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(['/path1']))    // rock.json - valid
        .mockReturnValueOnce('invalid json')               // jazz.json - invalid

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadCollections()

      expect(result).toEqual({
        rock: ['/path1']
        // jazz should be excluded due to error
      })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load collection jazz:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle non-array data in collection files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue(['rock.json'])
      
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ not: 'array' }))

      const result = loadCollections()

      expect(result).toEqual({
        rock: [] // should default to empty array for non-array data
      })
    })

    it('should handle readdirSync errors gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadCollections()

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load collections:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('saveCollection', () => {
    it('should save collection to JSON file', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      const paths = ['/test/path1', '/test/path2']
      
      saveCollection('rock', paths)

      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
        '/home/test/.config/net.knoopx.music/collections/rock.json',
        JSON.stringify(paths, null, 2),
        'utf-8'
      )
    })

    it('should handle write errors gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Disk full')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      saveCollection('rock', ['/test/path'])

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save collection rock:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})

  describe('ensureConfigDir', () => {
    it('should create config directories if they do not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.config/net.knoopx.music', { recursive: true })
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.cache/net.knoopx.music', { recursive: true })
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.config/net.knoopx.music/collections', { recursive: true })
    })

    it('should not create directories if they already exist', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).not.toHaveBeenCalled()
    })

    it('should selectively create only missing directories', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // config dir exists
        .mockReturnValueOnce(false) // cache dir doesn't exist
        .mockReturnValueOnce(true)  // collections dir exists

      ensureConfigDir()

      expect(vi.mocked(mkdirSync)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(mkdirSync)).toHaveBeenCalledWith('/home/test/.cache/net.knoopx.music', { recursive: true })
    })
  })

  describe('loadReleasesFromCache', () => {
    it('should return empty array when cache file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = loadReleasesFromCache()

      expect(result).toEqual([])
    })

    it('should load and transform releases from cache file', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // cache file exists

      const mockReleases = [
        { title: 'Album 1', path: '/test/path1', track_count: 10 },
        { title: 'Album 2', path: '/test/path2', trackCount: 12 }, // legacy format
        { title: 'Album 3', path: '/test/path3' }, // missing track count
      ]
      
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockReleases))

      const result = loadReleasesFromCache()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ title: 'Album 1', path: '/test/path1', track_count: 10 })
      expect(result[1]).toEqual({ title: 'Album 2', path: '/test/path2', track_count: 12 })
      expect(result[2]).toEqual({ title: 'Album 3', path: '/test/path3', track_count: 0 })
    })

    it('should handle malformed JSON gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // cache file exists

      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadReleasesFromCache()

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load releases from cache:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle missing properties in release objects', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // cache file exists

      const mockReleases = [
        {}, // completely empty object
        { title: 'Partial Album' }, // missing path and track_count
        { path: '/test/path' }, // missing title and track_count
      ]
      
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockReleases))

      const result = loadReleasesFromCache()

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ title: '', path: '', track_count: 0 })
      expect(result[1]).toEqual({ title: 'Partial Album', path: '', track_count: 0 })
      expect(result[2]).toEqual({ title: '', path: '/test/path', track_count: 0 })
    })
  })

  describe('loadStarredPaths', () => {
    it('should return empty array when starred file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const result = loadStarredPaths()

      expect(result).toEqual([])
    })

    it('should load starred paths from file', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // starred file exists

      const mockStarred = { paths: ['/test/starred1', '/test/starred2'] }
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockStarred))

      const result = loadStarredPaths()

      expect(result).toEqual(['/test/starred1', '/test/starred2'])
    })

    it('should handle missing paths property', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // starred file exists

      const mockStarred = {} // missing paths property
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockStarred))

      const result = loadStarredPaths()

      expect(result).toEqual([])
    })

    it('should handle malformed JSON gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)  // starred file exists

      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadStarredPaths()

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load starred paths:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('loadCollections', () => {
    it('should return empty object when collections directory has no files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue([])

      const result = loadCollections()

      expect(result).toEqual({})
    })

    it('should load collections from JSON files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue(['rock.json', 'jazz.json', 'not-json.txt'])
      
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(['/path1', '/path2']))  // rock.json
        .mockReturnValueOnce(JSON.stringify(['/path3']))            // jazz.json

      const result = loadCollections()

      expect(result).toEqual({
        rock: ['/path1', '/path2'],
        jazz: ['/path3']
      })
    })

    it('should handle malformed JSON in collection files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue(['rock.json', 'jazz.json'])
      
      vi.mocked(readFileSync)
        .mockReturnValueOnce(JSON.stringify(['/path1']))    // rock.json - valid
        .mockReturnValueOnce('invalid json')               // jazz.json - invalid

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadCollections()

      expect(result).toEqual({
        rock: ['/path1']
        // jazz should be excluded due to error
      })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load collection jazz:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle non-array data in collection files', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockReturnValue(['rock.json'])
      
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ not: 'array' }))

      const result = loadCollections()

      expect(result).toEqual({
        rock: [] // should default to empty array for non-array data
      })
    })

    it('should handle readdirSync errors gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = loadCollections()

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load collections:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('saveCollection', () => {
    it('should save collection to JSON file', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      const paths = ['/test/path1', '/test/path2']
      
      saveCollection('rock', paths)

      expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
        '/home/test/.config/net.knoopx.music/collections/rock.json',
        JSON.stringify(paths, null, 2),
        'utf-8'
      )
    })

    it('should handle write errors gracefully', () => {
      vi.mocked(existsSync)
        .mockReturnValueOnce(true)  // ensureConfigDir checks
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)

      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('Disk full')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      saveCollection('rock', ['/test/path'])

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save collection rock:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
    })
