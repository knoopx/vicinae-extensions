# Systemd Services Extension

A Vicinae extension for managing systemd services on Linux systems.

## Features

- **Service Management**: Start, stop, restart, and reload systemd services
- **Boot Configuration**: Enable/disable services to start at boot
- **Service Monitoring**: View real-time service status and load state
- **Log Viewing**: Access service logs with clean formatting (current boot session only)
- **Filtering**: Filter between All, System, and User services
- **Search**: Search through services by name or description
- **Visual Indicators**: Color-coded status icons and service type accessories

## Requirements

- Linux system with systemd
- Appropriate permissions to manage services (may require sudo for some operations)

## Usage

### Basic Navigation

1. Open the extension to see all available systemd services
2. Use the dropdown filter to show:
   - **All Services**: Both system and user services
   - **System Services**: Only system-wide services (gear icon)
   - **User Services**: Only user-specific services (person icon)

### Service Actions

Select a service and use the action panel or keyboard shortcuts:

- **Start** (⌘S): Start a stopped service
- **Stop** (⌘S): Stop a running service
- **Restart** (⌘R): Restart a running service
- **Reload** (⌘L): Reload service configuration without full restart
- **Enable** (⌘E): Enable service to start at boot
- **Disable** (⌘D): Disable service from starting at boot

### Viewing Details

- **Show Details**: View service metadata and recent logs
- **Refresh** (⌘F): Update the service list and status

### Service Status Indicators

- **Green**: Active and running
- **Red**: Failed
- **Gray**: Inactive
- **Orange**: Unknown status

### Log Viewing

Service logs are displayed in the detail view with:
- Clean formatting (timestamps and process prefixes removed)
- Current boot session only
- Monospace code block display
- Automatic loading when viewing details

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Start/Stop | ⌘S |
| Restart | ⌘R |
| Reload | ⌘L |
| Enable | ⌘E |
| Disable | ⌘D |
| Refresh | ⌘F |

## Permissions

Some systemctl operations may require elevated privileges. If you encounter permission errors:

1. Run Vicinae with appropriate permissions (e.g., via sudo)
2. Configure sudo for systemctl commands without password prompts
3. Check that your user has permission to manage the specific service

## Troubleshooting

### No Services Found
- Verify systemd is running: `systemctl is-system-running`
- Check permissions for systemctl commands
- Try refreshing the service list

### Permission Errors
- Some system services require root privileges
- User services should work with standard user permissions
- Check sudo configuration for passwordless systemctl access

### Log Loading Issues
- Logs are limited to the current boot session (-b flag)
- Some services may not have recent logs
- Check journalctl permissions if logs fail to load