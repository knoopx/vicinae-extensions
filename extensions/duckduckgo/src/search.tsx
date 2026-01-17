import { Icon, List } from "@vicinae/api";
import { useEffect, useState } from "react";

import { createCommonActions, searchDuckDuckGo } from "./utils";
import type { DDGResult, DDGSearchResponse } from "./utils";

export default function Command() {
  const [query, setQuery] = useState("");
  const [searchResponse, setSearchResponse] = useState<DDGSearchResponse>({ results: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResponse({ results: [] });
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const response = await searchDuckDuckGo(query);
        setSearchResponse(response);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResponse({ results: [] });
      }
      setIsLoading(false);
    };

    const timeoutId = setTimeout(search, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search DuckDuckGo"
      onSearchTextChange={setQuery}
    >
      {searchResponse.results.map((result, index) => (
        <List.Item
          key={index}
          icon={Icon.Globe}
          title={result.title}
          subtitle={result.url}
          detail={
            <List.Item.Detail
              markdown={`# ${result.title}\n\n${result.description}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="URL" text={result.url} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={createCommonActions(result.url)}
        />
      ))}
      {query && !isLoading && searchResponse.results.length === 0 && (
        <List.EmptyView
          title="No results found"
          description="Try a different search query."
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}