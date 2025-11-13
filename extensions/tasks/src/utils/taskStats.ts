import { Task } from "../models/Task";
import { now } from "./now";

export interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  recurring: number;
}

export function getTaskStats(tasks: Task[]): TaskStats {
  const currentTime = now();
  const today = currentTime.startOf("day");
  const thisWeek = currentTime.startOf("week");
  const thisMonth = currentTime.startOf("month");

  return {
    total: tasks.length,
    completed: tasks.filter(t => t.isCompleted).length,
    overdue: tasks.filter(t => !t.isCompleted && t.nextAt && t.nextAt < currentTime).length,
    today: tasks.filter(t => t.nextAt && t.nextAt.hasSame(today, "day")).length,
    thisWeek: tasks.filter(t => t.nextAt && t.nextAt >= thisWeek).length,
    thisMonth: tasks.filter(t => t.nextAt && t.nextAt >= thisMonth).length,
    recurring: tasks.filter(t => t.isRecurring).length,
  };
}

export function formatTaskSummary(stats: TaskStats): string {
  const parts = [
    `${stats.total} total`,
    stats.completed > 0 && `${stats.completed} completed`,
    stats.overdue > 0 && `${stats.overdue} overdue`,
    stats.today > 0 && `${stats.today} today`,
    stats.recurring > 0 && `${stats.recurring} recurring`,
  ].filter(Boolean);

  return parts.join(", ");
}