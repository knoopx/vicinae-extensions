import { Action, ActionPanel, Icon, List } from "@vicinae/api";
import { HistoryItem, GenerationType, ModelOption } from "./types";

type HistoryListProps = {
  history: HistoryItem[];
  onRemove: (id: string) => void;
  type: GenerationType;
  prompt?: string;
  isGenerating?: boolean;
  onGenerate?: () => void;
  models?: ModelOption[];
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  selectedVoice?: string;
  streamingPreview?: string;
};

const getIconForType = (type: GenerationType) => {
  switch (type) {
    case "text":
      return Icon.Text;
    case "image":
      return Icon.Image;
    case "audio":
      return Icon.SpeakerOn;
    default:
      return Icon.Document;
  }
};

const getDetailForType = (item: HistoryItem, type: GenerationType) => {
  switch (type) {
    case "image":
      return (
        <List.Item.Detail markdown={`![Generated Image](${item.content})`} />
      );
    case "audio":
      return (
        <List.Item.Detail
          markdown={`<audio controls src="${item.content}"></audio>`}
        />
      );
    case "text":
    default:
      return <List.Item.Detail markdown={item.content} />;
  }
};

const getCopyActionForType = (type: GenerationType) => {
  switch (type) {
    case "text":
      return "Copy Text";
    case "image":
      return "Copy Image URL";
    case "audio":
      return "Copy Audio URL";
    default:
      return "Copy";
  }
};

const getOpenActionForType = (type: GenerationType) => {
  switch (type) {
    case "image":
      return { title: "Open Image", icon: Icon.Globe };
    case "audio":
      return { title: "Open Audio", icon: Icon.SpeakerOn };
    default:
      return null;
  }
};

export function HistoryList({
  history,
  onRemove,
  type,
  prompt,
  isGenerating,
  onGenerate,
  models: _models,
  selectedModel: _selectedModel,
  onModelChange: _onModelChange,
  selectedVoice,
  streamingPreview,
}: HistoryListProps) {
  const icon = getIconForType(type);
  const openAction = getOpenActionForType(type);

  const getGenerateTitle = () => {
    switch (type) {
      case "text":
        return "Generate Text";
      case "image":
        return "Generate Image";
      case "audio":
        return "Generate Audio";
      default:
        return "Generate";
    }
  };

  const getGenerateSubtitle = () => {
    if (!prompt) return "";
    return `Prompt: ${prompt.substring(0, 40)}${prompt.length > 40 ? "..." : ""}`;
  };

  const getGeneratingDetail = () => {
    if (!isGenerating || !prompt || !streamingPreview) return null;

    return <List.Item.Detail markdown={streamingPreview} />;
  };

  return (
    <List.Section title="HISTORY">
      {prompt && onGenerate && (
        <List.Item
          icon={isGenerating ? Icon.Circle : Icon.Plus}
          title={isGenerating ? "Generating..." : getGenerateTitle()}
          subtitle={getGenerateSubtitle()}
          detail={getGeneratingDetail()}
          actions={
            <ActionPanel>
              <Action
                title={getGenerateTitle()}
                onAction={onGenerate}
                icon={Icon.Plus}
                shortcut={{ modifiers: [], key: "return" }}
              />
            </ActionPanel>
          }
        />
      )}
      {history.map((item) => (
        <List.Item
          id={item.id}
          key={item.id}
          icon={icon}
          title={
            item.prompt.substring(0, 40) +
            (item.prompt.length > 40 ? "..." : "")
          }
          subtitle={`${item.model || item.voice} • ${new Date(item.timestamp).toLocaleDateString()}`}
          detail={getDetailForType(item, type)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title={getCopyActionForType(type)}
                content={item.content}
                icon={Icon.Clipboard}
              />
              {openAction && (
                <Action.OpenInBrowser
                  title={openAction.title}
                  url={item.content}
                  icon={openAction.icon}
                />
              )}
              <Action
                title="Remove from History"
                onAction={() => onRemove(item.id)}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: [], key: "delete" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
