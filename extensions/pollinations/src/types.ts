export type Preferences = {
  apiToken: string;
};

export type HistoryItem = {
  id: string;
  prompt: string;
  content: string;
  model?: string;
  voice?: string;
  timestamp: number;
};

export type ModelOption = {
  title: string;
  value: string;
};

export type GenerationType = "text" | "image" | "audio";

export type ApiModel =
  | string
  | {
      name: string;
      description?: string;
      tier?: string;
    };
