import { List, showToast, Toast } from "@vicinae/api";
import { useState, useEffect } from "react";
import { HistoryItem } from "./types";
import { loadHistory, addToHistory, removeFromHistory, loadLastModel, saveLastModel } from "./history-utils";
import { AUDIO_VOICES } from "./constants";
import { HistoryList } from "./history-list";

export default function Command() {
  const [prompt, setPrompt] = useState("");
  const [voice, setVoice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      // Load history from cache
      const historyData = await loadHistory("AUDIO_HISTORY");
      setHistory(historyData);

      // Load last used voice
      const lastVoice = await loadLastModel("AUDIO_LAST_VOICE");
      if (lastVoice) {
        setVoice(lastVoice);
      }
      // If no last voice, leave voice as empty string (no default)
    };

    loadData();
  }, []);

  // Save last used voice when it changes
  useEffect(() => {
    if (voice) {
      saveLastModel("AUDIO_LAST_VOICE", voice);
    }
  }, [voice]);

  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    if (newVoice) {
      saveLastModel("AUDIO_LAST_VOICE", newVoice);
    }
  };

  const handleSaveToHistory = async (
    newItem: Omit<HistoryItem, "id" | "timestamp">,
  ) => {
    const newHistory = await addToHistory("AUDIO_HISTORY", history, newItem);
    setHistory(newHistory);
  };

  const handleRemoveFromHistory = async (id: string) => {
    const newHistory = await removeFromHistory("AUDIO_HISTORY", history, id);
    setHistory(newHistory);
  };

  const generateAudio = async () => {
     if (!prompt.trim()) {
       showToast({
         style: Toast.Style.Failure,
         title: "Text required",
         message: "Please enter text for audio generation",
       });
       return;
     }

     if (!voice) {
       showToast({
         style: Toast.Style.Failure,
         title: "Voice required",
         message: "Please select a voice for audio generation",
       });
       return;
     }

     setIsGenerating(true);
    try {
      const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-audio&voice=${voice}`;

       // For audio, the URL itself is the generated content
       handleSaveToHistory({
         prompt,
         content: url,
         voice,
       });

       showToast({
         style: Toast.Style.Success,
         title: "Audio generated",
         message: "Audio URL ready to copy",
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
      searchBarPlaceholder="Enter text to convert to speech..."
      onSearchTextChange={setPrompt}
      searchBarAccessory={
        <List.Dropdown tooltip="Voice" onChange={handleVoiceChange}>
          {AUDIO_VOICES.map((voice) => (
            <List.Dropdown.Item
              key={voice.value}
              title={voice.title}
              value={voice.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      <HistoryList
        history={history}
        onRemove={handleRemoveFromHistory}
        type="audio"
        prompt={prompt}
        isGenerating={isGenerating}
        onGenerate={generateAudio}
        selectedVoice={voice}
      />
    </List>
  );
}
