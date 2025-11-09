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
  const [textModels, setTextModels] = useState<ModelOption[]>([]);
  const [streamingPreview, setStreamingPreview] = useState<string>("");



  useEffect(() => {
    const loadData = async () => {
      // Load history from cache
      const historyData = await loadHistory("TEXT_HISTORY");
      setHistory(historyData);

      // Load last used model
      const lastModel = await loadLastModel("TEXT_LAST_MODEL");
      if (lastModel) {
        setModel(lastModel);
      }
      // If no last model, leave model as empty string (no default)

      // Load models from cache or fetch from API
      const cachedModels = await loadModels("TEXT_MODELS");
      if (cachedModels.length > 0) {
        setTextModels(cachedModels);
      } else {
        // Fetch models from API
        try {
          const response = await fetch("https://text.pollinations.ai/models");
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
          setTextModels(formattedModels);
          await saveModels("TEXT_MODELS", formattedModels);
        } catch (error) {
          console.error("Failed to fetch text models:", error);
          setTextModels([]);
        }
      }
    };

    loadData();
  }, []);

  // Save last used model when it changes
  useEffect(() => {
    if (model) {
      saveLastModel("TEXT_LAST_MODEL", model);
    }
  }, [model]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    if (newModel) {
      saveLastModel("TEXT_LAST_MODEL", newModel);
    }
  };

  const handleSaveToHistory = async (
    newItem: Omit<HistoryItem, "id" | "timestamp">,
  ) => {
    const newHistory = await addToHistory("TEXT_HISTORY", history, newItem);
    setHistory(newHistory);
  };

  const handleRemoveFromHistory = async (id: string) => {
    const newHistory = await removeFromHistory("TEXT_HISTORY", history, id);
    setHistory(newHistory);
  };

  const generateText = async () => {
    try {
       if (!prompt.trim()) {
         showToast({
           style: Toast.Style.Failure,
           title: "Prompt required",
           message: "Please enter a prompt for text generation",
         });
         return;
       }

       if (!model) {
         showToast({
           style: Toast.Style.Failure,
           title: "Model required",
           message: "Please select an AI model for text generation",
         });
         return;
       }

       setIsGenerating(true);
       setStreamingPreview("");

       // Use OpenAI-compatible endpoint for streaming
       const url = 'https://text.pollinations.ai/openai';
       const headers: Record<string, string> = {
         'Content-Type': 'application/json',
         'Accept': 'text/event-stream',
         'Cache-Control': 'no-cache',
       };
       if (preferences.apiToken) {
         headers.Authorization = `Bearer ${preferences.apiToken}`;
       }

       const payload = {
         model: model || 'openai',
         messages: [{ role: 'user', content: prompt }],
         stream: true,
       };

       console.log('Sending request:', { url, payload });

       const response = await fetch(url, {
         method: 'POST',
         headers,
         body: JSON.stringify(payload),
       });

       console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

          // Provide helpful error messages for common status codes
          if (response.status === 402) {
            errorMessage += ' - This model may require authentication or payment. Try using the "openai" model or set your API token in preferences.';
          } else if (response.status === 429) {
            errorMessage += ' - Rate limit exceeded. Please wait before making another request.';
          } else if (response.status === 401) {
            errorMessage += ' - Authentication required. Please set your API token in preferences.';
          } else if (errorText) {
            errorMessage += ` - ${errorText}`;
          }

          throw new Error(errorMessage);
        }

        // Handle SSE streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let generatedText = "";
        let buffer = "";
        let fullBuffer = "";
        let hasReceivedData = false;

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              fullBuffer += chunk;
              buffer += chunk;
              const events = buffer.split('\n\n');

              // Process complete SSE events
              for (let i = 0; i < events.length - 1; i++) {
                const event = events[i].trim();
                if (!event) continue;

                hasReceivedData = true;

                const lines = event.split('\n');
                let data = '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    data = line.slice(6);
                    break;
                  }
                }

                if (data) {
                  if (data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    // Handle OpenAI-compatible streaming format
                    const content = parsed.choices?.[0]?.delta?.content;

                    if (typeof content === 'string' && content) {
                      generatedText += content;
                      setStreamingPreview(generatedText);
                    }
                  } catch {
                    // If not JSON, skip this chunk
                    console.log('Skipping non-JSON chunk:', data);
                  }
                }
              }

              buffer = events[events.length - 1];
            }
           } finally {
             reader.releaseLock();
           }
         }

        // If no streaming data was received, fall back to parsing full response as JSON
        if (!hasReceivedData) {
          console.log('No streaming data received, parsing full response as JSON');
          console.log('Full response:', fullBuffer);
          try {
            const jsonResponse = JSON.parse(fullBuffer);
            generatedText = jsonResponse.choices?.[0]?.message?.content ||
                           jsonResponse.content ||
                           jsonResponse.reasoning_content ||
                           jsonResponse.response ||
                           fullBuffer;
          } catch {
            generatedText = fullBuffer;
          }
          setStreamingPreview(generatedText);
        }

       handleSaveToHistory({
         prompt,
         content: generatedText,
         model,
       });

       showToast({
         style: Toast.Style.Success,
         title: "Text generated",
         message: "Response ready to copy",
       });

       // Clear prompt and streaming preview after successful generation
       setPrompt("");
       setStreamingPreview("");
     } catch (error) {
      console.error("Generation error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message: String(error),
      });
     } finally {
       setIsGenerating(false);
       setStreamingPreview("");
     }
  };

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Enter your text prompt..."
      onSearchTextChange={setPrompt}
       searchBarAccessory={
         <List.Dropdown tooltip="AI Model" value={model} onChange={handleModelChange}>
           {textModels.map((model) => (
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
        type="text"
        prompt={prompt}
        isGenerating={isGenerating}
        onGenerate={generateText}
        selectedModel={model}
        streamingPreview={streamingPreview}
      />
    </List>
  );
}
