# Bluetooth Devices Extension

A Raycast extension for managing Bluetooth devices using command line tools.

## Features

- List all paired Bluetooth devices
- Connect/disconnect to Bluetooth devices
- Pair new Bluetooth devices
- Trust/untrust Bluetooth devices
- Remove Bluetooth devices

## Requirements

- Linux operating system
- `bluetoothctl` command line tool installed
- Bluetooth hardware enabled

## Installation

1. Install the extension dependencies:
   ```bash
   cd bluetooth-devices
   bun install
   ```

2. Build the extension:
   ```bash
   bun run build
   ```

3. Replace the placeholder icon in `assets/extension-icon.png` with a proper Bluetooth-themed PNG icon (512x512 recommended)

## Usage

1. Open Raycast and search for "List Bluetooth Devices"
2. The extension will scan for available Bluetooth devices
3. Use the action panel to:
   - Connect/disconnect devices
   - Pair new devices
   - Trust/untrust devices
   - Remove devices from the list

## Development

- `bun run dev` - Start development mode
- `bun run build` - Build the extension
- `bun run lint` - Run linter
- `bun run fix-lint` - Fix linting issues

## Note

This extension wraps the `bluetoothctl` command line tool and requires Bluetooth hardware to be available on the system.