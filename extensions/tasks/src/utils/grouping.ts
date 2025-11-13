import { DateTime } from "luxon";
import { Task } from "../models/Task";
import { TASK_GROUP_NAMES } from "../constants";
import { now } from "./now";

export function groupName(start: DateTime | null) {
  const currentTime = now().startOf("day");

  if (!start) return "today";

  if (start < currentTime) return "due";
  if (start.hasSame(currentTime, "day")) return "today";

  if (start.hasSame(currentTime.plus({ days: 1 }), "day")) return "tomorrow";
  if (start.hasSame(currentTime, "week")) return "later this week";
  if (start.hasSame(currentTime.plus({ weeks: 1 }).startOf("week"), "week"))
    return "next week";

  return "upcoming";
}

export function groupTasks(tasks: Task[]): [string, Task[]][] {
  const groups = TASK_GROUP_NAMES.reduce(
    (res, key) => {
      res[key] = [];
      return res;
    },
    {} as { [key: string]: Task[] },
  );

  tasks.forEach((task) => {
    groups[groupName(task.nextAt)].push(task);
  });

  return TASK_GROUP_NAMES.filter((key) => groups[key].length).map(
    (key) => [key, groups[key]] as [string, Task[]],
  );
}

export function groupTasksByContext(tasks: Task[]): [string, Task[]][] {
  const groups: { [key: string]: Task[] } = {};

  tasks.forEach((task) => {
    task.contexts.forEach((context) => {
      if (!groups[context]) {
        groups[context] = [];
      }
      groups[context].push(task);
    });
  });

  // Tasks without contexts
  const tasksWithoutContext = tasks.filter((task) => task.contexts.length === 0);
  if (tasksWithoutContext.length > 0) {
    groups["No Context"] = tasksWithoutContext;
  }

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function groupTasksByTag(tasks: Task[]): [string, Task[]][] {
  const groups: { [key: string]: Task[] } = {};

  tasks.forEach((task) => {
    task.tags.forEach((tag) => {
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(task);
    });
  });

  // Tasks without tags
  const tasksWithoutTags = tasks.filter((task) => task.tags.length === 0);
  if (tasksWithoutTags.length > 0) {
    groups["No Tags"] = tasksWithoutTags;
  }

  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function groupTasksByCompletion(tasks: Task[]): [string, Task[]][] {
  const groups: { [key: string]: Task[] } = {
    "Completed": [],
    "Incomplete": [],
  };

  tasks.forEach((task) => {
    if (task.isCompleted) {
      groups["Completed"].push(task);
    } else {
      groups["Incomplete"].push(task);
    }
  });

  return Object.entries(groups).filter(([, tasks]) => tasks.length > 0);
}

export function groupTasksByRecurrence(tasks: Task[]): [string, Task[]][] {
  const groups: { [key: string]: Task[] } = {
    "Recurring": [],
    "One-time": [],
  };

  tasks.forEach((task) => {
    if (task.isRecurring) {
      groups["Recurring"].push(task);
    } else {
      groups["One-time"].push(task);
    }
  });

  return Object.entries(groups).filter(([, tasks]) => tasks.length > 0);
}

export function groupTasksByAgenda(tasks: Task[]): [string, Task[]][] {
  const currentTime = now();
  const today = currentTime.startOf("day");
  const tomorrow = today.plus({ days: 1 });
  const endOfWeek = today.endOf("week");
  const endOfMonth = today.endOf("month");

  const groups: { [key: string]: Task[] } = {
    "Overdue": [],
    "Today": [],
    "Tomorrow": [],
    "This Week": [],
    "This Month": [],
    "Later": [],
    "No Date": [],
  };

  tasks.forEach((task) => {
    if (!task.nextAt) {
      groups["No Date"].push(task);
      return;
    }

    const taskDate = task.nextAt.startOf("day");

    if (taskDate < today) {
      groups["Overdue"].push(task);
    } else if (taskDate.hasSame(today, "day")) {
      groups["Today"].push(task);
    } else if (taskDate.hasSame(tomorrow, "day")) {
      groups["Tomorrow"].push(task);
    } else if (taskDate <= endOfWeek) {
      groups["This Week"].push(task);
    } else if (taskDate <= endOfMonth) {
      groups["This Month"].push(task);
    } else {
      groups["Later"].push(task);
    }
  });

  return Object.entries(groups).filter(([, tasks]) => tasks.length > 0);
}
