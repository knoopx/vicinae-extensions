import { Color, Icon } from "@vicinae/api";

export type TaskAccessory = {
  tag?: { value: string; color: Color };
  icon?: Icon;
  text?: string;
};

export type TaskMetadataLabel = {
  title: string;
  text: string;
};

export type TaskMetadataTagList = {
  title: string;
  children: Array<{
    text: string;
    color: Color;
  }>;
};

export interface TaskItemProps {
  task: import("../models/Task").Task;
  allContexts: string[];
  allTags: string[];
  showDetail?: boolean;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string | null) => void;
  onCompleteTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onCopyToClipboard: (task: import("../models/Task").Task) => Promise<void>;
  onEditTask?: (task: import("../models/Task").Task) => void;
  isEditing?: boolean;
  editingExpression?: string;
  onSaveEdit?: (taskId: string) => void;
  onCancelEdit?: () => void;
  searchText?: string;
}