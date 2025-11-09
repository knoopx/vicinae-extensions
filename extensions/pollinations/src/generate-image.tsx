import { List, showToast, Toast, getPreferenceValues } from "@vicinae/api";
import { useState, useEffect } from "react";
import { Preferences, HistoryItem, ModelOption, ApiModel } from "./types";
import {
  loadHistory,
  addToHistory,
  removeFromHistory,
  loadModels,
  saveModels,
  loadLastModel,
  saveLastModel,
} from "./history-utils";
import { HistoryList } from "./history-list";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [imageModels, setImageModels] = useState<ModelOption[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Load history from cache
      const historyData = await loadHistory("IMAGE_HISTORY");
      setHistory(historyData);

      // Load last used model
      const lastModel = await loadLastModel("IMAGE_LAST_MODEL");
      if (lastModel) {
        setModel(lastModel);
      }
      // If no last model, leave model as empty string (no default)

      // Load models from cache or fetch from API
      const cachedModels = await loadModels("IMAGE_MODELS");
      if (cachedModels.length > 0) {
        setImageModels(cachedModels);
      } else {
        // Fetch models from API
        try {
          const response = await fetch("https://image.pollinations.ai/models");
          const models: ApiModel[] = await response.json();
          const formattedModels = models.map((model) => {
            if (typeof model === "string") {
              return {
                title:
                  model.charAt(0).toUpperCase() +
                  model.slice(1).replace(/-/g, " "),
                value: model,
              };
            } else {
              return {
                title: `${model.description || model.name.charAt(0).toUpperCase() + model.name.slice(1).replace(/-/g, " ")} (${model.tier})`,
                value: model.name,
              };
            }
          });
          setImageModels(formattedModels);
          await saveModels("IMAGE_MODELS", formattedModels);
        } catch (error) {
          console.error("Failed to fetch image models:", error);
          setImageModels([]);
        }
      }
    };

    loadData();
  }, []);

  // Save last used model when it changes
  useEffect(() => {
    if (model) {
      saveLastModel("IMAGE_LAST_MODEL", model);
    }
  }, [model]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    if (newModel) {
      saveLastModel("IMAGE_LAST_MODEL", newModel);
    }
  };

  const handleSaveToHistory = async (
    newItem: Omit<HistoryItem, "id" | "timestamp">,
  ) => {
    const newHistory = await addToHistory("IMAGE_HISTORY", history, newItem);
    setHistory(newHistory);
  };

  const handleRemoveFromHistory = async (id: string) => {
    const newHistory = await removeFromHistory("IMAGE_HISTORY", history, id);
    setHistory(newHistory);
  };

  const generateImage = async () => {
     if (!prompt.trim()) {
       showToast({
         style: Toast.Style.Failure,
         title: "Prompt required",
         message: "Please enter a prompt for image generation",
       });
       return;
     }

     if (!model) {
       showToast({
         style: Toast.Style.Failure,
         title: "Model required",
         message: "Please select an AI model for image generation",
       });
       return;
     }

     setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        model: model,
        width: "1024",
        height: "1024",
      });
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`;
      const headers: Record<string, string> = {};
      if (preferences.apiToken) {
        headers.Authorization = `Bearer ${preferences.apiToken}`;
      }

       // For images, the URL itself is the generated content
       handleSaveToHistory({
         prompt,
         content: url,
         model,
       });

       showToast({
         style: Toast.Style.Success,
         title: "Image generated",
         message: "Image URL ready to copy",
       });

       // Clear prompt after successful generation
       setPrompt("");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message: String(error),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Enter your image prompt..."
      onSearchTextChange={setPrompt}
       searchBarAccessory={
         <List.Dropdown tooltip="AI Model" value={model} onChange={handleModelChange}>
           {imageModels.map((model) => (
             <List.Dropdown.Item
               key={model.value}
               title={model.title}
               value={model.value}
             />
           ))}
         </List.Dropdown>
       }
    >
      <HistoryList
        history={history}
        onRemove={handleRemoveFromHistory}
        type="image"
        prompt={prompt}
        isGenerating={isGenerating}
        onGenerate={generateImage}
        selectedModel={model}
      />
    </List>
  );
}
