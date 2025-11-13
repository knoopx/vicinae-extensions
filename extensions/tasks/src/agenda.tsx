import { List, Icon } from "@vicinae/api";
import { useState } from "react";

import { groupTasksByAgenda } from "./utils/grouping";
import { useTasks } from "./hooks/useTasks";
import { useTaskActions } from "./hooks/useTaskActions";
import { TaskItem } from "./components/TaskItem";

export default function AgendaCommand() {
  const { tasks, setTasks, isLoading } = useTasks();
  const { handleCompleteTask, handleDeleteTask, handleCopyToClipboard } = useTaskActions(setTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  const groupedTasks = groupTasksByAgenda(tasks);

  return (
    <List>
      {groupedTasks.map(([groupName, tasksInGroup]) => (
        <List.Section key={groupName} title={groupName}>
          {tasksInGroup.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              allContexts={[]}
              allTags={[]}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              onCopyToClipboard={handleCopyToClipboard}
            />
          ))}
        </List.Section>
      ))}

      {tasks.length === 0 && (
        <List.Item
          key="no-tasks-placeholder"
          title="No tasks yet"
          subtitle="Add some tasks to see your agenda"
          icon={Icon.Document}
        />
      )}
    </List>
  );
}