// Mock Raycast API for testing
export const showToast = vi.fn()

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated',
  },
}

export const getPreferenceValues = vi.fn(() => ({
  musicDirectory: '/test/music',
}))

export const environment = {
  supportPath: '/test/support',
  cachePath: '/test/cache',
}

export const Icon = {
  Music: 'music',
  Star: 'star',
  StarDisabled: 'star-disabled',
  Play: 'play',
  Finder: 'finder',
  Eye: 'eye',
  EyeSlash: 'eye-slash',
  XMarkCircle: 'x-mark-circle',
}

export const Color = {
  Yellow: 'yellow',
}

export const Keyboard = {
  Shortcut: {
    Common: {
      Pin: 'cmd+p',
      ToggleQuickLook: 'space',
      Remove: 'cmd+backspace',
    },
  },
}

export const Action = vi.fn()
export const ActionPanel = vi.fn()
export const List = vi.fn()