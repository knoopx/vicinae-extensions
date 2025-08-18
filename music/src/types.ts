export interface ReleaseData {
  title: string;
  path: string;
  track_count: number;
}

export interface Collection {
  name: string;
  items: string[]; // paths
}

export interface ScanProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface FilterState {
  query: string;
  starredOnly: boolean;
  selectedCollection: string;
  selectedGenre: string;
  selectedYear: number | null;
}
