import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { Action, ActionPanel, Icon, List, showToast } from "@vicinae/api";
import { useEffect, useState } from "react";

interface SSHHost {
  name: string;
  config: string[];
}

export default function SSHConnect() {
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHosts();
  }, []);

  const loadHosts = async () => {
    try {
      const knownHostsPath = `${homedir()}/.ssh/known_hosts`;
      if (!existsSync(knownHostsPath)) {
        setHosts([]);
        setIsLoading(false);
        return;
      }

      const knownHostsContent = readFileSync(knownHostsPath, "utf-8");
      const parsedHosts = parseKnownHosts(knownHostsContent);
      setHosts(parsedHosts);
    } catch (_error) {
      await showToast({
        title: "Error",
        message: "Failed to read SSH known_hosts",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseKnownHosts = (content: string): SSHHost[] => {
    const lines = content.split("\n");
    const hostMap = new Map<string, SSHHost>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }

      const hostnames = parts[0].split(",");
      // Use the first hostname as the primary name
      const primaryHost = hostnames[0];

      // Skip if we already have this host
      if (hostMap.has(primaryHost)) {
        continue;
      }

      hostMap.set(primaryHost, {
        name: primaryHost,
        config: [trimmed],
      });
    }

    return Array.from(hostMap.values());
  };

  const connectToHost = async (host: SSHHost) => {
    try {
      // Try to find a terminal emulator
      const terminals = [
        "gnome-terminal",
        "konsole",
        "xterm",
        "alacritty",
        "kitty",
        "terminator",
      ];
      let terminalCmd = null;

      for (const term of terminals) {
        try {
          await new Promise((resolve, reject) => {
            const check = spawn("which", [term], { stdio: "pipe" });
            check.on("close", (code) => {
              if (code === 0) {
                resolve(true);
              } else {
                reject();
              }
            });
            check.on("error", reject);
          });
          terminalCmd = term;
          break;
        } catch {}
      }

      if (!terminalCmd) {
        throw new Error("No terminal emulator found");
      }

      // Launch terminal with SSH command
      let args: string[];
      if (terminalCmd === "gnome-terminal") {
        args = ["--", "ssh", host.name];
      } else if (terminalCmd === "konsole") {
        args = ["-e", "ssh", host.name];
      } else if (terminalCmd === "xterm") {
        args = ["-e", "ssh", host.name];
      } else {
        // Default for alacritty, kitty, terminator
        args = ["-e", "ssh", host.name];
      }

      const terminal = spawn(terminalCmd, args, {
        detached: true,
        stdio: "ignore",
      });

      terminal.on("error", (error) => {
        showToast({
          title: "Connection Failed",
          message: `Failed to launch terminal: ${error.message}`,
        });
      });

      terminal.unref();

      await showToast({
        title: "Connecting",
        message: `Launching terminal for ${host.name}...`,
      });
    } catch (error) {
      await showToast({
        title: "Error",
        message: `Failed to start SSH: ${error}`,
      });
    }
  };

  const removeHost = async (host: SSHHost) => {
    try {
      const knownHostsPath = `${homedir()}/.ssh/known_hosts`;
      if (!existsSync(knownHostsPath)) {
        await showToast({
          title: "Error",
          message: "known_hosts file not found",
        });
        return;
      }

      const content = readFileSync(knownHostsPath, "utf-8");
      const lines = content.split("\n");

      // Filter out lines that contain the hostname
      const filteredLines = lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return true; // Keep comments and empty lines
        }
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) {
          return true; // Keep malformed lines
        }
        const hostnames = parts[0].split(",");
        return !hostnames.includes(host.name);
      });

      writeFileSync(knownHostsPath, filteredLines.join("\n"), "utf-8");

      await showToast({
        title: "Host Removed",
        message: `Removed ${host.name} from known_hosts`,
      });

      // Reload hosts
      loadHosts();
    } catch (error) {
      await showToast({
        title: "Error",
        message: `Failed to remove host: ${error}`,
      });
    }
  };

  if (isLoading) {
    return <List isLoading />;
  }

  if (hosts.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Globe}
          title="No SSH Hosts"
          description="No SSH hosts found in ~/.ssh/known_hosts. Connect to hosts using SSH to populate this list."
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search SSH hosts...">
      <List.Section title={`SSH Hosts (${hosts.length})`}>
        {hosts.map((host) => (
          <List.Item
            key={host.name}
            title={host.name}
            subtitle={host.config[0].split(/\s+/)[1] || "Unknown key type"}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action
                  title="Connect"
                  icon={Icon.ArrowRight}
                  onAction={() => connectToHost(host)}
                  shortcut={{ modifiers: ["ctrl"], key: "enter" }}
                />
                <Action.CopyToClipboard
                  title="Copy Host Name"
                  content={host.name}
                />
                <Action
                  title="Remove Host"
                  icon={Icon.Trash}
                  style="destructive"
                  onAction={() => removeHost(host)}
                  shortcut={{ modifiers: ["ctrl"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
