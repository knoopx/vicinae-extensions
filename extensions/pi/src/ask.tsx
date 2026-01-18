import { ActionPanel, List } from "@vicinae/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { PrimaryAction } from "./actions";
import { FormInputActionSection } from "./actions/form-input";
import { PreferencesActionSection } from "./actions/preferences";
import { useChat } from "./hooks/useChat";
import { useQuestion } from "./hooks/useQuestion";
import { Chat } from "./type";
import { ChatView } from "./views/chat";

export default function Ask(props: { conversation?: any }) {
  const chats = useChat<Chat>([]);
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: true });

  const [conversation, setConversation] = useState<any>({
    id: uuidv4(),
    chats: [],
    updated_at: "",
    created_at: new Date().toISOString(),
  });

  const [isLoading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const updatedConversation = { ...conversation, chats: chats.data, updated_at: new Date().toISOString() };
    setConversation(updatedConversation);
  }, [chats.data]);

  const getActionPanel = (question: string) => (
    <ActionPanel>
      <PrimaryAction title="Get Answer" onAction={() => chats.ask(question, {} as any)} />
      <FormInputActionSection
        initialQuestion={question}
        onSubmit={(question) => chats.ask(question, {} as any)}
        models={[]}
        selectedModel=""
        onModelChange={() => {}}
      />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return (
    <List
      searchText={question.data}
      isShowingDetail={chats.data.length > 0 ? true : false}
      filtering={false}
      isLoading={question.isLoading || chats.isLoading}
      onSearchTextChange={question.update}
      throttle={false}
      navigationTitle={"Ask Pi"}
      actions={
        !question.data ? (
          <ActionPanel>
            <FormInputActionSection
              initialQuestion={question.data}
              onSubmit={(question) => chats.ask(question, {} as any)}
              models={[]}
              selectedModel=""
              onModelChange={() => {}}
            />
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getActionPanel(question.data)
        )
      }
      selectedItemId={chats.selectedChatId || undefined}
      onSelectionChange={(id) => {
        if (id !== chats.selectedChatId) {
          chats.setSelectedChatId(id);
        }
      }}
      searchBarPlaceholder={chats.data.length > 0 ? "Ask another question..." : "Ask Pi a question..."}
    >
      <ChatView
        data={chats.data}
        question={question.data}
        setConversation={setConversation}
        use={{ chats }}
        model={{} as any}
        models={[]}
        selectedModel=""
        onModelChange={() => {}}
      />
    </List>
  );
}