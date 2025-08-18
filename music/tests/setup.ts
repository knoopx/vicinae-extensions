import '@testing-library/jest-dom'

// Mock Raycast API completely
const mockRaycast = {
  showToast: vi.fn(),
  Toast: {
    Style: {
      Success: 'success',
      Failure: 'failure',
      Animated: 'animated',
    },
  },
  getPreferenceValues: vi.fn(() => ({
    musicDirectory: '/test/music',
  })),
  environment: {
    supportPath: '/test/support',
    cachePath: '/test/cache',
  },
  Icon: {
    Music: 'music',
    Star: 'star',
    StarDisabled: 'star-disabled',
    Play: 'play',
    Finder: 'finder',
    Eye: 'eye',
    EyeSlash: 'eye-slash',
    XMarkCircle: 'x-mark-circle',
  },
  Color: {
    Yellow: 'yellow',
  },
  Keyboard: {
    Shortcut: {
      Common: {
        Pin: 'cmd+p',
        ToggleQuickLook: 'space',
        Remove: 'cmd+backspace',
      },
    },
  },
  Action: vi.fn(),
  ActionPanel: vi.fn(),
  List: vi.fn(),
  useCachedState: vi.fn(() => [[], vi.fn()]),
}

vi.mock('@raycast/api', () => mockRaycast)

vi.mock('@raycast/utils', () => ({
  useCachedState: vi.fn(() => [[], vi.fn()]),
}))

// Mock music-metadata
vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}))

// Mock fs operations
const mockFs = {
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}

vi.mock('fs', () => mockFs)

// Mock path operations
vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
    resolve: (...args: string[]) => args.join('/'),
    dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
    basename: (path: string) => path.split('/').pop() || '',
  },
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => args.join('/'),
  dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
  basename: (path: string) => path.split('/').pop() || '',
}))

// Mock os module
vi.mock('os', () => ({
  homedir: () => '/home/test',
}))

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
  promisify: vi.fn(() => vi.fn()),
}))