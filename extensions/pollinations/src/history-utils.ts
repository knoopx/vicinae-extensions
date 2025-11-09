import { LocalStorage } from "@vicinae/api";
import { HistoryItem, ModelOption } from "./types";
import { CACHE_KEYS, MAX_HISTORY_ITEMS } from "./constants";

export const loadHistory = async (type: keyof typeof CACHE_KEYS): Promise<HistoryItem[]> => {
  const cacheKey = CACHE_KEYS[type];
  try {
    const cachedHistory = await LocalStorage.getItem(cacheKey);
    if (typeof cachedHistory === "string") {
      return JSON.parse(cachedHistory);
    }
  } catch (error) {
    console.error(`Failed to parse ${type} history:`, error);
  }
  return [];
};

export const saveHistory = async (
  type: keyof typeof CACHE_KEYS,
  history: HistoryItem[],
): Promise<void> => {
  const cacheKey = CACHE_KEYS[type];
  await LocalStorage.setItem(cacheKey, JSON.stringify(history));
};

export const addToHistory = async (
  type: keyof typeof CACHE_KEYS,
  history: HistoryItem[],
  newItem: Omit<HistoryItem, "id" | "timestamp">,
): Promise<HistoryItem[]> => {
  const historyItem: HistoryItem = {
    ...newItem,
    id: Date.now().toString(),
    timestamp: Date.now(),
  };

  const newHistory = [historyItem, ...history].slice(0, MAX_HISTORY_ITEMS);
  await saveHistory(type, newHistory);
  return newHistory;
};

export const removeFromHistory = async (
  type: keyof typeof CACHE_KEYS,
  history: HistoryItem[],
  id: string,
): Promise<HistoryItem[]> => {
  const newHistory = history.filter((item) => item.id !== id);
  await saveHistory(type, newHistory);
  return newHistory;
};

export const loadModels = async (type: keyof typeof CACHE_KEYS): Promise<ModelOption[]> => {
  const cacheKey = CACHE_KEYS[type];
  try {
    const cachedModels = await LocalStorage.getItem(cacheKey);
    if (typeof cachedModels === "string") {
      return JSON.parse(cachedModels);
    }
  } catch (error) {
    console.error(`Failed to parse cached ${type}:`, error);
  }
  return [];
};

export const saveModels = async (
  type: keyof typeof CACHE_KEYS,
  models: ModelOption[],
): Promise<void> => {
  const cacheKey = CACHE_KEYS[type];
  await LocalStorage.setItem(cacheKey, JSON.stringify(models));
};

export const loadLastModel = async (type: keyof typeof CACHE_KEYS): Promise<string | null> => {
  const cacheKey = CACHE_KEYS[type];
  try {
    const cachedModel = await LocalStorage.getItem(cacheKey);
    return typeof cachedModel === "string" ? cachedModel : null;
  } catch {
    return null;
  }
};

export const saveLastModel = async (type: keyof typeof CACHE_KEYS, model: string): Promise<void> => {
  const cacheKey = CACHE_KEYS[type];
  await LocalStorage.setItem(cacheKey, model);
};
