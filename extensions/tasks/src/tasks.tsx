import { List, ActionPanel, Action, Icon } from "@vicinae/api";
import { useState, useEffect } from "react";
import { Task } from "./models/Task";
import { parseExpression } from "./utils/expressionParser";
import { groupTasks, groupName } from "./utils/grouping";
import { useTasks } from "./hooks/useTasks";
import { useTaskActions } from "./hooks/useTaskActions";
import { TaskItem } from "./components/TaskItem";

import { CreateTaskMetadata } from "./components/CreateTaskMetadata";

function TaskList() {
  const { tasks, setTasks, isLoading } = useTasks();
  const { handleCompleteTask, handleDeleteTask, handleCopyToClipboard } = useTaskActions(setTasks);
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingExpression, setEditingExpression] = useState("");

  // Check if search text could be a task expression
  const parsedExpression = searchText.trim()
    ? parseExpression(searchText)
    : null;

  // Collect all unique contexts and tags for coloring
  const allContexts = Array.from(
    new Set([
      ...tasks.flatMap((task) => task.contexts),
      ...(parsedExpression?.contexts || []),
    ]),
  );
  const allTags = Array.from(
    new Set([
      ...tasks.flatMap((task) => task.tags),
      ...(parsedExpression?.tags || []),
    ]),
  );

  // Filter tasks based on search text (don't filter when editing)
  const getSearchTerm = (text: string) => {
    if (text.startsWith("@")) return text.substring(1);
    if (text.startsWith("#")) return text.substring(1);
    return text;
  };

  const searchTerm = getSearchTerm(searchText.toLowerCase());

  // Check if search text matches a time expression
  const getTimeGroupFilter = (text: string) => {
    const timeMappings: { [key: string]: string } = {
      today: "today",
      tomorrow: "tomorrow",
      "later this week": "later this week",
      "next week": "next week",
      upcoming: "upcoming",
      due: "due",
      overdue: "due",
    };
    return timeMappings[text.toLowerCase()];
  };

  const timeGroupFilter = getTimeGroupFilter(searchText.toLowerCase().trim());

  const filteredTasks = editingTaskId
    ? tasks
    : tasks.filter((task) => {
        // If searching for a time expression, only show tasks in that time group
        if (timeGroupFilter) {
          const taskGroup = task.nextAt ? groupName(task.nextAt) : "today";
          return taskGroup === timeGroupFilter;
        }

        // Otherwise, use regular text/context/tag matching
        return (
          task.subject.toLowerCase().includes(searchText.toLowerCase()) ||
          task.contexts.some((ctx: string) =>
            ctx.toLowerCase().includes(searchTerm),
          ) ||
          task.tags.some((tag: string) =>
            tag.toLowerCase().includes(searchTerm),
          )
        );
      });

  const hasExactMatch = tasks.some(
    (task) => task.expression.toLowerCase() === searchText.toLowerCase().trim(),
  );

  const shouldShowCreateTask =
    searchText.trim() &&
    !hasExactMatch &&
    !editingTaskId &&
    ((parsedExpression &&
      (parsedExpression.subject ||
        parsedExpression.contexts.length > 0 ||
        parsedExpression.tags.length > 0 ||
        parsedExpression.start ||
        parsedExpression.duration)) ||
      (searchText.trim().match(/^[@#]/) &&
        parsedExpression &&
        (parsedExpression.contexts.length > 0 ||
          parsedExpression.tags.length > 0)) ||
      timeGroupFilter); // Also show create option for time expressions

  // Clear selected task and editing state when creating a new task
  useEffect(() => {
    if (shouldShowCreateTask) {
      setSelectedTaskId(null);
      setEditingTaskId(null);
    }
  }, [shouldShowCreateTask]);

  // Clear editing state when selecting a task for details
  useEffect(() => {
    if (selectedTaskId) {
      setEditingTaskId(null);
      setEditingExpression("");
      setSearchText("");
    }
  }, [selectedTaskId]);

  // Update editing expression when search text changes during editing
  useEffect(() => {
    if (editingTaskId) {
      setEditingExpression(searchText);
    }
  }, [searchText, editingTaskId]);

  const handleCreateTask = () => {
    const newTask = new Task(searchText);
    setTasks((prev) => [...prev, newTask]);
    setSearchText("");
  };

  const handleEditTask = (task: Task) => {
    // Mark the task as being edited
    setEditingTaskId(task.id);
    setEditingExpression(task.expression);
    setSearchText(task.expression);
  };

  const handleSaveEdit = (taskId: string) => {
    const newExpression = editingExpression.trim();
    if (
      newExpression &&
      newExpression !== tasks.find((t) => t.id === taskId)?.expression
    ) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? new Task(newExpression) : task,
        ),
      );
    }
    setEditingTaskId(null);
    setEditingExpression("");
    setSearchText("");
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingExpression("");
    setSearchText("");
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  const groupedTasks = groupTasks(filteredTasks);

  // Check if we should show detail view for a selected task
  const selectedTask = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId)
    : null;

  // Show detail when creating a new task or viewing task details
  const showDetail = !!shouldShowCreateTask || !!selectedTask;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        editingTaskId
          ? "Edit task expression..."
          : "Search tasks or type a task expression..."
      }
      isShowingDetail={showDetail}
    >
      {shouldShowCreateTask && (
        <List.Item
          key="create-task-preview"
          title="Create task..."
          subtitle={parsedExpression?.subject || searchText}
          icon={Icon.Plus}
          detail={
            parsedExpression ? (
              <List.Item.Detail
                metadata={
                  <CreateTaskMetadata
                    parsedExpression={parsedExpression}
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
                title="Create Task"
                onAction={handleCreateTask}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      )}

      {groupedTasks.map(([groupName, tasksInGroup]) => (
        <List.Section key={groupName} title={groupName}>
          {tasksInGroup.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allContexts={allContexts}
              allTags={allTags}
              showDetail={showDetail}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              onCopyToClipboard={handleCopyToClipboard}
              onEditTask={handleEditTask}
              isEditing={editingTaskId === task.id}
              editingExpression={editingExpression}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          ))}
        </List.Section>
      ))}

      {tasks.length === 0 && !shouldShowCreateTask && (
        <List.Item
          key="no-tasks-placeholder"
          title="No tasks yet"
          subtitle="Type a task expression to create your first task"
          icon={Icon.Document}
        />
      )}
    </List>
  );
}

export default function Command() {
  return <TaskList />;
}
