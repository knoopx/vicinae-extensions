import { getPreferenceValues, showToast } from "@vicinae/api";
import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Chat, ChatHook, Model } from "../type";
import { chatTransformer } from "../utils";
import { usePiRpc } from "./usePiRpc";
import { useHistory } from "./useHistory";

export function useChat<T extends Chat>(props: T[]): ChatHook {
  const [data, setData] = useState<Chat[]>(props);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [useStream] = useState<boolean>(() => {
    return getPreferenceValues<{
      useStream: boolean;
    }>().useStream;
  });
  const [streamData, setStreamData] = useState<Chat | undefined>();

  const history = useHistory();
  const piRpc = usePiRpc();

  // Listen for events
  useMemo(() => {
    piRpc.onEvent((event) => {
      if (event.type === "message_update") {
        const msgEvent = event.assistantMessageEvent;
        if (msgEvent.type === "text_delta") {
          // Update streaming chat
          setData((prev) => prev.map((chat) => {
            if (chat.id === selectedChatId) {
              return { ...chat, answer: (chat.answer || "") + msgEvent.delta };
            }
            return chat;
          }));
          setStreamData((prev) => prev ? { ...prev, answer: (prev.answer || "") + msgEvent.delta } : undefined);
        }
      } else if (event.type === "agent_end") {
        setLoading(false);
        setStreamData(undefined);
        // Save to history
        const lastChat = data[data.length - 1];
        if (lastChat) {
          history.add(lastChat);
        }
      }
    });
  }, [piRpc, selectedChatId, data]);

  async function ask(question: string, model: Model) {
    setLoading(true);

    const toast = await showToast({
      title: "Getting your answer...",
      style: "animated",
    });

    let chat: Chat = {
      id: uuidv4(),
      question,
      answer: "",
      created_at: new Date().toISOString(),
    };

    setSelectedChatId(chat.id);
    setData((prev) => [...prev, chat]);
    setStreamData(chat);

    try {
      // Send prompt via RPC
      await piRpc.send({
        type: "prompt",
        message: question,
      });

      toast.title = "Got your answer!";
      toast.style = "success";
    } catch (err) {
      toast.title = "Error";
      toast.message = `Couldn't get response: ${err}`;
      toast.style = "failure";
      setLoading(false);
    }
  }

  const clear = useCallback(async () => {
    setData([]);
  }, [setData]);

  return useMemo(
    () => ({ data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData }),
    [data, setData, isLoading, setLoading, selectedChatId, setSelectedChatId, ask, clear, streamData]
  );
}
