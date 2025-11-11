import { Icon, Color } from "@vicinae/api";

// Systemd service status patterns
export const SYSTEMD_REGEX = {
  // Match service lines from systemctl list-units
  serviceLine: /^(\S+)\.service\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/,
  // Status patterns
  activeStatus: /\bactive\b/,
  inactiveStatus: /\binactive\b/,
  failedStatus: /\bfailed\b/,
  runningStatus: /\brunning\b/,
  exitedStatus: /\bexited\b/,
  deadStatus: /\bdead\b/,
  loadedStatus: /\bloaded\b/,
  notFoundStatus: /\bnot-found\b/,
};

// Service status types
export enum ServiceStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  FAILED = "failed",
  UNKNOWN = "unknown",
}

// Service sub-status types
export enum ServiceSubStatus {
  RUNNING = "running",
  EXITED = "exited",
  DEAD = "dead",
  WAITING = "waiting",
  UNKNOWN = "unknown",
}

// Service load status
export enum ServiceLoadStatus {
  LOADED = "loaded",
  NOT_FOUND = "not-found",
  UNKNOWN = "unknown",
}

// Get icon based on service status
export function getServiceIcon(): string {
  // Use a consistent gear icon for all services, status is shown via colors and accessories
  return Icon.Gear;
}

// Get color based on service status
export function getServiceColor(status: ServiceStatus) {
  switch (status) {
    case ServiceStatus.ACTIVE:
      return Color.Green;
    case ServiceStatus.FAILED:
      return Color.Red;
    case ServiceStatus.INACTIVE:
      return Color.SecondaryText;
    default:
      return Color.Orange;
  }
}
