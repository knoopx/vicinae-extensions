import { Cache, showToast, Toast } from "@vicinae/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Conversation, ConversationsHook } from "../type";

export function useConversations(): ConversationsHook {
  const [data, setData] = useState<Conversation[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const storedConversations = await Cache.getItem<string>("conversations");

      if (storedConversations) {
        setData((previous) => [...previous, ...JSON.parse(storedConversations)]);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    Cache.setItem("conversations", JSON.stringify(data.filter((x) => x.chats.length > 0)));
  }, [data]);

  const add = useCallback(
    async (conversation: Conversation) => {
      setData([...data, conversation]);
    },
    [setData, data]
  );

  const update = useCallback(
    async (conversation: Conversation) => {
      setData((prev) => {
        return prev.map((x) => {
          if (x.id === conversation.id) {
            return conversation;
          }
          return x;
        });
      });
    },
    [setData, data]
  );

  const remove = useCallback(
    async (conversation: Conversation) => {
      const toast = await showToast({
        title: "Removing conversation...",
        style: "animated",
      });
      const newConversations: Conversation[] = data.filter((item) => item.id !== conversation.id);
      setData(newConversations);
      toast.title = "Conversation removed!";
      toast.style = "success";
    },
    [setData, data]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing conversations ...",
      style: "animated",
    });
    setData([]);
    toast.title = "Conversations cleared!";
    toast.style = "success";
  }, [setData]);

  return useMemo(
    () => ({ data, isLoading, add, update, remove, clear }),
    [data, isLoading, add, update, remove, clear]
  );
}
