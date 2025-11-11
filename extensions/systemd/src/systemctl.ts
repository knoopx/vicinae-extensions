import { exec } from "child_process";
import { promisify } from "util";
import { Toast, showToast } from "@vicinae/api";
import {
  SYSTEMD_REGEX,
  ServiceStatus,
  ServiceSubStatus,
  ServiceLoadStatus,
} from "./patterns";

const execAsync = promisify(exec);

export type Service = {
  name: string;
  description: string;
  status: ServiceStatus;
  subStatus: ServiceSubStatus;
  loadStatus: ServiceLoadStatus;
  type: "system" | "user";
  icon: string;
};

// Parse systemctl list-units output
export function parseServiceLine(line: string): Service | null {
  const match = line.match(SYSTEMD_REGEX.serviceLine);
  if (!match) return null;

  const [, name, loadStatus, status, subStatus, description] = match;

  if (!name || !loadStatus || !status || !subStatus || !description) {
    return null;
  }

  let parsedStatus = ServiceStatus.UNKNOWN;
  if (SYSTEMD_REGEX.activeStatus.test(status)) {
    parsedStatus = ServiceStatus.ACTIVE;
  } else if (SYSTEMD_REGEX.inactiveStatus.test(status)) {
    parsedStatus = ServiceStatus.INACTIVE;
  } else if (SYSTEMD_REGEX.failedStatus.test(status)) {
    parsedStatus = ServiceStatus.FAILED;
  }

  let parsedSubStatus = ServiceSubStatus.UNKNOWN;
  if (SYSTEMD_REGEX.runningStatus.test(subStatus)) {
    parsedSubStatus = ServiceSubStatus.RUNNING;
  } else if (SYSTEMD_REGEX.exitedStatus.test(subStatus)) {
    parsedSubStatus = ServiceSubStatus.EXITED;
  } else if (SYSTEMD_REGEX.deadStatus.test(subStatus)) {
    parsedSubStatus = ServiceSubStatus.DEAD;
  }

  let parsedLoadStatus = ServiceLoadStatus.UNKNOWN;
  if (SYSTEMD_REGEX.loadedStatus.test(loadStatus)) {
    parsedLoadStatus = ServiceLoadStatus.LOADED;
  } else if (SYSTEMD_REGEX.notFoundStatus.test(loadStatus)) {
    parsedLoadStatus = ServiceLoadStatus.NOT_FOUND;
  }

  return {
    name,
    description: description.trim(),
    status: parsedStatus,
    subStatus: parsedSubStatus,
    loadStatus: parsedLoadStatus,
    type: "system", // Default to system, will be overridden for user services
    icon: "", // Will be set by getServiceIcon
  };
}

// Get list of services
export async function listServices(
  showAll: boolean = true
): Promise<Service[]> {
  try {
    const services: Service[] = [];

    // Get system services
    const systemCommand = showAll
      ? "systemctl list-units --all"
      : "systemctl list-units";
    const { stdout: systemStdout } = await execAsync(systemCommand);

    const systemLines = systemStdout.trim().split("\n");

    // Skip header lines for system services
    for (let i = 1; i < systemLines.length; i++) {
      const line = systemLines[i]?.trim();
      if (
        !line ||
        line.startsWith("●") ||
        line.includes("LOAD") ||
        line.includes("units listed")
      ) {
        continue;
      }

      const service = parseServiceLine(line);
      if (service) {
        // Mark as system service
        services.push({ ...service, type: "system" });
      }
    }

    // Try to get user services (may fail if no user session)
    try {
      const userCommand = showAll
        ? "systemctl --user list-units --all"
        : "systemctl --user list-units";
      const { stdout: userStdout } = await execAsync(userCommand);

      const userLines = userStdout.trim().split("\n");

      // Skip header lines for user services
      for (let i = 1; i < userLines.length; i++) {
        const line = userLines[i]?.trim();
        if (
          !line ||
          line.startsWith("●") ||
          line.includes("LOAD") ||
          line.includes("units listed")
        ) {
          continue;
        }

        const service = parseServiceLine(line);
        if (service) {
          // Mark as user service
          services.push({ ...service, type: "user" });
        }
      }
    } catch (userError) {
      // User services may not be available, that's okay
      console.log("User services not available:", userError);
    }

    return services.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error listing services:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to list services",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

// Control service actions
export async function startService(serviceName: string): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Starting ${serviceName}...`,
    });

    const { stderr } = await execAsync(`systemctl start ${serviceName}`);

    if (stderr) {
      console.warn(`Warning starting ${serviceName}:`, stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Service started",
      message: `${serviceName} started successfully`,
    });
  } catch (error) {
    console.error(`Error starting ${serviceName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start service",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function stopService(serviceName: string): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Stopping ${serviceName}...`,
    });

    const { stderr } = await execAsync(`systemctl stop ${serviceName}`);

    if (stderr) {
      console.warn(`Warning stopping ${serviceName}:`, stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Service stopped",
      message: `${serviceName} stopped successfully`,
    });
  } catch (error) {
    console.error(`Error stopping ${serviceName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop service",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function restartService(serviceName: string): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Restarting ${serviceName}...`,
    });

    const { stderr } = await execAsync(`systemctl restart ${serviceName}`);

    if (stderr) {
      console.warn(`Warning restarting ${serviceName}:`, stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Service restarted",
      message: `${serviceName} restarted successfully`,
    });
  } catch (error) {
    console.error(`Error restarting ${serviceName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to restart service",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function reloadService(serviceName: string): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Reloading ${serviceName}...`,
    });

    const { stderr } = await execAsync(`systemctl reload ${serviceName}`);

    if (stderr) {
      console.warn(`Warning reloading ${serviceName}:`, stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Service reloaded",
      message: `${serviceName} reloaded successfully`,
    });
  } catch (error) {
    console.error(`Error reloading ${serviceName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to reload service",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function enableService(serviceName: string): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Enabling ${serviceName}...`,
    });

    const { stderr } = await execAsync(`systemctl enable ${serviceName}`);

    if (stderr) {
      console.warn(`Warning enabling ${serviceName}:`, stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Service enabled",
      message: `${serviceName} enabled successfully`,
    });
  } catch (error) {
    console.error(`Error enabling ${serviceName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to enable service",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function disableService(serviceName: string): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Disabling ${serviceName}...`,
    });

    const { stderr } = await execAsync(`systemctl disable ${serviceName}`);

    if (stderr) {
      console.warn(`Warning disabling ${serviceName}:`, stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Service disabled",
      message: `${serviceName} disabled successfully`,
    });
  } catch (error) {
    console.error(`Error disabling ${serviceName}:`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disable service",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// Get service status details
export async function getServiceStatus(serviceName: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`systemctl status ${serviceName}`);
    return stdout;
  } catch (error) {
    console.error(`Error getting status for ${serviceName}:`, error);
    return `Failed to get status: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

// Get service logs using journalctl
export async function getServiceLogs(
  serviceName: string,
  serviceType: "system" | "user" = "system",
  lines: number = 50
): Promise<string> {
  try {
    const userFlag = serviceType === "user" ? "--user" : "";
    const { stdout } = await execAsync(
      `journalctl ${userFlag} -u ${serviceName} -b -n ${lines} --no-pager`
    );
    // Strip timestamp and hostname prefixes from each line
    const cleanedLogs = stdout
      .trim()
      .split("\n")
      .map((line) => {
        return line.replace(/^.*\[\d+\]:\s+/, "");
      })
      .filter((line) => line.trim().length > 0)
      .join("\n");

    return cleanedLogs || "No logs available for this service since last boot.";
  } catch (error) {
    console.error(`Error getting logs for ${serviceName}:`, error);
    return `Failed to get logs: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}
