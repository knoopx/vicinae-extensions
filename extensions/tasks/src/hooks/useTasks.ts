import { useState, useEffect } from "react";
import { LocalStorage } from "@vicinae/api";
import { Task } from "../models/Task";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const stored = await LocalStorage.getItem<string>("tasks");
        if (stored) {
          const parsedTasks = JSON.parse(stored).map(
            (t: ReturnType<Task["toJSON"]>) => Task.fromJSON(t),
          );
          setTasks(parsedTasks);
        }
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, []);

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    if (!isLoading) {
      try {
        LocalStorage.setItem(
          "tasks",
          JSON.stringify(tasks.map((t) => t.toJSON())),
        );
      } catch (error) {
        console.error("Failed to save tasks:", error);
      }
    }
  }, [tasks, isLoading]);

  return { tasks, setTasks, isLoading };
}
