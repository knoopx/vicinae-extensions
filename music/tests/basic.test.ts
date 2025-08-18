import { describe, it, expect } from 'vitest'

describe('Basic functionality', () => {
  it('should run tests successfully', () => {
    expect(1 + 1).toBe(2)
  })

  it('should test string operations', () => {
    const title = 'Album_Name_Here'
    const cleaned = title.replace(/_/g, ' ')
    expect(cleaned).toBe('Album Name Here')
  })

  it('should test array operations', () => {
    const releases = [
      { title: 'ZAlbum', path: '/z' },
      { title: 'AAlbum', path: '/a' }
    ]
    
    const sorted = releases.sort((a, b) => 
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    )
    
    expect(sorted[0].title).toBe('AAlbum')
    expect(sorted[1].title).toBe('ZAlbum')
  })

  it('should test audio file detection', () => {
    const audioExtensions = ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg']
    
    function isAudioFile(filename: string): boolean {
      const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
      return audioExtensions.includes(ext)
    }

    expect(isAudioFile('song.mp3')).toBe(true)
    expect(isAudioFile('song.FLAC')).toBe(true)
    expect(isAudioFile('document.txt')).toBe(false)
  })

  it('should test collection filtering logic', () => {
    // Test the normalized path comparison logic
    const releasePath = '/Music/Artist - Album Name'
    const collectionPaths = ['artist_-_album_name', 'other_album']
    
    function basename(path: string): string {
      return path.split('/').pop() || ''
    }
    
    const releaseFolderName = basename(releasePath)
    const normalizedReleaseName = releaseFolderName.toLowerCase().replace(/\s+/g, '_')
    
    const matches = collectionPaths.some(collectionPath => {
      const normalizedCollectionPath = collectionPath.toLowerCase().replace(/\s+/g, '_')
      return normalizedCollectionPath === normalizedReleaseName
    })
    
    expect(normalizedReleaseName).toBe('artist_-_album_name')
    expect(matches).toBe(true)
  })
})