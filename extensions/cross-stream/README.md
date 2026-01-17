# Cross.Stream Extension for Vicinae

This extension provides integration with [cross.stream](https://www.cross.stream/), a local-first event streaming store for hackers & tinkerers, directly within Vicinae.

## Features

- **Unified Interface**: Single command to browse and manage all cross.stream topics and frames
- **Topic Filtering**: Dropdown filter to quickly switch between event streams
- **Frame Management**: View, append, and remove event frames
- **Quick Actions**: Copy frame content to clipboard, view full content
- **Search**: Filter frames within the selected topic
- **Event Streaming**: Real-time view of append-only event streams

## Commands

### Cross.Stream (`cross-stream`)

The unified interface for managing cross.stream event stores and frames.

**Main Features:**
- **Topic Dropdown**: Filter dropdown in the search bar to switch between topics
- **Frame Listing**: Browse all frames in the selected topic with content previews
- **Search**: Filter frames using the search bar

**ActionPanel Actions:**
- **Append Frame** - Add new event frames to the current topic

**Frame Actions:**
- Copy content to clipboard
- View full content (for truncated previews)
- Remove frame (destructive action)

## Requirements

- [cross.stream (xs)](https://github.com/cablehead/xs) must be installed and available in your PATH
- A cross.stream server should be running (`xs serve`)
- Topics are created automatically when you first append a frame

## Usage Examples

```bash
# Start the cross.stream server
xs serve

# Create test data in another terminal
echo "Hello World" | xs append greetings
echo "Event data" | xs append events

# Use the extension
# 1. Run "Cross.Stream" command - use the topic dropdown to select a topic
# 2. Browse frames in the selected topic
# 3. Search for specific frames using the search bar
# 4. Click "Append Frame" to add new event frames
# 5. View, copy, or remove existing frames
```

## Troubleshooting

The extension provides detailed error messages and robust validation:

- **Input Validation**: Frame content cannot be empty or whitespace-only
- **Detailed Errors**: Specific error messages from xs commands
- **Console Logging**: Debug information available in terminal/console
- **Installation Check**: Detects when xs is not installed or server is not running

**Common Issues:**
- **Empty content**: Form validation prevents submission
- **Server not running**: Make sure `xs serve` is running
- **Command failures**: Detailed stderr output helps diagnose issues