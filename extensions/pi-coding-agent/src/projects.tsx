import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  open,
  Clipboard,
  useNavigation,
  closeMainWindow,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { open as openFile, readdir, rm, stat } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { spawn } from "child_process";

const SESSIONS_DIR = join(homedir(), ".pi", "agent", "sessions");

interface ProjectInfo {
  id: string;
  path: string;
  displayPath: string;
  cwdPath: string;
  sessionCount: number;
  latestSession: Date | null;
  totalSize: number;
}

interface SessionFile {
  filename: string;
  path: string;
  timestamp: Date;
  size: number;
  title: string;
}

function decodeSessionPath(dirName: string): string {
  const trimmed = dirName.replace(/^--/, "").replace(/--$/, "");
  return `/${trimmed.replace(/-/g, "/")}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? "just now" : `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  if (days === 1) {
    return "yesterday";
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function formatDateTime(date: Date): string {
  return date.toLocaleString();
}

function parseSessionTimestamp(filename: string): Date | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
  if (!match) {
    return null;
  }

  const rawTimestamp = match[1];
  if (!rawTimestamp) {
    return null;
  }

  const isoString = rawTimestamp.replace(
    /(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/,
    "$1T$2:$3:$4.$5Z",
  );

  return new Date(isoString);
}

async function resolveLaunchCwd(cwdPath: string): Promise<string> {
  try {
    const cwdStat = await stat(cwdPath);
    if (cwdStat.isDirectory()) {
      return cwdPath;
    }
  } catch {
    return homedir();
  }

  return homedir();
}

function launchWezterm(commandArgs: string[], cwdPath: string) {
  const weztermArgs = ["start", "--cwd", cwdPath, "--", ...commandArgs];
  const child = spawn("wezterm", weztermArgs, {
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });

  child.unref();
}

async function startNewSession(projectPath: string) {
  try {
    const cwdPath = await resolveLaunchCwd(projectPath);
    launchWezterm(["pi"], cwdPath);
    await showToast({
      style: Toast.Style.Success,
      title: "Starting new Pi session",
      message: projectPath,
    });
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start Pi",
      message: (error as Error).message,
    });
  }
}

async function resumeSession(sessionPath: string, projectPath: string) {
  try {
    const cwdPath = await resolveLaunchCwd(projectPath);
    launchWezterm(["pi", "--session", sessionPath], cwdPath);
    await showToast({
      style: Toast.Style.Success,
      title: "Resuming Pi session",
      message: basename(sessionPath),
    });
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to resume session",
      message: (error as Error).message,
    });
  }
}

async function readSessionCwd(sessionPath: string): Promise<string | null> {
  const handle = await openFile(sessionPath, "r");

  try {
    const maxBytes = 16 * 1024;
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    const content = buffer.toString("utf8", 0, bytesRead);
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as { type?: string; cwd?: string };
        if (entry.type === "session" && typeof entry.cwd === "string") {
          return entry.cwd;
        }
      } catch {
        continue;
      }
    }

    return null;
  } finally {
    await handle.close();
  }
}

async function getProjectInfo(dirName: string): Promise<ProjectInfo> {
  const fullPath = join(SESSIONS_DIR, dirName);
  const displayPath = decodeSessionPath(dirName);

  const files = await readdir(fullPath);
  const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

  let latestSession: Date | null = null;
  let latestSessionPath: string | null = null;
  let totalSize = 0;

  for (const file of jsonlFiles) {
    const filePath = join(fullPath, file);
    const fileStat = await stat(filePath);
    totalSize += fileStat.size;

    if (!latestSession || fileStat.mtime > latestSession) {
      latestSession = fileStat.mtime;
      latestSessionPath = filePath;
    }
  }

  let cwdPath = displayPath;
  if (latestSessionPath) {
    const sessionCwd = await readSessionCwd(latestSessionPath);
    if (sessionCwd) {
      cwdPath = sessionCwd;
    }
  }

  return {
    id: dirName,
    path: fullPath,
    displayPath,
    cwdPath,
    sessionCount: jsonlFiles.length,
    latestSession,
    totalSize,
  };
}

async function getProjects(): Promise<ProjectInfo[]> {
  try {
    const dirs = await readdir(SESSIONS_DIR);
    const sessionDirs = dirs.filter((d) => d.startsWith("--"));

    const projects = await Promise.all(
      sessionDirs.map((dir) => getProjectInfo(dir)),
    );

    return projects.sort((a, b) => {
      if (!a.latestSession) return 1;
      if (!b.latestSession) return -1;
      return b.latestSession.getTime() - a.latestSession.getTime();
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readSessionTitle(sessionPath: string): Promise<string> {
  const handle = await openFile(sessionPath, "r");

  try {
    const maxBytes = 32 * 1024;
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    const content = buffer.toString("utf8", 0, bytesRead);
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as {
          type?: string;
          message?: { role?: string; content?: unknown };
        };

        if (entry.type === "message" && entry.message?.role === "user") {
          const messageContent = entry.message.content;
          if (Array.isArray(messageContent)) {
            for (const part of messageContent) {
              if (
                typeof part === "object" &&
                part !== null &&
                "type" in part &&
                "text" in part &&
                (part as { type?: string }).type === "text" &&
                typeof (part as { text?: unknown }).text === "string"
              ) {
                const text = (part as { text: string }).text.trim();
                if (text.length > 0) {
                  return text.length > 100 ? text.slice(0, 100) + "…" : text;
                }
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    return "Untitled session";
  } finally {
    await handle.close();
  }
}

async function getSessionFiles(projectPath: string): Promise<SessionFile[]> {
  const files = await readdir(projectPath);
  const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

  const sessions: SessionFile[] = [];
  for (const file of jsonlFiles) {
    const filePath = join(projectPath, file);
    const fileStat = await stat(filePath);
    const timestamp = parseSessionTimestamp(file) || fileStat.mtime;
    const title = await readSessionTitle(filePath);

    sessions.push({
      filename: file,
      path: filePath,
      timestamp,
      size: fileStat.size,
      title,
    });
  }

  return sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function RefreshAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["ctrl"], key: "r" }}
      onAction={onAction}
    />
  );
}

function ProjectSessionsView({ project }: { project: ProjectInfo }) {
  const [sessions, setSessions] = useState<SessionFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const sessionFiles = await getSessionFiles(project.path);
      setSessions(sessionFiles);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sessions",
        message: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [project.path]);

  if (sessions.length === 0 && !loading) {
    return (
      <List navigationTitle={basename(project.displayPath)}>
        <List.EmptyView
          icon={Icon.Document}
          title="No sessions found"
          description="This project has no session files"
          actions={
            <ActionPanel>
              <Action
                title="Start New Pi Session"
                icon={Icon.Plus}
                onAction={() => startNewSession(project.cwdPath)}
              />
              <RefreshAction onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      navigationTitle={basename(project.displayPath)}
      searchBarPlaceholder="Search sessions..."
      actions={
        <ActionPanel>
          <Action
            title="Start New Pi Session"
            icon={Icon.Plus}
            onAction={() => startNewSession(project.cwdPath)}
          />
          <RefreshAction onAction={refresh} />
        </ActionPanel>
      }
    >
      {sessions.map((session) => (
        <List.Item
          key={session.filename}
          title={session.title}
          subtitle={formatDateTime(session.timestamp)}
          icon={Icon.Document}
          accessories={[
            {
              text: formatBytes(session.size),
              icon: Icon.HardDrive,
            },
            {
              text: formatDate(session.timestamp),
              icon: Icon.Clock,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Resume Pi Session"
                  icon={Icon.Play}
                  onAction={() => resumeSession(session.path, project.cwdPath)}
                />
                <Action
                  title="Start New Pi Session"
                  icon={Icon.Plus}
                  onAction={() => startNewSession(project.cwdPath)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <RefreshAction onAction={refresh} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = async () => {
    setLoading(true);
    try {
      const projectList = await getProjects();
      setProjects(projectList);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (project: ProjectInfo) => {
    try {
      await rm(project.path, { recursive: true, force: true });
      await showToast({
        style: Toast.Style.Success,
        title: "Project deleted",
        message: project.displayPath,
      });
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete project",
        message: (error as Error).message,
      });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (projects.length === 0 && !loading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Pi sessions found"
          description="Start a Pi coding session to see it here"
          actions={
            <ActionPanel>
              <RefreshAction onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search projects..."
      actions={
        <ActionPanel>
          <RefreshAction onAction={refresh} />
        </ActionPanel>
      }
    >
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.displayPath}
          subtitle={`${project.sessionCount} session${project.sessionCount !== 1 ? "s" : ""}`}
          icon={Icon.Folder}
          accessories={[
            {
              text: formatBytes(project.totalSize),
              icon: Icon.HardDrive,
            },
            project.latestSession
              ? {
                  text: formatDate(project.latestSession),
                  icon: Icon.Clock,
                }
              : { text: "No sessions" },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="View Sessions"
                  icon={Icon.Eye}
                  onAction={() =>
                    push(<ProjectSessionsView project={project} />)
                  }
                />
                <Action
                  title="Start New Pi Session"
                  icon={Icon.Plus}
                  onAction={() => startNewSession(project.cwdPath)}
                />
                <Action
                  title="Open in Terminal"
                  icon={Icon.Terminal}
                  onAction={async () => {
                    await open(project.displayPath);
                  }}
                />
                <Action
                  title="Copy Project Path"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["ctrl"], key: "c" }}
                  onAction={async () => {
                    await Clipboard.copy(project.displayPath);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Path copied",
                    });
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Manage">
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["shift"], key: "delete" }}
                  onAction={() => deleteProject(project)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <RefreshAction onAction={refresh} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
