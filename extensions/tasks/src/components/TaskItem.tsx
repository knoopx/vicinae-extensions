import { List, ActionPanel, Action, Icon } from "@vicinae/api";
import { Task } from "../models/Task";
import { getTaskIcon, getEnhancedTaskAccessories } from "../utils/task-helpers";
import { emojiFromKeyword } from "../utils/emojiFromKeyword";
import { TaskItemProps } from "../types";
import { now } from "../utils/now";
import { toDistanceExpr } from "../utils/toDistanceExpr";


export function TaskItem({
  task,
  allContexts,
  allTags,
  showDetail = false,
  selectedTaskId,
  onSelectTask,
  onCompleteTask,
  onDeleteTask,
  onCopyToClipboard,
  onEditTask,
  isEditing = false,
  editingExpression = "",
  onSaveEdit,
  onCancelEdit,
}: TaskItemProps) {
  // Get emojis from contexts and tags
  const contextEmojis = [...task.contexts, ...task.tags]
    .map((x) => emojiFromKeyword(x))
    .filter((x) => x !== undefined) as string[];

  const titleWithEmoji =
    contextEmojis.length > 0
      ? `${contextEmojis[0]}  ${task.subject || task.expression}`
      : task.subject || task.expression;

  if (isEditing) {
    return (
      <List.Item
        key={task.id}
        title={editingExpression || "Edit task..."}
        subtitle="Press Enter to save, Esc to cancel"
        icon={Icon.Pencil}
        accessories={[]}
        actions={
          <ActionPanel>
            {onSaveEdit && (
              <Action
                title="Save Changes"
                onAction={() => onSaveEdit(task.id)}
                icon={Icon.CheckCircle}
                shortcut={{ modifiers: [], key: "return" }}
              />
            )}
            {onCancelEdit && (
              <Action
                title="Cancel"
                onAction={onCancelEdit}
                icon={Icon.Minus}
                shortcut={{ modifiers: [], key: "escape" }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.Item
      key={task.id}
      title={titleWithEmoji}
      subtitle={showDetail ? undefined : getTaskSubtitle(task)}
      icon={getTaskIcon(task)}
      accessories={
        showDetail
          ? []
          : getEnhancedTaskAccessories(task, allContexts, allTags)
      }
      detail={
        selectedTaskId === task.id ? (
          <List.Item.Detail
            metadata={
              <TaskMetadata
                task={task}
                allContexts={allContexts}
                allTags={allTags}
              />
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={
              task.isCompleted ? "Mark Incomplete" : "Mark Complete"
            }
            onAction={() => onCompleteTask(task.id)}
            icon={task.isCompleted ? Icon.Circle : Icon.CheckCircle}
          />
          {onEditTask && (
            <Action
              title="Edit Task"
              onAction={() => onEditTask(task)}
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["ctrl"], key: "e" }}
            />
          )}
          <Action
            title="Toggle Complete"
            onAction={() => onCompleteTask(task.id)}
            icon={task.isCompleted ? Icon.Circle : Icon.CheckCircle}
            shortcut={{ modifiers: [], key: "space" }}
          />

          <Action
            title="Copy to Clipboard"
            onAction={() => onCopyToClipboard(task)}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["ctrl"], key: "c" }}
          />
          {task.isRecurring && task.completionCount > 0 && (
            <Action
              title="Reset Completion"
              onAction={() => onCompleteTask(task.id)}
              icon={Icon.RotateClockwise}
            />
          )}
          {!showDetail && onSelectTask && (
            <Action
              title={
                selectedTaskId === task.id
                  ? "Hide Details"
                  : "View Details"
              }
              onAction={() => {
                onSelectTask(
                  selectedTaskId === task.id ? null : task.id,
                );
              }}
              icon={
                selectedTaskId === task.id
                  ? Icon.EyeDisabled
                  : Icon.Eye
              }
            />
          )}
          <Action
            title="Delete Task"
            onAction={() => onDeleteTask(task.id)}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
          />
        </ActionPanel>
      }
    />
  );
}

// Import TaskMetadata here to avoid circular imports
import { TaskMetadata } from "./TaskMetadata";

// Helper function for task subtitle (moved from task-helpers.ts)
function getTaskSubtitle(task: Task) {
  if (task.nextAt) {
    return getDistanceText(task.nextAt);
  }
  return undefined;
}

// Helper function for distance text
function getDistanceText(date: import("luxon").DateTime): string {
  const currentTime = now();

  if (date < currentTime) {
    return "overdue";
  }

  return toDistanceExpr(currentTime, date) || "now";
}

