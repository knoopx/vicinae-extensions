import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the cache module
vi.mock('../src/cache', () => ({
  loadStarredPaths: vi.fn(() => ['test_path_1', 'test_path_2']),
  saveStarredPaths: vi.fn(),
}))

import { StarredManager } from '../src/starred'
import { loadStarredPaths, saveStarredPaths } from '../src/cache'

describe('StarredManager', () => {
  let starredManager: StarredManager

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(loadStarredPaths).mockReturnValue(['test_path_1', 'test_path_2'])
    starredManager = new StarredManager()
  })

  describe('constructor', () => {
    it('should load starred paths on initialization', () => {
      expect(loadStarredPaths).toHaveBeenCalledOnce()
    })
  })

  describe('isStarred', () => {
    it('should return true for starred paths', () => {
      expect(starredManager.isStarred('/test/Test Path 1')).toBe(true)
      expect(starredManager.isStarred('/test/Test Path 2')).toBe(true)
    })

    it('should return false for non-starred paths', () => {
      expect(starredManager.isStarred('/test/Non Existent Path')).toBe(false)
    })
  })

  describe('contains', () => {
    it('should return true for starred paths', () => {
      expect(starredManager.contains('/test/Test Path 1')).toBe(true)
    })

    it('should return false for non-starred paths', () => {
      expect(starredManager.contains('/test/Non Existent Path')).toBe(false)
    })
  })

  describe('add', () => {
    it('should add a new starred path', () => {
      starredManager.add('/test/New Path')
      
      expect(starredManager.isStarred('/test/New Path')).toBe(true)
      expect(vi.mocked(saveStarredPaths)).toHaveBeenCalledWith([
        'test_path_1',
        'test_path_2',
        'new_path'
      ])
    })

    it('should not duplicate existing starred paths', () => {
      starredManager.add('/test/Test Path 1')
      
      expect(vi.mocked(saveStarredPaths)).toHaveBeenCalledWith([
        'test_path_1',
        'test_path_2'
      ])
    })
  })

  describe('remove', () => {
    it('should remove a starred path', () => {
      starredManager.remove('/test/Test Path 1')
      
      expect(starredManager.isStarred('/test/Test Path 1')).toBe(false)
      expect(vi.mocked(saveStarredPaths)).toHaveBeenCalledWith(['test_path_2'])
    })

    it('should handle removing non-existent paths gracefully', () => {
      starredManager.remove('/test/Non Existent')
      
      expect(starredManager.getPaths()).toEqual(['test_path_1', 'test_path_2'])
      expect(vi.mocked(saveStarredPaths)).toHaveBeenCalledWith([
        'test_path_1',
        'test_path_2'
      ])
    })
  })

  describe('toggle', () => {
    it('should add path if not starred and return true', () => {
      const result = starredManager.toggle('/test/New Path')
      
      expect(result).toBe(true)
      expect(starredManager.isStarred('/test/New Path')).toBe(true)
      expect(vi.mocked(saveStarredPaths)).toHaveBeenCalledWith([
        'test_path_1',
        'test_path_2',
        'new_path'
      ])
    })

    it('should remove path if already starred and return false', () => {
      const result = starredManager.toggle('/test/Test Path 1')
      
      expect(result).toBe(false)
      expect(starredManager.isStarred('/test/Test Path 1')).toBe(false)
      expect(vi.mocked(saveStarredPaths)).toHaveBeenCalledWith(['test_path_2'])
    })
  })
})