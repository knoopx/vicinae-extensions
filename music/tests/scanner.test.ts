import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock fs module
vi.mock('fs', () => ({
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}))

// Mock music-metadata
vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/home/test'),
}))

// Mock path module
vi.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}))

import {
  isAudioFile,
  cleanReleaseTitle,
  scanMusicDirectory
} from '../src/scanner'
import { readdirSync, statSync } from 'fs'
import { parseFile } from 'music-metadata'

describe('Scanner Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isAudioFile', () => {
    it('should return true for common audio extensions', () => {
      expect(isAudioFile('song.mp3')).toBe(true)
      expect(isAudioFile('song.flac')).toBe(true)
      expect(isAudioFile('song.wav')).toBe(true)
      expect(isAudioFile('song.m4a')).toBe(true)
      expect(isAudioFile('song.ogg')).toBe(true)
      expect(isAudioFile('song.wma')).toBe(true)
      expect(isAudioFile('song.aac')).toBe(true)
    })

    it('should return false for non-audio files', () => {
      expect(isAudioFile('document.pdf')).toBe(false)
      expect(isAudioFile('image.jpg')).toBe(false)
      expect(isAudioFile('text.txt')).toBe(false)
      expect(isAudioFile('video.mp4')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isAudioFile('SONG.MP3')).toBe(true)
      expect(isAudioFile('Song.FLAC')).toBe(true)
      expect(isAudioFile('MUSIC.m4A')).toBe(true)
    })
  })

  describe('cleanReleaseTitle', () => {
    it('should remove common bracketed text patterns', () => {
      expect(cleanReleaseTitle('Album Name [2021]')).toBe('Album Name')
      expect(cleanReleaseTitle('Album Name (Deluxe Edition)')).toBe('Album Name')
      expect(cleanReleaseTitle('Album Name - Remastered')).toBe('Album Name')
      expect(cleanReleaseTitle('Album Name [FLAC]')).toBe('Album Name')
    })

    it('should remove file extensions', () => {
      expect(cleanReleaseTitle('Album.zip')).toBe('Album')
      expect(cleanReleaseTitle('Album.rar')).toBe('Album')
      expect(cleanReleaseTitle('Album.tar.gz')).toBe('Album')
    })

    it('should handle underscores and multiple spaces', () => {
      expect(cleanReleaseTitle('Album_Name_Here')).toBe('Album Name Here')
      expect(cleanReleaseTitle('Album   Name   Here')).toBe('Album Name Here')
    })

    it('should trim whitespace', () => {
      expect(cleanReleaseTitle('  Album Name  ')).toBe('Album Name')
    })

    it('should handle empty strings', () => {
      expect(cleanReleaseTitle('')).toBe('')
      expect(cleanReleaseTitle('   ')).toBe('')
    })
  })

  describe('scanMusicDirectory', () => {
    beforeEach(() => {
      vi.mocked(readdirSync).mockReturnValue([
        { name: 'Album 1', isDirectory: () => true, isFile: () => false },
        { name: 'Album 2', isDirectory: () => true, isFile: () => false },
        { name: 'file.txt', isDirectory: () => false, isFile: () => true }
      ] as any)
      
      vi.mocked(statSync).mockImplementation((path: string) => ({
        isDirectory: () => !path.endsWith('.txt')
      }) as any)
    })

    it('should scan directory and return release data', async () => {
      // Mock subdirectory contents
      vi.mocked(readdirSync)
        .mockReturnValueOnce([
          { name: 'Album 1', isDirectory: () => true, isFile: () => false },
          { name: 'Album 2', isDirectory: () => true, isFile: () => false },
          { name: 'file.txt', isDirectory: () => false, isFile: () => true }
        ] as any)
        .mockReturnValueOnce([
          { name: 'song1.mp3', isDirectory: () => false, isFile: () => true },
          { name: 'song2.mp3', isDirectory: () => false, isFile: () => true }
        ] as any)
        .mockReturnValueOnce([
          { name: 'song3.flac', isDirectory: () => false, isFile: () => true }
        ] as any)

      const releases = await scanMusicDirectory('/test/music')
      
      expect(releases).toHaveLength(2)
      expect(releases[0]).toEqual({
        title: 'Album 1',
        path: '/test/music/Album 1',
        track_count: 2
      })
      expect(releases[1]).toEqual({
        title: 'Album 2', 
        path: '/test/music/Album 2',
        track_count: 1
      })
    })

    it('should handle directories with no audio files', async () => {
      vi.mocked(readdirSync)
        .mockReturnValueOnce([
          { name: 'Empty Album', isDirectory: () => true, isFile: () => false }
        ] as any)
        .mockReturnValueOnce([
          { name: 'readme.txt', isDirectory: () => false, isFile: () => true },
          { name: 'cover.jpg', isDirectory: () => false, isFile: () => true }
        ] as any)

      const releases = await scanMusicDirectory('/test/music')
      
      expect(releases).toHaveLength(1)
      expect(releases[0].track_count).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(readdirSync).mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const releases = await scanMusicDirectory('/test/music')
      
      expect(releases).toEqual([])
    })

    it('should skip non-directory items', async () => {
      vi.mocked(readdirSync).mockReturnValue([
        { name: 'Album 1', isDirectory: () => true, isFile: () => false },
        { name: 'file.mp3', isDirectory: () => false, isFile: () => true },
        { name: 'readme.txt', isDirectory: () => false, isFile: () => true }
      ] as any)

      vi.mocked(statSync).mockImplementation((path: string) => ({
        isDirectory: () => path.includes('Album')
      }) as any)

      vi.mocked(readdirSync)
        .mockReturnValueOnce([
          { name: 'Album 1', isDirectory: () => true, isFile: () => false },
          { name: 'file.mp3', isDirectory: () => false, isFile: () => true },
          { name: 'readme.txt', isDirectory: () => false, isFile: () => true }
        ] as any)
        .mockReturnValueOnce([
          { name: 'song1.mp3', isDirectory: () => false, isFile: () => true }
        ] as any)

      const releases = await scanMusicDirectory('/test/music')
      
      expect(releases).toHaveLength(1)
      expect(releases[0].title).toBe('Album 1')
    })
  })
})