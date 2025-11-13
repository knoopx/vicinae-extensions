import { Color, Icon } from "@vicinae/api";
import { DateTime, Duration } from "luxon";
import { Task } from "../models/Task";
import { getContextColor } from "./colors";
import { formatDuration } from "./formatDuration";
import { toDistanceExpr } from "./toDistanceExpr";
import { now } from "./now";

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

// Task display helper functions
export function getTaskIcon(task: Task) {
  if (task.isRecurring) {
    return Icon.Repeat;
  }
  return Icon.Circle;
}

export function getTaskAccessories(
  task: Task,
  allContexts: string[],
  allTags: string[],
): TaskAccessory[] {
  const accessories: TaskAccessory[] = [];

  // Add contexts with colors
  task.contexts.forEach((context) => {
    accessories.push({
      tag: {
        value: `@${context}`,
        color: getContextColor(context, allContexts),
      },
    });
  });

  // Add tags with colors
  task.tags.forEach((tag) => {
    accessories.push({
      tag: { value: `#${tag}`, color: getContextColor(tag, allTags) },
    });
  });

  return accessories;
}

export function getTaskSubtitle(task: Task) {
  if (task.nextAt) {
    return getDistanceText(task.nextAt);
  }
  return undefined;
}

export function getEnhancedTaskAccessories(
  task: Task,
  allContexts: string[],
  allTags: string[],
): TaskAccessory[] {
  const accessories = getTaskAccessories(task, allContexts, allTags);

  // Add duration
  if (task.duration) {
    const duration = Duration.fromMillis(task.duration);
    accessories.push({ icon: Icon.Stopwatch, text: formatDuration(duration) });
  }

  // Add URLs
  task.urls.forEach((url) => {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname;
      accessories.push({ text: `🔗 ${domain}` });
    } catch {
      accessories.push({ text: `🔗 ${url}` });
    }
  });

  return accessories;
}

function getDistanceText(date: DateTime): string {
  const currentTime = now();

  if (date < currentTime) {
    return "overdue";
  }

  return toDistanceExpr(currentTime, date) || "now";
}
