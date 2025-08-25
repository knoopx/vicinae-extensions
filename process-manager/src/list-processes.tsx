// Process Manager Raycast Extension
// Lists, filters, and manages system processes
// Shows PID, command, CPU, memory, and user ID
// Actions: Terminate, Kill, Copy PID/Command

import React, { useEffect, useState, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Keyboard,
} from "@vicinae/api";
import { exec } from "child_process";

async function getProcessList(): Promise<Process[]> {
  return new Promise((resolve, reject) => {
    exec(
      "/run/current-system/sw/bin/ps -eo pid,ppid,comm,%cpu,%mem,uid",
      (error, stdout, stderr) => {
        if (error) {
          // Log error and stderr for debugging
          console.error("Process listing error:", error);
          console.error("Process listing stderr:", stderr);
          reject(error.message + "\n" + stderr);
          return;
        }
        if (error) {
          reject(error);
          return;
        }
        const lines = stdout.trim().split("\n").slice(1);
        const processes = lines.map((line) => {
          const [pid, ppid, ...rest] = line.trim().split(/\s+/);
          const cmdParts = rest.slice(0, rest.length - 3);
          const cpu = Number(rest[rest.length - 3]);
          const mem = Number(rest[rest.length - 2]);
          const uid = Number(rest[rest.length - 1]);
          return {
            pid: Number(pid),
            ppid: Number(ppid),
            name: cmdParts.join(" "),
            cmd: cmdParts.join(" "),
            cpu,
            memory: mem,
            uid,
          };
        });
        resolve(processes);
      }
    );
  });
}

interface Process {
  pid: number;
  name: string;
  cmd: string;
  ppid?: number;
  cpu?: number;
  memory?: number;
  uid?: number;
}

function formatMemory(memory?: number) {
  if (!memory) return "";
  return `${memory.toFixed(1)} MB`;
}

function isSystemProcess(pid: number) {
  return pid === 0 || pid === 1;
}

async function killProcess(pid: number, signal: NodeJS.Signals) {
  if (isSystemProcess(pid)) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Cannot kill system process (PID ${pid})`,
    });
    return;
  }
  try {
    process.kill(pid, signal);
    await showToast({
      style: Toast.Style.Success,
      title: `Sent ${signal} to PID ${pid}`,
    });
  } catch (e: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to send ${signal} to PID ${pid}`,
      message: e.message,
    });
  }
}

const uidToUser: Record<number, string> = {
  0: "root",
  4: "messagebus",
  12: "atd",
  28: "polkituser",
  132: "gdm",
  151: "systemd-coredump",
  152: "systemd-network",
  153: "systemd-resolve",
  154: "systemd-timesync",
  217: "nm-openvpn",
  987: "rtkit",
  988: "flatpak",
  992: "geoclue",
  994: "systemd-oom",
  995: "sshd",
  996: "nscd",
  997: "nm-iodine",
  998: "fwupd-refresh",
  999: "avahi",
  1000: "knoopx",
  30001: "nixbld1",
  30002: "nixbld2",
  30003: "nixbld3",
  30004: "nixbld4",
  30005: "nixbld5",
  30006: "nixbld6",
  30007: "nixbld7",
  30008: "nixbld8",
  30009: "nixbld9",
  30010: "nixbld10",
  30011: "nixbld11",
  30012: "nixbld12",
  30013: "nixbld13",
  30014: "nixbld14",
  30015: "nixbld15",
  30016: "nixbld16",
  30017: "nixbld17",
  30018: "nixbld18",
  30019: "nixbld19",
  30020: "nixbld20",
  30021: "nixbld21",
  30022: "nixbld22",
  30023: "nixbld23",
  30024: "nixbld24",
  30025: "nixbld25",
  30026: "nixbld26",
  30027: "nixbld27",
  30028: "nixbld28",
  30029: "nixbld29",
  30030: "nixbld30",
  30031: "nixbld31",
  30032: "nixbld32",
  65534: "nobody",
};

export default function Command() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"cpu" | "memory" | "pid" | "name">(
    "cpu"
  );
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [filterSystem, setFilterSystem] = useState<"all" | "system" | "user">(
    "all"
  );
  const [filterCpu, setFilterCpu] = useState<number>(0);
  const [filterMem, setFilterMem] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchProcesses() {
    setLoading(true);
    try {
      const list = await getProcessList();
      setProcesses(
        Array.isArray(list)
          ? list.filter((proc) => !isSystemProcess(proc.pid))
          : []
      );
    } catch (e) {
      setProcesses([]);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to list processes",
        message: String(e),
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProcesses();
    intervalRef.current = setInterval(fetchProcesses, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  let filtered = Array.isArray(processes)
    ? processes.filter((proc) => {
        const query = searchText.toLowerCase();
        // Search filter
        if (
          !(
            proc.name.toLowerCase().includes(query) ||
            proc.cmd.toLowerCase().includes(query) ||
            String(proc.pid).includes(query) ||
            (proc.uid !== undefined && String(proc.uid).includes(query)) ||
            (proc.ppid !== undefined && String(proc.ppid).includes(query))
          )
        )
          return false;
        // User filter
        if (
          filterUser &&
          proc.uid !== undefined &&
          uidToUser[proc.uid] !== filterUser
        )
          return false;
        // System/user filter
        if (filterSystem === "system" && !isSystemProcess(proc.pid))
          return false;
        if (filterSystem === "user" && isSystemProcess(proc.pid)) return false;
        // CPU/mem filter
        if (proc.cpu !== undefined && proc.cpu < filterCpu) return false;
        if (proc.memory !== undefined && proc.memory < filterMem) return false;
        return true;
      })
    : [];

  // Sort filtered processes
  filtered = filtered.sort((a, b) => {
    if (sortBy === "cpu") return (b.cpu ?? 0) - (a.cpu ?? 0);
    if (sortBy === "memory") return (b.memory ?? 0) - (a.memory ?? 0);
    if (sortBy === "pid") return b.pid - a.pid;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search processes. Sort: ${sortBy.toUpperCase()}${filterUser ? ", User: " + filterUser : ""}${filterSystem !== "all" ? ", Type: " + filterSystem : ""}${filterCpu > 0 ? ", CPU > " + filterCpu : ""}${filterMem > 0 ? ", Mem > " + filterMem : ""} (⌘/Ctrl+1:CPU, ⌘/Ctrl+2:MEM, ⌘/Ctrl+3:PID, ⌘/Ctrl+4:NAME)`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Sort">
            <Action
              title="Sort by CPU"
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "1" },
                windows: { modifiers: ["ctrl"], key: "1" },
              }}
              onAction={() => setSortBy("cpu")}
              icon={Icon.BarChart}
            />
            <Action
              title="Sort by Memory"
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "2" },
                windows: { modifiers: ["ctrl"], key: "2" },
              }}
              onAction={() => setSortBy("memory")}
              icon={Icon.MemoryChip}
            />
            <Action
              title="Sort by PID"
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "3" },
                windows: { modifiers: ["ctrl"], key: "3" },
              }}
              onAction={() => setSortBy("pid")}
              icon={Icon.Hashtag}
            />
            <Action
              title="Sort by Name"
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "4" },
                windows: { modifiers: ["ctrl"], key: "4" },
              }}
              onAction={() => setSortBy("name")}
              icon={Icon.Text}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Filter">
            <Action
              title="Show Only System Processes"
              onAction={() => setFilterSystem("system")}
              icon={Icon.Shield}
            />
            <Action
              title="Show Only User Processes"
              onAction={() => setFilterSystem("user")}
              icon={Icon.Person}
            />
            <Action
              title="Show All Processes"
              onAction={() => setFilterSystem("all")}
              icon={Icon.List}
            />
            <Action
              title="Filter by User: knoopx"
              onAction={() => setFilterUser("knoopx")}
              icon={Icon.Person}
            />
            <Action
              title="Filter by User: root"
              onAction={() => setFilterUser("root")}
              icon={Icon.Person}
            />
            <Action
              title="Clear User Filter"
              onAction={() => setFilterUser(null)}
              icon={Icon.XmarkCircle}
            />
            <Action
              title="CPU > 10%"
              onAction={() => setFilterCpu(10)}
              icon={Icon.BarChart}
            />
            <Action
              title="CPU > 50%"
              onAction={() => setFilterCpu(50)}
              icon={Icon.BarChart}
            />
            <Action
              title="Clear CPU Filter"
              onAction={() => setFilterCpu(0)}
              icon={Icon.XmarkCircle}
            />
            <Action
              title="Mem > 100MB"
              onAction={() => setFilterMem(100)}
              icon={Icon.MemoryChip}
            />
            <Action
              title="Mem > 500MB"
              onAction={() => setFilterMem(500)}
              icon={Icon.MemoryChip}
            />
            <Action
              title="Clear Mem Filter"
              onAction={() => setFilterMem(0)}
              icon={Icon.XmarkCircle}
            />
            <Action
              title="Clear All Filters"
              onAction={() => {
                setFilterUser(null);
                setFilterSystem("all");
                setFilterCpu(0);
                setFilterMem(0);
              }}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {filtered.length === 0 ? (
        <List.EmptyView
          title="No processes found"
          description={
            "No processes match your search. Try searching for 'firefox', 'bash', or a PID. You can also refresh the list with ⌘R."
          }
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        filtered.map((proc) => (
          <List.Item
            key={proc.pid}
            title={proc.name}
            subtitle={`CPU: ${proc.cpu !== undefined ? proc.cpu.toFixed(1) + "%" : "-"} | MEM: ${proc.memory !== undefined ? formatMemory(proc.memory) : "-"}`}
            icon={isSystemProcess(proc.pid) ? Icon.Shield : Icon.Person}
            detail={null}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Terminate Process (SIGTERM)"
                    onAction={() => {
                      if (isSystemProcess(proc.pid)) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: `Cannot kill system process (PID ${proc.pid})`,
                        });
                        return;
                      }
                      showToast({
                        style: Toast.Style.Animated,
                        title: `Terminating PID ${proc.pid}...`,
                      });
                      killProcess(proc.pid, "SIGTERM");
                    }}
                    icon={Icon.Trash}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <Action
                    title="Kill Process (SIGKILL)"
                    onAction={() => {
                      if (isSystemProcess(proc.pid)) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: `Cannot kill system process (PID ${proc.pid})`,
                        });
                        return;
                      }
                      showToast({
                        style: Toast.Style.Failure,
                        title: `Killing PID ${proc.pid}...`,
                      });
                      killProcess(proc.pid, "SIGKILL");
                    }}
                    icon={Icon.ExclamationMark}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  />
                </ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy PID"
                  content={String(proc.pid)}
                />
                <Action.CopyToClipboard
                  title="Copy Command"
                  content={proc.cmd}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
