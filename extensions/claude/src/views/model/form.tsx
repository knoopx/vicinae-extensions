import { Action, ActionPanel, Form, Icon, showToast, useNavigation } from "@vicinae/api";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Model, ModelHook } from "../../type";

// Helper to determine max tokens for a model
function getMaxTokensForModel(modelId: string): number {
  // Check if it's a Claude 4+ model
  const isClaude4Plus =
    modelId.includes("-4-") ||
    modelId.startsWith("claude-haiku-4") ||
    modelId.startsWith("claude-sonnet-4") ||
    modelId.startsWith("claude-opus-4");

  if (isClaude4Plus) {
    // Opus 4+ models have 32K output limit
    if (modelId.includes("opus")) {
      return 32000;
    }
    // Haiku 4+ and Sonnet 4+ models have 64K output limit
    return 64000;
  }

  // Legacy Claude 3 models have 4096 token output limit
  return 4096;
}

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const [name, setName] = useState(
    model?.name ??
    (use.models.availableModels.length > 0
      ? use.models.availableModels.find((m) => m.id === defaultModelOption)?.display_name || ""
      : "")
  );
  const [temperature, setTemperature] = useState(model?.temperature.toString() ?? "1");
  const [maxTokens, setMaxTokens] = useState(model?.max_tokens ?? getMaxTokensForModel(defaultModelOption).toString());
  const [prompt, setPrompt] = useState(model?.prompt ?? "You are a useful assistant");
  const [pinned, setPinned] = useState(model?.pinned ?? false);

  const handleSubmit = async () => {
    let updatedModel: Model = {
      id: model?.id || uuidv4(),
      name,
      prompt,
      option: selectedModel,
      temperature,
      max_tokens: maxTokens,
      pinned,
      updated_at: new Date().toISOString(),
      created_at: model?.created_at || new Date().toISOString(),
    };
    if (props.model) {
      const toast = await showToast({
        title: "Update your model...",
        style: "animated",
      });
      use.models.update(updatedModel);
      toast.title = "Model updated!";
      toast.style = "success";
    } else {
      await showToast({
        title: "Save your model...",
        style: "animated",
      });
      use.models.add(updatedModel);
      await showToast({
        title: "Model saved",
        style: "animated",
      });
    }
    pop();
  };

  const MODEL_OPTIONS = use.models.option;
  const AVAILABLE_MODELS = use.models.availableModels;

  // Helper to get display name for a model ID
  const getDisplayName = useCallback(
    (modelId: string): string => {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      return model?.display_name || modelId;
    },
    [AVAILABLE_MODELS]
  );

  // Handle model selection
  const handleModelChange = useCallback(
    (newValue: string) => {
      setSelectedModel(newValue);
      const newDisplayName = getDisplayName(newValue);
      setName(newDisplayName);
      const maxTokensVal = getMaxTokensForModel(newValue);
      setMaxTokens(maxTokensVal.toString());
    },
    [getDisplayName]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Model" placeholder="Choose model option" value={selectedModel} onChange={handleModelChange}>
        {MODEL_OPTIONS.map((option) => {
          const displayName = getDisplayName(option);
          return <Form.Dropdown.Item value={option} title={`${displayName} (${option})`} key={option} />;
        })}
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="Name your model" value={name} onChange={setName} />
      <Form.TextArea title="Prompt" placeholder="Describe your prompt" value={prompt} onChange={setPrompt} />
      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 1)"
        value={temperature}
        onChange={setTemperature}
      />
      <Form.TextField
        title="Max token output"
        placeholder="Set the maximum number of tokens to generate"
        info={`Maximum allowed: ${getMaxTokensForModel(selectedModel).toLocaleString()} tokens`}
        value={maxTokens}
        onChange={setMaxTokens}
      />
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" value={pinned} onChange={setPinned} />}
    </Form>
  );
};
