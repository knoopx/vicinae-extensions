import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
} from "@vicinae/api";
import { useState, useEffect } from "react";
import { loadCollections, saveCollection } from "./cache";

export default function ManageCollections() {
  const [collections, setCollections] = useState<{ [name: string]: string[] }>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setIsLoading(true);
    try {
      const loadedCollections = loadCollections();
      setCollections(loadedCollections);
    } catch (error) {
      console.error("Error loading collections:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load collections",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      {Object.entries(collections).map(([name, paths]) => (
        <List.Item
          key={name}
          title={name}
          subtitle={`${paths.length} releases`}
          accessories={[{ text: `${paths.length} items` }]}
          actions={
            <ActionPanel>
              <Action
                title="View Collection"
                onAction={() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: `Collection: ${name}`,
                    message: `Contains ${paths.length} releases`,
                  });
                }}
                icon={Icon.Eye}
              />
              <Action
                title="Refresh Collections"
                onAction={loadData}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ))}
      {Object.keys(collections).length === 0 && !isLoading && (
        <List.EmptyView
          title="No Collections Found"
          description="Collections will appear here once you create them"
          icon={Icon.Music}
        />
      )}
    </List>
  );
}
