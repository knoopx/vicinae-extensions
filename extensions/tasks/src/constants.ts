// Shared constants for the tasks extension

import { getPreferenceValues } from "@vicinae/api";

export const TASK_GROUP_NAMES = [
  "due",
  "today",
  "tomorrow",
  "later this week",
  "next week",
  "upcoming",
] as const;

export function getHoursOfDay() {
  const preferences = getPreferenceValues<{
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
  }>();
  return {
    morning: parseInt(preferences.morning) || 9,
    afternoon: parseInt(preferences.afternoon) || 15,
    evening: parseInt(preferences.evening) || 18,
    night: parseInt(preferences.night) || 22,
  };
}

export function getMonthsOfYear() {
  const preferences = getPreferenceValues<{
    winter: string;
    spring: string;
    summer: string;
    autumn: string;
  }>();
  return {
    winter: parseInt(preferences.winter) || 12,
    spring: parseInt(preferences.spring) || 3,
    summer: parseInt(preferences.summer) || 6,
    autumn: parseInt(preferences.autumn) || 9,
  };
}

export function getWeekendDays() {
  const preferences = getPreferenceValues<{
    weekendDays: string;
  }>();
  try {
    return preferences.weekendDays
      .split(",")
      .map((d) => parseInt(d.trim()))
      .filter((d) => !isNaN(d));
  } catch {
    return [0, 6]; // Default: Sunday (0), Saturday (6)
  }
}
