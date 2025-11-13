import { useCallback } from "react";
import { Clipboard, showToast, Toast } from "@vicinae/api";
import { Task } from "../models/Task";

export function useTaskActions(setTasks: (updater: (prev: Task[]) => Task[]) => void) {
  const handleCompleteTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? task.complete() : task)),
    );
  }, [setTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, [setTasks]);

  const handleCopyToClipboard = useCallback(async (task: Task) => {
    try {
      await Clipboard.copy(task.expression);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: task.expression,
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: "Could not copy task to clipboard",
      });
    }
  }, []);

  const handleResetCompletion = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId && task.isRecurring) {
          const resetTask = new Task(task.expression);
          resetTask.id = task.id;
          resetTask.createdAt = task.createdAt;
          resetTask.completionCount = 0;
          resetTask.lastCompletedAt = task.createdAt;
          return resetTask;
        }
        return task;
      }),
    );
  }, [setTasks]);

  return {
    handleCompleteTask,
    handleDeleteTask,
    handleCopyToClipboard,
    handleResetCompletion,
  };
}