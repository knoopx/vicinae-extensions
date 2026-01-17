import { List, ActionPanel, Action, Icon, showToast, Toast, Form, useNavigation, Clipboard } from "@vicinae/api";
import { spawn } from "child_process";
import React from "react";

interface Frame {
  id: string;
  topic: string;
  content?: string;
  metadata?: Record<string, any>;
}

async function getTopics(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn("xs", ["exec", "topics | get name"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        try {
          // Parse the JSON output from xs exec
          const topics = JSON.parse(stdout.trim());
          resolve(Array.isArray(topics) ? topics : []);
        } catch (e) {
          resolve([]);
        }
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function getFrames(topic: string): Promise<Frame[]> {
  return new Promise((resolve) => {
    const child = spawn("xs", ["cat", topic, "--json"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        try {
          const lines = stdout.trim().split("\n").filter(Boolean);
          const frames = lines.map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          }).filter(Boolean);
          resolve(frames);
        } catch (error) {
          resolve([]);
        }
      } else {
        // Topic doesn't exist or other error
        resolve([]);
      }
    });

    child.on("error", () => {
      resolve([]);
    });
  });
}

async function getFrameContent(frameId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("xs", ["get", frameId, "--json"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        try {
          const frame = JSON.parse(stdout.trim());
          resolve(frame.content || "");
        } catch (error) {
          reject(new Error("Failed to parse frame data"));
        }
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function appendFrame(topic: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("xs", ["append", topic], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";

    child.stdin.write(content);
    child.stdin.end();

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function removeFrame(frameId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("xs", ["remove", frameId], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

function AppendFrameForm({ topic, onSuccess }: { topic: string; onSuccess?: () => void }) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: Form.Values) => {
    const content = (values.content as string)?.trim();

    if (!content) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid content",
        message: "Content cannot be empty",
      });
      return;
    }

    try {
      await appendFrame(topic, content);
      await showToast({
        style: Toast.Style.Success,
        title: "Frame appended successfully",
      });
      onSuccess?.();
      pop();
    } catch (error) {
      console.error("Append frame error:", error);
      let errorMessage = "Unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message || "Unknown error";
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        errorMessage = JSON.stringify(error);
      }

      if (errorMessage.length > 100) {
        errorMessage = `${errorMessage.substring(0, 100)}...`;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to append frame",
        message: errorMessage,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Append Frame" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="Enter the frame content..." />
    </Form>
  );
}

export default function CrossStream() {
  const [topics, setTopics] = React.useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = React.useState<string>("");
  const [frames, setFrames] = React.useState<Frame[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingFrames, setIsLoadingFrames] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const { push } = useNavigation();

  const loadTopics = async () => {
    try {
      const topicList = await getTopics();
      setTopics(topicList);
      if (topicList.length > 0 && !selectedTopic) {
        setSelectedTopic(topicList[0]!);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load topics",
        message: errorMessage.includes("ENOENT") ? "xs is not installed or not in PATH" : errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFrames = async (topic: string) => {
    if (!topic) return;
    setIsLoadingFrames(true);
    try {
      const frameList = await getFrames(topic);
      setFrames(frameList);
    } catch (error) {
      console.error("Unexpected error loading frames:", error);
      setFrames([]);
    } finally {
      setIsLoadingFrames(false);
    }
  };

  React.useEffect(() => {
    loadTopics();
  }, []);

  React.useEffect(() => {
    if (selectedTopic) {
      loadFrames(selectedTopic);
    }
  }, [selectedTopic]);

  const handleAppendFrame = () => {
    push(<AppendFrameForm topic={selectedTopic} onSuccess={() => loadFrames(selectedTopic)} />);
  };

  const filteredFrames = frames.filter(frame =>
    frame.id.toLowerCase().includes(searchText.toLowerCase()) ||
    frame.content?.toLowerCase().includes(searchText.toLowerCase()) ||
    frame.topic.toLowerCase().includes(searchText.toLowerCase())
  );

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (topics.length === 0) {
    return (
      <List>
        <List.Section title="No Topics Found">
          <List.Item
            title="Append Frame"
            subtitle="Create a new topic by appending a frame"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action title="Append Frame" onAction={handleAppendFrame} />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  return (
    <List
      isLoading={isLoadingFrames}
      searchBarPlaceholder="Search frames..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        topics.length > 1 ? (
          <List.Dropdown
            tooltip="Select Topic"
            value={selectedTopic}
            onChange={setSelectedTopic}
          >
            {topics.map((topic) => (
              <List.Dropdown.Item key={topic} title={topic} value={topic} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action title="Append Frame" icon={Icon.Plus} onAction={handleAppendFrame} />
        </ActionPanel>
      }
    >
      <List.Section title={`${filteredFrames.length} frames in ${selectedTopic}`}>
        {filteredFrames.map((frame) => (
          <List.Item
            key={frame.id}
            title={frame.id}
            subtitle={frame.content ? (frame.content.length > 50 ? `${frame.content.substring(0, 50)}...` : frame.content) : "No content"}
            icon={Icon.Document}
            accessories={[
              { text: frame.topic }
            ]}
            actions={
              <ActionPanel>
                <Action title="Copy Content" onAction={async () => {
                  if (frame.content) {
                    await Clipboard.copy(frame.content);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Content copied",
                    });
                  } else {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "No content to copy",
                    });
                  }
                }} />
                <Action title="View Full Content" onAction={async () => {
                  try {
                    const fullContent = await getFrameContent(frame.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Full content loaded",
                      message: fullContent.substring(0, 100) + (fullContent.length > 100 ? "..." : ""),
                    });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to load content",
                    });
                  }
                }} />
                <Action title="Remove Frame" style={Action.Style.Destructive} onAction={async () => {
                  try {
                    await removeFrame(frame.id);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Frame removed",
                    });
                    loadFrames(selectedTopic);
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to remove frame",
                      message: errorMessage,
                    });
                  }
                }} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}